"""add contract_analysis table

Revision ID: f0g1h2i3j4k5
Revises: e8f9g0h1i2j3
Create Date: 2026-04-24 16:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = "f0g1h2i3j4k5"
down_revision = "e8f9g0h1i2j3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "contract_analysis",
        sa.Column("id", sa.UUID(), nullable=False),
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
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("share_id", sa.String(length=12), unique=True, nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("analyzed_clauses", JSON, nullable=True),
        sa.Column("notary_checklist", JSON, nullable=True),
        sa.Column("overall_risk_assessment", sa.String(length=10), nullable=True),
        sa.Column("overall_risk_explanation", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contract_analysis_user_id"),
        "contract_analysis",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_contract_analysis_share_id"),
        "contract_analysis",
        ["share_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_contract_analysis_share_id"),
        table_name="contract_analysis",
    )
    op.drop_index(
        op.f("ix_contract_analysis_user_id"),
        table_name="contract_analysis",
    )
    op.drop_table("contract_analysis")
