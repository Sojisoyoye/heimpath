"""Alter financing_assessment.user_id to NOT NULL

Revision ID: n5j6k7l8m9o1
Revises: m4i5j6k7l8m9
Create Date: 2026-04-03 11:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "n5j6k7l8m9o1"
down_revision = "m4i5j6k7l8m9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Fail fast if any assessments have no owner rather than silently
    # destroying data. Investigate and clean up before re-running.
    conn = op.get_bind()
    null_count = conn.execute(
        sa.text("SELECT COUNT(*) FROM financing_assessment WHERE user_id IS NULL")
    ).scalar()
    if null_count:
        raise RuntimeError(
            f"Cannot migrate: {null_count} financing_assessment row(s) have "
            "user_id IS NULL. Investigate and clean up before re-running."
        )
    op.alter_column("financing_assessment", "user_id", nullable=False)


def downgrade() -> None:
    op.alter_column("financing_assessment", "user_id", nullable=True)
