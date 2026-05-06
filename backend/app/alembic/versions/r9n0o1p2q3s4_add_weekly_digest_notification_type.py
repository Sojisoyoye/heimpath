"""Add weekly_digest notification type

Revision ID: r9n0o1p2q3s4
Revises: q8m9n0o1p2r3
Create Date: 2026-04-15 10:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "r9n0o1p2q3s4"
down_revision = "q8m9n0o1p2r3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'weekly_digest'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from enums.
    # A full recreation would be needed, but this is rarely necessary.
    pass
