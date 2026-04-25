"""Add land_share to portfolio_property

Revision ID: c6d7e8f9g0h1
Revises: b5c6d7e8f9a0
Create Date: 2026-04-25 16:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "c6d7e8f9g0h1"
down_revision = "b5c6d7e8f9a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "portfolio_property",
        sa.Column(
            "land_share",
            sa.Float(),
            nullable=True,
            server_default=sa.text("20.0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("portfolio_property", "land_share")
