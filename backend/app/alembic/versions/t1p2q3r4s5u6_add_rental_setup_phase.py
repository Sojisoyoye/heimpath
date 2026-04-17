"""Add rental_setup phase and property_use column

Revision ID: t1p2q3r4s5u6
Revises: s0o1p2q3r4t5
Create Date: 2026-04-17 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "t1p2q3r4s5u6"
down_revision = "s0o1p2q3r4t5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add 'rental_setup' value to the journeyphase enum
    op.execute("ALTER TYPE journeyphase ADD VALUE IF NOT EXISTS 'rental_setup'")

    # Add property_use column to journey table
    op.add_column(
        "journey",
        sa.Column("property_use", sa.String(20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("journey", "property_use")
    # Note: PostgreSQL does not support removing enum values directly.
    # The 'rental_setup' value will remain in the enum but be unused.
