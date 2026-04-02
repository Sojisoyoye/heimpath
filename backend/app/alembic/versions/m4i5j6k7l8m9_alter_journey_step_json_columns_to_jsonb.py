"""Alter journey_step JSON columns to JSONB

Revision ID: m4i5j6k7l8m9
Revises: l3h4i5j6k7l8
Create Date: 2026-04-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = "m4i5j6k7l8m9"
down_revision = "l3h4i5j6k7l8"
branch_labels = None
depends_on = None


def upgrade():
    # Cast Text columns containing JSON to JSONB using PostgreSQL's USING clause
    op.alter_column(
        "journey_step",
        "related_laws",
        existing_type=sa.Text(),
        type_=JSONB(),
        postgresql_using="related_laws::jsonb",
        nullable=True,
    )
    op.alter_column(
        "journey_step",
        "estimated_costs",
        existing_type=sa.Text(),
        type_=JSONB(),
        postgresql_using="estimated_costs::jsonb",
        nullable=True,
    )
    op.alter_column(
        "journey_step",
        "prerequisites",
        existing_type=sa.Text(),
        type_=JSONB(),
        postgresql_using="prerequisites::jsonb",
        nullable=True,
    )


def downgrade():
    op.alter_column(
        "journey_step",
        "prerequisites",
        existing_type=JSONB(),
        type_=sa.Text(),
        postgresql_using="prerequisites::text",
        nullable=True,
    )
    op.alter_column(
        "journey_step",
        "estimated_costs",
        existing_type=JSONB(),
        type_=sa.Text(),
        postgresql_using="estimated_costs::text",
        nullable=True,
    )
    op.alter_column(
        "journey_step",
        "related_laws",
        existing_type=JSONB(),
        type_=sa.Text(),
        postgresql_using="related_laws::text",
        nullable=True,
    )
