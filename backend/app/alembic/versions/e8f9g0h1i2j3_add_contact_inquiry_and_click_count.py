"""add contact inquiry table and click count to professional

Revision ID: e8f9g0h1i2j3
Revises: d7a8b9c0d1e2
Create Date: 2026-04-24 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "e8f9g0h1i2j3"
down_revision = "d7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add click_count column to professional table
    op.add_column(
        "professional",
        sa.Column(
            "click_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    # Create contact_inquiry table
    op.create_table(
        "contact_inquiry",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("professional_id", sa.UUID(), nullable=False),
        sa.Column("sender_name", sa.String(length=255), nullable=False),
        sa.Column("sender_email", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["professional_id"],
            ["professional.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contact_inquiry_professional_id"),
        "contact_inquiry",
        ["professional_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_contact_inquiry_professional_id"),
        table_name="contact_inquiry",
    )
    op.drop_table("contact_inquiry")
    op.drop_column("professional", "click_count")
