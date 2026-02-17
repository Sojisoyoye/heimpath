"""Add financing assessment table

Revision ID: i9d0e1f2g3h4
Revises: h8c9d0e1f2g3
Create Date: 2026-02-16 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'i9d0e1f2g3h4'
down_revision = 'h8c9d0e1f2g3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'financing_assessment',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('share_id', sa.String(12), nullable=True),
        # Inputs
        sa.Column('employment_status', sa.String(50), nullable=False),
        sa.Column('employment_years', sa.Integer(), nullable=False),
        sa.Column('monthly_net_income', sa.Float(), nullable=False),
        sa.Column('monthly_debt', sa.Float(), nullable=False),
        sa.Column('available_down_payment', sa.Float(), nullable=False),
        sa.Column('schufa_rating', sa.String(20), nullable=False),
        sa.Column('residency_status', sa.String(30), nullable=False),
        # Score breakdown
        sa.Column('employment_score', sa.Float(), nullable=False),
        sa.Column('income_ratio_score', sa.Float(), nullable=False),
        sa.Column('down_payment_score', sa.Float(), nullable=False),
        sa.Column('schufa_score', sa.Float(), nullable=False),
        sa.Column('residency_score', sa.Float(), nullable=False),
        sa.Column('years_bonus_score', sa.Float(), nullable=False),
        # Results
        sa.Column('total_score', sa.Float(), nullable=False),
        sa.Column('likelihood_label', sa.String(20), nullable=False),
        # Estimates
        sa.Column('max_loan_estimate', sa.Float(), nullable=False),
        sa.Column('recommended_down_payment_percent', sa.Float(), nullable=False),
        sa.Column('expected_rate_min', sa.Float(), nullable=False),
        sa.Column('expected_rate_max', sa.Float(), nullable=False),
        sa.Column('ltv_ratio', sa.Float(), nullable=False),
        # Advisory JSON columns
        sa.Column('strengths', sa.JSON(), nullable=False),
        sa.Column('improvements', sa.JSON(), nullable=False),
        sa.Column('document_checklist', sa.JSON(), nullable=False),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        # Constraints
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_financing_assessment_user_id', 'financing_assessment', ['user_id'])
    op.create_index('ix_financing_assessment_share_id', 'financing_assessment', ['share_id'], unique=True)


def downgrade() -> None:
    op.drop_table('financing_assessment')
