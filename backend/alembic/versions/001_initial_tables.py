"""Initial tables creation

Revision ID: 001
Revises:
Create Date: 2026-01-18

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Embedding dimension (must match settings.EMBEDDING_DIMENSION)
EMBEDDING_DIMENSION = 384


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Create enum types
    userrole_enum = postgresql.ENUM(
        "superadmin", "admin", "user", name="userrole", create_type=False
    )
    userrole_enum.create(op.get_bind(), checkfirst=True)

    llmprovider_enum = postgresql.ENUM(
        "ollama", "openai", "anthropic", "custom", name="llmprovider", create_type=False
    )
    llmprovider_enum.create(op.get_bind(), checkfirst=True)

    documentstatus_enum = postgresql.ENUM(
        "uploading",
        "processing",
        "completed",
        "failed",
        name="documentstatus",
        create_type=False,
    )
    documentstatus_enum.create(op.get_bind(), checkfirst=True)

    messagerole_enum = postgresql.ENUM(
        "user", "assistant", "system", name="messagerole", create_type=False
    )
    messagerole_enum.create(op.get_bind(), checkfirst=True)

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # Create models table
    op.create_table(
        "models",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "llm_provider",
            postgresql.ENUM(
                "ollama",
                "openai",
                "anthropic",
                "custom",
                name="llmprovider",
                create_type=False,
            ),
            nullable=False,
            server_default="ollama",
        ),
        sa.Column("llm_model_name", sa.String(), nullable=False),
        sa.Column("api_key_encrypted", sa.Text(), nullable=True),
        sa.Column("api_base_url", sa.String(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_models_id"), "models", ["id"], unique=False)
    op.create_index(op.f("ix_models_name"), "models", ["name"], unique=True)

    # Create model_user_access table
    op.create_table(
        "model_user_access",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "granted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["model_id"], ["models.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_model_user_access_id"), "model_user_access", ["id"], unique=False
    )

    # Create documents table
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=True),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("file_type", sa.String(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "uploading",
                "processing",
                "completed",
                "failed",
                name="documentstatus",
                create_type=False,
            ),
            nullable=False,
            server_default="uploading",
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("uploaded_by", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["model_id"], ["models.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["uploaded_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_documents_id"), "documents", ["id"], unique=False)

    # Create document_chunks table
    op.create_table(
        "document_chunks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIMENSION), nullable=True),
        sa.Column("metadata", sa.Text(), nullable=True),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["model_id"], ["models.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_document_chunks_id"), "document_chunks", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_document_chunks_model_id"),
        "document_chunks",
        ["model_id"],
        unique=False,
    )

    # Create chat_sessions table
    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["model_id"], ["models.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_chat_sessions_id"), "chat_sessions", ["id"], unique=False)

    # Create chat_messages table
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(
                "user", "assistant", "system", name="messagerole", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("sources", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["session_id"], ["chat_sessions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_chat_messages_id"), "chat_messages", ["id"], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign key constraints)
    op.drop_index(op.f("ix_chat_messages_id"), table_name="chat_messages")
    op.drop_table("chat_messages")

    op.drop_index(op.f("ix_chat_sessions_id"), table_name="chat_sessions")
    op.drop_table("chat_sessions")

    op.drop_index(op.f("ix_document_chunks_model_id"), table_name="document_chunks")
    op.drop_index(op.f("ix_document_chunks_id"), table_name="document_chunks")
    op.drop_table("document_chunks")

    op.drop_index(op.f("ix_documents_id"), table_name="documents")
    op.drop_table("documents")

    op.drop_index(op.f("ix_model_user_access_id"), table_name="model_user_access")
    op.drop_table("model_user_access")

    op.drop_index(op.f("ix_models_name"), table_name="models")
    op.drop_index(op.f("ix_models_id"), table_name="models")
    op.drop_table("models")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS messagerole")
    op.execute("DROP TYPE IF EXISTS documentstatus")
    op.execute("DROP TYPE IF EXISTS llmprovider")
    op.execute("DROP TYPE IF EXISTS userrole")

    # Drop pgvector extension (optional - you may want to keep it)
    # op.execute('DROP EXTENSION IF EXISTS vector')
