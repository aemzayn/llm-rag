from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Optional
from app.models.document import DocumentChunk, Document
from app.models.chat import ChatSession, ChatMessage, MESSAGE_ROLES
from app.services.embedding_service import generate_embedding
from app.core.config import settings
import json
import logging

logger = logging.getLogger(__name__)


class RAGService:
    """Retrieval-Augmented Generation service"""

    def __init__(self, db: Session):
        self.db = db

    def search_similar_chunks(
        self,
        query: str,
        model_id: int,
        top_k: int = 5,
        similarity_threshold: float = 0.3,
    ) -> List[Dict]:
        """
        Search for similar document chunks using vector similarity

        Args:
            query: User's search query
            model_id: Model ID to search within
            top_k: Number of results to return
            similarity_threshold: Minimum similarity score

        Returns:
            List of relevant chunks with metadata and similarity scores
        """
        # Generate query embedding
        query_embedding = generate_embedding(query)

        # Use pgvector's cosine distance operator (<=>)
        # Lower distance = more similar
        sql = text(
            """
            SELECT
                dc.id,
                dc.content,
                dc.metadata,
                dc.document_id,
                d.filename,
                1 - (dc.embedding <=> :query_embedding) as similarity
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.model_id = :model_id
            ORDER BY dc.embedding <=> :query_embedding
            LIMIT :top_k
        """
        )

        result = self.db.execute(
            sql,
            {
                "query_embedding": str(query_embedding),
                "model_id": model_id,
                "top_k": top_k,
            },
        )

        chunks = []
        for row in result:
            similarity = float(row.similarity)
            if similarity >= similarity_threshold:
                metadata = json.loads(row.metadata) if row.metadata else {}
                chunks.append(
                    {
                        "chunk_id": row.id,
                        "content": row.content,
                        "document_id": row.document_id,
                        "document_name": row.filename,
                        "similarity": similarity,
                        "metadata": metadata,
                    }
                )

        logger.info(
            f"Found {len(chunks)} relevant chunks for query in model {model_id}"
        )
        return chunks

    def build_context(self, chunks: List[Dict]) -> str:
        """Build context string from retrieved chunks"""
        if not chunks:
            return "No relevant context found in the knowledge base."

        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            metadata = chunk.get("metadata", {})
            source_info = f"[Source {i}: {chunk['document_name']}"

            if "page" in metadata:
                source_info += f", Page {metadata['page']}"
            source_info += "]"

            context_parts.append(f"{source_info}\n{chunk['content']}")

        return "\n\n".join(context_parts)

    def build_prompt(
        self, query: str, context: str, chat_history: Optional[List[Dict]] = None
    ) -> str:
        """Build the full prompt for the LLM"""
        prompt_parts = [
            "You are a helpful AI assistant. Answer the user's question based on the provided context from the knowledge base.",
            "",
            "Context from knowledge base:",
            context,
            "",
        ]

        # Add chat history if available
        if chat_history:
            prompt_parts.append("Previous conversation:")
            for msg in chat_history[-5:]:  # Last 5 messages for context
                role = "User" if msg["role"] == "user" else "Assistant"
                prompt_parts.append(f"{role}: {msg['content']}")
            prompt_parts.append("")

        prompt_parts.extend(
            [
                "Instructions:",
                "1. Answer the question using ONLY the information from the provided context",
                "2. If the context doesn't contain relevant information, say so honestly",
                "3. Include specific references to sources when possible",
                "4. Be concise and accurate",
                "",
                f"User Question: {query}",
                "",
                "Assistant Answer:",
            ]
        )

        return "\n".join(prompt_parts)

    def get_or_create_session(
        self,
        user_id: int,
        model_id: int,
        session_id: Optional[int] = None,
        title: Optional[str] = None,
    ) -> ChatSession:
        """Get existing session or create a new one"""
        if session_id:
            session = (
                self.db.query(ChatSession)
                .filter(
                    ChatSession.id == session_id,
                    ChatSession.user_id == user_id,
                    ChatSession.model_id == model_id,
                )
                .first()
            )

            if session:
                return session

        # Create new session
        session = ChatSession(
            user_id=user_id, model_id=model_id, title=title or "New Chat"
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        return session

    def save_message(
        self,
        session_id: int,
        user_id: int,
        role: str,
        content: str,
        sources: Optional[List[Dict]] = None,
    ) -> ChatMessage:
        """Save a chat message"""
        message = ChatMessage(
            session_id=session_id,
            user_id=user_id,
            role=role,
            content=content,
            sources=sources,
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)

        return message

    def get_chat_history(self, session_id: int, limit: int = 10) -> List[ChatMessage]:
        """Get chat history for a session"""
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_user_sessions(
        self, user_id: int, model_id: Optional[int] = None, limit: int = 50
    ) -> List[ChatSession]:
        """Get user's chat sessions"""
        query = self.db.query(ChatSession).filter(ChatSession.user_id == user_id)

        if model_id:
            query = query.filter(ChatSession.model_id == model_id)

        return query.order_by(ChatSession.updated_at.desc()).limit(limit).all()

    def format_sources_for_response(self, chunks: List[Dict]) -> List[Dict]:
        """Format retrieved chunks as source citations"""
        sources = []
        for chunk in chunks:
            sources.append(
                {
                    "document_id": chunk["document_id"],
                    "document_name": chunk["document_name"],
                    "chunk_content": (
                        chunk["content"][:200] + "..."
                        if len(chunk["content"]) > 200
                        else chunk["content"]
                    ),
                    "page": chunk["metadata"].get("page"),
                    "similarity_score": round(chunk["similarity"], 3),
                }
            )
        return sources
