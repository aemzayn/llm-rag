from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.chat import MessageRole


class ChatMessageSource(BaseModel):
    """Source citation for a chat message"""
    document_id: int
    document_name: str
    chunk_content: str
    page: Optional[int] = None
    similarity_score: float


class ChatMessageCreate(BaseModel):
    """Schema for creating a chat message"""
    content: str


class ChatMessageResponse(BaseModel):
    """Schema for chat message response"""
    id: int
    session_id: int
    user_id: int
    role: MessageRole
    content: str
    sources: Optional[List[ChatMessageSource]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    """Schema for creating a chat session"""
    model_id: int
    title: Optional[str] = None


class ChatSessionResponse(BaseModel):
    """Schema for chat session response"""
    id: int
    user_id: int
    model_id: int
    title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    """Schema for chat request"""
    message: str
    session_id: Optional[int] = None
    model_id: int
    top_k: int = 5  # Number of relevant chunks to retrieve
    include_sources: bool = True


class ChatResponse(BaseModel):
    """Schema for chat response"""
    session_id: int
    message: ChatMessageResponse
    sources: Optional[List[ChatMessageSource]] = None
