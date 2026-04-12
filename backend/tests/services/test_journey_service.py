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
    StepTemplate,
    _matches_conditions,
    _personalize_buying_costs,
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

    def test_property_goals_budget_max_prefilled_from_budget_euros(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that property_goals.budget_max_euros is pre-filled from budget_euros."""
        mock_session = MagicMock()
        user_id = uuid.uuid4()

        journey = generate_journey(
            session=mock_session,
            user_id=user_id,
            title="Test Journey",
            answers=sample_answers,
        )

        assert journey.property_goals is not None
        assert journey.property_goals["budget_max_euros"] == sample_answers.budget_euros

    def test_property_goals_budget_min_prefilled_when_provided(
        self,
    ) -> None:
        """Test that property_goals.budget_min_euros is pre-filled when provided."""
        answers = QuestionnaireAnswers(
            property_type=PropertyType.APARTMENT,
            property_location="Berlin",
            financing_type=FinancingType.MORTGAGE,
            is_first_time_buyer=True,
            has_german_residency=True,
            budget_euros=400000,
            budget_min_euros=200000,
        )
        mock_session = MagicMock()

        journey = generate_journey(
            session=mock_session,
            user_id=uuid.uuid4(),
            title="Test Journey",
            answers=answers,
        )

        assert journey.property_goals is not None
        assert journey.property_goals["budget_min_euros"] == 200000
        assert journey.property_goals["budget_max_euros"] == 400000

    def test_property_goals_budget_min_none_when_not_provided(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that budget_min_euros is None in property_goals when not in questionnaire."""
        mock_session = MagicMock()

        journey = generate_journey(
            session=mock_session,
            user_id=uuid.uuid4(),
            title="Test Journey",
            answers=sample_answers,
        )

        assert journey.property_goals is not None
        assert journey.property_goals["budget_min_euros"] is None


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
        """Test that there are 19 step templates."""
        assert len(STEP_TEMPLATES) == 19

    def test_find_property_is_step_3(self) -> None:
        """Test that Find a Property (property_search) is step 3."""
        template = STEP_TEMPLATES[2]  # 0-indexed
        assert template.step_number == 3
        assert template.content_key == "property_search"
        assert template.phase == JourneyPhase.RESEARCH

    def test_step_3_property_search_tasks(self) -> None:
        """Test that step 3 has 10 tasks: 6 required, 4 optional."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "property_search")
        assert len(template.tasks) == 10
        required = [t for t in template.tasks if t["is_required"]]
        optional = [t for t in template.tasks if not t["is_required"]]
        assert len(required) == 6
        assert len(optional) == 4

    def test_step_3_includes_research_tasks(self) -> None:
        """Test that step 3 includes property research tasks like exposé and land registry."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "property_search")
        task_titles = [t["title"] for t in template.tasks]
        assert any("exposé" in t for t in task_titles)
        assert any("Grundbuchauszug" in t for t in task_titles)
        assert any("Energieausweis" in t for t in task_titles)

    def test_step_3_has_related_laws(self) -> None:
        """Test that step 3 references relevant German laws."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "property_search")
        assert template.related_laws is not None
        assert len(template.related_laws) > 0

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

    def test_step_2_market_research_tasks(self) -> None:
        """Test that step 2 has 5 tasks: 4 required, 1 optional."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "market_research")
        assert len(template.tasks) == 5
        required = [t for t in template.tasks if t["is_required"]]
        optional = [t for t in template.tasks if not t["is_required"]]
        assert len(required) == 4
        assert len(optional) == 1

    def test_step_10_due_diligence_tasks(self) -> None:
        """Test that step 10 (due_diligence) has 8 tasks: 5 required, 3 optional."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "due_diligence")
        assert len(template.tasks) == 8
        required = [t for t in template.tasks if t["is_required"]]
        optional = [t for t in template.tasks if not t["is_required"]]
        assert len(required) == 5
        assert len(optional) == 3

    def test_step_10_expose_task_says_review_not_request(self) -> None:
        """Test that step 10 exposé task says 'Review' not 'Request'."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "due_diligence")
        expose_tasks = [t for t in template.tasks if "exposé" in t["title"].lower()]
        assert len(expose_tasks) == 1
        assert expose_tasks[0]["title"] == "Review the property exposé"
        assert "Request" not in expose_tasks[0]["title"]

    def test_step_10_includes_lawyer_task(self) -> None:
        """Test that step 10 includes an optional task for hiring a real estate lawyer."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "due_diligence")
        lawyer_tasks = [t for t in template.tasks if "Immobilienanwalt" in t["title"]]
        assert len(lawyer_tasks) == 1
        assert (
            lawyer_tasks[0]["title"]
            == "Consider hiring a real estate lawyer (Immobilienanwalt)"
        )
        assert lawyer_tasks[0]["is_required"] is False

    def test_proof_of_funds_template_exists(self) -> None:
        """Test that proof_of_funds template exists with correct attributes."""
        template = next(
            (t for t in STEP_TEMPLATES if t.content_key == "proof_of_funds"),
            None,
        )
        assert template is not None
        assert template.step_number == 18
        assert template.phase == JourneyPhase.PREPARATION
        assert template.conditions == {"financing_type": ["cash"]}
        assert template.prerequisites == [5]
        assert len(template.tasks) == 4
        assert all(t["is_required"] for t in template.tasks)

    def test_proof_of_funds_included_for_cash_buyer(
        self, cash_buyer_answers: QuestionnaireAnswers
    ) -> None:
        """Test that proof_of_funds step is included for cash buyers."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "proof_of_funds")
        assert _should_include_step(template, cash_buyer_answers)

    def test_proof_of_funds_excluded_for_mortgage_buyer(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that proof_of_funds step is excluded for mortgage buyers."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "proof_of_funds")
        assert not _should_include_step(template, sample_answers)

    def test_loan_commitment_template_exists(self) -> None:
        """Test that loan_commitment template exists with correct attributes."""
        template = next(
            (t for t in STEP_TEMPLATES if t.content_key == "loan_commitment"),
            None,
        )
        assert template is not None
        assert template.step_number == 19
        assert template.phase == JourneyPhase.BUYING
        assert template.conditions == {"financing_type": ["mortgage", "mixed"]}
        assert template.prerequisites == [13]
        assert len(template.tasks) == 4
        assert all(t["is_required"] for t in template.tasks)

    def test_loan_commitment_included_for_mortgage_buyer(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that loan_commitment step is included for mortgage buyers."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "loan_commitment")
        assert _should_include_step(template, sample_answers)

    def test_loan_commitment_excluded_for_cash_buyer(
        self, cash_buyer_answers: QuestionnaireAnswers
    ) -> None:
        """Test that loan_commitment step is excluded for cash buyers."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "loan_commitment")
        assert not _should_include_step(template, cash_buyer_answers)

    def test_notary_signing_prerequisites_include_loan_commitment(self) -> None:
        """Test that notary signing (step 14) has prerequisites [13, 19]."""
        template = next(t for t in STEP_TEMPLATES if t.content_key == "notary_signing")
        assert template.prerequisites == [13, 19]

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


def _generate_steps_with_tasks(
    answers: QuestionnaireAnswers,
) -> dict[str, list[JourneyTask]]:
    """Generate journey and return a dict mapping step title -> list of tasks.

    Since mock sessions don't assign real IDs, we group by add-call order:
    each JourneyStep is followed by its JourneyTask objects until the next step.
    """
    mock_session = MagicMock()
    mock_session.exec.return_value.first.return_value = None

    generate_journey(
        session=mock_session,
        user_id=uuid.uuid4(),
        title="Test Journey",
        answers=answers,
    )

    result: dict[str, list[JourneyTask]] = {}
    current_step_title: str | None = None
    for call in mock_session.add.call_args_list:
        obj = call.args[0]
        if isinstance(obj, JourneyStep):
            current_step_title = obj.title
            result[current_step_title] = []
        elif isinstance(obj, JourneyTask) and current_step_title is not None:
            result[current_step_title].append(obj)
    return result


def _generate_steps(answers: QuestionnaireAnswers) -> list[JourneyStep]:
    """Generate journey steps from answers and return the JourneyStep objects added to the session."""
    mock_session = MagicMock()
    mock_session.exec.return_value.first.return_value = None

    generate_journey(
        session=mock_session,
        user_id=uuid.uuid4(),
        title="Test Journey",
        answers=answers,
    )

    return [
        call.args[0]
        for call in mock_session.add.call_args_list
        if isinstance(call.args[0], JourneyStep)
    ]


class TestJourneyStepGeneration:
    """Tests for step generation with new conditional steps."""

    def test_cash_buyer_includes_proof_of_funds(
        self, cash_buyer_answers: QuestionnaireAnswers
    ) -> None:
        """Test that a cash buyer journey includes 'Prepare Proof of Funds'."""
        steps = _generate_steps(cash_buyer_answers)
        step_titles = [s.title for s in steps]
        assert "Prepare Proof of Funds" in step_titles

    def test_cash_buyer_excludes_loan_commitment(
        self, cash_buyer_answers: QuestionnaireAnswers
    ) -> None:
        """Test that a cash buyer journey does NOT include 'Secure Final Loan Commitment'."""
        steps = _generate_steps(cash_buyer_answers)
        step_titles = [s.title for s in steps]
        assert "Secure Final Loan Commitment" not in step_titles

    def test_mortgage_buyer_includes_loan_commitment(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that a mortgage buyer journey includes 'Secure Final Loan Commitment'."""
        steps = _generate_steps(sample_answers)
        step_titles = [s.title for s in steps]
        assert "Secure Final Loan Commitment" in step_titles

    def test_mortgage_buyer_excludes_proof_of_funds(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that a mortgage buyer journey does NOT include 'Prepare Proof of Funds'."""
        steps = _generate_steps(sample_answers)
        step_titles = [s.title for s in steps]
        assert "Prepare Proof of Funds" not in step_titles

    def test_cash_buyer_notary_signing_prereq_excludes_loan_commitment(
        self, cash_buyer_answers: QuestionnaireAnswers
    ) -> None:
        """Test that for cash buyers, Step 14 prereq resolves to just [remapped 13].

        Step 19 (loan commitment) is excluded for cash buyers, so its prerequisite
        reference in Step 14 is silently dropped by the remap logic.
        """
        steps = _generate_steps(cash_buyer_answers)
        notary_step = next((s for s in steps if s.title == "Sign at the Notary"), None)
        assert notary_step is not None
        assert notary_step.prerequisites is not None
        assert len(notary_step.prerequisites) == 1

    def test_mortgage_buyer_notary_signing_has_two_prereqs(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that for mortgage buyers, Step 14 prereqs include both 13 and 19 (remapped)."""
        steps = _generate_steps(sample_answers)
        notary_step = next((s for s in steps if s.title == "Sign at the Notary"), None)
        assert notary_step is not None
        assert notary_step.prerequisites is not None
        assert len(notary_step.prerequisites) == 2


class TestMatchesConditions:
    """Tests for the _matches_conditions helper."""

    def test_none_conditions_always_matches(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that None conditions always match."""
        assert _matches_conditions(None, sample_answers)

    def test_matches_bool_condition(self, sample_answers: QuestionnaireAnswers) -> None:
        """Test that boolean condition matches."""
        assert _matches_conditions({"has_german_residency": True}, sample_answers)

    def test_rejects_bool_condition(self, sample_answers: QuestionnaireAnswers) -> None:
        """Test that boolean condition rejects non-match."""
        assert not _matches_conditions({"has_german_residency": False}, sample_answers)

    def test_matches_list_condition(self, sample_answers: QuestionnaireAnswers) -> None:
        """Test that list condition matches."""
        assert _matches_conditions(
            {"financing_type": ["mortgage", "mixed"]}, sample_answers
        )

    def test_rejects_list_condition(
        self, cash_buyer_answers: QuestionnaireAnswers
    ) -> None:
        """Test that list condition rejects non-match."""
        assert not _matches_conditions(
            {"financing_type": ["mortgage", "mixed"]}, cash_buyer_answers
        )


class TestTailoredDocumentTasks:
    """Tests for Step 9 task-level conditional filtering."""

    def test_documents_prep_included_for_all_buyers(
        self,
        sample_answers: QuestionnaireAnswers,
        cash_buyer_answers: QuestionnaireAnswers,
    ) -> None:
        """Test that Prepare Required Documents step is included for all buyers."""
        for answers in [sample_answers, cash_buyer_answers]:
            steps_with_tasks = _generate_steps_with_tasks(answers)
            assert "Prepare Required Documents" in steps_with_tasks

    def test_resident_mortgage_gets_universal_and_mortgage_tasks(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that a resident mortgage buyer gets universal + mortgage tasks, not non-resident tasks."""
        doc_tasks = _generate_steps_with_tasks(sample_answers)[
            "Prepare Required Documents"
        ]
        task_titles = [t.title for t in doc_tasks]

        # Universal tasks
        assert "Obtain proof of identity (passport/ID)" in task_titles
        assert "Get proof of address in Germany" in task_titles
        assert "Prepare recent bank statements" in task_titles
        # Mortgage tasks
        assert "Gather salary statements and employment contract" in task_titles
        assert "Request your SCHUFA credit report" in task_titles
        # Non-resident tasks should NOT be present
        assert (
            "Get apostilled or translated copies of personal documents"
            not in task_titles
        )
        assert (
            "Obtain proof of legal residency or visa documentation" not in task_titles
        )

    def test_non_resident_mortgage_gets_all_tasks(
        self, non_resident_answers: QuestionnaireAnswers
    ) -> None:
        """Test that a non-resident mortgage buyer gets universal + non-resident + mortgage tasks."""
        doc_tasks = _generate_steps_with_tasks(non_resident_answers)[
            "Prepare Required Documents"
        ]
        task_titles = [t.title for t in doc_tasks]

        # All 7 tasks should be present
        assert len(doc_tasks) == 7
        assert (
            "Get apostilled or translated copies of personal documents" in task_titles
        )
        assert "Obtain proof of legal residency or visa documentation" in task_titles
        assert "Gather salary statements and employment contract" in task_titles
        assert "Request your SCHUFA credit report" in task_titles

    def test_cash_resident_gets_only_universal_tasks(
        self, cash_buyer_answers: QuestionnaireAnswers
    ) -> None:
        """Test that a cash-paying resident gets only universal tasks."""
        doc_tasks = _generate_steps_with_tasks(cash_buyer_answers)[
            "Prepare Required Documents"
        ]
        task_titles = [t.title for t in doc_tasks]

        # Only 3 universal tasks
        assert len(doc_tasks) == 3
        assert "Obtain proof of identity (passport/ID)" in task_titles
        assert "Get proof of address in Germany" in task_titles
        assert "Prepare recent bank statements" in task_titles
        # No conditional tasks
        assert "Gather salary statements and employment contract" not in task_titles
        assert "Request your SCHUFA credit report" not in task_titles
        assert (
            "Get apostilled or translated copies of personal documents"
            not in task_titles
        )

    def test_task_order_is_sequential(
        self, non_resident_answers: QuestionnaireAnswers
    ) -> None:
        """Test that task order values are sequential after filtering."""
        doc_tasks = _generate_steps_with_tasks(non_resident_answers)[
            "Prepare Required Documents"
        ]
        sorted_tasks = sorted(doc_tasks, key=lambda t: t.order)
        orders = [t.order for t in sorted_tasks]
        assert orders == list(range(len(doc_tasks)))


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

    def test_all_tasks_unchecked_reverts_in_progress_step_to_not_started(
        self,
    ) -> None:
        """All tasks unchecked on an in_progress step reverts it to not_started."""
        step_id = uuid.uuid4()
        task1 = _make_task(step_id, is_completed=False)
        task2 = _make_task(step_id, is_completed=True)  # Will be unchecked

        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = task2
        mock_session.exec.return_value.all.return_value = [task1, task2]

        mock_step = MagicMock(spec=JourneyStep)
        mock_step.id = step_id
        mock_step.status = StepStatus.IN_PROGRESS
        mock_step.started_at = datetime.now(timezone.utc)
        mock_step.step_number = 1

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 1

        update_task_status(
            session=mock_session,
            step=mock_step,
            task_id=task2.id,
            is_completed=False,
            journey=mock_journey,
        )

        assert task2.is_completed is False
        assert mock_step.status == StepStatus.NOT_STARTED
        assert mock_step.started_at is None

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


class TestStep4StatusTransitions:
    """Regression tests for Step 4 ('Evaluate Your Property') status transitions.

    Step 4 has four required tasks and uses task checkboxes to drive status.
    These tests confirm the 3-state logic (not_started → in_progress → completed
    and the reversion path) works correctly for a step with four tasks.
    """

    def _make_four_tasks(self, step_id: uuid.UUID) -> list[JourneyTask]:
        return [_make_task(step_id, is_completed=False) for _ in range(4)]

    def test_first_task_checked_moves_step4_to_in_progress(self) -> None:
        """Checking the first of four tasks moves step from not_started to in_progress."""
        step_id = uuid.uuid4()
        tasks = self._make_four_tasks(step_id)

        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = tasks[0]
        mock_session.exec.return_value.all.return_value = tasks

        mock_step = MagicMock(spec=JourneyStep)
        mock_step.id = step_id
        mock_step.status = StepStatus.NOT_STARTED
        mock_step.started_at = None
        mock_step.step_number = 4

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 4
        mock_journey.completed_at = None

        update_task_status(
            session=mock_session,
            step=mock_step,
            task_id=tasks[0].id,
            is_completed=True,
            journey=mock_journey,
        )

        assert tasks[0].is_completed is True
        assert mock_step.status == StepStatus.IN_PROGRESS
        assert mock_step.started_at is not None

    def test_all_four_tasks_checked_moves_step4_to_completed(self) -> None:
        """Checking the last of four tasks moves step from in_progress to completed."""
        step_id = uuid.uuid4()
        tasks = [
            _make_task(step_id, is_completed=True),
            _make_task(step_id, is_completed=True),
            _make_task(step_id, is_completed=True),
            _make_task(step_id, is_completed=False),  # last task being checked
        ]

        mock_session = MagicMock()
        mock_session.exec.return_value.first.side_effect = [tasks[3], None]
        mock_session.exec.return_value.all.return_value = tasks

        mock_step = MagicMock(spec=JourneyStep)
        mock_step.id = step_id
        mock_step.status = StepStatus.IN_PROGRESS
        mock_step.started_at = datetime.now(timezone.utc)
        mock_step.step_number = 4

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 4
        mock_journey.completed_at = None

        update_task_status(
            session=mock_session,
            step=mock_step,
            task_id=tasks[3].id,
            is_completed=True,
            journey=mock_journey,
        )

        assert tasks[3].is_completed is True
        assert mock_step.status == StepStatus.COMPLETED
        assert mock_step.completed_at is not None
        assert mock_journey.completed_at is not None

    def test_unchecking_all_four_tasks_reverts_step4_to_not_started(self) -> None:
        """Unchecking the last checked task reverts step from in_progress to not_started."""
        step_id = uuid.uuid4()
        tasks = [
            _make_task(step_id, is_completed=False),
            _make_task(step_id, is_completed=False),
            _make_task(step_id, is_completed=False),
            _make_task(
                step_id, is_completed=True
            ),  # last checked task, being unchecked
        ]

        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = tasks[3]
        mock_session.exec.return_value.all.return_value = tasks

        mock_step = MagicMock(spec=JourneyStep)
        mock_step.id = step_id
        mock_step.status = StepStatus.IN_PROGRESS
        mock_step.started_at = datetime.now(timezone.utc)
        mock_step.step_number = 4

        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.current_step_number = 4
        mock_journey.completed_at = None

        update_task_status(
            session=mock_session,
            step=mock_step,
            task_id=tasks[3].id,
            is_completed=False,
            journey=mock_journey,
        )

        assert tasks[3].is_completed is False
        assert mock_step.status == StepStatus.NOT_STARTED
        assert mock_step.started_at is None


class TestPersonalizeBuyingCosts:
    """Tests for _personalize_buying_costs helper."""

    @pytest.fixture
    def buying_costs_template(self) -> StepTemplate:
        """Return the buying_costs StepTemplate."""
        return next(t for t in STEP_TEMPLATES if t.content_key == "buying_costs")

    def test_budget_and_valid_state_personalizes_titles_and_descriptions(
        self, buying_costs_template: StepTemplate
    ) -> None:
        """Budget + valid state → titles show state rate, descriptions show EUR amounts."""
        answers = QuestionnaireAnswers(
            property_type=PropertyType.APARTMENT,
            property_location="BE",  # Berlin, 6.0%
            financing_type=FinancingType.MORTGAGE,
            is_first_time_buyer=True,
            has_german_residency=True,
            budget_euros=300_000,
        )

        tasks, costs = _personalize_buying_costs(buying_costs_template, answers)

        # Transfer tax task personalized to Berlin 6.0%
        assert "6.0%" in tasks[0]["title"]
        assert "Berlin" in tasks[0]["title"]
        assert tasks[0]["description"] is not None
        assert "18,000 EUR" in tasks[0]["description"]

        # Notary fees task shows EUR amount
        assert tasks[1]["description"] is not None
        assert "4,500 EUR" in tasks[1]["description"]

        # Land registry fees task shows EUR amount
        assert tasks[2]["description"] is not None
        assert "1,500 EUR" in tasks[2]["description"]

        # Agent commission task shows EUR amount
        assert tasks[3]["description"] is not None
        assert "10,710 EUR" in tasks[3]["description"]

    def test_no_budget_with_valid_state_shows_rate_without_amounts(
        self, buying_costs_template: StepTemplate
    ) -> None:
        """No budget + valid state → titles show state rate, no EUR amounts in descriptions."""
        answers = QuestionnaireAnswers(
            property_type=PropertyType.APARTMENT,
            property_location="BY",  # Bayern, 3.5%
            financing_type=FinancingType.CASH,
            is_first_time_buyer=True,
            has_german_residency=True,
            budget_euros=None,
        )

        tasks, costs = _personalize_buying_costs(buying_costs_template, answers)

        # Transfer tax title personalized to Bayern
        assert "3.5%" in tasks[0]["title"]
        assert "Bayern" in tasks[0]["title"]
        # No description (no budget to compute amounts)
        assert tasks[0]["description"] is None

        # Non-state tasks fall back to originals (no budget)
        assert tasks[1].get("description") is None
        assert tasks[2].get("description") is None
        assert tasks[3].get("description") is None

    def test_budget_with_unknown_state_falls_back_for_tax_only(
        self, buying_costs_template: StepTemplate
    ) -> None:
        """Budget + unknown state → transfer tax uses original, notary/registry still personalized."""
        answers = QuestionnaireAnswers(
            property_type=PropertyType.HOUSE,
            property_location="Frankfurt",  # Not a state code
            financing_type=FinancingType.MORTGAGE,
            is_first_time_buyer=False,
            has_german_residency=True,
            budget_euros=500_000,
        )

        tasks, costs = _personalize_buying_costs(buying_costs_template, answers)

        # Transfer tax task uses original (unknown state)
        assert tasks[0]["title"] == buying_costs_template.tasks[0]["title"]
        assert tasks[0].get("description") is None

        # Notary and registry are still personalized with budget
        assert "7,500 EUR" in tasks[1]["description"]
        assert "2,500 EUR" in tasks[2]["description"]
        assert "17,850 EUR" in tasks[3]["description"]

    def test_budget_and_valid_state_estimated_costs_personalized(
        self, buying_costs_template: StepTemplate
    ) -> None:
        """Budget + valid state → estimated_costs dict has EUR amounts and total_estimated."""
        answers = QuestionnaireAnswers(
            property_type=PropertyType.APARTMENT,
            property_location="BE",  # Berlin, 6.0%
            financing_type=FinancingType.MORTGAGE,
            is_first_time_buyer=True,
            has_german_residency=True,
            budget_euros=300_000,
        )

        _tasks, costs = _personalize_buying_costs(buying_costs_template, answers)

        assert "18,000 EUR" in costs["grunderwerbsteuer"]
        assert "4,500 EUR" in costs["notary_fees"]
        assert "1,500 EUR" in costs["land_registry"]
        assert "10,710 EUR" in costs["agent_commission"]
        assert "total_estimated" in costs
        # Total: 300000 * (6.0 + 1.5 + 0.5 + 3.57) / 100 = 34,710
        assert "34,710 EUR" in costs["total_estimated"]

    def test_no_budget_estimated_costs_has_no_total(
        self, buying_costs_template: StepTemplate
    ) -> None:
        """No budget → estimated_costs has no total_estimated key."""
        answers = QuestionnaireAnswers(
            property_type=PropertyType.APARTMENT,
            property_location="BE",
            financing_type=FinancingType.CASH,
            is_first_time_buyer=True,
            has_german_residency=True,
            budget_euros=None,
        )

        _tasks, costs = _personalize_buying_costs(buying_costs_template, answers)

        assert "total_estimated" not in costs
        assert "6.0%" in costs["grunderwerbsteuer"]
