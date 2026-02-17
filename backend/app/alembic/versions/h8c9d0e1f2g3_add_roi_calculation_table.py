"""Add ROI calculation table

Revision ID: h8c9d0e1f2g3
Revises: g7b8c9d0e1f2
Create Date: 2026-02-14 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'h8c9d0e1f2g3'
down_revision = 'g7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'roi_calculation',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('share_id', sa.String(12), nullable=True),
        # Inputs
        sa.Column('purchase_price', sa.Float(), nullable=False),
        sa.Column('down_payment', sa.Float(), nullable=False),
        sa.Column('monthly_rent', sa.Float(), nullable=False),
        sa.Column('monthly_expenses', sa.Float(), nullable=False),
        sa.Column('annual_appreciation', sa.Float(), nullable=False),
        sa.Column('vacancy_rate', sa.Float(), nullable=False),
        sa.Column('mortgage_rate', sa.Float(), nullable=False),
        sa.Column('mortgage_term', sa.Integer(), nullable=False),
        # Results
        sa.Column('gross_rental_income', sa.Float(), nullable=False),
        sa.Column('net_operating_income', sa.Float(), nullable=False),
        sa.Column('annual_cash_flow', sa.Float(), nullable=False),
        sa.Column('monthly_mortgage_payment', sa.Float(), nullable=False),
        sa.Column('gross_yield', sa.Float(), nullable=False),
        sa.Column('net_yield', sa.Float(), nullable=False),
        sa.Column('cap_rate', sa.Float(), nullable=False),
        sa.Column('cash_on_cash_return', sa.Float(), nullable=False),
        sa.Column('investment_grade', sa.Float(), nullable=False),
        sa.Column('investment_grade_label', sa.String(20), nullable=False),
        # Projections
        sa.Column('projections', sa.JSON(), nullable=False),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        # Constraints
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_roi_calculation_user_id', 'roi_calculation', ['user_id'])
    op.create_index('ix_roi_calculation_share_id', 'roi_calculation', ['share_id'], unique=True)


def downgrade() -> None:
    op.drop_table('roi_calculation')
