"""Add feedback table

Revision ID: a3b4c5d6e7f8
Revises: z2v3w4x5y6a7
Create Date: 2026-04-22 16:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "a3b4c5d6e7f8"
down_revision = "z2v3w4x5y6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE feedbackcategory AS ENUM "
        "('bug', 'feature_request', 'improvement', 'question', 'other')"
    )

    op.create_table(
        "feedback",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "category",
            sa.dialects.postgresql.ENUM(
                "bug",
                "feature_request",
                "improvement",
                "question",
                "other",
                name="feedbackcategory",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("page_url", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("feedback")
    op.execute("DROP TYPE feedbackcategory")
