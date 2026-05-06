"""Tests for the Rental Journey Service."""

import uuid
from unittest.mock import MagicMock

import pytest

from app.models.journey import (
    FinancingType,
    JourneyPhase,
    JourneyStep,
    JourneyTask,
    JourneyType,
    PropertyType,
)
from app.schemas.journey import QuestionnaireAnswers
from app.services.journey_service import (
    RENTAL_STEP_TEMPLATES,
    STEP_TEMPLATES,
    generate_journey,
)


@pytest.fixture
def rental_answers() -> QuestionnaireAnswers:
    """Create questionnaire answers for a rental journey."""
    return QuestionnaireAnswers(
        journey_type=JourneyType.RENTAL,
        property_location="Berlin",
        is_first_time_buyer=True,
        has_german_residency=False,
        budget_euros=1200,
    )


@pytest.fixture
def buying_answers() -> QuestionnaireAnswers:
    """Create questionnaire answers for a buying journey (regression test)."""
    return QuestionnaireAnswers(
        journey_type=JourneyType.BUYING,
        property_type=PropertyType.APARTMENT,
        property_location="Berlin",
        financing_type=FinancingType.MORTGAGE,
        is_first_time_buyer=True,
        has_german_residency=True,
        budget_euros=300000,
    )


class TestRentalStepTemplates:
    """Tests for RENTAL_STEP_TEMPLATES structure."""

    def test_has_14_steps(self) -> None:
        assert len(RENTAL_STEP_TEMPLATES) == 14

    def test_covers_all_rental_phases(self) -> None:
        phases = {t.phase for t in RENTAL_STEP_TEMPLATES}
        assert phases == {
            JourneyPhase.RENTAL_SEARCH,
            JourneyPhase.RENTAL_APPLICATION,
            JourneyPhase.RENTAL_CONTRACT,
            JourneyPhase.RENTAL_MOVE_IN,
        }

    def test_rental_search_has_3_steps(self) -> None:
        search_steps = [
            t for t in RENTAL_STEP_TEMPLATES if t.phase == JourneyPhase.RENTAL_SEARCH
        ]
        assert len(search_steps) == 3

    def test_rental_application_has_3_steps(self) -> None:
        app_steps = [
            t
            for t in RENTAL_STEP_TEMPLATES
            if t.phase == JourneyPhase.RENTAL_APPLICATION
        ]
        assert len(app_steps) == 3

    def test_rental_contract_has_4_steps(self) -> None:
        contract_steps = [
            t for t in RENTAL_STEP_TEMPLATES if t.phase == JourneyPhase.RENTAL_CONTRACT
        ]
        assert len(contract_steps) == 4

    def test_rental_move_in_has_4_steps(self) -> None:
        move_in_steps = [
            t for t in RENTAL_STEP_TEMPLATES if t.phase == JourneyPhase.RENTAL_MOVE_IN
        ]
        assert len(move_in_steps) == 4

    def test_all_steps_have_tasks(self) -> None:
        for template in RENTAL_STEP_TEMPLATES:
            assert len(template.tasks) > 0, f"Step '{template.title}' has no tasks"

    def test_no_buying_specific_content_keys(self) -> None:
        buying_keys = {t.content_key for t in STEP_TEMPLATES}
        rental_keys = {t.content_key for t in RENTAL_STEP_TEMPLATES}
        assert buying_keys.isdisjoint(rental_keys), (
            f"Overlap: {buying_keys & rental_keys}"
        )


class TestGenerateRentalJourney:
    """Tests for generating a rental journey."""

    def test_rental_journey_sets_journey_type(
        self, rental_answers: QuestionnaireAnswers
    ) -> None:
        session = MagicMock(spec=["add", "flush", "commit", "refresh"])
        user_id = uuid.uuid4()

        journey = generate_journey(
            session, user_id, "My Rental Journey", rental_answers
        )

        assert journey.journey_type == JourneyType.RENTAL

    def test_rental_journey_sets_rental_search_phase(
        self, rental_answers: QuestionnaireAnswers
    ) -> None:
        session = MagicMock(spec=["add", "flush", "commit", "refresh"])
        user_id = uuid.uuid4()

        journey = generate_journey(
            session, user_id, "My Rental Journey", rental_answers
        )

        assert journey.current_phase == JourneyPhase.RENTAL_SEARCH

    def test_rental_journey_creates_14_steps(
        self, rental_answers: QuestionnaireAnswers
    ) -> None:
        session = MagicMock(spec=["add", "flush", "commit", "refresh"])
        user_id = uuid.uuid4()

        generate_journey(session, user_id, "My Rental Journey", rental_answers)

        # Count JourneyStep objects added to session
        step_calls = [
            call
            for call in session.add.call_args_list
            if isinstance(call[0][0], JourneyStep)
        ]
        assert len(step_calls) == 14

    def test_rental_journey_creates_tasks(
        self, rental_answers: QuestionnaireAnswers
    ) -> None:
        session = MagicMock(spec=["add", "flush", "commit", "refresh"])
        user_id = uuid.uuid4()

        generate_journey(session, user_id, "My Rental Journey", rental_answers)

        task_calls = [
            call
            for call in session.add.call_args_list
            if isinstance(call[0][0], JourneyTask)
        ]
        assert len(task_calls) > 0

    def test_rental_journey_has_no_buying_fields(
        self, rental_answers: QuestionnaireAnswers
    ) -> None:
        session = MagicMock(spec=["add", "flush", "commit", "refresh"])
        user_id = uuid.uuid4()

        journey = generate_journey(
            session, user_id, "My Rental Journey", rental_answers
        )

        assert journey.property_type is None
        assert journey.financing_type is None
        assert journey.property_use is None
        assert journey.property_goals is None

    def test_rental_journey_default_title(
        self, rental_answers: QuestionnaireAnswers
    ) -> None:
        session = MagicMock(spec=["add", "flush", "commit", "refresh"])
        user_id = uuid.uuid4()

        journey = generate_journey(session, user_id, "", rental_answers)

        assert journey.title == "My Rental Journey"

    def test_rental_journey_phases_in_order(
        self, rental_answers: QuestionnaireAnswers
    ) -> None:
        session = MagicMock(spec=["add", "flush", "commit", "refresh"])
        user_id = uuid.uuid4()

        generate_journey(session, user_id, "My Rental Journey", rental_answers)

        step_calls = [
            call[0][0]
            for call in session.add.call_args_list
            if isinstance(call[0][0], JourneyStep)
        ]
        phases = [s.phase for s in step_calls]
        expected_order = [
            JourneyPhase.RENTAL_SEARCH,
            JourneyPhase.RENTAL_SEARCH,
            JourneyPhase.RENTAL_SEARCH,
            JourneyPhase.RENTAL_APPLICATION,
            JourneyPhase.RENTAL_APPLICATION,
            JourneyPhase.RENTAL_APPLICATION,
            JourneyPhase.RENTAL_CONTRACT,
            JourneyPhase.RENTAL_CONTRACT,
            JourneyPhase.RENTAL_CONTRACT,
            JourneyPhase.RENTAL_CONTRACT,
            JourneyPhase.RENTAL_MOVE_IN,
            JourneyPhase.RENTAL_MOVE_IN,
            JourneyPhase.RENTAL_MOVE_IN,
            JourneyPhase.RENTAL_MOVE_IN,
        ]
        assert phases == expected_order


class TestBuyingJourneyRegression:
    """Ensure buying journeys still work unchanged."""

    def test_buying_journey_sets_buying_type(
        self, buying_answers: QuestionnaireAnswers
    ) -> None:
        session = MagicMock(spec=["add", "flush", "commit", "refresh"])
        user_id = uuid.uuid4()

        journey = generate_journey(
            session, user_id, "My Property Journey", buying_answers
        )

        assert journey.journey_type == JourneyType.BUYING

    def test_buying_journey_does_not_set_rental_phase(
        self, buying_answers: QuestionnaireAnswers
    ) -> None:
        session = MagicMock(spec=["add", "flush", "commit", "refresh"])
        user_id = uuid.uuid4()

        journey = generate_journey(
            session, user_id, "My Property Journey", buying_answers
        )

        # Buying journey relies on model default (research) — not explicitly set
        # in code. Verify it's not a rental phase.
        assert journey.current_phase != JourneyPhase.RENTAL_SEARCH

    def test_buying_journey_has_property_goals(
        self, buying_answers: QuestionnaireAnswers
    ) -> None:
        session = MagicMock(spec=["add", "flush", "commit", "refresh"])
        user_id = uuid.uuid4()

        journey = generate_journey(
            session, user_id, "My Property Journey", buying_answers
        )

        assert journey.property_goals is not None
        assert journey.property_goals["preferred_property_type"] == "apartment"

    def test_buying_journey_default_title(
        self, buying_answers: QuestionnaireAnswers
    ) -> None:
        session = MagicMock(spec=["add", "flush", "commit", "refresh"])
        user_id = uuid.uuid4()

        journey = generate_journey(session, user_id, "", buying_answers)

        assert journey.title == "My Property Journey"
