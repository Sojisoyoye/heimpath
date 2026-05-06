"""Add audit_log table and reliability columns to document_translation

Revision ID: r8e9l1i2a3b4
Revises: s1t2u3v4w5x6
Create Date: 2026-05-06 14:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = "r8e9l1i2a3b4"
down_revision = "s1t2u3v4w5x6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── audit_log table ───────────────────────────────────────────────────────
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=True),
        sa.Column("resource_id", sa.String(100), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("request_id", sa.String(36), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="success"),
        sa.Column("extra_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index("ix_audit_log_user_id", "audit_log", ["user_id"])
    op.create_index("ix_audit_log_action", "audit_log", ["action"])
    op.create_index("ix_audit_log_resource_type", "audit_log", ["resource_type"])
    op.create_index("ix_audit_log_created_at", "audit_log", ["created_at"])

    # ── document_translation: reliability columns ─────────────────────────────
    op.add_column(
        "document_translation",
        sa.Column(
            "requires_manual_review",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "document_translation",
        sa.Column("translation_confidence_score", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("document_translation", "translation_confidence_score")
    op.drop_column("document_translation", "requires_manual_review")

    op.drop_index("ix_audit_log_created_at", "audit_log")
    op.drop_index("ix_audit_log_resource_type", "audit_log")
    op.drop_index("ix_audit_log_action", "audit_log")
    op.drop_index("ix_audit_log_user_id", "audit_log")
    op.drop_table("audit_log")
