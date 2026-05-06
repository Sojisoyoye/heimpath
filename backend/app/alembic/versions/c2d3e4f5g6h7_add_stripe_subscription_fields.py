"""add stripe subscription fields to user

Revision ID: c2d3e4f5g6h7
Revises: b1m2n3p4q5r6
Create Date: 2026-04-27 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "c2d3e4f5g6h7"
down_revision = "b1m2n3p4q5r6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "user",
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
    )
    # Unique index on stripe_customer_id (used for webhook lookups)
    op.create_index(
        "ix_user_stripe_customer_id", "user", ["stripe_customer_id"], unique=True
    )
    # Unique constraint on stripe_subscription_id (no index needed — not a lookup key)
    op.create_unique_constraint(
        "uq_user_stripe_subscription_id", "user", ["stripe_subscription_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_user_stripe_subscription_id", "user", type_="unique")
    op.drop_index("ix_user_stripe_customer_id", table_name="user")
    op.drop_column("user", "stripe_subscription_id")
    op.drop_column("user", "stripe_customer_id")
