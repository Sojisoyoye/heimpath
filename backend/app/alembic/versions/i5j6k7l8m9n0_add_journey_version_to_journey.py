"""Add journey_version to journey

Revision ID: i5j6k7l8m9n0
Revises: h4i5j6k7l8m9
Create Date: 2026-05-15 13:00:00.000000

Existing journeys retain journey_version=1 (legacy STEP_TEMPLATES).
New buying journeys are created with journey_version=2 (BUYING_STEP_TEMPLATES_V2,
consolidated from ~28 templates to ~18).  The column is additive-only — no
existing step data is modified.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "i5j6k7l8m9n0"
down_revision = "h4i5j6k7l8m9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "journey",
        sa.Column(
            "journey_version",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )


def downgrade() -> None:
    op.drop_column("journey", "journey_version")
