from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

# Type alias for document status
DocumentStatusType = Literal["uploading", "processing", "completed", "failed"]


class DocumentBase(BaseModel):
    """Base document schema"""

    filename: str
    file_size: int
    file_type: str


class DocumentResponse(DocumentBase):
    """Schema for document response"""

    id: int
    model_id: int
    status: str
    error_message: Optional[str] = None
    uploaded_by: int
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    """Schema for document upload response"""

    document_id: int
    filename: str
    status: str
    message: str


class DocumentChunkResponse(BaseModel):
    """Schema for document chunk response"""

    id: int
    document_id: int
    content: str
    metadata: Optional[str] = None
    chunk_index: int

    class Config:
        from_attributes = True
