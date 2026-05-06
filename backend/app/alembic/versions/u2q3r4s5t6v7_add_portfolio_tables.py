"""Add portfolio property and transaction tables

Revision ID: u2q3r4s5t6v7
Revises: t1p2q3r4s5u6
Create Date: 2026-04-17 14:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "u2q3r4s5t6v7"
down_revision = "t1p2q3r4s5u6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type
    op.execute(
        "DO $$ BEGIN CREATE TYPE transactiontype AS ENUM ("
        "'rent_income', 'operating_expense', 'maintenance', 'insurance', "
        "'hausgeld', 'mortgage_interest', 'tax_payment', 'other_income', "
        "'other_expense'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )

    transaction_type_enum = postgresql.ENUM(
        "rent_income",
        "operating_expense",
        "maintenance",
        "insurance",
        "hausgeld",
        "mortgage_interest",
        "tax_payment",
        "other_income",
        "other_expense",
        name="transactiontype",
        create_type=False,
    )

    op.create_table(
        "portfolio_property",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("city", sa.String(255), nullable=False),
        sa.Column("postcode", sa.String(10), nullable=False),
        sa.Column("state_code", sa.String(2), nullable=True),
        sa.Column("purchase_price", sa.Float(), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("square_meters", sa.Float(), nullable=False),
        sa.Column("building_year", sa.Integer(), nullable=True),
        sa.Column("current_value_estimate", sa.Float(), nullable=True),
        sa.Column("monthly_rent_target", sa.Float(), nullable=True),
        sa.Column("tenant_name", sa.String(255), nullable=True),
        sa.Column("lease_start_date", sa.Date(), nullable=True),
        sa.Column("lease_end_date", sa.Date(), nullable=True),
        sa.Column("monthly_hausgeld", sa.Float(), nullable=True),
        sa.Column("is_vacant", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_portfolio_property_user_id", "portfolio_property", ["user_id"])

    op.create_table(
        "portfolio_transaction",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("property_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("type", transaction_type_enum, nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["property_id"], ["portfolio_property.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_portfolio_transaction_property_id", "portfolio_transaction", ["property_id"])
    op.create_index("ix_portfolio_transaction_user_id", "portfolio_transaction", ["user_id"])
    op.create_index(
        "ix_portfolio_transaction_property_date",
        "portfolio_transaction",
        ["property_id", "date"],
    )


def downgrade() -> None:
    op.drop_table("portfolio_transaction")
    op.drop_table("portfolio_property")
    op.execute("DROP TYPE IF EXISTS transactiontype;")
