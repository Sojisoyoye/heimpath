"""Tests for the Journey Service."""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from app.models.journey import (
    FinancingType,
    Journey,
    JourneyPhase,
    JourneyStep,
    JourneyTask,
    PropertyType,
    StepStatus,
)
from app.schemas.journey import QuestionnaireAnswers
from app.services.journey_service import (
    STEP_TEMPLATES,
    JourneyNotFoundError,
    StepNotFoundError,
    _should_include_step,
    _sync_step_status_from_tasks,
    generate_journey,
    get_journey,
    get_progress,
    get_step,
    update_step_status,
    update_task_status,
)


@pytest.fixture
def sample_answers() -> QuestionnaireAnswers:
    """Create sample questionnaire answers."""
    return QuestionnaireAnswers(
        property_type=PropertyType.APARTMENT,
        property_location="Berlin",
        financing_type=FinancingType.MORTGAGE,
        is_first_time_buyer=True,
        has_german_residency=True,
        budget_euros=300000,
        target_purchase_date=datetime(2026, 12, 31, tzinfo=timezone.utc),
    )


@pytest.fixture
def cash_buyer_answers() -> QuestionnaireAnswers:
    """Create questionnaire answers for cash buyer."""
    return QuestionnaireAnswers(
        property_type=PropertyType.HOUSE,
        property_location="Munich",
        financing_type=FinancingType.CASH,
        is_first_time_buyer=False,
        has_german_residency=True,
        budget_euros=500000,
    )


@pytest.fixture
def non_resident_answers() -> QuestionnaireAnswers:
    """Create questionnaire answers for non-German resident."""
    return QuestionnaireAnswers(
        property_type=PropertyType.APARTMENT,
        property_location="Frankfurt",
        financing_type=FinancingType.MORTGAGE,
        is_first_time_buyer=True,
        has_german_residency=False,
        budget_euros=400000,
    )


class TestShouldIncludeStep:
    """Tests for step inclusion logic."""

    def test_includes_step_without_conditions(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that steps without conditions are always included."""
        template = STEP_TEMPLATES[0]
        assert _should_include_step(template, sample_answers)

    def test_includes_mortgage_step_for_mortgage_buyer(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that mortgage steps are included for mortgage buyers."""
        mortgage_step = next(
            (
                t
                for t in STEP_TEMPLATES
                if t.conditions and "financing_type" in t.conditions
            ),
            None,
        )
        if mortgage_step:
            assert _should_include_step(mortgage_step, sample_answers)

    def test_excludes_mortgage_step_for_cash_buyer(
        self, cash_buyer_answers: QuestionnaireAnswers
    ) -> None:
        """Test that mortgage steps are excluded for cash buyers."""
        mortgage_step = next(
            (
                t
                for t in STEP_TEMPLATES
                if t.conditions
                and "financing_type" in t.conditions
                and "cash" not in t.conditions.get("financing_type", [])
            ),
            None,
        )
        if mortgage_step:
            assert not _should_include_step(mortgage_step, cash_buyer_answers)


class TestGenerateJourney:
    """Tests for journey generation."""

    def test_generates_journey_with_steps(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that journey is generated with steps."""
        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = None

        user_id = uuid.uuid4()

        _journey = generate_journey(
            session=mock_session,
            user_id=user_id,
            title="Test Journey",
            answers=sample_answers,
        )

        assert mock_session.add.called
        assert mock_session.flush.called
        assert mock_session.commit.called

    def test_journey_stores_questionnaire_answers(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that questionnaire answers are stored in journey."""
        mock_session = MagicMock()
        user_id = uuid.uuid4()

        journey = generate_journey(
            session=mock_session,
            user_id=user_id,
            title="Test Journey",
            answers=sample_answers,
        )

        assert journey.property_type == sample_answers.property_type
        assert journey.property_location == sample_answers.property_location
        assert journey.financing_type == sample_answers.financing_type
        assert journey.is_first_time_buyer == sample_answers.is_first_time_buyer
        assert journey.has_german_residency == sample_answers.has_german_residency
        assert journey.budget_euros == sample_answers.budget_euros

    def test_property_goals_prefilled_from_questionnaire(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that property_goals.preferred_property_type is pre-filled from questionnaire."""
        mock_session = MagicMock()
        user_id = uuid.uuid4()

        journey = generate_journey(
            session=mock_session,
            user_id=user_id,
            title="Test Journey",
            answers=sample_answers,
        )

        assert journey.property_goals is not None
        assert (
            journey.property_goals["preferred_property_type"]
            == sample_answers.property_type.value
        )

    def test_property_goals_prefilled_for_house_type(
        self, cash_buyer_answers: QuestionnaireAnswers
    ) -> None:
        """Test that property_goals.preferred_property_type is pre-filled for house type."""
        mock_session = MagicMock()
        user_id = uuid.uuid4()

        journey = generate_journey(
            session=mock_session,
            user_id=user_id,
            title="Test Journey",
            answers=cash_buyer_answers,
        )

        assert journey.property_goals is not None
        assert journey.property_goals["preferred_property_type"] == "house"


class TestGetJourney:
    """Tests for getting journeys."""

    def test_raises_not_found_for_missing_journey(self) -> None:
        """Test that JourneyNotFoundError is raised for missing journey."""
        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = None

        with pytest.raises(JourneyNotFoundError):
            get_journey(
                session=mock_session,
                journey_id=uuid.uuid4(),
                user_id=uuid.uuid4(),
            )

    def test_returns_journey_for_valid_id(self) -> None:
        """Test that journey is returned for valid ID."""
        mock_session = MagicMock()
        mock_journey = MagicMock(spec=Journey)
        mock_session.exec.return_value.first.return_value = mock_journey

        result = get_journey(
            session=mock_session,
            journey_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
        )

        assert result == mock_journey


class TestGetStep:
    """Tests for getting steps."""

    def test_raises_not_found_for_missing_step(self) -> None:
        """Test that StepNotFoundError is raised for missing step."""
        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = None

        with pytest.raises(StepNotFoundError):
            get_step(
                session=mock_session,
                journey_id=uuid.uuid4(),
                step_id=uuid.uuid4(),
            )


class TestUpdateStepStatus:
    """Tests for step status updates."""

    def test_updates_step_to_in_progress(self) -> None:
        """Test updating step status to in_progress."""
        mock_session = MagicMock()
        mock_step = MagicMock(spec=JourneyStep)
        mock_step.prerequisites = None
        mock_step.started_at = None
        mock_session.exec.return_value.first.return_value = mock_step

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()

        _result = update_step_status(
            session=mock_session,
            journey=mock_journey,
            step_id=uuid.uuid4(),
            new_status=StepStatus.IN_PROGRESS,
        )

        assert mock_step.status == StepStatus.IN_PROGRESS
        assert mock_step.started_at is not None

    def test_updates_step_to_completed(self) -> None:
        """Test updating step status to completed."""
        mock_session = MagicMock()
        mock_step = MagicMock(spec=JourneyStep)
        mock_step.prerequisites = None
        mock_step.started_at = datetime.now(timezone.utc)
        mock_session.exec.return_value.first.side_effect = [mock_step, None]

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()

        update_step_status(
            session=mock_session,
            journey=mock_journey,
            step_id=uuid.uuid4(),
            new_status=StepStatus.COMPLETED,
        )

        assert mock_step.status == StepStatus.COMPLETED
        assert mock_step.completed_at is not None


class TestGetProgress:
    """Tests for progress calculation."""

    def test_calculates_progress_percentage(self) -> None:
        """Test that progress percentage is calculated correctly."""
        mock_session = MagicMock()

        step1 = MagicMock(spec=JourneyStep)
        step1.status = StepStatus.COMPLETED
        step1.phase = JourneyPhase.RESEARCH
        step1.estimated_duration_days = 5

        step2 = MagicMock(spec=JourneyStep)
        step2.status = StepStatus.IN_PROGRESS
        step2.phase = JourneyPhase.RESEARCH
        step2.estimated_duration_days = 7

        step3 = MagicMock(spec=JourneyStep)
        step3.status = StepStatus.NOT_STARTED
        step3.phase = JourneyPhase.PREPARATION
        step3.estimated_duration_days = 10

        mock_session.exec.return_value.all.return_value = [step1, step2, step3]

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 2
        mock_journey.current_phase = JourneyPhase.RESEARCH

        progress = get_progress(mock_session, mock_journey)

        assert progress["total_steps"] == 3
        assert progress["completed_steps"] == 1
        assert progress["progress_percentage"] == pytest.approx(33.33, rel=0.1)
        assert progress["estimated_days_remaining"] == 17  # 7 + 10

    def test_calculates_phase_breakdown(self) -> None:
        """Test that phase breakdown is calculated correctly."""
        mock_session = MagicMock()

        step1 = MagicMock(spec=JourneyStep)
        step1.status = StepStatus.COMPLETED
        step1.phase = JourneyPhase.RESEARCH
        step1.estimated_duration_days = 5

        step2 = MagicMock(spec=JourneyStep)
        step2.status = StepStatus.NOT_STARTED
        step2.phase = JourneyPhase.RESEARCH
        step2.estimated_duration_days = 7

        mock_session.exec.return_value.all.return_value = [step1, step2]

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 1
        mock_journey.current_phase = JourneyPhase.RESEARCH

        progress = get_progress(mock_session, mock_journey)

        assert progress["phases"]["research"]["total"] == 2
        assert progress["phases"]["research"]["completed"] == 1


class TestStepTemplates:
    """Tests for step template ordering and content."""

    def test_step_templates_total_count(self) -> None:
        """Test that there are 17 step templates."""
        assert len(STEP_TEMPLATES) == 17

    def test_find_property_is_step_3(self) -> None:
        """Test that Find a Property (property_search) is step 3."""
        template = STEP_TEMPLATES[2]  # 0-indexed
        assert template.step_number == 3
        assert template.content_key == "property_search"
        assert template.phase == JourneyPhase.RESEARCH

    def test_property_evaluation_template_exists(self) -> None:
        """Test that property_evaluation template exists with correct attributes."""
        template = next(
            (t for t in STEP_TEMPLATES if t.content_key == "property_evaluation"),
            None,
        )
        assert template is not None
        assert template.step_number == 4
        assert template.phase == JourneyPhase.RESEARCH
        assert template.prerequisites == [3]
        assert len(template.tasks) == 4
        assert template.conditions is None

    def test_mortgage_comparison_template_exists(self) -> None:
        """Test that mortgage_comparison template exists with conditions."""
        template = next(
            (t for t in STEP_TEMPLATES if t.content_key == "mortgage_comparison"),
            None,
        )
        assert template is not None
        assert template.step_number == 8
        assert template.phase == JourneyPhase.PREPARATION
        assert template.prerequisites == [7]
        assert template.conditions == {"financing_type": ["mortgage", "mixed"]}
        assert len(template.tasks) == 4

    def test_mortgage_comparison_excluded_for_cash_buyer(
        self, cash_buyer_answers: QuestionnaireAnswers
    ) -> None:
        """Test that mortgage_comparison is excluded for cash buyers."""
        template = next(
            (t for t in STEP_TEMPLATES if t.content_key == "mortgage_comparison"),
            None,
        )
        assert template is not None
        assert not _should_include_step(template, cash_buyer_answers)

    def test_research_phase_steps_order(self) -> None:
        """Test that steps 1-5 are RESEARCH phase with correct content_keys."""
        expected = [
            (1, "research_goals"),
            (2, "market_research"),
            (3, "property_search"),
            (4, "property_evaluation"),
            (5, "buying_costs"),
        ]
        research_steps = [t for t in STEP_TEMPLATES if t.phase == JourneyPhase.RESEARCH]
        assert len(research_steps) == 5
        for template, (expected_num, expected_key) in zip(
            research_steps, expected, strict=True
        ):
            assert template.step_number == expected_num
            assert template.content_key == expected_key


def _make_task(
    step_id: uuid.UUID, is_completed: bool = False, task_id: uuid.UUID | None = None
) -> MagicMock:
    """Create a mock JourneyTask."""
    task = MagicMock(spec=JourneyTask)
    task.id = task_id or uuid.uuid4()
    task.step_id = step_id
    task.is_completed = is_completed
    task.completed_at = datetime.now(timezone.utc) if is_completed else None
    return task


class TestUpdateTaskStatusSyncsStepStatus:
    """Tests for automatic step status sync when tasks are toggled."""

    def test_first_task_checked_moves_step_to_in_progress(self) -> None:
        """Test that checking the first task on a not_started step moves it to in_progress."""
        step_id = uuid.uuid4()
        task1 = _make_task(step_id, is_completed=False)
        task2 = _make_task(step_id, is_completed=False)

        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = task1
        mock_session.exec.return_value.all.return_value = [task1, task2]

        mock_step = MagicMock(spec=JourneyStep)
        mock_step.id = step_id
        mock_step.status = StepStatus.NOT_STARTED
        mock_step.started_at = None
        mock_step.step_number = 1

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 1
        mock_journey.completed_at = None

        update_task_status(
            session=mock_session,
            step=mock_step,
            task_id=task1.id,
            is_completed=True,
            journey=mock_journey,
        )

        assert task1.is_completed is True
        assert mock_step.status == StepStatus.IN_PROGRESS
        assert mock_step.started_at is not None

    def test_all_tasks_completed_moves_step_to_completed(self) -> None:
        """Test that completing the last task marks the step as completed."""
        step_id = uuid.uuid4()
        task1 = _make_task(step_id, is_completed=True)
        task2 = _make_task(step_id, is_completed=False)  # Will be set to True

        mock_session = MagicMock()
        mock_session.exec.return_value.first.side_effect = [task2, None]
        mock_session.exec.return_value.all.return_value = [task1, task2]

        mock_step = MagicMock(spec=JourneyStep)
        mock_step.id = step_id
        mock_step.status = StepStatus.IN_PROGRESS
        mock_step.started_at = datetime.now(timezone.utc)
        mock_step.step_number = 1

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 1
        mock_journey.completed_at = None

        update_task_status(
            session=mock_session,
            step=mock_step,
            task_id=task2.id,
            is_completed=True,
            journey=mock_journey,
        )

        assert task2.is_completed is True
        assert mock_step.status == StepStatus.COMPLETED
        assert mock_step.completed_at is not None

    def test_unchecking_task_reverts_completed_step_to_in_progress(self) -> None:
        """Test that unchecking a task on a completed step reverts it to in_progress."""
        step_id = uuid.uuid4()
        task1 = _make_task(step_id, is_completed=True)
        task2 = _make_task(step_id, is_completed=True)  # Will be unchecked

        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = task2
        mock_session.exec.return_value.all.return_value = [task1, task2]

        mock_step = MagicMock(spec=JourneyStep)
        mock_step.id = step_id
        mock_step.status = StepStatus.COMPLETED
        mock_step.completed_at = datetime.now(timezone.utc)
        mock_step.step_number = 2

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 3
        mock_journey.completed_at = None

        update_task_status(
            session=mock_session,
            step=mock_step,
            task_id=task2.id,
            is_completed=False,
            journey=mock_journey,
        )

        assert task2.is_completed is False
        assert mock_step.status == StepStatus.IN_PROGRESS
        assert mock_step.completed_at is None
        assert mock_journey.current_step_number == 2

    def test_partial_completion_keeps_step_in_progress(self) -> None:
        """Test that completing some but not all tasks keeps step in_progress."""
        step_id = uuid.uuid4()
        task1 = _make_task(step_id, is_completed=True)
        task2 = _make_task(step_id, is_completed=False)
        task3 = _make_task(step_id, is_completed=False)  # Will be completed

        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = task3
        mock_session.exec.return_value.all.return_value = [task1, task2, task3]

        mock_step = MagicMock(spec=JourneyStep)
        mock_step.id = step_id
        mock_step.status = StepStatus.IN_PROGRESS
        mock_step.started_at = datetime.now(timezone.utc)
        mock_step.step_number = 1

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 1
        mock_journey.completed_at = None

        update_task_status(
            session=mock_session,
            step=mock_step,
            task_id=task3.id,
            is_completed=True,
            journey=mock_journey,
        )

        assert mock_step.status == StepStatus.IN_PROGRESS

    def test_completing_last_step_sets_journey_completed_at(self) -> None:
        """Test that completing all tasks on the last incomplete step sets journey.completed_at."""
        step_id = uuid.uuid4()
        task1 = _make_task(step_id, is_completed=True)
        task2 = _make_task(step_id, is_completed=False)  # Will be set to True

        mock_session = MagicMock()
        mock_session.exec.return_value.first.side_effect = [task2, None]
        mock_session.exec.return_value.all.return_value = [task1, task2]

        mock_step = MagicMock(spec=JourneyStep)
        mock_step.id = step_id
        mock_step.status = StepStatus.IN_PROGRESS
        mock_step.started_at = datetime.now(timezone.utc)
        mock_step.step_number = 3

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 3
        mock_journey.completed_at = None

        update_task_status(
            session=mock_session,
            step=mock_step,
            task_id=task2.id,
            is_completed=True,
            journey=mock_journey,
        )

        assert mock_step.status == StepStatus.COMPLETED
        assert mock_journey.completed_at is not None

    def test_unchecking_task_clears_journey_completed_at(self) -> None:
        """Test that unchecking a task on a completed step clears journey.completed_at if set."""
        step_id = uuid.uuid4()
        task1 = _make_task(step_id, is_completed=True)
        task2 = _make_task(step_id, is_completed=True)  # Will be unchecked

        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = task2
        mock_session.exec.return_value.all.return_value = [task1, task2]

        mock_step = MagicMock(spec=JourneyStep)
        mock_step.id = step_id
        mock_step.status = StepStatus.COMPLETED
        mock_step.completed_at = datetime.now(timezone.utc)
        mock_step.step_number = 3

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 4
        mock_journey.completed_at = datetime.now(timezone.utc)

        update_task_status(
            session=mock_session,
            step=mock_step,
            task_id=task2.id,
            is_completed=False,
            journey=mock_journey,
        )

        assert mock_step.status == StepStatus.IN_PROGRESS
        assert mock_step.completed_at is None
        assert mock_journey.completed_at is None
        assert mock_journey.current_step_number == 3

    def test_zero_tasks_step_not_affected(self) -> None:
        """Test that a step with zero tasks is not affected by _sync_step_status_from_tasks."""
        step_id = uuid.uuid4()
        task = _make_task(step_id, is_completed=False)

        mock_session = MagicMock()
        mock_session.exec.return_value.all.return_value = []

        mock_step = MagicMock(spec=JourneyStep)
        mock_step.id = step_id
        mock_step.status = StepStatus.NOT_STARTED
        mock_step.started_at = None
        mock_step.step_number = 1

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 1
        mock_journey.completed_at = None

        _sync_step_status_from_tasks(
            session=mock_session,
            step=mock_step,
            updated_task=task,
            journey=mock_journey,
        )

        assert mock_step.status == StepStatus.NOT_STARTED
