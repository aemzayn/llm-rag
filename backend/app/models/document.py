from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    BigInteger,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.core.database import Base
from app.core.config import settings


# Document status constants
DOCUMENT_STATUS_UPLOADING = "uploading"
DOCUMENT_STATUS_PROCESSING = "processing"
DOCUMENT_STATUS_COMPLETED = "completed"
DOCUMENT_STATUS_FAILED = "failed"

DOCUMENT_STATUSES = [DOCUMENT_STATUS_UPLOADING, DOCUMENT_STATUS_PROCESSING, DOCUMENT_STATUS_COMPLETED, DOCUMENT_STATUS_FAILED]


class Document(Base):
    """Document model"""

    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(
        Integer, ForeignKey("models.id", ondelete="CASCADE"), nullable=False
    )
    filename = Column(String, nullable=False)
    file_path = Column(String)  # Path to original file (if KEEP_ORIGINAL_FILES=true)
    file_size = Column(BigInteger, nullable=False)  # in bytes
    file_type = Column(String, nullable=False)  # pdf, csv, etc.
    status = Column(String, default=DOCUMENT_STATUS_UPLOADING, nullable=False)
    error_message = Column(Text)  # Error details if status=FAILED
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    processed_at = Column(DateTime(timezone=True))  # When processing completed

    # Relationships
    model = relationship("Model", back_populates="documents")
    uploader = relationship("User", back_populates="uploaded_documents")
    chunks = relationship(
        "DocumentChunk", back_populates="document", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Document {self.filename}>"


class DocumentChunk(Base):
    """Document chunk with embeddings for vector search"""

    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    model_id = Column(
        Integer, ForeignKey("models.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content = Column(Text, nullable=False)
    embedding = Column(
        Vector(settings.EMBEDDING_DIMENSION)
    )  # Vector column for pgvector
    meta = Column(
        "metadata", Text, nullable=True
    )  # JSON string with additional metadata (page number, etc.)
    chunk_index = Column(Integer, nullable=False)  # Order of chunk in document
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    document = relationship("Document", back_populates="chunks")
    model = relationship("Model", back_populates="document_chunks")

    def __repr__(self):
        return f"<DocumentChunk doc_id={self.document_id} index={self.chunk_index}>"
