"""Convert enum columns to strings

Revision ID: 002
Revises: 001
Create Date: 2026-01-19

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert llm_provider from enum to string in models table
    op.execute(
        """
        ALTER TABLE models
        ALTER COLUMN llm_provider TYPE VARCHAR
        USING llm_provider::text
        """
    )
    op.execute(
        """
        ALTER TABLE models
        ALTER COLUMN llm_provider SET DEFAULT 'ollama'
        """
    )

    # Convert status from enum to string in documents table
    op.execute(
        """
        ALTER TABLE documents
        ALTER COLUMN status TYPE VARCHAR
        USING status::text
        """
    )
    op.execute(
        """
        ALTER TABLE documents
        ALTER COLUMN status SET DEFAULT 'uploading'
        """
    )

    # Convert role from enum to string in chat_messages table
    op.execute(
        """
        ALTER TABLE chat_messages
        ALTER COLUMN role TYPE VARCHAR
        USING role::text
        """
    )

    # Drop the enum types that are no longer needed
    op.execute("DROP TYPE IF EXISTS llmprovider")
    op.execute("DROP TYPE IF EXISTS documentstatus")
    op.execute("DROP TYPE IF EXISTS messagerole")
    op.execute("DROP TYPE IF EXISTS userrole")


def downgrade() -> None:
    # Recreate enum types
    op.execute(
        "CREATE TYPE userrole AS ENUM ('superadmin', 'admin', 'user')"
    )
    op.execute(
        "CREATE TYPE llmprovider AS ENUM ('ollama', 'openai', 'anthropic', 'custom')"
    )
    op.execute(
        "CREATE TYPE documentstatus AS ENUM ('uploading', 'processing', 'completed', 'failed')"
    )
    op.execute(
        "CREATE TYPE messagerole AS ENUM ('user', 'assistant', 'system')"
    )

    # Convert llm_provider back to enum
    op.execute(
        """
        ALTER TABLE models
        ALTER COLUMN llm_provider TYPE llmprovider
        USING llm_provider::llmprovider
        """
    )
    op.execute(
        """
        ALTER TABLE models
        ALTER COLUMN llm_provider SET DEFAULT 'ollama'::llmprovider
        """
    )

    # Convert status back to enum
    op.execute(
        """
        ALTER TABLE documents
        ALTER COLUMN status TYPE documentstatus
        USING status::documentstatus
        """
    )
    op.execute(
        """
        ALTER TABLE documents
        ALTER COLUMN status SET DEFAULT 'uploading'::documentstatus
        """
    )

    # Convert role back to enum
    op.execute(
        """
        ALTER TABLE chat_messages
        ALTER COLUMN role TYPE messagerole
        USING role::messagerole
        """
    )
