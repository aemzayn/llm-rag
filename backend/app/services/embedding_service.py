from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Global embedding model (loaded once)
_embedding_model = None


def get_embedding_model() -> SentenceTransformer:
    """Get or initialize the embedding model"""
    global _embedding_model
    if _embedding_model is None:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _embedding_model = SentenceTransformer(
            settings.EMBEDDING_MODEL,
            device=settings.EMBEDDING_DEVICE
        )
        logger.info("Embedding model loaded successfully")
    return _embedding_model


def generate_embedding(text: str) -> List[float]:
    """Generate embedding for a single text"""
    model = get_embedding_model()
    embedding = model.encode(text, convert_to_numpy=True)
    return embedding.tolist()


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for multiple texts"""
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=True)
    return embeddings.tolist()


def similarity_search(
    query_embedding: List[float],
    candidate_embeddings: List[List[float]],
    top_k: int = 5
) -> List[tuple]:
    """
    Find most similar embeddings using cosine similarity

    Returns:
        List of (index, similarity_score) tuples
    """
    query = np.array(query_embedding)
    candidates = np.array(candidate_embeddings)

    # Normalize vectors
    query_norm = query / np.linalg.norm(query)
    candidates_norm = candidates / np.linalg.norm(candidates, axis=1, keepdims=True)

    # Calculate cosine similarity
    similarities = np.dot(candidates_norm, query_norm)

    # Get top k indices
    top_indices = np.argsort(similarities)[::-1][:top_k]

    return [(int(idx), float(similarities[idx])) for idx in top_indices]
