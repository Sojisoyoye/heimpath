"""Add processed_webhook_event table for Stripe webhook idempotency

Revision ID: s3t4u5v6w7x8
Revises: r8e9l1i2a3b4
Create Date: 2026-05-07 10:00:00.000000

"""

import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as pg
from alembic import op

# revision identifiers, used by Alembic.
revision = "s3t4u5v6w7x8"
down_revision = "r8e9l1i2a3b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "processed_webhook_event",
        sa.Column("id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_event_id", sa.String(255), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=True),
        sa.Column(
            "processed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "stripe_event_id",
            name="uq_processed_webhook_event_stripe_event_id",
        ),
    )
    op.create_index(
        "ix_processed_webhook_event_processed_at",
        "processed_webhook_event",
        ["processed_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_processed_webhook_event_processed_at",
        table_name="processed_webhook_event",
    )
    op.drop_table("processed_webhook_event")
