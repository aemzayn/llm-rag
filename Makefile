# LLM RAG Chatbot - Development Makefile
# ==========================================

.PHONY: help install dev up down restart logs logs-backend logs-frontend logs-celery \
        db-migrate db-upgrade db-downgrade db-reset db-shell \
        backend-shell frontend-shell redis-shell \
        build clean prune test lint format \
        ollama-pull ollama-list \
        env-setup generate-keys

# Colors for terminal output
YELLOW := \033[1;33m
GREEN := \033[1;32m
RED := \033[1;31m
BLUE := \033[1;34m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

#-----------------------------------------
# Help
#-----------------------------------------

help: ## Show this help message
	@echo "$(BLUE)LLM RAG Chatbot - Development Commands$(NC)"
	@echo "========================================"
	@echo ""
	@echo "$(YELLOW)Usage:$(NC) make [target]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

#-----------------------------------------
# Environment Setup
#-----------------------------------------

env-setup: ## Create .env file from .env.example
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)Created .env file from .env.example$(NC)"; \
		echo "$(YELLOW)Please edit .env with your settings$(NC)"; \
	else \
		echo "$(YELLOW).env file already exists$(NC)"; \
	fi

generate-keys: ## Generate secret keys for the application
	@docker compose run --rm backend python generate_keys.py

#-----------------------------------------
# Docker Compose Commands
#-----------------------------------------

dev: env-setup up ## Start development environment (alias for up with env setup)
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "$(BLUE)Frontend:$(NC) http://localhost:3000"
	@echo "$(BLUE)Backend:$(NC) http://localhost:8000"
	@echo "$(BLUE)API Docs:$(NC) http://localhost:8000/docs"

up: ## Start all services
	docker compose up -d
	@echo "$(GREEN)All services started$(NC)"

up-build: ## Start all services with rebuild
	docker compose up -d --build
	@echo "$(GREEN)All services rebuilt and started$(NC)"

down: ## Stop all services
	docker compose down
	@echo "$(YELLOW)All services stopped$(NC)"

restart: down up ## Restart all services

stop: ## Stop services without removing containers
	docker compose stop

start: ## Start stopped containers
	docker compose start

#-----------------------------------------
# Logs
#-----------------------------------------

logs: ## Follow logs from all services
	docker compose logs -f

logs-backend: ## Follow backend logs
	docker compose logs -f backend

logs-frontend: ## Follow frontend logs
	docker compose logs -f frontend

logs-celery: ## Follow Celery worker logs
	docker compose logs -f celery_worker

logs-db: ## Follow PostgreSQL logs
	docker compose logs -f postgres

logs-redis: ## Follow Redis logs
	docker compose logs -f redis

logs-ollama: ## Follow Ollama logs
	docker compose logs -f ollama

#-----------------------------------------
# Database Commands
#-----------------------------------------

db-migrate: ## Create a new migration (usage: make db-migrate msg="migration message")
	@if [ -z "$(msg)" ]; then \
		echo "$(RED)Error: Please provide migration message$(NC)"; \
		echo "$(YELLOW)Usage: make db-migrate msg=\"your migration message\"$(NC)"; \
		exit 1; \
	fi
	docker compose exec backend alembic revision --autogenerate -m "$(msg)"
	@echo "$(GREEN)Migration created$(NC)"

db-upgrade: ## Apply all pending migrations
	docker compose exec backend alembic upgrade head
	@echo "$(GREEN)Database upgraded to latest$(NC)"

db-downgrade: ## Revert last migration
	docker compose exec backend alembic downgrade -1
	@echo "$(YELLOW)Database downgraded by 1 revision$(NC)"

db-history: ## Show migration history
	docker compose exec backend alembic history

db-current: ## Show current migration version
	docker compose exec backend alembic current

db-reset: ## Reset database (WARNING: destroys all data)
	@echo "$(RED)WARNING: This will destroy all data in the database!$(NC)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose down -v postgres_data
	docker compose up -d postgres
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	docker compose up -d backend
	@sleep 3
	$(MAKE) db-upgrade
	@echo "$(GREEN)Database reset complete$(NC)"

db-shell: ## Open PostgreSQL shell
	docker compose exec postgres psql -U $${POSTGRES_USER:-llmrag_user} -d $${POSTGRES_DB:-llmrag_db}

#-----------------------------------------
# Shell Access
#-----------------------------------------

backend-shell: ## Open bash shell in backend container
	docker compose exec backend bash

frontend-shell: ## Open bash shell in frontend container
	docker compose exec frontend sh

redis-shell: ## Open Redis CLI
	docker compose exec redis redis-cli

celery-shell: ## Open bash shell in Celery worker container
	docker compose exec celery_worker bash

#-----------------------------------------
# Build & Clean
#-----------------------------------------

build: ## Build all Docker images
	docker compose build
	@echo "$(GREEN)All images built$(NC)"

build-backend: ## Build backend image only
	docker compose build backend celery_worker celery_beat
	@echo "$(GREEN)Backend images built$(NC)"

build-frontend: ## Build frontend image only
	docker compose build frontend
	@echo "$(GREEN)Frontend image built$(NC)"

clean: ## Remove stopped containers and unused images
	docker compose down --remove-orphans
	docker image prune -f
	@echo "$(GREEN)Cleanup complete$(NC)"

prune: ## Remove all unused Docker resources (WARNING: affects all Docker)
	@echo "$(RED)WARNING: This will remove all unused Docker resources!$(NC)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker system prune -af
	@echo "$(GREEN)Docker system pruned$(NC)"

#-----------------------------------------
# Ollama (LLM)
#-----------------------------------------

ollama-pull: ## Pull an Ollama model (usage: make ollama-pull model=llama2)
	@if [ -z "$(model)" ]; then \
		echo "$(RED)Error: Please specify a model$(NC)"; \
		echo "$(YELLOW)Usage: make ollama-pull model=llama2$(NC)"; \
		echo "$(YELLOW)Popular models: llama2, mistral, codellama, phi$(NC)"; \
		exit 1; \
	fi
	docker compose exec ollama ollama pull $(model)
	@echo "$(GREEN)Model $(model) pulled$(NC)"

ollama-list: ## List installed Ollama models
	docker compose exec ollama ollama list

ollama-run: ## Run an Ollama model interactively (usage: make ollama-run model=llama2)
	@if [ -z "$(model)" ]; then \
		echo "$(RED)Error: Please specify a model$(NC)"; \
		echo "$(YELLOW)Usage: make ollama-run model=llama2$(NC)"; \
		exit 1; \
	fi
	docker compose exec -it ollama ollama run $(model)

#-----------------------------------------
# Testing
#-----------------------------------------

test: ## Run backend tests
	docker compose exec backend pytest -v

test-cov: ## Run backend tests with coverage
	docker compose exec backend pytest --cov=app --cov-report=html -v
	@echo "$(GREEN)Coverage report generated in backend/htmlcov/$(NC)"

lint: ## Run linting on backend code
	docker compose exec backend ruff check app/

lint-fix: ## Fix linting issues automatically
	docker compose exec backend ruff check --fix app/

format: ## Format backend code with black
	docker compose exec backend black app/

#-----------------------------------------
# Frontend Commands
#-----------------------------------------

frontend-install: ## Install frontend dependencies
	docker compose exec frontend npm install

frontend-lint: ## Lint frontend code
	docker compose exec frontend npm run lint

frontend-build: ## Build frontend for production
	docker compose exec frontend npm run build

#-----------------------------------------
# Status & Health
#-----------------------------------------

status: ## Show status of all services
	docker compose ps

health: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo ""
	@echo "$(YELLOW)PostgreSQL:$(NC)"
	@docker compose exec postgres pg_isready -U $${POSTGRES_USER:-llmrag_user} && echo "$(GREEN)  Healthy$(NC)" || echo "$(RED)  Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Redis:$(NC)"
	@docker compose exec redis redis-cli ping && echo "$(GREEN)  Healthy$(NC)" || echo "$(RED)  Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Backend:$(NC)"
	@curl -s http://localhost:8000/health > /dev/null && echo "$(GREEN)  Healthy$(NC)" || echo "$(RED)  Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Frontend:$(NC)"
	@curl -s http://localhost:3000 > /dev/null && echo "$(GREEN)  Healthy$(NC)" || echo "$(RED)  Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Ollama:$(NC)"
	@curl -s http://localhost:11434 > /dev/null && echo "$(GREEN)  Healthy$(NC)" || echo "$(RED)  Unhealthy$(NC)"

#-----------------------------------------
# Quick Commands
#-----------------------------------------

fresh: down prune up db-upgrade ## Fresh start: clean everything and start fresh
	@echo "$(GREEN)Fresh environment ready!$(NC)"

quick-start: env-setup up-build db-upgrade ## Quick start for first-time setup
	@echo "$(GREEN)Quick start complete!$(NC)"
	@echo "$(BLUE)Frontend:$(NC) http://localhost:3000"
	@echo "$(BLUE)Backend:$(NC) http://localhost:8000"
	@echo "$(BLUE)API Docs:$(NC) http://localhost:8000/docs"
	@echo ""
	@echo "$(YELLOW)Default superadmin credentials:$(NC)"
	@echo "  Email: admin@example.com"
	@echo "  Password: changeme (update in .env)"
