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
        """Test that there are 28 step templates (19 base + 4 ownership + 5 rental investor)."""
        assert len(STEP_TEMPLATES) == 28

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
        """Test that base RESEARCH steps (1-5) have correct content_keys."""
        expected = [
            (1, "research_goals"),
            (2, "market_research"),
            (3, "property_search"),
            (4, "property_evaluation"),
            (5, "buying_costs"),
        ]
        research_steps = [t for t in STEP_TEMPLATES if t.phase == JourneyPhase.RESEARCH]
        # 5 base steps only — rental investor steps were reclassified to rental_setup/ownership
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


class TestRentalInvestorSteps:
    """Tests for rental investor-specific journey steps."""

    @pytest.fixture
    def rent_out_answers(self) -> QuestionnaireAnswers:
        """Create questionnaire answers for a rental investor."""
        return QuestionnaireAnswers(
            property_type=PropertyType.APARTMENT,
            property_location="Berlin",
            financing_type=FinancingType.MORTGAGE,
            is_first_time_buyer=True,
            has_german_residency=True,
            budget_euros=300000,
            property_use="rent_out",
        )

    @pytest.fixture
    def live_in_answers(self) -> QuestionnaireAnswers:
        """Create questionnaire answers for a live-in buyer."""
        return QuestionnaireAnswers(
            property_type=PropertyType.APARTMENT,
            property_location="Berlin",
            financing_type=FinancingType.MORTGAGE,
            is_first_time_buyer=True,
            has_german_residency=True,
            budget_euros=300000,
            property_use="live_in",
        )

    def test_investor_steps_included_for_rent_out(
        self, rent_out_answers: QuestionnaireAnswers
    ) -> None:
        """Test that rental investor steps are included when property_use is rent_out."""
        steps = _generate_steps(rent_out_answers)
        step_titles = [s.title for s in steps]

        assert "Understand Landlord Obligations" in step_titles
        assert "Analyze Rental Yield" in step_titles
        assert "Plan Property Management" in step_titles
        assert "Prepare Rental Tax Strategy" in step_titles
        assert "Set Up Rental Operations" in step_titles

    def test_investor_steps_excluded_for_live_in(
        self, live_in_answers: QuestionnaireAnswers
    ) -> None:
        """Test that rental investor steps are excluded when property_use is live_in."""
        steps = _generate_steps(live_in_answers)
        step_titles = [s.title for s in steps]

        assert "Understand Landlord Obligations" not in step_titles
        assert "Analyze Rental Yield" not in step_titles
        assert "Plan Property Management" not in step_titles
        assert "Prepare Rental Tax Strategy" not in step_titles
        assert "Set Up Rental Operations" not in step_titles

    def test_investor_steps_excluded_when_property_use_none(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that rental investor steps are excluded when property_use is None (backward compat)."""
        # sample_answers has no property_use (defaults to None)
        steps = _generate_steps(sample_answers)
        step_titles = [s.title for s in steps]

        assert "Understand Landlord Obligations" not in step_titles
        assert "Analyze Rental Yield" not in step_titles
        assert "Plan Property Management" not in step_titles
        assert "Prepare Rental Tax Strategy" not in step_titles
        assert "Set Up Rental Operations" not in step_titles

    def test_rental_setup_phase_in_progress(
        self, rent_out_answers: QuestionnaireAnswers
    ) -> None:
        """Test that progress calculation includes RENTAL_SETUP phase for investor journeys."""
        steps = _generate_steps(rent_out_answers)
        rental_setup_steps = [s for s in steps if s.phase == JourneyPhase.RENTAL_SETUP]
        # 3 rental_setup steps: "Understand Landlord Obligations", "Analyze Rental Yield",
        # and "Set Up Rental Operations"
        assert len(rental_setup_steps) == 3
        titles = {s.title for s in rental_setup_steps}
        assert "Set Up Rental Operations" in titles
        assert "Understand Landlord Obligations" in titles
        assert "Analyze Rental Yield" in titles

    def test_property_use_stored_on_journey(
        self, rent_out_answers: QuestionnaireAnswers
    ) -> None:
        """Test that property_use is persisted on the Journey model."""
        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = None

        journey = generate_journey(
            session=mock_session,
            user_id=uuid.uuid4(),
            title="Test Investor Journey",
            answers=rent_out_answers,
        )

        assert journey.property_use == "rent_out"

    def test_property_use_none_when_not_provided(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that property_use is None when not in questionnaire (backward compat)."""
        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = None

        journey = generate_journey(
            session=mock_session,
            user_id=uuid.uuid4(),
            title="Test Journey",
            answers=sample_answers,
        )

        assert journey.property_use is None

    def test_investor_step_templates_have_correct_phases(
        self,
    ) -> None:
        """Test that investor step templates use the correct phases."""
        rental_templates = [
            t for t in STEP_TEMPLATES if t.conditions and "property_use" in t.conditions
        ]
        assert len(rental_templates) == 5

        content_keys = [t.content_key for t in rental_templates]
        assert "rental_landlord_law" in content_keys
        assert "rental_yield_analysis" in content_keys
        assert "rental_property_management" in content_keys
        assert "rental_tax_strategy" in content_keys
        assert "rental_operations_setup" in content_keys

    def test_investor_step_phases_distribution(
        self,
    ) -> None:
        """Test that investor steps are distributed across the correct phases."""
        rental_templates = {
            t.content_key: t
            for t in STEP_TEMPLATES
            if t.conditions and "property_use" in t.conditions
        }
        assert (
            rental_templates["rental_landlord_law"].phase == JourneyPhase.RENTAL_SETUP
        )
        assert (
            rental_templates["rental_yield_analysis"].phase == JourneyPhase.RENTAL_SETUP
        )
        assert (
            rental_templates["rental_property_management"].phase
            == JourneyPhase.OWNERSHIP
        )
        assert rental_templates["rental_tax_strategy"].phase == JourneyPhase.BUYING
        assert (
            rental_templates["rental_operations_setup"].phase
            == JourneyPhase.RENTAL_SETUP
        )

    def test_investor_steps_each_have_tasks(
        self, rent_out_answers: QuestionnaireAnswers
    ) -> None:
        """Test that each investor step has tasks."""
        steps_with_tasks = _generate_steps_with_tasks(rent_out_answers)
        investor_titles = [
            "Understand Landlord Obligations",
            "Analyze Rental Yield",
            "Plan Property Management",
            "Prepare Rental Tax Strategy",
            "Set Up Rental Operations",
        ]
        for title in investor_titles:
            assert title in steps_with_tasks
            assert len(steps_with_tasks[title]) >= 3

    def test_rental_setup_prerequisite_is_ownership_registration(self) -> None:
        """Test that rental_operations_setup depends on ownership registration (step 25)."""
        template = next(
            t for t in STEP_TEMPLATES if t.content_key == "rental_operations_setup"
        )
        assert template.prerequisites == [25]

    def test_rental_setup_after_ownership_in_generated_journey(
        self, rent_out_answers: QuestionnaireAnswers
    ) -> None:
        """Test that Set Up Rental Operations comes after Complete Property Registration."""
        steps = _generate_steps(rent_out_answers)
        reg_step = next(s for s in steps if s.title == "Complete Property Registration")
        rental_step = next(s for s in steps if s.title == "Set Up Rental Operations")
        assert rental_step.step_number > reg_step.step_number


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


class TestOwnershipPhaseSteps:
    """Tests for the OWNERSHIP phase step templates and generation."""

    @pytest.fixture
    def live_in_apartment_answers(self) -> QuestionnaireAnswers:
        """Answers for a live-in apartment buyer (mortgage)."""
        return QuestionnaireAnswers(
            property_type=PropertyType.APARTMENT,
            property_location="Berlin",
            financing_type=FinancingType.MORTGAGE,
            is_first_time_buyer=True,
            has_german_residency=True,
            budget_euros=300000,
            property_use="live_in",
        )

    @pytest.fixture
    def rent_out_house_answers(self) -> QuestionnaireAnswers:
        """Answers for a rent-out house buyer (mortgage)."""
        return QuestionnaireAnswers(
            property_type=PropertyType.HOUSE,
            property_location="Berlin",
            financing_type=FinancingType.MORTGAGE,
            is_first_time_buyer=True,
            has_german_residency=True,
            budget_euros=500000,
            property_use="rent_out",
        )

    @pytest.fixture
    def rent_out_apartment_cash_answers(self) -> QuestionnaireAnswers:
        """Answers for a rent-out apartment buyer (cash)."""
        return QuestionnaireAnswers(
            property_type=PropertyType.APARTMENT,
            property_location="Berlin",
            financing_type=FinancingType.CASH,
            is_first_time_buyer=False,
            has_german_residency=True,
            budget_euros=400000,
            property_use="rent_out",
        )

    # --- Template existence tests ---

    def test_ownership_templates_exist(self) -> None:
        """Test that all 5 ownership step templates exist with correct content_keys."""
        # 4 base templates (all buyers) + 1 investor-only (rental_property_management)
        ownership_keys = {
            "ownership_registration",
            "ownership_insurance",
            "ownership_management",
            "ownership_tax_finance",
            "rental_property_management",
        }
        found_keys = {
            t.content_key for t in STEP_TEMPLATES if t.phase == JourneyPhase.OWNERSHIP
        }
        assert found_keys == ownership_keys

    def test_ownership_templates_have_no_step_level_conditions(self) -> None:
        """Test that base ownership steps have no step-level conditions (included for all).

        The investor-only "Plan Property Management" step (rental_property_management)
        is also in the ownership phase but carries property_use conditions.
        """
        base_ownership_templates = [
            t
            for t in STEP_TEMPLATES
            if t.phase == JourneyPhase.OWNERSHIP and t.conditions is None
        ]
        base_keys = {t.content_key for t in base_ownership_templates}
        assert base_keys == {
            "ownership_registration",
            "ownership_insurance",
            "ownership_management",
            "ownership_tax_finance",
        }

    # --- Step inclusion tests ---

    def test_ownership_steps_included_for_live_in(
        self, live_in_apartment_answers: QuestionnaireAnswers
    ) -> None:
        """Test that ownership steps are included for live-in buyers."""
        steps = _generate_steps(live_in_apartment_answers)
        step_titles = [s.title for s in steps]
        assert "Complete Property Registration" in step_titles
        assert "Arrange Property Insurance" in step_titles
        assert "Set Up Property Management" in step_titles
        assert "Handle Property Tax & Finance" in step_titles

    def test_ownership_steps_included_for_rent_out(
        self, rent_out_house_answers: QuestionnaireAnswers
    ) -> None:
        """Test that ownership steps are included for rent-out buyers."""
        steps = _generate_steps(rent_out_house_answers)
        step_titles = [s.title for s in steps]
        assert "Complete Property Registration" in step_titles
        assert "Arrange Property Insurance" in step_titles
        assert "Set Up Property Management" in step_titles
        assert "Handle Property Tax & Finance" in step_titles

    def test_ownership_steps_included_when_property_use_none(
        self, sample_answers: QuestionnaireAnswers
    ) -> None:
        """Test that ownership steps are included when property_use is None (backward compat)."""
        steps = _generate_steps(sample_answers)
        step_titles = [s.title for s in steps]
        assert "Complete Property Registration" in step_titles
        assert "Arrange Property Insurance" in step_titles
        assert "Set Up Property Management" in step_titles
        assert "Handle Property Tax & Finance" in step_titles

    # --- Phase ordering tests ---

    def test_ownership_phase_before_rental_setup(
        self, rent_out_house_answers: QuestionnaireAnswers
    ) -> None:
        """Test that investor rental steps are in the correct relative order.

        After the phase reclassification, the sequence for rent-out journeys is:
        - Early rental_setup steps (landlord law, yield analysis): appear before
          all ownership steps — investors research before they buy.
        - Base ownership steps (registration, insurance, etc.): post-purchase
          onboarding, appear before "Set Up Rental Operations".
        - "Set Up Rental Operations": last step — you need to own before operating.
        """
        steps = _generate_steps(rent_out_house_answers)
        ownership_steps = [s for s in steps if s.phase == JourneyPhase.OWNERSHIP]
        rental_steps = [s for s in steps if s.phase == JourneyPhase.RENTAL_SETUP]
        # 5 ownership steps: 4 base + investor "Plan Property Management"
        assert len(ownership_steps) == 5
        # 3 rental_setup steps: "Understand Landlord Obligations", "Analyze Rental Yield",
        # and "Set Up Rental Operations"
        assert len(rental_steps) == 3

        base_ownership_steps = [
            s for s in ownership_steps if s.title != "Plan Property Management"
        ]
        max_base_ownership_num = max(s.step_number for s in base_ownership_steps)

        # Early investor rental_setup steps come before base ownership onboarding
        early_rental_steps = [
            s
            for s in rental_steps
            if s.title in ("Understand Landlord Obligations", "Analyze Rental Yield")
        ]
        min_early_rental_num = min(s.step_number for s in early_rental_steps)
        assert min_early_rental_num < max_base_ownership_num

        # "Set Up Rental Operations" comes after base ownership onboarding
        setup_step = next(
            s for s in rental_steps if s.title == "Set Up Rental Operations"
        )
        assert setup_step.step_number > max_base_ownership_num

    def test_ownership_phase_after_closing(
        self, live_in_apartment_answers: QuestionnaireAnswers
    ) -> None:
        """Test that OWNERSHIP steps appear after CLOSING steps."""
        steps = _generate_steps(live_in_apartment_answers)
        closing_steps = [s for s in steps if s.phase == JourneyPhase.CLOSING]
        ownership_steps = [s for s in steps if s.phase == JourneyPhase.OWNERSHIP]
        assert len(closing_steps) > 0
        assert len(ownership_steps) == 4
        max_closing_num = max(s.step_number for s in closing_steps)
        min_ownership_num = min(s.step_number for s in ownership_steps)
        assert max_closing_num < min_ownership_num

    def test_live_in_journey_ends_with_ownership(
        self, live_in_apartment_answers: QuestionnaireAnswers
    ) -> None:
        """Test that live-in journeys end with OWNERSHIP (no RENTAL_SETUP)."""
        steps = _generate_steps(live_in_apartment_answers)
        last_step = steps[-1]
        assert last_step.phase == JourneyPhase.OWNERSHIP

    # --- Task-level condition tests ---

    def test_anmeldung_task_included_for_live_in(
        self, live_in_apartment_answers: QuestionnaireAnswers
    ) -> None:
        """Test that Anmeldung task is included for live-in buyers."""
        steps_with_tasks = _generate_steps_with_tasks(live_in_apartment_answers)
        reg_tasks = steps_with_tasks["Complete Property Registration"]
        task_titles = [t.title for t in reg_tasks]
        assert "Register new address at Bürgeramt (Anmeldung)" in task_titles

    def test_anmeldung_task_excluded_for_rent_out(
        self, rent_out_house_answers: QuestionnaireAnswers
    ) -> None:
        """Test that Anmeldung task is excluded for rent-out buyers."""
        steps_with_tasks = _generate_steps_with_tasks(rent_out_house_answers)
        reg_tasks = steps_with_tasks["Complete Property Registration"]
        task_titles = [t.title for t in reg_tasks]
        assert "Register new address at Bürgeramt (Anmeldung)" not in task_titles

    def test_contents_insurance_included_for_live_in(
        self, live_in_apartment_answers: QuestionnaireAnswers
    ) -> None:
        """Test that Hausratversicherung task is included for live-in buyers."""
        steps_with_tasks = _generate_steps_with_tasks(live_in_apartment_answers)
        ins_tasks = steps_with_tasks["Arrange Property Insurance"]
        task_titles = [t.title for t in ins_tasks]
        assert "Set up Hausratversicherung (contents insurance)" in task_titles

    def test_contents_insurance_excluded_for_rent_out(
        self, rent_out_house_answers: QuestionnaireAnswers
    ) -> None:
        """Test that Hausratversicherung task is excluded for rent-out buyers."""
        steps_with_tasks = _generate_steps_with_tasks(rent_out_house_answers)
        ins_tasks = steps_with_tasks["Arrange Property Insurance"]
        task_titles = [t.title for t in ins_tasks]
        assert "Set up Hausratversicherung (contents insurance)" not in task_titles

    def test_weg_tasks_included_for_apartment(
        self, live_in_apartment_answers: QuestionnaireAnswers
    ) -> None:
        """Test that WEG/Hausgeld tasks are included for apartment buyers."""
        steps_with_tasks = _generate_steps_with_tasks(live_in_apartment_answers)
        mgmt_tasks = steps_with_tasks["Set Up Property Management"]
        task_titles = [t.title for t in mgmt_tasks]
        assert "Contact WEG-Verwaltung and register as new owner" in task_titles
        assert "Set up Hausgeld (condo fees) payment via Dauerauftrag" in task_titles

    def test_weg_tasks_excluded_for_house(
        self, rent_out_house_answers: QuestionnaireAnswers
    ) -> None:
        """Test that WEG/Hausgeld tasks are excluded for house buyers."""
        steps_with_tasks = _generate_steps_with_tasks(rent_out_house_answers)
        mgmt_tasks = steps_with_tasks["Set Up Property Management"]
        task_titles = [t.title for t in mgmt_tasks]
        assert "Contact WEG-Verwaltung and register as new owner" not in task_titles
        assert (
            "Set up Hausgeld (condo fees) payment via Dauerauftrag" not in task_titles
        )

    def test_house_maintenance_tasks_included_for_house(
        self, rent_out_house_answers: QuestionnaireAnswers
    ) -> None:
        """Test that house maintenance tasks are included for house buyers."""
        steps_with_tasks = _generate_steps_with_tasks(rent_out_house_answers)
        mgmt_tasks = steps_with_tasks["Set Up Property Management"]
        task_titles = [t.title for t in mgmt_tasks]
        assert "Plan annual maintenance budget (Instandhaltungsrücklage)" in task_titles

    def test_house_maintenance_tasks_excluded_for_apartment(
        self, live_in_apartment_answers: QuestionnaireAnswers
    ) -> None:
        """Test that house maintenance tasks are excluded for apartment buyers."""
        steps_with_tasks = _generate_steps_with_tasks(live_in_apartment_answers)
        mgmt_tasks = steps_with_tasks["Set Up Property Management"]
        task_titles = [t.title for t in mgmt_tasks]
        assert (
            "Plan annual maintenance budget (Instandhaltungsrücklage)"
            not in task_titles
        )

    def test_weg_insurance_included_for_apartment(
        self, live_in_apartment_answers: QuestionnaireAnswers
    ) -> None:
        """Test that WEG insurance verification task is included for apartment buyers."""
        steps_with_tasks = _generate_steps_with_tasks(live_in_apartment_answers)
        ins_tasks = steps_with_tasks["Arrange Property Insurance"]
        task_titles = [t.title for t in ins_tasks]
        assert "Verify WEG building insurance policy covers your unit" in task_titles

    def test_weg_insurance_excluded_for_house(
        self, rent_out_house_answers: QuestionnaireAnswers
    ) -> None:
        """Test that WEG insurance verification task is excluded for house buyers."""
        steps_with_tasks = _generate_steps_with_tasks(rent_out_house_answers)
        ins_tasks = steps_with_tasks["Arrange Property Insurance"]
        task_titles = [t.title for t in ins_tasks]
        assert (
            "Verify WEG building insurance policy covers your unit" not in task_titles
        )

    def test_mortgage_tracking_included_for_mortgage(
        self, live_in_apartment_answers: QuestionnaireAnswers
    ) -> None:
        """Test that mortgage tracking task is included for mortgage buyers."""
        steps_with_tasks = _generate_steps_with_tasks(live_in_apartment_answers)
        tax_tasks = steps_with_tasks["Handle Property Tax & Finance"]
        task_titles = [t.title for t in tax_tasks]
        assert (
            "Track mortgage payments and request annual interest statement"
            in task_titles
        )

    def test_mortgage_tracking_excluded_for_cash(
        self, rent_out_apartment_cash_answers: QuestionnaireAnswers
    ) -> None:
        """Test that mortgage tracking task is excluded for cash buyers."""
        steps_with_tasks = _generate_steps_with_tasks(rent_out_apartment_cash_answers)
        tax_tasks = steps_with_tasks["Handle Property Tax & Finance"]
        task_titles = [t.title for t in tax_tasks]
        assert (
            "Track mortgage payments and request annual interest statement"
            not in task_titles
        )

    def test_anlage_v_included_for_rent_out(
        self, rent_out_house_answers: QuestionnaireAnswers
    ) -> None:
        """Test that Anlage V task is included for rent-out buyers."""
        steps_with_tasks = _generate_steps_with_tasks(rent_out_house_answers)
        tax_tasks = steps_with_tasks["Handle Property Tax & Finance"]
        task_titles = [t.title for t in tax_tasks]
        assert "Prepare for Anlage V rental income tax filing" in task_titles

    def test_anlage_v_excluded_for_live_in(
        self, live_in_apartment_answers: QuestionnaireAnswers
    ) -> None:
        """Test that Anlage V task is excluded for live-in buyers."""
        steps_with_tasks = _generate_steps_with_tasks(live_in_apartment_answers)
        tax_tasks = steps_with_tasks["Handle Property Tax & Finance"]
        task_titles = [t.title for t in tax_tasks]
        assert "Prepare for Anlage V rental income tax filing" not in task_titles

    def test_universal_tasks_always_present(
        self, live_in_apartment_answers: QuestionnaireAnswers
    ) -> None:
        """Test that unconditional tasks are always present in ownership steps."""
        steps_with_tasks = _generate_steps_with_tasks(live_in_apartment_answers)

        # Registration universal tasks
        reg_titles = [
            t.title for t in steps_with_tasks["Complete Property Registration"]
        ]
        assert (
            "Confirm Grundbuch (land register) transfer is complete with notary"
            in reg_titles
        )
        assert (
            "Transfer utilities (electricity, gas, water, internet) to your name"
            in reg_titles
        )

        # Management universal tasks
        mgmt_titles = [t.title for t in steps_with_tasks["Set Up Property Management"]]
        assert "Register for waste collection (Müllabfuhr) service" in mgmt_titles

        # Tax universal tasks
        tax_titles = [
            t.title for t in steps_with_tasks["Handle Property Tax & Finance"]
        ]
        assert (
            "Register for Grundsteuer (property tax) at local Finanzamt" in tax_titles
        )
        assert "Keep records of all property expenses for tax deduction" in tax_titles

    def test_step17_utility_task_distinct_from_step25(self) -> None:
        """Test that Step 17 and Step 25 utility tasks have distinct wording."""
        step17 = next(
            t for t in STEP_TEMPLATES if t.content_key == "ownership_transfer"
        )
        step25 = next(
            t for t in STEP_TEMPLATES if t.content_key == "ownership_registration"
        )
        step17_titles = {t["title"] for t in step17.tasks}
        step25_titles = {t["title"] for t in step25.tasks}
        assert step17_titles.isdisjoint(step25_titles)

    # --- Prerequisite tests ---

    def test_ownership_registration_prerequisite_is_ownership_transfer(
        self,
    ) -> None:
        """Test that ownership_registration template has prerequisite [17] (ownership transfer)."""
        template = next(
            t for t in STEP_TEMPLATES if t.content_key == "ownership_registration"
        )
        assert template.prerequisites == [17]

    def test_ownership_insurance_prerequisite_is_registration(self) -> None:
        """Test that ownership_insurance template has prerequisite [25] (registration)."""
        template = next(
            t for t in STEP_TEMPLATES if t.content_key == "ownership_insurance"
        )
        assert template.prerequisites == [25]

    def test_ownership_management_prerequisite_is_registration(self) -> None:
        """Test that ownership_management template has prerequisite [25] (registration)."""
        template = next(
            t for t in STEP_TEMPLATES if t.content_key == "ownership_management"
        )
        assert template.prerequisites == [25]

    def test_ownership_tax_prerequisite_is_registration(self) -> None:
        """Test that ownership_tax_finance template has prerequisite [25] (registration)."""
        template = next(
            t for t in STEP_TEMPLATES if t.content_key == "ownership_tax_finance"
        )
        assert template.prerequisites == [25]
