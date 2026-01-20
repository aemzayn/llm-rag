from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


# LLM provider constants
LLM_PROVIDER_OLLAMA = "ollama"
LLM_PROVIDER_OPENAI = "openai"
LLM_PROVIDER_ANTHROPIC = "anthropic"
LLM_PROVIDER_CUSTOM = "custom"

LLM_PROVIDERS = [LLM_PROVIDER_OLLAMA, LLM_PROVIDER_OPENAI, LLM_PROVIDER_ANTHROPIC, LLM_PROVIDER_CUSTOM]


class Model(Base):
    """Model (Collection) model - represents a chat model with its documents"""
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    llm_provider = Column(String, default=LLM_PROVIDER_OLLAMA, nullable=False)
    llm_model_name = Column(String, nullable=False)  # e.g., "llama2", "gpt-4", "claude-3-opus"
    api_key_encrypted = Column(Text)  # Encrypted API key for external providers
    api_base_url = Column(String)  # Custom base URL for API providers
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    creator = relationship("User", back_populates="created_models", foreign_keys=[created_by])
    user_access = relationship("ModelUserAccess", back_populates="model", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="model", cascade="all, delete-orphan")
    document_chunks = relationship("DocumentChunk", back_populates="model", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="model", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Model {self.name}>"


class ModelUserAccess(Base):
    """Many-to-many relationship between Models and Users for access control"""
    __tablename__ = "model_user_access"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    granted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    model = relationship("Model", back_populates="user_access")
    user = relationship("User", back_populates="model_access")

    def __repr__(self):
        return f"<ModelUserAccess model_id={self.model_id} user_id={self.user_id}>"
