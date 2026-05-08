"""Add partial_translation_coverage to document_translation

Revision ID: c9d0e1f2g3h4
Revises: b4w5x6y7z8c9
Create Date: 2026-05-08 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "c9d0e1f2g3h4"
down_revision = "b4w5x6y7z8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "document_translation",
        sa.Column("partial_translation_coverage", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("document_translation", "partial_translation_coverage")
