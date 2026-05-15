"""Add is_personalised to journey_step

Revision ID: a3w4x5y6z7b8
Revises: z2v3w4x5y6a7
Create Date: 2026-05-15 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "a3w4x5y6z7b8"
down_revision = "z2v3w4x5y6a7"
branch_labels = None
depends_on = None

# content_key values for steps that are conditionally generated based on
# questionnaire answers (financing type, property use, residency status).
_CONDITIONAL_CONTENT_KEYS = (
    "finance_check",
    "mortgage_preapproval",
    "mortgage_comparison",
    "proof_of_funds",
    "loan_commitment",
    "rental_landlord_law",
    "rental_yield_analysis",
    "rental_property_management",
    "rental_tax_strategy",
    "rental_operations_setup",
)


def upgrade() -> None:
    op.add_column(
        "journey_step",
        sa.Column(
            "is_personalised",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    # Backfill: mark known conditionally-generated steps as personalised.
    op.execute(
        sa.text(
            "UPDATE journey_step SET is_personalised = TRUE "
            "WHERE content_key = ANY(:keys)"
        ).bindparams(keys=list(_CONDITIONAL_CONTENT_KEYS))
    )


def downgrade() -> None:
    op.drop_column("journey_step", "is_personalised")
