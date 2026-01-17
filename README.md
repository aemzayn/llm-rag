# LLM RAG Chatbot Application

A fullstack application for building AI chatbots with document embedding and RAG (Retrieval-Augmented Generation) capabilities.

## Features

- 🔐 **Authentication & Authorization**: Role-based access (Superadmin, Admin, User)
- 📚 **Document Management**: Upload PDFs and CSVs with automatic embedding
- 🤖 **Flexible LLM Support**: Local Ollama models + API-based providers (OpenAI, Anthropic, etc.)
- 💬 **RAG Chat**: Chat with your documents with source citations
- 👥 **Multi-tenant**: Group-based access to different model collections
- ⚡ **Real-time**: WebSocket for upload progress and streaming responses
- 📊 **Vector Search**: Powered by PostgreSQL + pgvector

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend**: FastAPI, Python 3.11+
- **Database**: PostgreSQL + pgvector
- **Cache/Queue**: Redis + Celery
- **Embeddings**: sentence-transformers
- **LLM**: Ollama (local) + API providers

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Development Setup

1. **Clone and setup**:
```bash
git clone <repository-url>
cd llm-rag
cp .env.example .env
# Edit .env with your configuration
```

2. **Start services**:
```bash
docker-compose up -d
```

3. **Access the application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

4. **Initial superadmin login**:
- Email: Set in SUPERADMIN_EMAIL (.env)
- Password: Set in SUPERADMIN_PASSWORD (.env)

## Project Structure

```
llm-rag/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/      # API routes
│   │   ├── core/     # Config, security
│   │   ├── models/   # Database models
│   │   ├── schemas/  # Pydantic schemas
│   │   ├── services/ # Business logic
│   │   └── workers/  # Celery tasks
│   └── alembic/      # DB migrations
├── frontend/         # Next.js frontend
│   └── src/
│       ├── app/      # App router
│       ├── components/
│       └── lib/
└── docker-compose.yml
```

## Configuration

Key environment variables (see `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `OLLAMA_BASE_URL`: Ollama API endpoint
- `KEEP_ORIGINAL_FILES`: Toggle file storage (true/false)
- `MAX_FILE_SIZE_MB`: Maximum upload size

## User Roles

- **Superadmin**: Full system access (created on first run)
- **Admin**: Create models, manage users, upload documents
- **User**: Access assigned models, chat, upload files in chat

## Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Deployment

Build and deploy using Docker:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Documentation

See [claude.md](claude.md) for detailed development progress and technical decisions.

## License

MIT
