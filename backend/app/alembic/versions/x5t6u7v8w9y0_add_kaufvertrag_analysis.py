"""Add kaufvertrag_analysis column to document_translation

Revision ID: x5t6u7v8w9y0
Revises: w4s5t6u7v8x9
Create Date: 2026-04-19 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = "x5t6u7v8w9y0"
down_revision = "w4s5t6u7v8x9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "document_translation",
        sa.Column("kaufvertrag_analysis", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("document_translation", "kaufvertrag_analysis")
