"""Tests for financing eligibility assessment service."""

import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.schemas.financing import FinancingAssessmentCreate
from app.services.financing_service import (
    AssessmentResult,
    ScoreBreakdown,
    _build_document_checklist,
    _build_improvements,
    _build_strengths,
    _estimate_ltv,
    _estimate_max_loan,
    _likelihood_label,
    _recommended_dp_percent,
    _score_down_payment,
    _score_employment,
    _score_employment_years,
    _score_income_ratio,
    _score_residency,
    _score_schufa,
    assess,
    delete_assessment,
    get_assessment,
    get_by_share_id,
    list_user_assessments,
    save_assessment,
)

# --- Scoring function tests (pure, no mocking needed) ---


def _make_inputs(**overrides) -> FinancingAssessmentCreate:
    """Create default assessment inputs with optional overrides."""
    defaults = {
        "employment_status": "permanent",
        "employment_years": 3,
        "monthly_net_income": 4000.0,
        "monthly_debt": 500.0,
        "available_down_payment": 60000.0,
        "schufa_rating": "good",
        "residency_status": "eu_citizen",
    }
    defaults.update(overrides)
    return FinancingAssessmentCreate(**defaults)


class TestScoreEmployment:
    def test_civil_servant_highest(self) -> None:
        assert _score_employment("civil_servant") == 20.0

    def test_permanent(self) -> None:
        assert _score_employment("permanent") == 18.0

    def test_freelance_low(self) -> None:
        assert _score_employment("freelance") == 6.0

    def test_unknown_status_default(self) -> None:
        assert _score_employment("unknown_status") == 5.0


class TestScoreIncomeRatio:
    def test_low_ratio_high_score(self) -> None:
        assert _score_income_ratio(5000, 500) == 20.0

    def test_moderate_ratio(self) -> None:
        assert _score_income_ratio(5000, 1500) == 12.0

    def test_high_ratio_low_score(self) -> None:
        assert _score_income_ratio(5000, 2500) == 2.0

    def test_zero_income(self) -> None:
        assert _score_income_ratio(0, 500) == 0.0


class TestScoreDownPayment:
    def test_thirty_percent_max(self) -> None:
        assert _score_down_payment(90000) == 20.0

    def test_twenty_percent(self) -> None:
        assert _score_down_payment(60000) == 16.0

    def test_ten_percent(self) -> None:
        assert _score_down_payment(30000) == 12.0

    def test_under_five_percent(self) -> None:
        assert _score_down_payment(10000) == 2.0


class TestScoreSchufa:
    def test_excellent(self) -> None:
        assert _score_schufa("excellent") == 15.0

    def test_poor(self) -> None:
        assert _score_schufa("poor") == 2.0

    def test_unknown_default(self) -> None:
        assert _score_schufa("unknown") == 3.0


class TestScoreResidency:
    def test_german_citizen(self) -> None:
        assert _score_residency("german_citizen") == 15.0

    def test_non_eu(self) -> None:
        assert _score_residency("non_eu") == 4.0


class TestScoreEmploymentYears:
    def test_five_plus_years(self) -> None:
        assert _score_employment_years(5) == 10.0

    def test_two_years(self) -> None:
        assert _score_employment_years(2) == 6.0

    def test_less_than_one(self) -> None:
        assert _score_employment_years(0) == 2.0


class TestLikelihoodLabel:
    def test_high(self) -> None:
        assert _likelihood_label(85) == "High"

    def test_good(self) -> None:
        assert _likelihood_label(65) == "Good"

    def test_moderate(self) -> None:
        assert _likelihood_label(45) == "Moderate"

    def test_low(self) -> None:
        assert _likelihood_label(25) == "Low"

    def test_very_low(self) -> None:
        assert _likelihood_label(10) == "Very Low"


class TestEstimates:
    def test_max_loan(self) -> None:
        assert _estimate_max_loan(5000, 1000) == 400000.0

    def test_max_loan_zero_disposable(self) -> None:
        assert _estimate_max_loan(1000, 1000) == 0.0

    def test_recommended_dp_non_eu(self) -> None:
        result = _recommended_dp_percent("non_eu", "good")
        assert result == 30.0

    def test_recommended_dp_german_excellent(self) -> None:
        result = _recommended_dp_percent("german_citizen", "excellent")
        assert result == 15.0

    def test_ltv(self) -> None:
        result = _estimate_ltv(50000, 200000)
        assert result == 0.8


class TestAdvisoryBuilders:
    def test_strengths_high_scores(self) -> None:
        scores = ScoreBreakdown(
            employment=18,
            income_ratio=18,
            down_payment=18,
            schufa=14,
            residency=13,
            years_bonus=10,
        )
        strengths = _build_strengths(scores)
        assert len(strengths) == 6

    def test_strengths_low_scores_empty(self) -> None:
        scores = ScoreBreakdown(
            employment=5,
            income_ratio=5,
            down_payment=5,
            schufa=3,
            residency=4,
            years_bonus=2,
        )
        strengths = _build_strengths(scores)
        assert len(strengths) == 0

    def test_improvements_low_scores(self) -> None:
        scores = ScoreBreakdown(
            employment=5,
            income_ratio=5,
            down_payment=5,
            schufa=3,
            residency=4,
            years_bonus=2,
        )
        improvements = _build_improvements(scores)
        assert len(improvements) == 6

    def test_document_checklist_base(self) -> None:
        inputs = _make_inputs()
        docs = _build_document_checklist(inputs)
        assert len(docs) >= 6
        assert any("passport" in d.lower() or "id" in d.lower() for d in docs)

    def test_document_checklist_self_employed(self) -> None:
        inputs = _make_inputs(employment_status="self_employed")
        docs = _build_document_checklist(inputs)
        assert any("business" in d.lower() for d in docs)

    def test_document_checklist_non_eu(self) -> None:
        inputs = _make_inputs(residency_status="non_eu")
        docs = _build_document_checklist(inputs)
        assert any("residence permit" in d.lower() for d in docs)


class TestAssess:
    def test_returns_assessment_result(self) -> None:
        inputs = _make_inputs()
        result = assess(inputs)
        assert isinstance(result, AssessmentResult)
        assert 0 <= result.total_score <= 100
        assert result.likelihood_label in (
            "High",
            "Good",
            "Moderate",
            "Low",
            "Very Low",
        )
        assert result.max_loan_estimate > 0
        assert len(result.document_checklist) >= 6

    def test_strong_profile_high_score(self) -> None:
        inputs = _make_inputs(
            employment_status="civil_servant",
            employment_years=10,
            monthly_net_income=6000,
            monthly_debt=200,
            available_down_payment=100000,
            schufa_rating="excellent",
            residency_status="german_citizen",
        )
        result = assess(inputs)
        assert result.total_score >= 80
        assert result.likelihood_label == "High"

    def test_weak_profile_low_score(self) -> None:
        inputs = _make_inputs(
            employment_status="freelance",
            employment_years=0,
            monthly_net_income=2000,
            monthly_debt=1200,
            available_down_payment=5000,
            schufa_rating="poor",
            residency_status="non_eu",
        )
        result = assess(inputs)
        assert result.total_score < 30
        assert result.likelihood_label in ("Low", "Very Low")


# --- CRUD tests with mocked session ---


class TestSaveAssessment:
    @patch("app.services.financing_service.assess")
    def test_saves_and_returns(self, mock_assess: MagicMock) -> None:
        mock_assess.return_value = AssessmentResult(
            scores=ScoreBreakdown(18, 16, 16, 12, 13, 8),
            total_score=83.0,
            likelihood_label="High",
            max_loan_estimate=350000.0,
            recommended_down_payment_percent=15.0,
            expected_rate_min=3.0,
            expected_rate_max=3.8,
            ltv_ratio=0.8,
            strengths=["Good employment"],
            improvements=[],
            document_checklist=["ID"],
        )
        session = MagicMock()
        session.refresh = MagicMock()

        inputs = _make_inputs()
        save_assessment(session, uuid.uuid4(), inputs)

        session.add.assert_called_once()
        session.commit.assert_called_once()
        session.refresh.assert_called_once()


class TestGetAssessment:
    def test_found(self) -> None:
        user_id = uuid.uuid4()
        assessment = MagicMock()
        assessment.user_id = user_id
        session = MagicMock()
        session.get.return_value = assessment

        result = get_assessment(session, uuid.uuid4(), user_id)
        assert result == assessment

    def test_not_found_raises(self) -> None:
        session = MagicMock()
        session.get.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            get_assessment(session, uuid.uuid4(), uuid.uuid4())
        assert exc_info.value.status_code == 404

    def test_wrong_owner_raises(self) -> None:
        assessment = MagicMock()
        assessment.user_id = uuid.uuid4()
        session = MagicMock()
        session.get.return_value = assessment

        with pytest.raises(HTTPException) as exc_info:
            get_assessment(session, uuid.uuid4(), uuid.uuid4())
        assert exc_info.value.status_code == 404


class TestGetByShareId:
    @patch("app.services.financing_service.select")
    def test_found(self, _mock_select: MagicMock) -> None:
        assessment = MagicMock()
        session = MagicMock()
        session.exec.return_value.first.return_value = assessment

        result = get_by_share_id(session, "abc123")
        assert result == assessment

    @patch("app.services.financing_service.select")
    def test_not_found_raises(self, _mock_select: MagicMock) -> None:
        session = MagicMock()
        session.exec.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            get_by_share_id(session, "nonexistent")
        assert exc_info.value.status_code == 404


class TestListUserAssessments:
    @patch("app.services.financing_service.select")
    def test_returns_list(self, _mock_select: MagicMock) -> None:
        session = MagicMock()
        session.exec.return_value.all.return_value = [MagicMock(), MagicMock()]

        result = list_user_assessments(session, uuid.uuid4())
        assert len(result) == 2


class TestDeleteAssessment:
    @patch("app.services.financing_service.get_assessment")
    def test_deletes(self, mock_get: MagicMock) -> None:
        assessment = MagicMock()
        mock_get.return_value = assessment
        session = MagicMock()

        delete_assessment(session, uuid.uuid4(), uuid.uuid4())

        session.delete.assert_called_once_with(assessment)
        session.commit.assert_called_once()
