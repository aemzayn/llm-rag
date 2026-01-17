from typing import Optional, AsyncGenerator
from app.models.model import Model, LLMProvider
from app.core.security import api_key_encryption
from app.core.config import settings
import httpx
import json
import logging

logger = logging.getLogger(__name__)


class LLMService:
    """Service for interacting with different LLM providers"""

    def __init__(self, model: Model):
        self.model = model
        self.provider = model.llm_provider
        self.model_name = model.llm_model_name

        # Decrypt API key if available
        self.api_key = None
        if model.api_key_encrypted:
            self.api_key = api_key_encryption.decrypt(model.api_key_encrypted)

        self.base_url = model.api_base_url

    async def generate_response(self, prompt: str) -> str:
        """Generate a non-streaming response from the LLM"""
        if self.provider == LLMProvider.OLLAMA:
            return await self._generate_ollama(prompt)
        elif self.provider == LLMProvider.OPENAI:
            return await self._generate_openai(prompt)
        elif self.provider == LLMProvider.ANTHROPIC:
            return await self._generate_anthropic(prompt)
        else:
            return await self._generate_custom(prompt)

    async def generate_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Generate a streaming response from the LLM"""
        if self.provider == LLMProvider.OLLAMA:
            async for chunk in self._stream_ollama(prompt):
                yield chunk
        elif self.provider == LLMProvider.OPENAI:
            async for chunk in self._stream_openai(prompt):
                yield chunk
        elif self.provider == LLMProvider.ANTHROPIC:
            async for chunk in self._stream_anthropic(prompt):
                yield chunk
        else:
            async for chunk in self._stream_custom(prompt):
                yield chunk

    # Ollama implementation
    async def _generate_ollama(self, prompt: str) -> str:
        """Generate response from Ollama"""
        base_url = self.base_url or settings.OLLAMA_BASE_URL
        url = f"{base_url}/api/generate"

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                url,
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False
                }
            )
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")

    async def _stream_ollama(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream response from Ollama"""
        base_url = self.base_url or settings.OLLAMA_BASE_URL
        url = f"{base_url}/api/generate"

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                url,
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": True
                }
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if "response" in data:
                                yield data["response"]
                        except json.JSONDecodeError:
                            continue

    # OpenAI implementation
    async def _generate_openai(self, prompt: str) -> str:
        """Generate response from OpenAI"""
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        base_url = self.base_url or "https://api.openai.com/v1"
        url = f"{base_url}/chat/completions"

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False
                }
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]

    async def _stream_openai(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream response from OpenAI"""
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        base_url = self.base_url or "https://api.openai.com/v1"
        url = f"{base_url}/chat/completions"

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": True
                }
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                        except json.JSONDecodeError:
                            continue

    # Anthropic implementation
    async def _generate_anthropic(self, prompt: str) -> str:
        """Generate response from Anthropic Claude"""
        if not self.api_key:
            raise ValueError("Anthropic API key not configured")

        base_url = self.base_url or "https://api.anthropic.com"
        url = f"{base_url}/v1/messages"

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                url,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 4096,
                    "stream": False
                }
            )
            response.raise_for_status()
            result = response.json()
            return result["content"][0]["text"]

    async def _stream_anthropic(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream response from Anthropic Claude"""
        if not self.api_key:
            raise ValueError("Anthropic API key not configured")

        base_url = self.base_url or "https://api.anthropic.com"
        url = f"{base_url}/v1/messages"

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                url,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 4096,
                    "stream": True
                }
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        try:
                            data = json.loads(data_str)
                            if data.get("type") == "content_block_delta":
                                if "delta" in data and "text" in data["delta"]:
                                    yield data["delta"]["text"]
                        except json.JSONDecodeError:
                            continue

    # Custom implementation (fallback to Ollama-style)
    async def _generate_custom(self, prompt: str) -> str:
        """Generate response from custom provider"""
        return await self._generate_ollama(prompt)

    async def _stream_custom(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream response from custom provider"""
        async for chunk in self._stream_ollama(prompt):
            yield chunk
