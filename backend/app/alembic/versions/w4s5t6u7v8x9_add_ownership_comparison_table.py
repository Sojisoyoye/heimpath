"""add ownership comparison table

Revision ID: w4s5t6u7v8x9
Revises: v3r4s5t6u7w8
Create Date: 2026-04-18 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "w4s5t6u7v8x9"
down_revision = "v3r4s5t6u7w8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ownership_comparison",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("share_id", sa.String(12), unique=True, index=True, nullable=True),
        # Frozen inputs
        sa.Column("num_properties", sa.Integer(), nullable=False),
        sa.Column("annual_rental_income", sa.Float(), nullable=False),
        sa.Column("personal_marginal_tax_rate", sa.Float(), nullable=False),
        sa.Column("annual_appreciation", sa.Float(), nullable=False),
        sa.Column("holding_period", sa.Integer(), nullable=False),
        sa.Column("total_property_value", sa.Float(), nullable=False),
        sa.Column("building_share_percent", sa.Float(), nullable=False),
        sa.Column("afa_rate_percent", sa.Float(), nullable=False),
        sa.Column("annual_rent_increase_percent", sa.Float(), nullable=False),
        sa.Column("gewerbesteuer_hebesatz", sa.Float(), nullable=False),
        sa.Column("gmbh_setup_cost", sa.Float(), nullable=False),
        sa.Column("annual_accounting_cost", sa.Float(), nullable=False),
        # Key results
        sa.Column("private_total_wealth", sa.Float(), nullable=False),
        sa.Column("gmbh_total_wealth", sa.Float(), nullable=False),
        sa.Column("breakeven_year", sa.Integer(), nullable=True),
        sa.Column("gmbh_advantage_at_exit", sa.Float(), nullable=False),
        sa.Column("recommendation", sa.String(255), nullable=False),
        # Full results as JSON
        sa.Column("results", sa.dialects.postgresql.JSON(), nullable=False),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("ownership_comparison")
