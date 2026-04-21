"""add journey_id to portfolio_property

Revision ID: c5y6z7a8b9d0
Revises: b4x5y6z7a8c9
Create Date: 2026-04-21 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "c5y6z7a8b9d0"
down_revision = "b4x5y6z7a8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "portfolio_property",
        sa.Column(
            "journey_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("journey.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_portfolio_property_journey_id",
        "portfolio_property",
        ["journey_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_portfolio_property_journey_id",
        table_name="portfolio_property",
    )
    op.drop_column("portfolio_property", "journey_id")
