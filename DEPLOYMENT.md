# LLM RAG Chatbot - Deployment Guide

This guide covers deploying the LLM RAG Chatbot application to production using Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Security Configuration](#security-configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Backup and Recovery](#backup-and-recovery)

---

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+) or macOS
- **CPU**: Minimum 4 cores (8+ recommended for production)
- **RAM**: Minimum 8GB (16GB+ recommended for production)
- **Storage**: Minimum 50GB free space (SSD recommended)
- **Network**: Stable internet connection for Docker images and LLM providers

### Required Software

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository
- **PostgreSQL**: 14+ with pgvector extension (included in Docker setup)
- **Python**: 3.11+ (for local development)
- **Node.js**: 18+ (for local development)

### Installation Commands

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose git

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (logout/login required)
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version
```

---

## Architecture Overview

### Services

The application consists of 7 Docker services:

1. **postgres**: PostgreSQL 14 with pgvector extension (vector database)
2. **redis**: Redis 7 (cache and message broker)
3. **ollama**: Ollama server (local LLM runtime)
4. **backend**: FastAPI application (Python API server)
5. **celery**: Celery worker (background task processing)
6. **celery-beat**: Celery beat (scheduled tasks)
7. **frontend**: Next.js application (React UI)

### Network Architecture

```
Internet
   |
   v
[Reverse Proxy/Load Balancer] (nginx/Traefik - optional)
   |
   +-- [Frontend:3000] (Next.js)
   |
   +-- [Backend:8000] (FastAPI)
        |
        +-- [PostgreSQL:5432] (Database)
        +-- [Redis:6379] (Cache/Queue)
        +-- [Ollama:11434] (LLM)
        +-- [Celery Workers] (Background tasks)
```

### Data Flow

1. **User Authentication**: Frontend → Backend → PostgreSQL
2. **Chat Request**: Frontend → Backend (WebSocket) → RAG Service → pgvector → LLM → Response
3. **File Upload**: Frontend → Backend → Celery → Document Processor → Embeddings → pgvector
4. **Admin Operations**: Frontend → Backend → PostgreSQL/Redis

---

## Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/llm-rag.git
cd llm-rag
```

### 2. Generate Security Keys

```bash
cd backend
python generate_keys.py
```

This will output:
- `SECRET_KEY`: For JWT tokens
- `ENCRYPTION_KEY`: For API key encryption

Save these keys securely.

### 3. Configure Environment Variables

Create `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://llmrag:changeme@postgres:5432/llmrag

# Redis
REDIS_URL=redis://redis:6379/0

# Security (use keys from generate_keys.py)
SECRET_KEY=your-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Superadmin Account
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=changeme123
SUPERADMIN_NAME=Super Admin

# File Storage
KEEP_ORIGINAL_FILES=true
MAX_FILE_SIZE_MB=250
UPLOAD_DIR=/app/uploads

# Embedding Configuration
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384
EMBEDDING_DEVICE=cpu
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Ollama
OLLAMA_BASE_URL=http://ollama:11434

# CORS (adjust for production)
BACKEND_CORS_ORIGINS=http://localhost:3000,http://frontend:3000
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### 4. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 5. Initialize Database

```bash
# Run database migrations
docker-compose exec backend alembic upgrade head

# Verify superadmin was created
docker-compose logs backend | grep -i superadmin
```

### 6. Download Ollama Model

```bash
# Download llama2 model (3.8GB)
docker-compose exec ollama ollama pull llama2

# Or mistral (4.1GB)
docker-compose exec ollama ollama pull mistral

# List downloaded models
docker-compose exec ollama ollama list
```

### 7. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Ollama**: http://localhost:11434

**Default Login**:
- Email: admin@example.com
- Password: changeme123

---

## Production Deployment

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx

# Configure firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Clone and Configure

```bash
# Clone repository
git clone https://github.com/yourusername/llm-rag.git /opt/llm-rag
cd /opt/llm-rag

# Generate production keys
cd backend
python3 generate_keys.py > /root/llm-rag-keys.txt
chmod 600 /root/llm-rag-keys.txt
```

### 3. Production Environment Variables

Create `.env` with production values:

```env
# Database
DATABASE_URL=postgresql://llmrag:STRONG_PASSWORD_HERE@postgres:5432/llmrag

# Redis
REDIS_URL=redis://:REDIS_PASSWORD_HERE@redis:6379/0

# Security
SECRET_KEY=production-secret-key-from-generate_keys
ENCRYPTION_KEY=production-encryption-key-from-generate_keys
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Superadmin
SUPERADMIN_EMAIL=admin@yourdomain.com
SUPERADMIN_PASSWORD=very-strong-password-here
SUPERADMIN_NAME=System Administrator

# File Storage
KEEP_ORIGINAL_FILES=false  # Set to false to save disk space
MAX_FILE_SIZE_MB=250
UPLOAD_DIR=/app/uploads

# Embedding
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384
EMBEDDING_DEVICE=cpu
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Ollama
OLLAMA_BASE_URL=http://ollama:11434

# CORS (use your domain)
BACKEND_CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

### 4. Docker Compose Production Override

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    restart: always
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-changeme}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command: postgres -c shared_preload_libraries=vector -c max_connections=200

  redis:
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD:-changeme} --maxmemory 512mb --maxmemory-policy allkeys-lru

  backend:
    restart: always
    environment:
      - WORKERS=4
      - LOG_LEVEL=warning
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

  celery:
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 4G

  frontend:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  ollama:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  ollama_data:
    driver: local
```

### 5. Start Production Services

```bash
# Build and start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f backend frontend

# Verify all services are running
docker-compose ps
```

### 6. Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/llm-rag`:

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 250M;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

Enable site and restart nginx:

```bash
sudo ln -s /etc/nginx/sites-available/llm-rag /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Configure SSL with Let's Encrypt

```bash
# Obtain SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 8. Initialize Database

```bash
cd /opt/llm-rag

# Run migrations
docker-compose exec backend alembic upgrade head

# Verify superadmin created
docker-compose exec backend python -c "from app.core.database import SessionLocal; from app.models.user import User; db = SessionLocal(); print(db.query(User).filter(User.role=='superadmin').first().email)"
```

### 9. Download LLM Models

```bash
# Download recommended models
docker-compose exec ollama ollama pull llama2
docker-compose exec ollama ollama pull mistral
docker-compose exec ollama ollama pull codellama

# Verify models
docker-compose exec ollama ollama list
```

---

## Environment Variables

### Backend Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `REDIS_URL` | Redis connection string | `redis://redis:6379/0` | Yes |
| `SECRET_KEY` | JWT signing key | Generated by `generate_keys.py` | Yes |
| `ENCRYPTION_KEY` | Fernet encryption key | Generated by `generate_keys.py` | Yes |
| `SUPERADMIN_EMAIL` | Initial superadmin email | `admin@example.com` | Yes |
| `SUPERADMIN_PASSWORD` | Initial superadmin password | `changeme123` | Yes |

### Backend Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | `7` |
| `KEEP_ORIGINAL_FILES` | Store original uploaded files | `true` |
| `MAX_FILE_SIZE_MB` | Maximum upload size | `250` |
| `EMBEDDING_MODEL` | Sentence transformer model | `sentence-transformers/all-MiniLM-L6-v2` |
| `EMBEDDING_DIMENSION` | Embedding vector size | `384` |
| `CHUNK_SIZE` | Text chunk size in chars | `1000` |
| `CHUNK_OVERLAP` | Chunk overlap in chars | `200` |
| `OLLAMA_BASE_URL` | Ollama API endpoint | `http://ollama:11434` |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:8000` |

---

## Database Setup

### PostgreSQL Configuration

The application uses PostgreSQL 14 with the pgvector extension for vector similarity search.

#### Initial Setup

```bash
# Connect to database
docker-compose exec postgres psql -U llmrag -d llmrag

# Verify pgvector extension
\dx

# Check tables
\dt

# Check vector index
\d document_chunks
```

#### Database Migrations

```bash
# Create new migration
docker-compose exec backend alembic revision -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback one migration
docker-compose exec backend alembic downgrade -1

# Show current version
docker-compose exec backend alembic current
```

#### Backup Database

```bash
# Backup
docker-compose exec postgres pg_dump -U llmrag llmrag > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker-compose exec -T postgres psql -U llmrag llmrag < backup.sql
```

---

## Security Configuration

### 1. Strong Passwords

Always use strong, unique passwords:

```bash
# Generate strong password (32 chars)
openssl rand -base64 32

# Generate strong password (64 chars)
openssl rand -base64 64
```

### 2. Environment Variables

Never commit `.env` files to version control:

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo "*.env" >> .gitignore
echo "frontend/.env.local" >> .gitignore
```

### 3. File Permissions

```bash
# Secure environment files
chmod 600 .env
chmod 600 frontend/.env.local
chmod 600 /root/llm-rag-keys.txt

# Secure Docker socket
sudo chmod 660 /var/run/docker.sock
```

### 4. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 5. Rate Limiting

Add rate limiting to nginx:

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    server {
        location /api/auth/ {
            limit_req zone=auth burst=3 nodelay;
            proxy_pass http://localhost:8000;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://localhost:8000;
        }
    }
}
```

### 6. HTTPS Only

Force HTTPS in production nginx config:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Monitoring and Maintenance

### Health Checks

```bash
# Check service health
docker-compose ps

# Check backend health
curl http://localhost:8000/health

# Check PostgreSQL
docker-compose exec postgres pg_isready -U llmrag

# Check Redis
docker-compose exec redis redis-cli ping

# Check Ollama
curl http://localhost:11434/api/tags
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f celery

# View last 100 lines
docker-compose logs --tail=100 backend

# Save logs to file
docker-compose logs backend > backend_logs_$(date +%Y%m%d).txt
```

### Resource Monitoring

```bash
# Monitor container resources
docker stats

# Check disk usage
df -h
docker system df

# Clean up unused Docker resources
docker system prune -a --volumes
```

### Database Maintenance

```bash
# Check database size
docker-compose exec postgres psql -U llmrag -d llmrag -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database;"

# Vacuum database
docker-compose exec postgres psql -U llmrag -d llmrag -c "VACUUM ANALYZE;"

# Reindex
docker-compose exec postgres psql -U llmrag -d llmrag -c "REINDEX DATABASE llmrag;"
```

### Updates

```bash
# Pull latest code
cd /opt/llm-rag
git pull origin main

# Rebuild containers
docker-compose build

# Restart services
docker-compose down
docker-compose up -d

# Run new migrations
docker-compose exec backend alembic upgrade head
```

---

## Troubleshooting

### Common Issues

#### 1. Backend not starting

```bash
# Check logs
docker-compose logs backend

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Port 8000 already in use

# Verify environment
docker-compose exec backend env | grep -E "DATABASE_URL|REDIS_URL|SECRET_KEY"

# Test database connection
docker-compose exec backend python -c "from app.core.database import engine; engine.connect()"
```

#### 2. Frontend not loading

```bash
# Check logs
docker-compose logs frontend

# Verify API URL
docker-compose exec frontend env | grep NEXT_PUBLIC

# Test API connection
curl http://localhost:8000/docs
```

#### 3. WebSocket connection failed

```bash
# Check nginx WebSocket config
sudo nginx -t

# Verify WebSocket in browser console
# Should see "WebSocket connected"

# Check backend WebSocket endpoint
docker-compose logs backend | grep -i websocket
```

#### 4. File upload fails

```bash
# Check upload directory permissions
docker-compose exec backend ls -la /app/uploads

# Check Celery worker
docker-compose logs celery

# Check file size limit
docker-compose exec backend env | grep MAX_FILE_SIZE
```

#### 5. Embeddings not working

```bash
# Check embedding model downloaded
docker-compose exec backend python -c "from sentence_transformers import SentenceTransformer; model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2'); print('OK')"

# Check pgvector extension
docker-compose exec postgres psql -U llmrag -d llmrag -c "\dx vector"

# Test similarity search
docker-compose exec postgres psql -U llmrag -d llmrag -c "SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;"
```

#### 6. Ollama not responding

```bash
# Check Ollama service
docker-compose logs ollama

# List models
docker-compose exec ollama ollama list

# Test generation
docker-compose exec ollama ollama run llama2 "Hello"

# Restart Ollama
docker-compose restart ollama
```

### Performance Issues

#### Slow chat responses

```bash
# Check Ollama CPU/RAM usage
docker stats ollama

# Check database query performance
docker-compose exec postgres psql -U llmrag -d llmrag -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Optimize pgvector index
docker-compose exec postgres psql -U llmrag -d llmrag -c "REINDEX INDEX document_chunks_embedding_idx;"
```

#### High memory usage

```bash
# Check container limits
docker-compose config

# Reduce Celery concurrency
# In docker-compose.yml:
# command: celery -A app.workers.celery_app worker --concurrency=2
docker-compose restart celery
```

---

## Backup and Recovery

### Automated Backup Script

Create `/opt/llm-rag/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/llm-rag"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U llmrag llmrag | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz backend/uploads/

# Backup environment
cp .env $BACKUP_DIR/env_$DATE
cp frontend/.env.local $BACKUP_DIR/env_frontend_$DATE

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable and add to cron:

```bash
chmod +x /opt/llm-rag/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /opt/llm-rag/backup.sh >> /var/log/llm-rag-backup.log 2>&1
```

### Manual Backup

```bash
# Full backup
cd /opt/llm-rag
./backup.sh
```

### Recovery

```bash
# Restore database
gunzip < /var/backups/llm-rag/db_YYYYMMDD_HHMMSS.sql.gz | docker-compose exec -T postgres psql -U llmrag llmrag

# Restore uploads
tar -xzf /var/backups/llm-rag/uploads_YYYYMMDD_HHMMSS.tar.gz -C backend/

# Restart services
docker-compose restart
```

---

## Production Checklist

- [ ] Strong passwords for all services
- [ ] SSL/TLS certificates configured
- [ ] Firewall rules configured
- [ ] CORS origins set to production domain
- [ ] Environment variables secured (600 permissions)
- [ ] Database backups scheduled
- [ ] Log rotation configured
- [ ] Resource limits set in docker-compose
- [ ] Monitoring tools installed
- [ ] Rate limiting enabled
- [ ] Superadmin password changed from default
- [ ] Redis password set
- [ ] PostgreSQL password changed
- [ ] KEEP_ORIGINAL_FILES set appropriately
- [ ] Nginx reverse proxy configured
- [ ] Health check endpoints tested
- [ ] WebSocket connection tested
- [ ] File upload tested
- [ ] Ollama models downloaded

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/llm-rag/issues
- Documentation: https://github.com/yourusername/llm-rag/wiki

---

**Last Updated**: 2026-01-17
