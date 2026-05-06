"""add cost category to transaction

Revision ID: b4x5y6z7a8c9
Revises: a3w4x5y6z7b8
Create Date: 2026-04-19 14:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "b4x5y6z7a8c9"
down_revision = "a3w4x5y6z7b8"
branch_labels = None
depends_on = None

_cost_category_enum = sa.Enum(
    "hausgeld",
    "grundsteuer",
    "insurance",
    "heating",
    "water",
    "electricity",
    "maintenance",
    "misc",
    name="costcategory",
)


def upgrade() -> None:
    _cost_category_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "portfolio_transaction",
        sa.Column("cost_category", _cost_category_enum, nullable=True),
    )
    op.add_column(
        "portfolio_transaction",
        sa.Column("estimated_amount", sa.Float(), nullable=True),
    )
    op.create_index(
        "ix_portfolio_transaction_property_cost_category",
        "portfolio_transaction",
        ["property_id", "cost_category"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_portfolio_transaction_property_cost_category",
        table_name="portfolio_transaction",
    )
    op.drop_column("portfolio_transaction", "estimated_amount")
    op.drop_column("portfolio_transaction", "cost_category")
    _cost_category_enum.drop(op.get_bind(), checkfirst=True)
