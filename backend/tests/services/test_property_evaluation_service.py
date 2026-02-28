"""Tests for the Property Evaluation Service."""

import uuid
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.journey import JourneyTask
from app.models.property_evaluation import PropertyEvaluation
from app.schemas.property_evaluation import PropertyEvaluationCreate
from app.services import property_evaluation_service

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_INPUTS = {
    "property_info": {
        "address": "Musterstraße 1, Berlin",
        "square_meters": 60.0,
        "purchase_price": 300000.0,
        "broker_fee_percent": 3.57,
        "notary_fee_percent": 1.5,
        "land_registry_fee_percent": 0.5,
        "transfer_tax_percent": 6.0,
        "state_code": "BE",
    },
    "rent": {
        "rent_per_sqm": 12.0,
        "parking_rent": 50.0,
        "depreciation_rate_percent": 2.0,
        "building_share_percent": 80.0,
        "cost_increase_percent": 2.0,
        "rent_increase_percent": 2.0,
        "value_increase_percent": 2.0,
        "equity_interest_percent": 3.0,
        "marginal_tax_rate_percent": 42.0,
    },
    "operating_costs": {
        "hausgeld_allocable": 150.0,
        "property_tax_monthly": 30.0,
        "hausgeld_non_allocable": 80.0,
        "reserves_portion": 50.0,
    },
    "financing": {
        "loan_percent": 80.0,
        "interest_rate_percent": 3.5,
        "repayment_rate_percent": 2.0,
    },
}


@pytest.fixture
def sample_create() -> PropertyEvaluationCreate:
    """Create a sample PropertyEvaluationCreate."""
    return PropertyEvaluationCreate(
        name="Test Evaluation",
        inputs=SAMPLE_INPUTS,
    )


@pytest.fixture
def sample_create_with_step() -> PropertyEvaluationCreate:
    """Create a sample PropertyEvaluationCreate with journey_step_id."""
    return PropertyEvaluationCreate(
        name="Test Evaluation",
        journey_step_id=uuid.uuid4(),
        inputs=SAMPLE_INPUTS,
    )


# ---------------------------------------------------------------------------
# Tests: calculate_results
# ---------------------------------------------------------------------------


class TestCalculateResults:
    """Tests for calculate_results."""

    def test_returns_expected_keys(self) -> None:
        """Test that all expected result keys are returned."""
        results = property_evaluation_service.calculate_results(SAMPLE_INPUTS)
        expected_keys = {
            "price_per_sqm",
            "total_incidental_costs_percent",
            "total_incidental_costs",
            "total_investment",
            "cold_rent_monthly",
            "warm_rent_monthly",
            "net_cold_rent_yearly",
            "gross_rental_yield",
            "cold_rent_factor",
            "total_allocable_costs",
            "total_non_allocable_costs",
            "total_hausgeld",
            "loan_amount",
            "equity_amount",
            "monthly_interest",
            "monthly_repayment",
            "debt_service_monthly",
            "depreciation_yearly",
            "depreciation_monthly",
            "interest_yearly",
            "taxable_income",
            "taxable_cashflow_monthly",
            "tax_yearly",
            "tax_monthly",
            "cashflow_before_tax",
            "cashflow_after_tax",
            "is_positive_cashflow",
            "net_rental_yield",
            "return_on_equity",
            "return_on_equity_without_appreciation",
        }
        assert set(results.keys()) == expected_keys

    def test_price_per_sqm(self) -> None:
        """Test price per sqm calculation."""
        results = property_evaluation_service.calculate_results(SAMPLE_INPUTS)
        assert results["price_per_sqm"] == pytest.approx(5000.0)

    def test_gross_rental_yield(self) -> None:
        """Test gross rental yield calculation."""
        results = property_evaluation_service.calculate_results(SAMPLE_INPUTS)
        # Cold rent = 12 * 60 + 50 = 770/month = 9240/year
        # Gross yield = 9240 / 300000 * 100 = 3.08%
        assert results["gross_rental_yield"] == pytest.approx(3.08, rel=0.01)

    def test_total_incidental_costs(self) -> None:
        """Test total incidental costs calculation."""
        results = property_evaluation_service.calculate_results(SAMPLE_INPUTS)
        # (3.57 + 1.5 + 0.5 + 6.0) / 100 * 300000 = 34710
        assert results["total_incidental_costs"] == pytest.approx(34710.0)

    def test_loan_amount(self) -> None:
        """Test loan amount calculation."""
        results = property_evaluation_service.calculate_results(SAMPLE_INPUTS)
        # 80% of 300000 = 240000
        assert results["loan_amount"] == pytest.approx(240000.0)

    def test_is_positive_cashflow_type(self) -> None:
        """Test that is_positive_cashflow is a boolean."""
        results = property_evaluation_service.calculate_results(SAMPLE_INPUTS)
        assert isinstance(results["is_positive_cashflow"], bool)

    def test_missing_section_raises_400(self) -> None:
        """Test that missing input section raises HTTPException."""
        with pytest.raises(HTTPException) as exc_info:
            property_evaluation_service.calculate_results({"property_info": {}})
        assert exc_info.value.status_code == 400

    def test_zero_purchase_price_raises_400(self) -> None:
        """Test that zero purchase price raises HTTPException."""
        invalid = {
            **SAMPLE_INPUTS,
            "property_info": {**SAMPLE_INPUTS["property_info"], "purchase_price": 0},
        }
        with pytest.raises(HTTPException) as exc_info:
            property_evaluation_service.calculate_results(invalid)
        assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# Tests: save_evaluation
# ---------------------------------------------------------------------------


class TestSaveEvaluation:
    """Tests for save_evaluation."""

    def test_persists_evaluation(
        self,
        sample_create: PropertyEvaluationCreate,
    ) -> None:
        """Test that evaluation is persisted with correct data."""
        mock_session = MagicMock()
        user_id = uuid.uuid4()

        result = property_evaluation_service.save_evaluation(
            session=mock_session,
            user_id=user_id,
            data=sample_create,
        )

        assert mock_session.add.called
        assert mock_session.commit.called
        assert mock_session.refresh.called
        assert result.purchase_price == 300000.0
        assert result.square_meters == 60.0
        assert result.share_id is not None
        assert result.user_id == user_id

    def test_generates_share_id(
        self,
        sample_create: PropertyEvaluationCreate,
    ) -> None:
        """Test that a share_id is generated."""
        mock_session = MagicMock()
        result = property_evaluation_service.save_evaluation(
            session=mock_session,
            user_id=uuid.uuid4(),
            data=sample_create,
        )
        assert result.share_id is not None
        assert len(result.share_id) > 0

    def test_auto_completes_task_when_step_provided(
        self,
        sample_create_with_step: PropertyEvaluationCreate,
    ) -> None:
        """Test that journey task is auto-completed when journey_step_id is set."""
        mock_session = MagicMock()
        mock_task = MagicMock(spec=JourneyTask)
        mock_task.is_completed = False
        mock_task.title = "Run evaluation calculator"
        mock_session.exec.return_value.first.return_value = mock_task

        property_evaluation_service.save_evaluation(
            session=mock_session,
            user_id=uuid.uuid4(),
            data=sample_create_with_step,
        )

        assert mock_task.is_completed is True
        assert mock_task.completed_at is not None

    def test_no_auto_complete_without_step(
        self,
        sample_create: PropertyEvaluationCreate,
    ) -> None:
        """Test that no task auto-completion happens without journey_step_id."""
        mock_session = MagicMock()

        property_evaluation_service.save_evaluation(
            session=mock_session,
            user_id=uuid.uuid4(),
            data=sample_create,
        )

        # exec should not be called for task lookup (only add/commit/refresh)
        mock_session.exec.assert_not_called()


# ---------------------------------------------------------------------------
# Tests: get_evaluation / get_by_share_id / list
# ---------------------------------------------------------------------------


class TestGetEvaluation:
    """Tests for get_evaluation."""

    def test_returns_evaluation_for_owner(self) -> None:
        """Test that evaluation is returned for the owner."""
        mock_session = MagicMock()
        user_id = uuid.uuid4()
        mock_eval = MagicMock(spec=PropertyEvaluation)
        mock_eval.user_id = user_id
        mock_session.get.return_value = mock_eval

        result = property_evaluation_service.get_evaluation(
            mock_session,
            uuid.uuid4(),
            user_id,
        )
        assert result == mock_eval

    def test_raises_404_for_wrong_user(self) -> None:
        """Test that 404 is raised for wrong user."""
        mock_session = MagicMock()
        mock_eval = MagicMock(spec=PropertyEvaluation)
        mock_eval.user_id = uuid.uuid4()
        mock_session.get.return_value = mock_eval

        with pytest.raises(HTTPException) as exc_info:
            property_evaluation_service.get_evaluation(
                mock_session,
                uuid.uuid4(),
                uuid.uuid4(),
            )
        assert exc_info.value.status_code == 404

    def test_raises_404_for_missing(self) -> None:
        """Test that 404 is raised for missing evaluation."""
        mock_session = MagicMock()
        mock_session.get.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            property_evaluation_service.get_evaluation(
                mock_session,
                uuid.uuid4(),
                uuid.uuid4(),
            )
        assert exc_info.value.status_code == 404


class TestGetByShareId:
    """Tests for get_by_share_id."""

    def test_returns_evaluation(self) -> None:
        """Test that evaluation is returned for valid share_id."""
        mock_session = MagicMock()
        mock_eval = MagicMock(spec=PropertyEvaluation)
        mock_session.exec.return_value.first.return_value = mock_eval

        result = property_evaluation_service.get_by_share_id(mock_session, "abc123")
        assert result == mock_eval

    def test_raises_404_for_missing(self) -> None:
        """Test that 404 is raised for missing share_id."""
        mock_session = MagicMock()
        mock_session.exec.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            property_evaluation_service.get_by_share_id(mock_session, "missing")
        assert exc_info.value.status_code == 404


class TestListUserEvaluations:
    """Tests for list_user_evaluations."""

    def test_returns_list(self) -> None:
        """Test that a list of evaluations is returned."""
        mock_session = MagicMock()
        mock_evals = [MagicMock(spec=PropertyEvaluation) for _ in range(3)]
        mock_session.exec.return_value.all.return_value = mock_evals

        result = property_evaluation_service.list_user_evaluations(
            mock_session,
            uuid.uuid4(),
        )
        assert len(result) == 3


# ---------------------------------------------------------------------------
# Tests: delete_evaluation
# ---------------------------------------------------------------------------


class TestDeleteEvaluation:
    """Tests for delete_evaluation."""

    def test_deletes_owned_evaluation(self) -> None:
        """Test that owned evaluation is deleted."""
        mock_session = MagicMock()
        user_id = uuid.uuid4()
        mock_eval = MagicMock(spec=PropertyEvaluation)
        mock_eval.user_id = user_id
        mock_session.get.return_value = mock_eval

        property_evaluation_service.delete_evaluation(
            mock_session,
            uuid.uuid4(),
            user_id,
        )

        mock_session.delete.assert_called_once_with(mock_eval)
        mock_session.commit.assert_called_once()

    def test_raises_404_for_wrong_user(self) -> None:
        """Test that 404 is raised when deleting another user's evaluation."""
        mock_session = MagicMock()
        mock_eval = MagicMock(spec=PropertyEvaluation)
        mock_eval.user_id = uuid.uuid4()
        mock_session.get.return_value = mock_eval

        with pytest.raises(HTTPException) as exc_info:
            property_evaluation_service.delete_evaluation(
                mock_session,
                uuid.uuid4(),
                uuid.uuid4(),
            )
        assert exc_info.value.status_code == 404
