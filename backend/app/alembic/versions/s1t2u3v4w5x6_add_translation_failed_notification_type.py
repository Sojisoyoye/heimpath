"""Add translation_failed notification type

Revision ID: s1t2u3v4w5x6
Revises: d3e4f5g6h7i8
Create Date: 2026-04-29 10:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "s1t2u3v4w5x6"
down_revision = "d3e4f5g6h7i8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'translation_failed'"
    )


def downgrade() -> None:
    # PostgreSQL does not support removing values from enums.
    # A full recreation would be needed, but this is rarely necessary.
    pass
