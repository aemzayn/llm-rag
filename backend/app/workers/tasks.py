from celery import Task
from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.document_service import DocumentProcessor
from app.models.document import DocumentStatus
import logging
import asyncio

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def process_document_task(self: Task, document_id: int):
    """
    Process uploaded document: parse, chunk, embed, and store in vector DB

    Args:
        document_id: ID of the document to process
    """
    logger.info(f"Starting document processing for document {document_id}")
    db = SessionLocal()

    try:
        processor = DocumentProcessor(db)

        # Run async processing in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(processor.process_document(document_id))
        loop.close()

        logger.info(f"Document {document_id} processed successfully")
        return {
            "status": "success",
            "document_id": document_id,
            "message": "Document processed successfully"
        }

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}")

        # Update document status to failed
        from app.models.document import Document
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.status = DocumentStatus.FAILED
            document.error_message = str(e)
            db.commit()

        # Retry on failure
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()
