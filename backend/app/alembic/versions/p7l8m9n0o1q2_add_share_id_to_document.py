"""Add share_id to document

Revision ID: p7l8m9n0o1q2
Revises: o6k7l8m9n0p1
Create Date: 2026-04-10 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "p7l8m9n0o1q2"
down_revision = "o6k7l8m9n0p1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "document",
        sa.Column("share_id", sa.String(12), nullable=True),
    )
    op.create_unique_constraint(
        "uq_document_share_id",
        "document",
        ["share_id"],
    )
    op.create_index(
        "ix_document_share_id",
        "document",
        ["share_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_document_share_id", table_name="document")
    op.drop_constraint("uq_document_share_id", table_name="document")
    op.drop_column("document", "share_id")
