"""Add journey tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-02-07 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types using raw SQL with IF NOT EXISTS pattern
    # This handles the case where SQLAlchemy may have already created them
    connection = op.get_bind()

    # Check and create each enum type
    for enum_name, values in [
        ('journeyphase', ['research', 'preparation', 'buying', 'closing']),
        ('stepstatus', ['not_started', 'in_progress', 'completed', 'skipped']),
        ('propertytype', ['apartment', 'house', 'land', 'commercial']),
        ('financingtype', ['cash', 'mortgage', 'mixed']),
    ]:
        # Check if type exists
        result = connection.execute(
            sa.text("SELECT 1 FROM pg_type WHERE typname = :name"),
            {"name": enum_name}
        )
        if not result.fetchone():
            # Create the enum type
            values_str = ", ".join(f"'{v}'" for v in values)
            connection.execute(
                sa.text(f"CREATE TYPE {enum_name} AS ENUM ({values_str})")
            )

    # Define enum types that won't auto-create
    journeyphase = postgresql.ENUM(
        'research', 'preparation', 'buying', 'closing',
        name='journeyphase', create_type=False
    )
    stepstatus = postgresql.ENUM(
        'not_started', 'in_progress', 'completed', 'skipped',
        name='stepstatus', create_type=False
    )
    propertytype = postgresql.ENUM(
        'apartment', 'house', 'land', 'commercial',
        name='propertytype', create_type=False
    )
    financingtype = postgresql.ENUM(
        'cash', 'mortgage', 'mixed',
        name='financingtype', create_type=False
    )

    # Create journey table
    op.create_table(
        'journey',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('current_phase', journeyphase, nullable=False),
        sa.Column('current_step_number', sa.Integer(), nullable=False),
        sa.Column('property_type', propertytype, nullable=True),
        sa.Column('property_location', sa.String(length=255), nullable=True),
        sa.Column('financing_type', financingtype, nullable=True),
        sa.Column('is_first_time_buyer', sa.Boolean(), nullable=False),
        sa.Column('has_german_residency', sa.Boolean(), nullable=False),
        sa.Column('budget_euros', sa.Integer(), nullable=True),
        sa.Column('target_purchase_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_journey_user_id'), 'journey', ['user_id'], unique=False)

    # Create journey_step table
    op.create_table(
        'journey_step',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('journey_id', sa.UUID(), nullable=False),
        sa.Column('step_number', sa.Integer(), nullable=False),
        sa.Column('phase', journeyphase, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('estimated_duration_days', sa.Integer(), nullable=True),
        sa.Column('status', stepstatus, nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('content_key', sa.String(length=100), nullable=True),
        sa.Column('related_laws', sa.Text(), nullable=True),
        sa.Column('estimated_costs', sa.Text(), nullable=True),
        sa.Column('prerequisites', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['journey_id'], ['journey.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_journey_step_journey_id'), 'journey_step', ['journey_id'], unique=False)

    # Create journey_task table
    op.create_table(
        'journey_task',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('step_id', sa.UUID(), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_required', sa.Boolean(), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resource_url', sa.String(length=500), nullable=True),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['step_id'], ['journey_step.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_journey_task_step_id'), 'journey_task', ['step_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_journey_task_step_id'), table_name='journey_task')
    op.drop_table('journey_task')
    op.drop_index(op.f('ix_journey_step_journey_id'), table_name='journey_step')
    op.drop_table('journey_step')
    op.drop_index(op.f('ix_journey_user_id'), table_name='journey')
    op.drop_table('journey')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS financingtype')
    op.execute('DROP TYPE IF EXISTS propertytype')
    op.execute('DROP TYPE IF EXISTS stepstatus')
    op.execute('DROP TYPE IF EXISTS journeyphase')
