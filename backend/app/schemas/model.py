from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

# Type alias for LLM providers
LLMProviderType = Literal["ollama", "openai", "anthropic", "custom"]


class ModelBase(BaseModel):
    """Base model schema"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    llm_provider: LLMProviderType
    llm_model_name: str = Field(..., min_length=1)
    api_base_url: Optional[str] = None


class ModelCreate(ModelBase):
    """Schema for creating a model"""
    api_key: Optional[str] = None  # Plaintext, will be encrypted
    user_ids: Optional[List[int]] = []  # Users to grant access


class ModelUpdate(BaseModel):
    """Schema for updating a model"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    llm_provider: Optional[LLMProviderType] = None
    llm_model_name: Optional[str] = None
    api_key: Optional[str] = None  # Plaintext, will be encrypted
    api_base_url: Optional[str] = None


class ModelResponse(ModelBase):
    """Schema for model response"""
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    has_api_key: bool = False  # Don't expose actual API key

    class Config:
        from_attributes = True


class ModelWithAccessResponse(ModelResponse):
    """Schema for model with access information"""
    user_count: int = 0
    document_count: int = 0


class ModelUserAssignment(BaseModel):
    """Schema for assigning users to model"""
    user_ids: List[int]
