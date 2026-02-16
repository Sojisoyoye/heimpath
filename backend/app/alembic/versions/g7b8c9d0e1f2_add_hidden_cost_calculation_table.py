"""Add hidden cost calculation table

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-02-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'g7b8c9d0e1f2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'hidden_cost_calculation',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('share_id', sa.String(12), nullable=True),
        # Inputs
        sa.Column('property_price', sa.Float(), nullable=False),
        sa.Column('state_code', sa.String(2), nullable=False),
        sa.Column('property_type', sa.String(50), nullable=False),
        sa.Column('include_agent', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('renovation_level', sa.String(10), nullable=False, server_default='none'),
        sa.Column('include_moving', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        # Results
        sa.Column('transfer_tax', sa.Float(), nullable=False),
        sa.Column('notary_fee', sa.Float(), nullable=False),
        sa.Column('land_registry_fee', sa.Float(), nullable=False),
        sa.Column('agent_commission', sa.Float(), nullable=False),
        sa.Column('renovation_estimate', sa.Float(), nullable=False),
        sa.Column('moving_costs', sa.Float(), nullable=False),
        sa.Column('total_additional_costs', sa.Float(), nullable=False),
        sa.Column('total_cost_of_ownership', sa.Float(), nullable=False),
        sa.Column('additional_cost_percentage', sa.Float(), nullable=False),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        # Constraints
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_hidden_cost_calculation_user_id', 'hidden_cost_calculation', ['user_id'])
    op.create_index('ix_hidden_cost_calculation_share_id', 'hidden_cost_calculation', ['share_id'], unique=True)


def downgrade() -> None:
    op.drop_table('hidden_cost_calculation')
