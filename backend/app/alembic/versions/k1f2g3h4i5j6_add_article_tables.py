"""Add article tables

Revision ID: k1f2g3h4i5j6
Revises: j0e1f2g3h4i5
Create Date: 2026-02-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'k1f2g3h4i5j6'
down_revision = 'j0e1f2g3h4i5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types with existence check
    connection = op.get_bind()

    for enum_name, values in [
        ('articlecategory', ['buying_process', 'costs_and_taxes', 'regulations', 'common_pitfalls']),
        ('articlestatus', ['draft', 'published', 'archived']),
        ('difficultylevel', ['beginner', 'intermediate', 'advanced']),
    ]:
        result = connection.execute(
            sa.text("SELECT 1 FROM pg_type WHERE typname = :name"),
            {"name": enum_name}
        )
        if not result.fetchone():
            values_str = ", ".join(f"'{v}'" for v in values)
            connection.execute(
                sa.text(f"CREATE TYPE {enum_name} AS ENUM ({values_str})")
            )

    # Define enums for table creation
    articlecategory = postgresql.ENUM(
        'buying_process', 'costs_and_taxes', 'regulations', 'common_pitfalls',
        name='articlecategory', create_type=False
    )
    articlestatus = postgresql.ENUM(
        'draft', 'published', 'archived',
        name='articlestatus', create_type=False
    )
    difficultylevel = postgresql.ENUM(
        'beginner', 'intermediate', 'advanced',
        name='difficultylevel', create_type=False
    )

    # Create article table
    op.create_table(
        'article',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('meta_description', sa.String(length=320), nullable=False),
        sa.Column('category', articlecategory, nullable=False),
        sa.Column('difficulty_level', difficultylevel, nullable=False),
        sa.Column('status', articlestatus, nullable=False, server_default='draft'),
        sa.Column('excerpt', sa.Text(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('key_takeaways', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('reading_time_minutes', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('author_name', sa.String(length=255), nullable=False),
        sa.Column('related_law_ids', postgresql.JSONB(), nullable=True, server_default='[]'),
        sa.Column('related_calculator_types', postgresql.JSONB(), nullable=True, server_default='[]'),
        sa.Column('search_vector', postgresql.TSVECTOR(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_article_slug'), 'article', ['slug'], unique=True)
    op.create_index(op.f('ix_article_category'), 'article', ['category'], unique=False)
    op.create_index(op.f('ix_article_status'), 'article', ['status'], unique=False)
    op.create_index('ix_article_search_vector', 'article', ['search_vector'], unique=False, postgresql_using='gin')

    # Create article_rating table
    op.create_table(
        'article_rating',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('article_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('is_helpful', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['article_id'], ['article.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('article_id', 'user_id', name='uq_article_rating_user')
    )
    op.create_index(op.f('ix_article_rating_article_id'), 'article_rating', ['article_id'], unique=False)
    op.create_index(op.f('ix_article_rating_user_id'), 'article_rating', ['user_id'], unique=False)

    # Create trigger function for updating search_vector
    op.execute("""
        CREATE OR REPLACE FUNCTION article_search_vector_update() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C') ||
                setweight(to_tsvector('english', COALESCE(
                    array_to_string(
                        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.key_takeaways, '[]'::jsonb))),
                        ' '
                    ),
                    ''
                )), 'D');
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger
    op.execute("""
        CREATE TRIGGER article_search_vector_trigger
        BEFORE INSERT OR UPDATE ON article
        FOR EACH ROW
        EXECUTE FUNCTION article_search_vector_update();
    """)


def downgrade() -> None:
    # Drop trigger
    op.execute("DROP TRIGGER IF EXISTS article_search_vector_trigger ON article")
    op.execute("DROP FUNCTION IF EXISTS article_search_vector_update()")

    # Drop tables
    op.drop_index(op.f('ix_article_rating_user_id'), table_name='article_rating')
    op.drop_index(op.f('ix_article_rating_article_id'), table_name='article_rating')
    op.drop_table('article_rating')
    op.drop_index('ix_article_search_vector', table_name='article')
    op.drop_index(op.f('ix_article_status'), table_name='article')
    op.drop_index(op.f('ix_article_category'), table_name='article')
    op.drop_index(op.f('ix_article_slug'), table_name='article')
    op.drop_table('article')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS difficultylevel')
    op.execute('DROP TYPE IF EXISTS articlestatus')
    op.execute('DROP TYPE IF EXISTS articlecategory')
