from fastapi import APIRouter, WebSocket

router = APIRouter()


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket):
    """WebSocket endpoint for chat"""
    await websocket.accept()
    # To be implemented
    await websocket.send_json({"message": "Chat WebSocket - to be implemented"})
    await websocket.close()


@router.get("/history")
async def get_chat_history():
    """Get chat history"""
    # To be implemented
    return {"message": "Chat history endpoint - to be implemented"}


@router.post("/upload")
async def upload_file_in_chat():
    """Upload file in chat (User can upload)"""
    # To be implemented
    return {"message": "Upload file in chat endpoint - to be implemented"}
