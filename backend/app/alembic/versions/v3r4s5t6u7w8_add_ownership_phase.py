"""Add ownership phase

Revision ID: v3r4s5t6u7w8
Revises: u2q3r4s5t6v7
Create Date: 2026-04-18 12:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "v3r4s5t6u7w8"
down_revision = "u2q3r4s5t6v7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE journeyphase ADD VALUE IF NOT EXISTS 'ownership'")


def downgrade() -> None:
    # Note: PostgreSQL does not support removing enum values directly.
    # The 'ownership' value will remain in the enum but be unused.
    pass
