"""add mietspiegel entry table

Revision ID: a1b2c3d4e5f6
Revises: z2v3w4x5y6a7
Create Date: 2026-04-27 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "a1b2c3d4e5f6"
down_revision = "z2v3w4x5y6a7"
branch_labels = None
depends_on = None

# Representative seed data: 5 cities × postcode-prefix rows + 1 NULL city default each
_SEED_SQL = """
INSERT INTO mietspiegel_entry (id, city, postcode_prefix, base_rent_per_sqm, valid_from, source)
VALUES
    -- Berlin
    (gen_random_uuid(), 'berlin', '10', 13.50, '2023-01-01', 'Berlin Mietspiegel 2023'),
    (gen_random_uuid(), 'berlin', '12', 12.80, '2023-01-01', 'Berlin Mietspiegel 2023'),
    (gen_random_uuid(), 'berlin', '13', 11.90, '2023-01-01', 'Berlin Mietspiegel 2023'),
    (gen_random_uuid(), 'berlin', '14', 12.20, '2023-01-01', 'Berlin Mietspiegel 2023'),
    (gen_random_uuid(), 'berlin', NULL,  12.50, '2023-01-01', 'Berlin Mietspiegel 2023'),

    -- Hamburg
    (gen_random_uuid(), 'hamburg', '20', 14.20, '2023-01-01', 'Hamburg Mietspiegel 2023'),
    (gen_random_uuid(), 'hamburg', '21', 13.50, '2023-01-01', 'Hamburg Mietspiegel 2023'),
    (gen_random_uuid(), 'hamburg', '22', 13.80, '2023-01-01', 'Hamburg Mietspiegel 2023'),
    (gen_random_uuid(), 'hamburg', '25', 12.60, '2023-01-01', 'Hamburg Mietspiegel 2023'),
    (gen_random_uuid(), 'hamburg', NULL,  13.50, '2023-01-01', 'Hamburg Mietspiegel 2023'),

    -- Munich
    (gen_random_uuid(), 'munich', '80', 19.50, '2023-01-01', 'Munich Mietspiegel 2023'),
    (gen_random_uuid(), 'munich', '81', 18.90, '2023-01-01', 'Munich Mietspiegel 2023'),
    (gen_random_uuid(), 'munich', '82', 17.80, '2023-01-01', 'Munich Mietspiegel 2023'),
    (gen_random_uuid(), 'munich', '85', 16.40, '2023-01-01', 'Munich Mietspiegel 2023'),
    (gen_random_uuid(), 'munich', NULL,  18.00, '2023-01-01', 'Munich Mietspiegel 2023'),

    -- Frankfurt
    (gen_random_uuid(), 'frankfurt', '60', 15.80, '2024-01-01', 'Frankfurt Mietspiegel 2024'),
    (gen_random_uuid(), 'frankfurt', '61', 14.90, '2024-01-01', 'Frankfurt Mietspiegel 2024'),
    (gen_random_uuid(), 'frankfurt', '63', 14.20, '2024-01-01', 'Frankfurt Mietspiegel 2024'),
    (gen_random_uuid(), 'frankfurt', '65', 13.60, '2024-01-01', 'Frankfurt Mietspiegel 2024'),
    (gen_random_uuid(), 'frankfurt', NULL,  14.80, '2024-01-01', 'Frankfurt Mietspiegel 2024'),

    -- Stuttgart (extra city with prefix + default)
    (gen_random_uuid(), 'stuttgart', '70', 14.50, '2023-01-01', 'Stuttgart Mietspiegel 2023'),
    (gen_random_uuid(), 'stuttgart', '71', 13.80, '2023-01-01', 'Stuttgart Mietspiegel 2023'),
    (gen_random_uuid(), 'stuttgart', '72', 13.20, '2023-01-01', 'Stuttgart Mietspiegel 2023'),
    (gen_random_uuid(), 'stuttgart', '73', 12.90, '2023-01-01', 'Stuttgart Mietspiegel 2023'),
    (gen_random_uuid(), 'stuttgart', NULL,  13.60, '2023-01-01', 'Stuttgart Mietspiegel 2023')
;
"""


def upgrade() -> None:
    op.create_table(
        "mietspiegel_entry",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column("city", sa.String(50), nullable=False),
        sa.Column("postcode_prefix", sa.String(5), nullable=True),
        sa.Column("base_rent_per_sqm", sa.Float(), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_to", sa.Date(), nullable=True),
        sa.Column("source", sa.String(255), nullable=True),
    )
    op.create_index(
        "ix_mietspiegel_entry_city",
        "mietspiegel_entry",
        ["city"],
    )
    op.create_index(
        "ix_mietspiegel_city_postcode",
        "mietspiegel_entry",
        ["city", "postcode_prefix"],
    )
    op.execute(_SEED_SQL)


def downgrade() -> None:
    op.drop_index("ix_mietspiegel_city_postcode", table_name="mietspiegel_entry")
    op.drop_index("ix_mietspiegel_entry_city", table_name="mietspiegel_entry")
    op.drop_table("mietspiegel_entry")
