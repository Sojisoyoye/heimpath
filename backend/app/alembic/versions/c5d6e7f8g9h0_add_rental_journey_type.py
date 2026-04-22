"""Add rental journey type

Revision ID: c5d6e7f8g9h0
Revises: b4c5d6e7f8g9
Create Date: 2026-04-22 18:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "c5d6e7f8g9h0"
down_revision = "b4c5d6e7f8g9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create journeytype enum
    op.execute("CREATE TYPE journeytype AS ENUM ('buying', 'rental')")

    # Add journey_type column to journey table
    op.add_column(
        "journey",
        sa.Column(
            "journey_type",
            sa.dialects.postgresql.ENUM(
                "buying", "rental", name="journeytype", create_type=False
            ),
            nullable=False,
            server_default="buying",
        ),
    )

    # Add new rental phases to journeyphase enum
    op.execute(
        "ALTER TYPE journeyphase ADD VALUE IF NOT EXISTS 'rental_search'"
    )
    op.execute(
        "ALTER TYPE journeyphase ADD VALUE IF NOT EXISTS 'rental_application'"
    )
    op.execute(
        "ALTER TYPE journeyphase ADD VALUE IF NOT EXISTS 'rental_contract'"
    )
    op.execute(
        "ALTER TYPE journeyphase ADD VALUE IF NOT EXISTS 'rental_move_in'"
    )


def downgrade() -> None:
    op.drop_column("journey", "journey_type")
    op.execute("DROP TYPE journeytype")
