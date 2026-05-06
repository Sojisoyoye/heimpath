"""Add notification tables

Revision ID: j0e1f2g3h4i5
Revises: i9d0e1f2g3h4
Create Date: 2026-02-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'j0e1f2g3h4i5'
down_revision = 'i9d0e1f2g3h4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type
    op.execute(
        "DO $$ BEGIN CREATE TYPE notificationtype AS ENUM "
        "('step_completed', 'document_translated', 'calculation_saved', "
        "'law_bookmarked', 'journey_deadline', 'payment_reminder', "
        "'subscription_expiring', 'system_announcement'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )

    notification_type_enum = postgresql.ENUM(
        'step_completed', 'document_translated', 'calculation_saved',
        'law_bookmarked', 'journey_deadline', 'payment_reminder',
        'subscription_expiring', 'system_announcement',
        name='notificationtype',
        create_type=False,
    )

    # Create notification table
    op.create_table(
        'notification',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('type', notification_type_enum, nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('action_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notification_user_id', 'notification', ['user_id'])
    op.create_index('ix_notification_user_id_created_at', 'notification', ['user_id', 'created_at'])
    op.create_index('ix_notification_user_id_is_read', 'notification', ['user_id', 'is_read'])

    # Create notification_preference table
    op.create_table(
        'notification_preference',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('notification_type', notification_type_enum, nullable=False),
        sa.Column('is_in_app_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_email_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'notification_type', name='uq_user_notification_type'),
    )
    op.create_index('ix_notification_preference_user_id', 'notification_preference', ['user_id'])


def downgrade() -> None:
    op.drop_table('notification_preference')
    op.drop_table('notification')
    op.execute("DROP TYPE IF EXISTS notificationtype;")
