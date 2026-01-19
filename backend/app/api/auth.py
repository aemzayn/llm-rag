from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.dependencies import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse

router = APIRouter()


@router.post(
    "/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """User signup endpoint"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)

    print(f"hashed password: {hashed_password}")  # Debugging line

    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role=UserRole.USER.lower(),  # Default role
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """User login endpoint"""
    # Find user by email
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    print(f"user password: {user_data.password}")  # Debugging line
    print(
        f"stored hashed password: {user.__getattribute__('hashed_password')}"
    )  # Debugging line

    provided_password = user_data.password
    hashed_password = user.__getattribute__("hashed_password") if user else None
    valid = (
        verify_password(provided_password, hashed_password)
        if hashed_password
        else False
    )
    print(f"hashed_password variable: {hashed_password}")  # Debugging line
    print(f"Password valid: {valid}")  # Debugging line
    # Verify credentials
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.__getattribute__("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
        )

    # Create tokens
    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token(data={"sub": user.id, "email": user.email})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    payload = decode_token(refresh_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    # Check token type
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    # Verify user exists and is active
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.__getattribute__("is_active"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Create new tokens
    new_access_token = create_access_token(data={"sub": user.id, "email": user.email})
    new_refresh_token = create_refresh_token(data={"sub": user.id, "email": user.email})

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user
