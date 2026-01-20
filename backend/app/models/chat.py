from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base


# Message role constants
MESSAGE_ROLE_USER = "user"
MESSAGE_ROLE_ASSISTANT = "assistant"
MESSAGE_ROLE_SYSTEM = "system"

MESSAGE_ROLES = [MESSAGE_ROLE_USER, MESSAGE_ROLE_ASSISTANT, MESSAGE_ROLE_SYSTEM]


class ChatSession(Base):
    """Chat session model - one session per user per model"""

    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    model_id = Column(
        Integer, ForeignKey("models.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String)  # Optional session title
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    model = relationship("Model", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<ChatSession user_id={self.user_id} model_id={self.model_id}>"


class ChatMessage(Base):
    """Chat message model"""

    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    sources = Column(JSONB)  # JSON array of source citations with document info
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    user = relationship("User", back_populates="chat_messages")

    def __repr__(self):
        return f"<ChatMessage session_id={self.session_id} role={self.role}>"
