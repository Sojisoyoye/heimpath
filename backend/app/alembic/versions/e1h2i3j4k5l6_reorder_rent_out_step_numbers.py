"""Reorder rent-out investor step numbers

Revision ID: e1h2i3j4k5l6
Revises: f0g1h2i3j4k5
Create Date: 2026-04-24 20:00:00.000000

Steps 20, 21, 24 (Understand Landlord Obligations, Analyze Rental Yield,
Set Up Rental Operations) had step_numbers that placed them between closing
(step 17) and the post-purchase ownership onboarding (steps 25-28). Since
step_number determines journey ordering, rent-out investors saw these steps
appear before ownership registration, insurance, and management setup —
logically incorrect.

Renumbering to 29, 30, 31 places them after the ownership onboarding block,
creating the correct post-purchase flow:
  closing → ownership onboarding (25-28) → rental-specific steps (29-31)
"""

from alembic import op

# revision identifiers, used by Alembic
revision = "e1h2i3j4k5l6"
down_revision = "f0g1h2i3j4k5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update journey.current_step_number BEFORE changing journey_step.step_number
    # so the join on step_number still resolves correctly.
    op.execute(
        """
        UPDATE journey
        SET current_step_number = 29
        WHERE current_step_number = 20
          AND id IN (
            SELECT journey_id FROM journey_step
            WHERE title = 'Understand Landlord Obligations'
              AND step_number = 20
          )
        """
    )
    op.execute(
        """
        UPDATE journey
        SET current_step_number = 30
        WHERE current_step_number = 21
          AND id IN (
            SELECT journey_id FROM journey_step
            WHERE title = 'Analyze Rental Yield'
              AND step_number = 21
          )
        """
    )
    op.execute(
        """
        UPDATE journey
        SET current_step_number = 31
        WHERE current_step_number = 24
          AND id IN (
            SELECT journey_id FROM journey_step
            WHERE title = 'Set Up Rental Operations'
              AND step_number = 24
          )
        """
    )

    # Now renumber the journey_step rows.
    op.execute(
        """
        UPDATE journey_step
        SET step_number = 29
        WHERE title = 'Understand Landlord Obligations'
          AND step_number = 20
        """
    )
    op.execute(
        """
        UPDATE journey_step
        SET step_number = 30
        WHERE title = 'Analyze Rental Yield'
          AND step_number = 21
        """
    )
    op.execute(
        """
        UPDATE journey_step
        SET step_number = 31
        WHERE title = 'Set Up Rental Operations'
          AND step_number = 24
        """
    )


def downgrade() -> None:
    # Restore current_step_number first, then revert step_numbers.
    op.execute(
        """
        UPDATE journey
        SET current_step_number = 20
        WHERE current_step_number = 29
          AND id IN (
            SELECT journey_id FROM journey_step
            WHERE title = 'Understand Landlord Obligations'
              AND step_number = 29
          )
        """
    )
    op.execute(
        """
        UPDATE journey
        SET current_step_number = 21
        WHERE current_step_number = 30
          AND id IN (
            SELECT journey_id FROM journey_step
            WHERE title = 'Analyze Rental Yield'
              AND step_number = 30
          )
        """
    )
    op.execute(
        """
        UPDATE journey
        SET current_step_number = 24
        WHERE current_step_number = 31
          AND id IN (
            SELECT journey_id FROM journey_step
            WHERE title = 'Set Up Rental Operations'
              AND step_number = 31
          )
        """
    )

    op.execute(
        """
        UPDATE journey_step
        SET step_number = 20
        WHERE title = 'Understand Landlord Obligations'
          AND step_number = 29
        """
    )
    op.execute(
        """
        UPDATE journey_step
        SET step_number = 21
        WHERE title = 'Analyze Rental Yield'
          AND step_number = 30
        """
    )
    op.execute(
        """
        UPDATE journey_step
        SET step_number = 24
        WHERE title = 'Set Up Rental Operations'
          AND step_number = 31
        """
    )
