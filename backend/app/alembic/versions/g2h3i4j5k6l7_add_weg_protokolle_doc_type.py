"""Add weg_protokolle to documenttype enum

Revision ID: g2h3i4j5k6l7
Revises: f1g2h3i4j5k6
Create Date: 2026-04-26 16:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "g2h3i4j5k6l7"
down_revision = "f1g2h3i4j5k6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE documenttype ADD VALUE IF NOT EXISTS 'weg_protokolle'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values
    pass
