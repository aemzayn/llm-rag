.PHONY: dev db-upgrade

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

db-upgrade:
	alembic upgrade head