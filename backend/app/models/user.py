from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


# User role constants
USER_ROLE_SUPERADMIN = "superadmin"
USER_ROLE_ADMIN = "admin"
USER_ROLE_USER = "user"

USER_ROLES = [USER_ROLE_SUPERADMIN, USER_ROLE_ADMIN, USER_ROLE_USER]


class User(Base):
    """User model"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default=USER_ROLE_USER, nullable=False)
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
