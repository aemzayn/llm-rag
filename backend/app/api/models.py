from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.dependencies import require_admin, get_current_user
from app.models.user import User
from app.schemas.model import (
    ModelCreate,
    ModelUpdate,
    ModelResponse,
    ModelWithAccessResponse,
    ModelUserAssignment,
)
from app.schemas.user import UserResponse
from app.services import model_service

router = APIRouter()


@router.post("", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    model_data: ModelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create new model (Admin only)"""
    # Check if model name already exists
    existing = (
        db.query(model_service.Model)
        .filter(model_service.Model.name == model_data.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Model name already exists"
        )

    model = model_service.create_model(
        db, model_data, current_user.__getattribute__("id")
    )

    # Add has_api_key flag
    response = ModelResponse.model_validate(model)
    response.has_api_key = bool(model.api_key_encrypted)
    return response


@router.get("", response_model=List[ModelResponse])
async def list_models(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List accessible models"""
    models = model_service.get_models(db, skip, limit, current_user)

    # Add has_api_key flag
    response = []
    for model in models:
        model_resp = ModelResponse.model_validate(model)
        model_resp.has_api_key = bool(model.api_key_encrypted)
        response.append(model_resp)

    return response


@router.get("/{model_id}", response_model=ModelWithAccessResponse)
async def get_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get model details"""
    model = model_service.get_model(db, model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Model not found"
        )

    # Check access
    if not model_service.check_user_access(db, model_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this model",
        )

    # Get counts
    user_count = (
        db.query(model_service.ModelUserAccess)
        .filter(model_service.ModelUserAccess.model_id == model_id)
        .count()
    )

    from app.models.document import Document

    document_count = db.query(Document).filter(Document.model_id == model_id).count()

    # Build response
    response = ModelWithAccessResponse.model_validate(model)
    response.has_api_key = bool(model.api_key_encrypted)
    response.user_count = user_count
    response.document_count = document_count

    return response


@router.patch("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: int,
    model_data: ModelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update model (Admin only)"""
    model = model_service.update_model(db, model_id, model_data)

    response = ModelResponse.model_validate(model)
    response.has_api_key = bool(model.api_key_encrypted)
    return response


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete model (Admin only)"""
    model_service.delete_model(db, model_id)
    return None


@router.post("/{model_id}/users", status_code=status.HTTP_200_OK)
async def assign_users_to_model(
    model_id: int,
    assignment: ModelUserAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Assign users to model (Admin only)"""
    model_service.assign_users_to_model(db, model_id, assignment.user_ids)
    return {"message": f"Assigned {len(assignment.user_ids)} users to model"}


@router.get("/{model_id}/users", response_model=List[UserResponse])
async def get_model_users(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get users with access to a model (Admin only)"""
    model = model_service.get_model(db, model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Model not found"
        )

    users = model_service.get_model_users(db, model_id)
    return users
