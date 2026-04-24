"""Add saved_professional table

Revision ID: b5c6d7e8f9a0
Revises: z2v3w4x5y6a7
Create Date: 2026-04-24 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = "b5c6d7e8f9a0"
down_revision = "z2v3w4x5y6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "saved_professional",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("professional_id", postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["professional_id"],
            ["professional.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_saved_professional_user_id",
        "saved_professional",
        ["user_id"],
    )
    op.create_index(
        "ix_saved_professional_professional_id",
        "saved_professional",
        ["professional_id"],
    )
    op.create_index(
        "ix_saved_professional_user_pro",
        "saved_professional",
        ["user_id", "professional_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_saved_professional_user_pro", table_name="saved_professional")
    op.drop_index(
        "ix_saved_professional_professional_id", table_name="saved_professional"
    )
    op.drop_index("ix_saved_professional_user_id", table_name="saved_professional")
    op.drop_table("saved_professional")
