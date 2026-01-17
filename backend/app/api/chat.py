from fastapi import APIRouter, WebSocket, Depends, HTTPException, status, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import decode_token
from app.models.user import User
from app.models.chat import MessageRole
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatMessageResponse,
    ChatSessionResponse
)
from app.services.rag_service import RAGService
from app.services.llm_service import LLMService
from app.services import model_service
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chat with RAG (non-streaming)"""
    # Verify model access
    model = model_service.get_model(db, request.model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    if not model_service.check_user_access(db, request.model_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this model"
        )

    # Initialize services
    rag_service = RAGService(db)
    llm_service = LLMService(model)

    # Get or create session
    session = rag_service.get_or_create_session(
        user_id=current_user.id,
        model_id=request.model_id,
        session_id=request.session_id
    )

    # Save user message
    user_message = rag_service.save_message(
        session_id=session.id,
        user_id=current_user.id,
        role=MessageRole.USER,
        content=request.message
    )

    # Search for relevant chunks
    relevant_chunks = rag_service.search_similar_chunks(
        query=request.message,
        model_id=request.model_id,
        top_k=request.top_k
    )

    # Build context and prompt
    context = rag_service.build_context(relevant_chunks)

    # Get chat history for context
    history = rag_service.get_chat_history(session.id, limit=10)
    history_list = [
        {"role": msg.role.value, "content": msg.content}
        for msg in reversed(history[1:])  # Exclude current message
    ]

    prompt = rag_service.build_prompt(
        query=request.message,
        context=context,
        chat_history=history_list
    )

    # Generate response
    try:
        response_text = await llm_service.generate_response(prompt)
    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}"
        )

    # Format sources
    sources = None
    if request.include_sources and relevant_chunks:
        sources = rag_service.format_sources_for_response(relevant_chunks)

    # Save assistant message
    assistant_message = rag_service.save_message(
        session_id=session.id,
        user_id=current_user.id,
        role=MessageRole.ASSISTANT,
        content=response_text,
        sources=sources
    )

    return {
        "session_id": session.id,
        "message": assistant_message,
        "sources": sources
    }


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    """WebSocket endpoint for streaming chat"""
    await websocket.accept()

    try:
        # Authenticate user from token
        payload = decode_token(token)
        if not payload:
            await websocket.close(code=4001, reason="Invalid token")
            return

        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            await websocket.close(code=4001, reason="User not found or inactive")
            return

        logger.info(f"WebSocket connection established for user {user.id}")

        # Main message loop
        while True:
            # Receive message
            data = await websocket.receive_json()

            message = data.get("message")
            model_id = data.get("model_id")
            session_id = data.get("session_id")
            top_k = data.get("top_k", 5)

            if not message or not model_id:
                await websocket.send_json({
                    "type": "error",
                    "error": "Missing message or model_id"
                })
                continue

            # Verify model access
            model = model_service.get_model(db, model_id)
            if not model or not model_service.check_user_access(db, model_id, user):
                await websocket.send_json({
                    "type": "error",
                    "error": "Model not found or access denied"
                })
                continue

            # Initialize services
            rag_service = RAGService(db)
            llm_service = LLMService(model)

            # Get or create session
            session = rag_service.get_or_create_session(
                user_id=user.id,
                model_id=model_id,
                session_id=session_id
            )

            # Save user message
            user_message = rag_service.save_message(
                session_id=session.id,
                user_id=user.id,
                role=MessageRole.USER,
                content=message
            )

            # Send acknowledgment
            await websocket.send_json({
                "type": "user_message",
                "session_id": session.id,
                "message_id": user_message.id
            })

            # Search for relevant chunks
            relevant_chunks = rag_service.search_similar_chunks(
                query=message,
                model_id=model_id,
                top_k=top_k
            )

            # Send sources
            if relevant_chunks:
                sources = rag_service.format_sources_for_response(relevant_chunks)
                await websocket.send_json({
                    "type": "sources",
                    "sources": sources
                })

            # Build context and prompt
            context = rag_service.build_context(relevant_chunks)
            history = rag_service.get_chat_history(session.id, limit=10)
            history_list = [
                {"role": msg.role.value, "content": msg.content}
                for msg in reversed(history[1:])
            ]

            prompt = rag_service.build_prompt(
                query=message,
                context=context,
                chat_history=history_list
            )

            # Stream response
            response_text = ""
            try:
                await websocket.send_json({"type": "stream_start"})

                async for chunk in llm_service.generate_stream(prompt):
                    response_text += chunk
                    await websocket.send_json({
                        "type": "stream_chunk",
                        "content": chunk
                    })

                await websocket.send_json({"type": "stream_end"})

            except Exception as e:
                logger.error(f"Streaming error: {e}")
                await websocket.send_json({
                    "type": "error",
                    "error": f"Failed to generate response: {str(e)}"
                })
                continue

            # Save assistant message
            assistant_message = rag_service.save_message(
                session_id=session.id,
                user_id=user.id,
                role=MessageRole.ASSISTANT,
                content=response_text,
                sources=sources if relevant_chunks else None
            )

            await websocket.send_json({
                "type": "message_saved",
                "message_id": assistant_message.id
            })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_sessions(
    model_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's chat sessions"""
    rag_service = RAGService(db)
    sessions = rag_service.get_user_sessions(
        user_id=current_user.id,
        model_id=model_id
    )
    return sessions


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get messages for a chat session"""
    # Verify session belongs to user
    rag_service = RAGService(db)
    messages = rag_service.get_chat_history(session_id, limit)

    # Check ownership
    if messages and messages[0].user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return list(reversed(messages))


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chat session"""
    from app.models.chat import ChatSession

    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    db.delete(session)
    db.commit()
    return None
