from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from app.core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()

    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()

    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])

    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode JWT token"""
    try:
        print(f"Decoding token: {token}")  # Debugging line
        print(f"secret key: {settings.SECRET_KEY}")  # Debugging line
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError as e:
        print(f"JWTError: {e}")  # Debugging line
        return None


# API Key Encryption
class APIKeyEncryption:
    """Encrypt and decrypt API keys for storage"""

    def __init__(self):
        if settings.ENCRYPTION_KEY:
            self.cipher = Fernet(settings.ENCRYPTION_KEY.encode())
        else:
            # Generate a key if not provided (for development)
            self.cipher = Fernet(Fernet.generate_key())

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a string"""
        if not plaintext:
            return ""
        return self.cipher.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a string"""
        if not ciphertext:
            return ""
        return self.cipher.decrypt(ciphertext.encode()).decode()


api_key_encryption = APIKeyEncryption()
