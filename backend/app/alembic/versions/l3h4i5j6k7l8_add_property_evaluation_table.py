"""Add property evaluation table

Revision ID: l3h4i5j6k7l8
Revises: k2g3h4i5j6k7
Create Date: 2026-02-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'l3h4i5j6k7l8'
down_revision = 'k2g3h4i5j6k7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'property_evaluation',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('journey_step_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('share_id', sa.String(12), nullable=True),
        # Key inputs
        sa.Column('purchase_price', sa.Float(), nullable=False),
        sa.Column('square_meters', sa.Float(), nullable=False),
        sa.Column('state_code', sa.String(2), nullable=True),
        # Full inputs (JSON)
        sa.Column('inputs', sa.JSON(), nullable=False),
        # Key results
        sa.Column('cashflow_after_tax', sa.Float(), nullable=False),
        sa.Column('gross_rental_yield', sa.Float(), nullable=False),
        sa.Column('return_on_equity', sa.Float(), nullable=False),
        sa.Column('is_positive_cashflow', sa.Boolean(), nullable=False),
        # Full results (JSON)
        sa.Column('results', sa.JSON(), nullable=False),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        # Constraints
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['journey_step_id'], ['journey_step.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_property_evaluation_user_id', 'property_evaluation', ['user_id'])
    op.create_index('ix_property_evaluation_journey_step_id', 'property_evaluation', ['journey_step_id'])
    op.create_index('ix_property_evaluation_share_id', 'property_evaluation', ['share_id'], unique=True)


def downgrade() -> None:
    op.drop_table('property_evaluation')
