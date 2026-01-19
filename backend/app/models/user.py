from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    """User role enum"""

    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    USER = "user"


class User(Base):
    """User model"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default=UserRole.USER.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    created_models = relationship(
        "Model", back_populates="creator", foreign_keys="Model.created_by"
    )
    model_access = relationship(
        "ModelUserAccess", back_populates="user", cascade="all, delete-orphan"
    )
    uploaded_documents = relationship("Document", back_populates="uploader")
    chat_sessions = relationship(
        "ChatSession", back_populates="user", cascade="all, delete-orphan"
    )
    chat_messages = relationship("ChatMessage", back_populates="user")

    def __repr__(self):
        return f"<User {self.email}>"
