from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.model import Model, ModelUserAccess
from app.models.user import User, UserRole
from app.schemas.model import ModelCreate, ModelUpdate
from app.core.security import api_key_encryption
from fastapi import HTTPException, status


def create_model(db: Session, model_data: ModelCreate, creator_id: int) -> Model:
    """Create a new model"""
    # Encrypt API key if provided
    api_key_encrypted = None
    if model_data.api_key:
        api_key_encrypted = api_key_encryption.encrypt(model_data.api_key)

    # Create model
    new_model = Model(
        name=model_data.name,
        description=model_data.description,
        llm_provider=model_data.llm_provider,
        llm_model_name=model_data.llm_model_name,
        api_key_encrypted=api_key_encrypted,
        api_base_url=model_data.api_base_url,
        created_by=creator_id
    )

    db.add(new_model)
    db.commit()
    db.refresh(new_model)

    # Assign users if provided
    if model_data.user_ids:
        assign_users_to_model(db, new_model.id, model_data.user_ids)

    return new_model


def get_model(db: Session, model_id: int) -> Optional[Model]:
    """Get model by ID"""
    return db.query(Model).filter(Model.id == model_id).first()


def get_models(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    user: Optional[User] = None
) -> List[Model]:
    """Get all models, optionally filtered by user access"""
    query = db.query(Model)

    # If user is not admin, filter by access
    if user and user.role not in [UserRole.ADMIN, UserRole.SUPERADMIN]:
        query = query.join(ModelUserAccess).filter(
            ModelUserAccess.user_id == user.id
        )

    return query.offset(skip).limit(limit).all()


def update_model(
    db: Session,
    model_id: int,
    model_data: ModelUpdate
) -> Model:
    """Update a model"""
    model = get_model(db, model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    # Update fields
    if model_data.name is not None:
        model.name = model_data.name
    if model_data.description is not None:
        model.description = model_data.description
    if model_data.llm_provider is not None:
        model.llm_provider = model_data.llm_provider
    if model_data.llm_model_name is not None:
        model.llm_model_name = model_data.llm_model_name
    if model_data.api_base_url is not None:
        model.api_base_url = model_data.api_base_url
    if model_data.api_key is not None:
        # Encrypt new API key
        model.api_key_encrypted = api_key_encryption.encrypt(model_data.api_key)

    db.commit()
    db.refresh(model)
    return model


def delete_model(db: Session, model_id: int) -> None:
    """Delete a model"""
    model = get_model(db, model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    db.delete(model)
    db.commit()


def assign_users_to_model(
    db: Session,
    model_id: int,
    user_ids: List[int]
) -> None:
    """Assign users to a model (replaces existing assignments)"""
    model = get_model(db, model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    # Verify all users exist
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    if len(users) != len(user_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more user IDs are invalid"
        )

    # Remove existing assignments
    db.query(ModelUserAccess).filter(
        ModelUserAccess.model_id == model_id
    ).delete()

    # Add new assignments
    for user_id in user_ids:
        access = ModelUserAccess(model_id=model_id, user_id=user_id)
        db.add(access)

    db.commit()


def check_user_access(db: Session, model_id: int, user: User) -> bool:
    """Check if user has access to a model"""
    # Admins have access to all models
    if user.role in [UserRole.ADMIN, UserRole.SUPERADMIN]:
        return True

    # Check if user has explicit access
    access = db.query(ModelUserAccess).filter(
        ModelUserAccess.model_id == model_id,
        ModelUserAccess.user_id == user.id
    ).first()

    return access is not None


def get_model_users(db: Session, model_id: int) -> List[User]:
    """Get all users with access to a model"""
    return db.query(User).join(ModelUserAccess).filter(
        ModelUserAccess.model_id == model_id
    ).all()


def get_decrypted_api_key(db: Session, model_id: int) -> Optional[str]:
    """Get decrypted API key for a model (admin only)"""
    model = get_model(db, model_id)
    if not model or not model.api_key_encrypted:
        return None

    return api_key_encryption.decrypt(model.api_key_encrypted)
