"""Add task_category to journey_task

Revision ID: h4i5j6k7l8m9
Revises: f2g3h4i5j6k7
Create Date: 2026-05-15 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "h4i5j6k7l8m9"
down_revision = "f2g3h4i5j6k7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create the PostgreSQL enum type before using it in a column
    op.execute("CREATE TYPE taskcategory AS ENUM ('action', 'resource', 'warning')")
    op.add_column(
        "journey_task",
        sa.Column(
            "task_category",
            sa.Enum("action", "resource", "warning", name="taskcategory", create_type=False),
            nullable=False,
            server_default="action",
        ),
    )
    # Backfill: tasks with a resource_url are resources, not actions.
    op.execute(
        "UPDATE journey_task SET task_category = 'resource' WHERE resource_url IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_column("journey_task", "task_category")
    op.execute("DROP TYPE taskcategory")
