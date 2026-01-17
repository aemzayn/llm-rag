from fastapi import APIRouter

router = APIRouter()


@router.post("/models/{model_id}/documents")
async def upload_document(model_id: int):
    """Upload document to model (Admin only, WebSocket progress)"""
    # To be implemented
    return {"message": f"Upload document to model {model_id} endpoint - to be implemented"}


@router.get("/models/{model_id}/documents")
async def list_documents(model_id: int):
    """List documents in model"""
    # To be implemented
    return {"message": f"List documents for model {model_id} endpoint - to be implemented"}


@router.delete("/{document_id}")
async def delete_document(document_id: int):
    """Delete document (Admin only)"""
    # To be implemented
    return {"message": f"Delete document {document_id} endpoint - to be implemented"}
