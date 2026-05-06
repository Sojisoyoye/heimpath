"""Add subscription_tier to user

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Create the subscription tier enum type
    subscription_tier_enum = sa.Enum(
        'free', 'premium', 'enterprise',
        name='subscriptiontier'
    )
    subscription_tier_enum.create(op.get_bind(), checkfirst=True)

    # Add subscription_tier column with default value 'free'
    op.add_column(
        'user',
        sa.Column(
            'subscription_tier',
            subscription_tier_enum,
            nullable=False,
            server_default='free'
        )
    )

    # Remove server default after column creation
    op.alter_column('user', 'subscription_tier', server_default=None)


def downgrade():
    # Drop the column
    op.drop_column('user', 'subscription_tier')

    # Drop the enum type
    sa.Enum(name='subscriptiontier').drop(op.get_bind(), checkfirst=True)
