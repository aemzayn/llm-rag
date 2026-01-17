from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.dependencies import require_admin, get_current_user
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentUploadResponse
from app.services.document_service import DocumentProcessor
from app.services import model_service
from app.workers.tasks import process_document_task

router = APIRouter()


@router.post("/models/{model_id}/documents", response_model=DocumentUploadResponse)
async def upload_document(
    model_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Upload document to model (Admin only)"""
    # Verify model exists
    model = model_service.get_model(db, model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    # Save upload
    processor = DocumentProcessor(db)
    document = await processor.save_upload(file, model_id, current_user.id)

    # Queue processing task
    process_document_task.delay(document.id)

    return {
        "document_id": document.id,
        "filename": document.filename,
        "status": "uploaded",
        "message": "Document uploaded successfully. Processing in background."
    }


@router.get("/models/{model_id}/documents", response_model=List[DocumentResponse])
async def list_documents(
    model_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List documents in model"""
    # Verify model exists and user has access
    model = model_service.get_model(db, model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    if not model_service.check_user_access(db, model_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this model"
        )

    processor = DocumentProcessor(db)
    documents = processor.get_documents_by_model(model_id, skip, limit)
    return documents


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get document details"""
    processor = DocumentProcessor(db)
    document = processor.get_document(document_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Check model access
    if not model_service.check_user_access(db, document.model_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this document"
        )

    return document


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete document (Admin only)"""
    processor = DocumentProcessor(db)
    processor.delete_document(document_id)
    return None


@router.post("/documents/{document_id}/reprocess", response_model=DocumentUploadResponse)
async def reprocess_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Reprocess document (Admin only)"""
    processor = DocumentProcessor(db)
    document = processor.get_document(document_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Queue reprocessing task
    process_document_task.delay(document.id)

    return {
        "document_id": document.id,
        "filename": document.filename,
        "status": "reprocessing",
        "message": "Document reprocessing queued"
    }
