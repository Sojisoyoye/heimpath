"""Add market_insights to journey

Revision ID: o6k7l8m9n0p1
Revises: n5j6k7l8m9o1
Create Date: 2026-04-05 10:00:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "o6k7l8m9n0p1"
down_revision = "n5j6k7l8m9o1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add market_insights JSONB column to journey table
    op.add_column(
        "journey",
        sa.Column(
            "market_insights",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("journey", "market_insights")
