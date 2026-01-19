from datetime import timezone
from fileinput import filename
import os
import json
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException, status
import aiofiles
from pypdf import PdfReader
import pandas as pd
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.core.config import settings
from app.services.embedding_service import generate_embeddings_batch
import logging

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Handle document processing: upload, parse, chunk, embed"""

    def __init__(self, db: Session):
        self.db = db
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", " ", ""],
        )

    async def save_upload(
        self, file: UploadFile, model_id: int, user_id: int
    ) -> Document:
        """Save uploaded file and create document record"""
        # Validate file size
        file_size = 0
        content = await file.read()
        file_size = len(content)

        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename must be provided",
            )

        max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
            )

        # Get file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in [".pdf", ".csv"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF and CSV files are supported",
            )

        # Create document record
        document = Document(
            model_id=model_id,
            filename=file.filename,
            file_size=file_size,
            file_type=file_ext.lstrip("."),
            status=DocumentStatus.UPLOADING,
            uploaded_by=user_id,
        )
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)

        # Save file if configured
        file_path = None
        if settings.KEEP_ORIGINAL_FILES:
            # Create upload directory
            upload_dir = Path(settings.UPLOAD_DIR) / str(model_id)
            upload_dir.mkdir(parents=True, exist_ok=True)

            # Save file
            file_path = upload_dir / f"{document.id}_{file.filename}"
            async with aiofiles.open(file_path, "wb") as f:
                await f.write(content)

            setattr(document, "file_path", str(file_path))
            self.db.commit()

        return document

    def parse_pdf(self, file_path: str) -> List[dict]:
        """Parse PDF and extract text with page numbers"""
        chunks = []
        try:
            reader = PdfReader(file_path)
            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text()
                if text.strip():
                    chunks.append(
                        {
                            "content": text,
                            "metadata": {"page": page_num, "source": "pdf"},
                        }
                    )
        except Exception as e:
            logger.error(f"Error parsing PDF: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to parse PDF: {str(e)}",
            )
        return chunks

    def parse_csv(self, file_path: str) -> List[dict]:
        """Parse CSV and convert to text chunks"""
        chunks = []
        try:
            df = pd.read_csv(file_path)

            # Convert each row to text
            idx = 0
            for _, row in df.iterrows():
                text_parts = []
                for col, value in row.items():
                    text_parts.append(f"{col}: {value}")
                text = " | ".join(text_parts)

                chunks.append(
                    {
                        "content": text,
                        "metadata": {"row": int(idx) + 1, "source": "csv"},
                    }
                )
                idx += 1

        except Exception as e:
            logger.error(f"Error parsing CSV: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to parse CSV: {str(e)}",
            )
        return chunks

    def chunk_text(self, text_chunks: List[dict]) -> List[dict]:
        """Split text into smaller semantic chunks"""
        all_chunks = []

        for item in text_chunks:
            text = item["content"]
            meta = item["metadata"]

            # Split text
            splits = self.text_splitter.split_text(text)

            for split in splits:
                all_chunks.append({"content": split, "meta": meta})

        return all_chunks

    async def process_document(self, document_id: int) -> None:
        """Process document: parse, chunk, embed, and store"""
        document = self.db.query(Document).filter(Document.id == document_id).first()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
            )

        try:
            # Update status
            document.__setattr__("status", DocumentStatus.PROCESSING)
            self.db.commit()
            file_type = document.__getattribute__("file_type")
            file_path = document.__getattribute__("file_path")
            if not file_path or not os.path.exists(file_path):
                raise ValueError("Document file not found on server")

            # Parse document
            if file_type == "pdf":
                parsed_chunks = self.parse_pdf(file_path)
            elif file_type == "csv":
                parsed_chunks = self.parse_csv(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
            # Chunk text
            chunks = self.chunk_text(parsed_chunks)

            if not chunks:
                raise ValueError("No content extracted from document")

            # Generate embeddings
            texts = [chunk["content"] for chunk in chunks]
            embeddings = generate_embeddings_batch(texts)

            # Delete old chunks if re-embedding
            self.db.query(DocumentChunk).filter(
                DocumentChunk.document_id == document_id
            ).delete()

            # Store chunks with embeddings
            for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                doc_chunk = DocumentChunk(
                    document_id=document_id,
                    model_id=document.model_id,
                    content=chunk["content"],
                    embedding=embedding,
                    metadata=json.dumps(chunk["metadata"]),
                    chunk_index=idx,
                )
                self.db.add(doc_chunk)

            # Update document status
            document.__setattr__("status", DocumentStatus.COMPLETED)
            from datetime import datetime

            document.__setattr__("processed_at", datetime.now(timezone.utc))
            self.db.commit()

            logger.info(
                f"Document {document_id} processed successfully: {len(chunks)} chunks"
            )

        except Exception as e:
            logger.error(f"Error processing document {document_id}: {e}")
            document.__setattr__("status", DocumentStatus.FAILED)
            document.__setattr__("error_message", str(e))
            self.db.commit()
            raise

    def get_document(self, document_id: int) -> Optional[Document]:
        """Get document by ID"""
        return self.db.query(Document).filter(Document.id == document_id).first()

    def get_documents_by_model(
        self, model_id: int, skip: int = 0, limit: int = 100
    ) -> List[Document]:
        """Get all documents for a model"""
        return (
            self.db.query(Document)
            .filter(Document.model_id == model_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def delete_document(self, document_id: int) -> None:
        """Delete document and its chunks"""
        document = self.get_document(document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
            )

        file_path = document.__getattribute__("file_path")

        # Delete file if it exists
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        # Delete document (chunks will be cascaded)
        self.db.delete(document)
        self.db.commit()
