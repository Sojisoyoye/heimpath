"""Add celery fields to document

Revision ID: b4w5x6y7z8c9
Revises: (a3w4x5y6z7b8, s3t4u5v6w7x8)
Create Date: 2026-05-07 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "b4w5x6y7z8c9"
down_revision = ("a3w4x5y6z7b8", "s3t4u5v6w7x8")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("document", sa.Column("celery_task_id", sa.String(255), nullable=True))
    op.add_column(
        "document",
        sa.Column(
            "processing_attempt",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("document", "processing_attempt")
    op.drop_column("document", "celery_task_id")
