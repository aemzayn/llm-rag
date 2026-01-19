from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema"""

    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    """Schema for creating a user"""

    password: str = Field(..., min_length=1)


class UserUpdate(BaseModel):
    """Schema for updating a user"""

    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user response"""

    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """Schema for user login"""

    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for token response"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token data"""

    user_id: Optional[int] = None
    email: Optional[str] = None
