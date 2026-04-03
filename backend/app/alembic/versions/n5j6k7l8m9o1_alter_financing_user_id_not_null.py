"""Alter financing_assessment.user_id to NOT NULL

Revision ID: n5j6k7l8m9o1
Revises: m4i5j6k7l8m9
Create Date: 2026-04-03 11:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "n5j6k7l8m9o1"
down_revision = "m4i5j6k7l8m9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove any rows that have no owner (should not exist in production
    # after the auth fix, but guards the NOT NULL constraint).
    op.execute("DELETE FROM financing_assessment WHERE user_id IS NULL")
    op.alter_column("financing_assessment", "user_id", nullable=False)


def downgrade() -> None:
    op.alter_column("financing_assessment", "user_id", nullable=True)
