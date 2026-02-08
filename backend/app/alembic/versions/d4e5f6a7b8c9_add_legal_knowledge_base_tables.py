"""Add legal knowledge base tables

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-02-08 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types using raw SQL with existence check
    connection = op.get_bind()

    for enum_name, values in [
        ('lawcategory', ['buying_process', 'costs_and_taxes', 'rental_law', 'condominium', 'agent_regulations']),
        ('propertyapplicability', ['all', 'apartment', 'house', 'land', 'commercial']),
    ]:
        # Check if type exists
        result = connection.execute(
            sa.text("SELECT 1 FROM pg_type WHERE typname = :name"),
            {"name": enum_name}
        )
        if not result.fetchone():
            values_str = ", ".join(f"'{v}'" for v in values)
            connection.execute(
                sa.text(f"CREATE TYPE {enum_name} AS ENUM ({values_str})")
            )

    # Define enums for use in table creation
    lawcategory = postgresql.ENUM(
        'buying_process', 'costs_and_taxes', 'rental_law', 'condominium', 'agent_regulations',
        name='lawcategory', create_type=False
    )
    propertyapplicability = postgresql.ENUM(
        'all', 'apartment', 'house', 'land', 'commercial',
        name='propertyapplicability', create_type=False
    )

    # Create law table
    op.create_table(
        'law',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('citation', sa.String(length=100), nullable=False),
        sa.Column('title_de', sa.String(length=500), nullable=False),
        sa.Column('title_en', sa.String(length=500), nullable=False),
        sa.Column('category', lawcategory, nullable=False),
        sa.Column('property_type', propertyapplicability, nullable=False),
        sa.Column('one_line_summary', sa.String(length=280), nullable=False),
        sa.Column('short_summary', sa.Text(), nullable=False),
        sa.Column('detailed_explanation', sa.Text(), nullable=False),
        sa.Column('real_world_example', sa.Text(), nullable=True),
        sa.Column('common_disputes', sa.Text(), nullable=True),
        sa.Column('buyer_implications', sa.Text(), nullable=True),
        sa.Column('seller_implications', sa.Text(), nullable=True),
        sa.Column('landlord_implications', sa.Text(), nullable=True),
        sa.Column('tenant_implications', sa.Text(), nullable=True),
        sa.Column('original_text_de', sa.Text(), nullable=True),
        sa.Column('last_amended', sa.DateTime(timezone=True), nullable=True),
        sa.Column('change_history', sa.Text(), nullable=True),
        sa.Column('search_vector', postgresql.TSVECTOR(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_law_citation'), 'law', ['citation'], unique=True)
    op.create_index(op.f('ix_law_category'), 'law', ['category'], unique=False)
    op.create_index('ix_law_search_vector', 'law', ['search_vector'], unique=False, postgresql_using='gin')

    # Create related_law association table
    op.create_table(
        'related_law',
        sa.Column('law_id', sa.UUID(), nullable=False),
        sa.Column('related_law_id', sa.UUID(), nullable=False),
        sa.Column('relationship_type', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['law_id'], ['law.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['related_law_id'], ['law.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('law_id', 'related_law_id')
    )

    # Create court_ruling table
    op.create_table(
        'court_ruling',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('law_id', sa.UUID(), nullable=False),
        sa.Column('court_name', sa.String(length=200), nullable=False),
        sa.Column('case_number', sa.String(length=100), nullable=False),
        sa.Column('ruling_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('significance', sa.Text(), nullable=True),
        sa.Column('source_url', sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(['law_id'], ['law.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_court_ruling_law_id'), 'court_ruling', ['law_id'], unique=False)

    # Create state_variation table
    op.create_table(
        'state_variation',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('law_id', sa.UUID(), nullable=False),
        sa.Column('state_code', sa.String(length=2), nullable=False),
        sa.Column('state_name', sa.String(length=100), nullable=False),
        sa.Column('variation_title', sa.String(length=255), nullable=False),
        sa.Column('variation_value', sa.String(length=100), nullable=True),
        sa.Column('variation_description', sa.Text(), nullable=False),
        sa.Column('effective_date', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['law_id'], ['law.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_state_variation_law_id'), 'state_variation', ['law_id'], unique=False)
    op.create_index('ix_state_variation_law_state', 'state_variation', ['law_id', 'state_code'], unique=True)

    # Create law_bookmark table
    op.create_table(
        'law_bookmark',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('law_id', sa.UUID(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['law_id'], ['law.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_law_bookmark_user_id'), 'law_bookmark', ['user_id'], unique=False)
    op.create_index(op.f('ix_law_bookmark_law_id'), 'law_bookmark', ['law_id'], unique=False)
    op.create_index('ix_law_bookmark_user_law', 'law_bookmark', ['user_id', 'law_id'], unique=True)

    # Create law_journey_step_link table
    op.create_table(
        'law_journey_step_link',
        sa.Column('law_id', sa.UUID(), nullable=False),
        sa.Column('step_content_key', sa.String(length=100), nullable=False),
        sa.Column('relevance_score', sa.Integer(), nullable=False, server_default='50'),
        sa.ForeignKeyConstraint(['law_id'], ['law.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('law_id', 'step_content_key')
    )

    # Create law_version table
    op.create_table(
        'law_version',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('law_id', sa.UUID(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('changed_by', sa.String(length=255), nullable=True),
        sa.Column('change_reason', sa.Text(), nullable=True),
        sa.Column('content_snapshot', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['law_id'], ['law.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_law_version_law_id'), 'law_version', ['law_id'], unique=False)

    # Create trigger function for updating search_vector
    op.execute("""
        CREATE OR REPLACE FUNCTION law_search_vector_update() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', COALESCE(NEW.title_en, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.citation, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.one_line_summary, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(NEW.short_summary, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(NEW.detailed_explanation, '')), 'C') ||
                setweight(to_tsvector('english', COALESCE(NEW.real_world_example, '')), 'D');
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger for auto-updating search_vector
    op.execute("""
        CREATE TRIGGER law_search_vector_trigger
        BEFORE INSERT OR UPDATE ON law
        FOR EACH ROW
        EXECUTE FUNCTION law_search_vector_update();
    """)


def downgrade() -> None:
    # Drop trigger
    op.execute("DROP TRIGGER IF EXISTS law_search_vector_trigger ON law")
    op.execute("DROP FUNCTION IF EXISTS law_search_vector_update()")

    # Drop tables
    op.drop_index(op.f('ix_law_version_law_id'), table_name='law_version')
    op.drop_table('law_version')
    op.drop_table('law_journey_step_link')
    op.drop_index('ix_law_bookmark_user_law', table_name='law_bookmark')
    op.drop_index(op.f('ix_law_bookmark_law_id'), table_name='law_bookmark')
    op.drop_index(op.f('ix_law_bookmark_user_id'), table_name='law_bookmark')
    op.drop_table('law_bookmark')
    op.drop_index('ix_state_variation_law_state', table_name='state_variation')
    op.drop_index(op.f('ix_state_variation_law_id'), table_name='state_variation')
    op.drop_table('state_variation')
    op.drop_index(op.f('ix_court_ruling_law_id'), table_name='court_ruling')
    op.drop_table('court_ruling')
    op.drop_table('related_law')
    op.drop_index('ix_law_search_vector', table_name='law')
    op.drop_index(op.f('ix_law_category'), table_name='law')
    op.drop_index(op.f('ix_law_citation'), table_name='law')
    op.drop_table('law')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS propertyapplicability')
    op.execute('DROP TYPE IF EXISTS lawcategory')
