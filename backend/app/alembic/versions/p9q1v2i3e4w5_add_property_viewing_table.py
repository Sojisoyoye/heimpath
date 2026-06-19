"""Add property_viewing table

Revision ID: p9q1v2i3e4w5
Revises: i5j6k7l8m9n0
Create Date: 2026-06-19 08:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic
revision = "p9q1v2i3e4w5"
down_revision = "i5j6k7l8m9n0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "property_viewing",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("journey_id", sa.UUID(), nullable=True),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("viewed_at", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "checklist_data",
            JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
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
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["journey_id"], ["journey.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_property_viewing_user_id"), "property_viewing", ["user_id"]
    )
    op.create_index(
        op.f("ix_property_viewing_journey_id"), "property_viewing", ["journey_id"]
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_property_viewing_journey_id"), table_name="property_viewing")
    op.drop_index(op.f("ix_property_viewing_user_id"), table_name="property_viewing")
    op.drop_table("property_viewing")
