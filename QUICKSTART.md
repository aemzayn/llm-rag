# Quick Start Guide

This guide will help you get the LLM RAG Chatbot up and running quickly.

## Prerequisites

- Docker and Docker Compose installed
- At least 8GB RAM available
- 20GB free disk space

## Step 1: Clone and Setup

```bash
cd /Users/ahmad/Desktop/SelfProject/llm-rag
```

## Step 2: Generate Secret Keys

```bash
cd backend
python3 generate_keys.py
```

Copy the generated keys for the next step.

## Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and update these important values:

```env
# Generated keys from step 2
SECRET_KEY=<your-generated-secret-key>
ENCRYPTION_KEY=<your-generated-encryption-key>

# Superadmin credentials (change these!)
SUPERADMIN_EMAIL=admin@yourdomain.com
SUPERADMIN_PASSWORD=YourSecurePassword123

# Database credentials (optional, defaults are fine for development)
POSTGRES_USER=llmrag_user
POSTGRES_PASSWORD=llmrag_password
POSTGRES_DB=llmrag_db
```

For frontend, create `.env.local`:

```bash
cd frontend
cp .env.local.example .env.local
```

The defaults should work for local development.

## Step 4: Start Services

```bash
# From the root directory
docker-compose up -d
```

This will start:
- PostgreSQL with pgvector (port 5432)
- Redis (port 6379)
- Ollama (port 11434)
- FastAPI Backend (port 8000)
- Celery Worker
- Next.js Frontend (port 3000)

## Step 5: Initialize Database

The database tables will be created automatically on first startup.

If you want to use Alembic migrations instead:

```bash
docker-compose exec backend alembic upgrade head
```

## Step 6: Download Ollama Model (Optional)

To use local LLM with Ollama:

```bash
docker-compose exec ollama ollama pull llama2
# or another model like:
# docker-compose exec ollama ollama pull mistral
```

## Step 7: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Step 8: Login

1. Go to http://localhost:3000
2. Click "Sign Up" to create a new user account
3. After signup, login with your credentials

The superadmin account is automatically created with:
- Email: (from SUPERADMIN_EMAIL in .env)
- Password: (from SUPERADMIN_PASSWORD in .env)

## Verify Installation

Check service health:

```bash
# Check all services are running
docker-compose ps

# Check backend health
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000

# View backend logs
docker-compose logs backend

# View frontend logs
docker-compose logs frontend
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Rebuild if needed
docker-compose down
docker-compose up --build
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Connect to PostgreSQL
docker-compose exec postgres psql -U llmrag_user -d llmrag_db
```

### Frontend can't connect to backend
- Make sure both services are running
- Check NEXT_PUBLIC_API_URL in frontend/.env.local
- Check CORS settings in backend/app/core/config.py

### Ollama model download fails
```bash
# Check Ollama service
docker-compose logs ollama

# List downloaded models
docker-compose exec ollama ollama list

# Pull model manually
docker-compose exec ollama ollama pull llama2
```

## Next Steps

1. **Create a Model** (Admin): Go to dashboard and create your first AI model
2. **Upload Documents** (Admin): Add PDFs or CSVs to your model
3. **Start Chatting**: Select a model and start asking questions!

## Stopping Services

```bash
# Stop services (keeps data)
docker-compose stop

# Stop and remove containers (keeps data in volumes)
docker-compose down

# Remove everything including volumes (WARNING: deletes all data)
docker-compose down -v
```

## Development Mode

For development with hot reload:

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Celery Worker
```bash
cd backend
celery -A app.workers.celery_app worker --loglevel=info
```

## Additional Configuration

### File Upload Limits

Edit `.env`:
```env
MAX_FILE_SIZE_MB=250  # Increase if needed
KEEP_ORIGINAL_FILES=true  # Set to false to save disk space
```

### Add LLM Provider API Keys

After creating a model in the dashboard, you can configure API keys for:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Other custom providers

Keys are encrypted before storage.

## Support

For issues, check:
1. [README.md](README.md) - Full documentation
2. [claude.md](claude.md) - Development log
3. Docker logs: `docker-compose logs <service-name>`
4. Backend logs in the container
5. Frontend console in browser DevTools

## Security Notes

**For Production Deployment:**
- Change all default passwords
- Use strong SECRET_KEY and ENCRYPTION_KEY
- Set up HTTPS/SSL
- Configure firewall rules
- Use production database with backups
- Set DEBUG=False
- Review CORS_ORIGINS settings
