"""Add journey_step_id to document

Revision ID: q8m9n0o1p2r3
Revises: p7l8m9n0o1q2
Create Date: 2026-04-12 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "q8m9n0o1p2r3"
down_revision = "p7l8m9n0o1q2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "document",
        sa.Column(
            "journey_step_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_document_journey_step_id",
        "document",
        "journey_step",
        ["journey_step_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_document_journey_step_id",
        "document",
        ["journey_step_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_document_journey_step_id", table_name="document")
    op.drop_constraint("fk_document_journey_step_id", table_name="document", type_="foreignkey")
    op.drop_column("document", "journey_step_id")
