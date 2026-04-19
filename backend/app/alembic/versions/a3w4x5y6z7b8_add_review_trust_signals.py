"""add review trust signals

Revision ID: a3w4x5y6z7b8
Revises: z2v3w4x5y6a7
Create Date: 2026-04-19 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "a3w4x5y6z7b8"
down_revision = "z2v3w4x5y6a7"
branch_labels = None
depends_on = None

_service_type_enum = sa.Enum(
    "buying", "selling", "rental", "tax", "legal", name="servicetype"
)


def upgrade() -> None:
    _service_type_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "professional_review",
        sa.Column("service_used", _service_type_enum, nullable=True),
    )
    op.add_column(
        "professional_review",
        sa.Column("language_used", sa.String(100), nullable=True),
    )
    op.add_column(
        "professional_review",
        sa.Column("would_recommend", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "professional_review",
        sa.Column("response_time_rating", sa.Integer(), nullable=True),
    )

    op.add_column(
        "professional",
        sa.Column("recommendation_rate", sa.Float(), nullable=True),
    )
    op.add_column(
        "professional",
        sa.Column(
            "review_highlights",
            sa.JSON(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("professional", "review_highlights")
    op.drop_column("professional", "recommendation_rate")

    op.drop_column("professional_review", "response_time_rating")
    op.drop_column("professional_review", "would_recommend")
    op.drop_column("professional_review", "language_used")
    op.drop_column("professional_review", "service_used")

    _service_type_enum.drop(op.get_bind(), checkfirst=True)
