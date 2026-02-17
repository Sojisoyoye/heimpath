"""Add document tables

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-02-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types (with existence checks)
    document_type_enum = postgresql.ENUM(
        'kaufvertrag', 'mietvertrag', 'expose', 'nebenkostenabrechnung',
        'grundbuchauszug', 'teilungserklaerung', 'hausgeldabrechnung', 'unknown',
        name='documenttype',
        create_type=False,
    )
    document_status_enum = postgresql.ENUM(
        'uploaded', 'processing', 'completed', 'failed',
        name='documentstatus',
        create_type=False,
    )

    # Create enums if they don't exist
    op.execute("DO $$ BEGIN CREATE TYPE documenttype AS ENUM "
               "('kaufvertrag', 'mietvertrag', 'expose', 'nebenkostenabrechnung', "
               "'grundbuchauszug', 'teilungserklaerung', 'hausgeldabrechnung', 'unknown'); "
               "EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE documentstatus AS ENUM "
               "('uploaded', 'processing', 'completed', 'failed'); "
               "EXCEPTION WHEN duplicate_object THEN NULL; END $$;")

    # Create document table
    op.create_table(
        'document',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('original_filename', sa.String(500), nullable=False),
        sa.Column('stored_filename', sa.String(500), nullable=False),
        sa.Column('file_path', sa.String(1000), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('page_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('document_type', document_type_enum, nullable=False, server_default='unknown'),
        sa.Column('status', document_status_enum, nullable=False, server_default='uploaded'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_document_user_id', 'document', ['user_id'])

    # Create document_translation table
    op.create_table(
        'document_translation',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('document_id', sa.UUID(), nullable=False),
        sa.Column('source_language', sa.String(10), nullable=False, server_default='de'),
        sa.Column('target_language', sa.String(10), nullable=False, server_default='en'),
        sa.Column('translated_pages', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('clauses_detected', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('risk_warnings', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('processing_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['document_id'], ['document.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('document_id'),
    )
    op.create_index('ix_document_translation_document_id', 'document_translation', ['document_id'])


def downgrade() -> None:
    op.drop_table('document_translation')
    op.drop_table('document')
    op.execute("DROP TYPE IF EXISTS documentstatus;")
    op.execute("DROP TYPE IF EXISTS documenttype;")
