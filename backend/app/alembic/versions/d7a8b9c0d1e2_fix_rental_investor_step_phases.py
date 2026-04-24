"""Fix rental investor step phases

Revision ID: d7a8b9c0d1e2
Revises: c5d6e7f8g9h0
Create Date: 2026-04-24 10:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic
revision = "d7a8b9c0d1e2"
down_revision = "c5d6e7f8g9h0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Fix misclassified rental investor steps (match by title, not step_number
    # which can vary across environments):
    # - "Understand Landlord Obligations": research → rental_setup
    # - "Analyze Rental Yield": research → rental_setup
    # - "Plan Property Management": preparation → ownership
    op.execute(
        """
        UPDATE journey_step
        SET phase = 'rental_setup'
        WHERE title IN ('Understand Landlord Obligations', 'Analyze Rental Yield')
          AND phase IN ('research', 'preparation')
        """
    )
    op.execute(
        """
        UPDATE journey_step
        SET phase = 'ownership'
        WHERE title = 'Plan Property Management'
          AND phase = 'preparation'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE journey_step
        SET phase = 'research'
        WHERE title IN ('Understand Landlord Obligations', 'Analyze Rental Yield')
          AND phase = 'rental_setup'
        """
    )
    op.execute(
        """
        UPDATE journey_step
        SET phase = 'preparation'
        WHERE title = 'Plan Property Management'
          AND phase = 'ownership'
        """
    )
