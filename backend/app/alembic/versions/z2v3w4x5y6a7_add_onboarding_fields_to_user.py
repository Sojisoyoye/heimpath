"""Add onboarding fields to user

Revision ID: z2v3w4x5y6a7
Revises: y1u2v3w4x5z6
Create Date: 2026-04-19 18:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "z2v3w4x5y6a7"
down_revision = "y1u2v3w4x5z6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "user",
        sa.Column("onboarding_persona", sa.String(50), nullable=True),
    )
    # Mark existing users as onboarded — they've already been using the app
    op.execute("UPDATE \"user\" SET onboarding_completed = true")


def downgrade() -> None:
    op.drop_column("user", "onboarding_persona")
    op.drop_column("user", "onboarding_completed")
