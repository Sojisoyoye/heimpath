"""Add purchase_price to contract_analysis

Revision ID: h3i4j5k6l7m8
Revises: e1h2i3j4k5l6
Create Date: 2026-04-24 21:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision: str = "h3i4j5k6l7m8"
down_revision: str | None = "e1h2i3j4k5l6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "contract_analysis",
        sa.Column("purchase_price", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("contract_analysis", "purchase_price")
