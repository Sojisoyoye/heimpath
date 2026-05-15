"""Merge migration heads

Revision ID: g3h4i5j6k7l8
Revises: d0e1f2g3h4i5, e1h2i3j4k5l6
Create Date: 2026-05-15 10:05:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic
revision = "g3h4i5j6k7l8"
down_revision = ("d0e1f2g3h4i5", "e1h2i3j4k5l6")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
