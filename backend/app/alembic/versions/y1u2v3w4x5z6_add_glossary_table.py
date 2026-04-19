"""Add glossary_term table

Revision ID: y1u2v3w4x5z6
Revises: x5t6u7v8w9y0
Create Date: 2026-04-19 14:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR

# revision identifiers, used by Alembic.
revision = "y1u2v3w4x5z6"
down_revision = "x5t6u7v8w9y0"
branch_labels = None
depends_on = None

# Enum values
GLOSSARY_CATEGORIES = (
    "buying_process",
    "costs_taxes",
    "financing",
    "legal",
    "rental",
    "property_types",
)


def upgrade() -> None:
    # Create enum type
    glossarycategory = sa.Enum(
        *GLOSSARY_CATEGORIES,
        name="glossarycategory",
    )
    glossarycategory.create(op.get_bind(), checkfirst=True)

    # Create table
    op.create_table(
        "glossary_term",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("term_de", sa.String(200), nullable=False, unique=True),
        sa.Column("term_en", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(200), nullable=False, unique=True),
        sa.Column("definition_short", sa.String(300), nullable=False),
        sa.Column("definition_long", sa.Text, nullable=False),
        sa.Column(
            "category",
            glossarycategory,
            nullable=False,
        ),
        sa.Column("example_usage", sa.Text, nullable=True),
        sa.Column("related_terms", JSONB, nullable=True, server_default="[]"),
        sa.Column("search_vector", TSVECTOR, nullable=True),
    )

    # Create indexes
    op.create_index(
        "ix_glossary_term_term_de", "glossary_term", ["term_de"]
    )
    op.create_index("ix_glossary_term_slug", "glossary_term", ["slug"])
    op.create_index(
        "ix_glossary_term_category", "glossary_term", ["category"]
    )
    op.create_index(
        "ix_glossary_term_search_vector",
        "glossary_term",
        ["search_vector"],
        postgresql_using="gin",
    )

    # Create trigger to auto-update search_vector
    op.execute("""
        CREATE OR REPLACE FUNCTION glossary_term_search_vector_update()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('simple', coalesce(NEW.term_de, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(NEW.term_en, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(NEW.definition_short, '')), 'B') ||
                setweight(to_tsvector('english', coalesce(NEW.definition_long, '')), 'C');
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER glossary_term_search_vector_trigger
        BEFORE INSERT OR UPDATE ON glossary_term
        FOR EACH ROW EXECUTE FUNCTION glossary_term_search_vector_update();
    """)


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS glossary_term_search_vector_trigger ON glossary_term"
    )
    op.execute(
        "DROP FUNCTION IF EXISTS glossary_term_search_vector_update()"
    )
    op.drop_table("glossary_term")
    op.execute("DROP TYPE IF EXISTS glossarycategory")
