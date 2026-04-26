"""Add recurrence fields to portfolio_transaction

Revision ID: f1g2h3i4j5k6
Revises: e0f1a2b3c4d5
Create Date: 2026-04-26 14:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "f1g2h3i4j5k6"
down_revision = "e0f1a2b3c4d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE recurrenceinterval AS ENUM ('monthly', 'annually')")
    op.add_column(
        "portfolio_transaction",
        sa.Column(
            "recurrence_interval",
            sa.Enum("monthly", "annually", name="recurrenceinterval"),
            nullable=True,
        ),
    )
    op.add_column(
        "portfolio_transaction",
        sa.Column("last_generated_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "portfolio_transaction",
        sa.Column(
            "is_generated",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade() -> None:
    op.drop_column("portfolio_transaction", "is_generated")
    op.drop_column("portfolio_transaction", "last_generated_date")
    op.drop_column("portfolio_transaction", "recurrence_interval")
    op.execute("DROP TYPE recurrenceinterval")
