# LLM RAG Chatbot - Development Log

## Project Overview

A fullstack LLM chatbot application with document embedding capabilities, user authentication, and role-based access control.

### Tech Stack
- **Frontend**: Next.js 14 (App Router, TypeScript)
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL + pgvector
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2)
- **Document Processing**: LangChain + Celery + Redis
- **Authentication**: NextAuth.js + JWT
- **Real-time**: WebSocket
- **Deployment**: Docker Compose

### Key Features
- **Authentication & Authorization**:
  - Superadmin (initial), Admin, Basic User roles
  - Users can sign up, admins promote to admin role
- **Models (Collections)**:
  - Admin creates models with LLM config + documents
  - Group-based access control
  - Flexible LLM providers (Ollama local + API-based with stored keys)
- **Document Management**:
  - Admin uploads PDFs/CSVs (up to 250MB, scalable to 1GB)
  - Background processing with real-time progress via WebSocket
  - Semantic chunking, stored in pgvector
  - Original files stored in Docker volume (toggleable)
- **Chat System**:
  - One active session per user, multiple users per model
  - RAG with source citations
  - Chat history per user
  - Users can upload files in chat

---

## Development Progress

### 2026-01-17

#### ✅ Task 1: Create project structure and initial documentation
**Status**: Completed

**What was done**:
- Created claude.md for tracking development progress
- Created .gitignore, README.md, and .env.example files
- Established project directory structure

**Files created**:
- [claude.md](claude.md)
- [README.md](README.md)
- [.gitignore](.gitignore)
- [.env.example](.env.example)

---

#### ✅ Task 2: Set up Docker Compose for development environment
**Status**: Completed

**What was done**:
- Created docker-compose.yml with all services:
  - PostgreSQL with pgvector extension
  - Redis for caching and Celery queue
  - Ollama for local LLM
  - FastAPI backend
  - Celery worker and beat
  - Next.js frontend
- Configured service dependencies and health checks
- Set up Docker volumes for data persistence

**Files created**:
- [docker-compose.yml](docker-compose.yml)

---

#### ✅ Task 3: Initialize backend (FastAPI) with project structure
**Status**: Completed

**What was done**:
- Created complete backend structure with FastAPI
- Configured SQLAlchemy database models:
  - User model with role-based access (superadmin, admin, user)
  - Model (collection) model with LLM provider configuration
  - Document and DocumentChunk models with pgvector support
  - ChatSession and ChatMessage models
- Set up security with JWT authentication and API key encryption
- Created configuration management with pydantic-settings
- Initialized API route stubs for all endpoints
- Created Celery worker configuration for background tasks
- Set up Alembic for database migrations

**Files created**:
- [backend/requirements.txt](backend/requirements.txt)
- [backend/Dockerfile](backend/Dockerfile)
- [backend/app/main.py](backend/app/main.py)
- [backend/app/core/config.py](backend/app/core/config.py)
- [backend/app/core/security.py](backend/app/core/security.py)
- [backend/app/core/database.py](backend/app/core/database.py)
- [backend/app/models/user.py](backend/app/models/user.py)
- [backend/app/models/model.py](backend/app/models/model.py)
- [backend/app/models/document.py](backend/app/models/document.py)
- [backend/app/models/chat.py](backend/app/models/chat.py)
- [backend/app/api/auth.py](backend/app/api/auth.py)
- [backend/app/api/users.py](backend/app/api/users.py)
- [backend/app/api/models.py](backend/app/api/models.py)
- [backend/app/api/documents.py](backend/app/api/documents.py)
- [backend/app/api/chat.py](backend/app/api/chat.py)
- [backend/app/schemas/user.py](backend/app/schemas/user.py)
- [backend/app/services/user_service.py](backend/app/services/user_service.py)
- [backend/app/workers/celery_app.py](backend/app/workers/celery_app.py)
- [backend/app/workers/tasks.py](backend/app/workers/tasks.py)
- [backend/alembic.ini](backend/alembic.ini)
- [backend/alembic/env.py](backend/alembic/env.py)
- [backend/alembic/script.py.mako](backend/alembic/script.py.mako)

**Key features implemented**:
- Database models with proper relationships
- pgvector integration for embeddings (384 dimensions)
- JWT authentication with access and refresh tokens
- API key encryption using Fernet
- Superadmin auto-initialization on startup
- Celery task structure for document processing

---

#### ✅ Task 4: Initialize frontend (Next.js) with project structure
**Status**: Completed

**What was done**:
- Created Next.js 14 project with App Router
- Set up TypeScript configuration
- Configured TailwindCSS for styling
- Created API client with axios and token management
- Set up TypeScript types for all entities
- Created basic homepage with login/signup links
- Configured environment variables

**Files created**:
- [frontend/package.json](frontend/package.json)
- [frontend/Dockerfile](frontend/Dockerfile)
- [frontend/tsconfig.json](frontend/tsconfig.json)
- [frontend/next.config.js](frontend/next.config.js)
- [frontend/tailwind.config.js](frontend/tailwind.config.js)
- [frontend/postcss.config.js](frontend/postcss.config.js)
- [frontend/.eslintrc.json](frontend/.eslintrc.json)
- [frontend/.env.local.example](frontend/.env.local.example)
- [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx)
- [frontend/src/app/page.tsx](frontend/src/app/page.tsx)
- [frontend/src/app/globals.css](frontend/src/app/globals.css)
- [frontend/src/lib/api.ts](frontend/src/lib/api.ts)
- [frontend/src/types/index.ts](frontend/src/types/index.ts)

**Key features implemented**:
- Axios interceptors for auth token management
- Automatic token refresh on 401 errors
- TypeScript interfaces for all data models
- Dark mode support in CSS
- API client configuration

---

**Next steps**:
- Implement authentication system (signup, login, JWT verification)
- Implement user management and authorization middleware
- Create model (collection) management endpoints
- Implement document upload and embedding pipeline
- Set up WebSocket for real-time communication
- Implement RAG chat system with citations

---

## Project Structure

```
llm-rag/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Configuration, security
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── workers/        # Celery tasks
│   │   └── main.py         # FastAPI app entry
│   ├── alembic/            # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities, API clients
│   │   ├── hooks/         # Custom hooks
│   │   └── types/         # TypeScript types
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml      # Development environment
├── .env.example           # Environment variables template
└── claude.md              # This file
```

---

## Environment Variables

### Backend (.env)
```
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/llmrag

# Redis
REDIS_URL=redis://redis:6379/0

# Security
SECRET_KEY=your-secret-key
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=changeme

# File Storage
KEEP_ORIGINAL_FILES=true
MAX_FILE_SIZE_MB=250

# Ollama
OLLAMA_BASE_URL=http://ollama:11434
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

---

## Database Schema (Planned)

### Tables
- **users**: id, email, hashed_password, full_name, role, is_active, created_at
- **models**: id, name, description, llm_provider, llm_model_name, api_key_encrypted, created_by, created_at
- **model_user_access**: model_id, user_id (many-to-many)
- **documents**: id, model_id, filename, file_path, file_size, status, uploaded_by, created_at
- **document_chunks**: id, document_id, model_id, content, embedding (vector), metadata, chunk_index
- **chat_sessions**: id, user_id, model_id, created_at, updated_at
- **chat_messages**: id, session_id, user_id, role (user/assistant), content, sources (jsonb), created_at

---

## API Endpoints (Planned)

### Authentication
- POST /api/auth/signup - User registration
- POST /api/auth/login - User login
- POST /api/auth/refresh - Refresh token
- GET /api/auth/me - Get current user

### Users (Admin only)
- GET /api/users - List users
- GET /api/users/{id} - Get user
- PATCH /api/users/{id} - Update user (promote to admin)
- DELETE /api/users/{id} - Delete user

### Models
- POST /api/models - Create model (Admin)
- GET /api/models - List accessible models
- GET /api/models/{id} - Get model details
- PATCH /api/models/{id} - Update model (Admin)
- DELETE /api/models/{id} - Delete model (Admin)
- POST /api/models/{id}/users - Assign users to model (Admin)

### Documents
- POST /api/models/{id}/documents - Upload document (Admin, WebSocket progress)
- GET /api/models/{id}/documents - List documents
- DELETE /api/documents/{id} - Delete document (Admin)

### Chat
- WS /api/chat/ws - WebSocket endpoint for chat
- GET /api/chat/history - Get chat history
- POST /api/chat/upload - Upload file in chat

---

## Notes & Decisions

- **Embedding Model**: Using sentence-transformers/all-MiniLM-L6-v2 (384 dimensions, fast, good quality)
- **Semantic Chunking**: Will use LangChain's SemanticChunker with sentence-transformers
- **API Key Storage**: Will encrypt LLM provider API keys using Fernet (cryptography library)
- **WebSocket**: Using FastAPI WebSocket for both upload progress and chat streaming
- **Celery**: For background document processing (parsing, chunking, embedding)
- **File Storage**: Configurable via KEEP_ORIGINAL_FILES env var

---

## Testing Strategy

- Backend: pytest with test database
- Frontend: Jest + React Testing Library
- E2E: Playwright (optional)
- Load testing: Locust for concurrent chat sessions

---

## Deployment Checklist

- [ ] Configure production environment variables
- [ ] Set up PostgreSQL with pgvector extension
- [ ] Set up Redis instance
- [ ] Set up Ollama or LLM provider
- [ ] Build Docker images
- [ ] Configure Docker volumes for file storage
- [ ] Set up reverse proxy (nginx)
- [ ] Configure SSL certificates
- [ ] Initialize superadmin user
- [ ] Run database migrations
- [ ] Test WebSocket connections
- [ ] Monitor resource usage

---

---

## Current Status

### ✅ Completed
- Project structure and documentation
- Docker Compose configuration with all services
- Backend FastAPI application with database models
- Frontend Next.js application with basic structure
- Database migration setup with Alembic
- Celery worker configuration

### 🚧 In Progress
- None currently

### ⏳ Pending
- Authentication system implementation
- User management and authorization
- Model (collection) management
- Document upload and embedding pipeline
- WebSocket for real-time communication
- RAG chat system with citations
- Admin dashboard UI
- User chat interface UI
- File upload in chat feature
- Testing and deployment documentation

---

*Last updated: 2026-01-17*
