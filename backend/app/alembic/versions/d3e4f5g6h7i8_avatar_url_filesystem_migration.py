"""Migrate avatar_url to filesystem storage

Clears any legacy base64-encoded avatar values that were stored directly in
the database and changes the column type to String(500) to hold filesystem
URLs only.

NOTE: This migration is NOT fully reversible. The upgrade irreversibly
NULLs base64 blobs (they cannot be reconstructed from the filesystem).
Running downgrade reverts the column type to Text but leaves previously-
uploaded avatars with a NULL avatar_url.

Revision ID: d3e4f5g6h7i8
Revises: c2d3e4f5g6h7
Create Date: 2026-04-27 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "d3e4f5g6h7i8"
down_revision = "c2d3e4f5g6h7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Clear legacy base64-encoded avatar values (they start with "data:")
    op.execute(
        "UPDATE \"user\" SET avatar_url = NULL WHERE avatar_url LIKE 'data:%'"
    )
    # Change column type from Text to String(500)
    op.alter_column(
        "user",
        "avatar_url",
        existing_type=sa.Text(),
        type_=sa.String(500),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "user",
        "avatar_url",
        existing_type=sa.String(500),
        type_=sa.Text(),
        existing_nullable=True,
    )
