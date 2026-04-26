"""Add glossary_links to document_translation and create glossary_gap table

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
Create Date: 2026-04-26 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic
revision = "e0f1a2b3c4d5"
down_revision = "d9e0f1a2b3c4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add glossary_links JSONB column to document_translation
    op.add_column(
        "document_translation",
        sa.Column("glossary_links", JSONB, nullable=True),
    )

    # Create glossary_gap table
    op.create_table(
        "glossary_gap",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("term_de", sa.String(200), nullable=False),
        sa.Column("occurrence_count", sa.Integer, nullable=False, server_default="1"),
        sa.Column("first_seen_document_id", UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("term_de"),
    )
    op.create_index("ix_glossary_gap_term_de", "glossary_gap", ["term_de"])


def downgrade() -> None:
    op.drop_index("ix_glossary_gap_term_de", table_name="glossary_gap")
    op.drop_table("glossary_gap")
    op.drop_column("document_translation", "glossary_links")
