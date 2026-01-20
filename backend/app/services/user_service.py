from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.core.config import settings
from app.models.user import User, USER_ROLE_SUPERADMIN
import logging

logger = logging.getLogger(__name__)


def create_superadmin():
    """Create initial superadmin user if it doesn't exist"""
    db = SessionLocal()
    try:
        # Check if superadmin exists
        superadmin = db.query(User).filter(
            User.email == settings.SUPERADMIN_EMAIL
        ).first()

        if not superadmin:
            # Create superadmin
            superadmin = User(
                email=settings.SUPERADMIN_EMAIL,
                hashed_password=get_password_hash(settings.SUPERADMIN_PASSWORD),
                full_name=settings.SUPERADMIN_NAME,
                role=USER_ROLE_SUPERADMIN,
                is_active=True
            )
            db.add(superadmin)
            db.commit()
            logger.info(f"Superadmin created: {settings.SUPERADMIN_EMAIL}")
        else:
            logger.info("Superadmin already exists")
    except Exception as e:
        logger.error(f"Error creating superadmin: {e}")
        db.rollback()
    finally:
        db.close()
