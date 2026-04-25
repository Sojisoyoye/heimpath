"""Add professional tables

Revision ID: s0o1p2q3r4t5
Revises: r9n0o1p2q3s4
Create Date: 2026-04-17 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 's0o1p2q3r4t5'
down_revision = 'r9n0o1p2q3s4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type with existence check
    connection = op.get_bind()

    result = connection.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :name"),
        {"name": "professionaltype"},
    )
    if not result.fetchone():
        connection.execute(
            sa.text(
                "CREATE TYPE professionaltype AS ENUM "
                "('lawyer', 'notary', 'tax_advisor', 'mortgage_broker', 'real_estate_agent')"
            )
        )

    # Define enum for table creation
    professionaltype = postgresql.ENUM(
        'lawyer', 'notary', 'tax_advisor', 'mortgage_broker', 'real_estate_agent',
        name='professionaltype', create_type=False
    )

    # Create professional table
    op.create_table(
        'professional',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('type', professionaltype, nullable=False),
        sa.Column('city', sa.String(length=255), nullable=False),
        sa.Column('languages', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('website', sa.String(length=500), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('average_rating', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('review_count', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_professional_type'), 'professional', ['type'], unique=False)
    op.create_index(op.f('ix_professional_city'), 'professional', ['city'], unique=False)

    # Create professional_review table
    op.create_table(
        'professional_review',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('professional_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['professional_id'], ['professional.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('professional_id', 'user_id', name='uq_professional_review_user')
    )
    op.create_index(op.f('ix_professional_review_professional_id'), 'professional_review', ['professional_id'], unique=False)
    op.create_index(op.f('ix_professional_review_user_id'), 'professional_review', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop tables
    op.drop_index(op.f('ix_professional_review_user_id'), table_name='professional_review')
    op.drop_index(op.f('ix_professional_review_professional_id'), table_name='professional_review')
    op.drop_table('professional_review')
    op.drop_index(op.f('ix_professional_city'), table_name='professional')
    op.drop_index(op.f('ix_professional_type'), table_name='professional')
    op.drop_table('professional')

    # Drop enum
    op.execute('DROP TYPE IF EXISTS professionaltype')
