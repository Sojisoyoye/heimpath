"""Migrate SCHUFA ratings to NextGen Score categories

Revision ID: a3b4c5d6e7f8
Revises: d6z7a8b9c0e1
Create Date: 2026-04-22 12:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "a3b4c5d6e7f8"
down_revision = "d6z7a8b9c0e1"
branch_labels = None
depends_on = None

# Old category name → new category name
RENAME_MAP = {
    "satisfactory": "acceptable",
    "adequate": "sufficient",
    "poor": "insufficient",
}

REVERSE_MAP = {v: k for k, v in RENAME_MAP.items()}


def upgrade() -> None:
    for old_name, new_name in RENAME_MAP.items():
        op.execute(
            f"UPDATE financing_assessment "
            f"SET schufa_rating = '{new_name}' "
            f"WHERE schufa_rating = '{old_name}'"
        )


def downgrade() -> None:
    for new_name, old_name in REVERSE_MAP.items():
        op.execute(
            f"UPDATE financing_assessment "
            f"SET schufa_rating = '{old_name}' "
            f"WHERE schufa_rating = '{new_name}'"
        )
