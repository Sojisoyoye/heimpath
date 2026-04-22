"""add avatar_url to user

Revision ID: d6z7a8b9c0e1
Revises: c5y6z7a8b9d0
Create Date: 2026-04-22 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "d6z7a8b9c0e1"
down_revision = "c5y6z7a8b9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("avatar_url", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user", "avatar_url")
