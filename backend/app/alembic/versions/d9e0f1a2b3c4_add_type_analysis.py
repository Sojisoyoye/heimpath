"""Add type_analysis column and wohnungsgrundriss enum value

Revision ID: d9e0f1a2b3c4
Revises: c6d7e8f9a0b1
Create Date: 2026-04-26 09:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic
revision = "d9e0f1a2b3c4"
down_revision = "c6d7e8f9a0b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new enum value — IF NOT EXISTS requires PostgreSQL 9.3+
    op.execute("ALTER TYPE documenttype ADD VALUE IF NOT EXISTS 'wohnungsgrundriss'")

    # Add type_analysis JSONB column (nullable, for non-Kaufvertrag doc types)
    op.add_column(
        "document_translation",
        sa.Column("type_analysis", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("document_translation", "type_analysis")
    # Note: PostgreSQL does not support removing enum values.
    # The 'wohnungsgrundriss' value will remain in the documenttype enum after downgrade.
