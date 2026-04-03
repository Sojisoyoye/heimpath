"""Unit tests for ROI calculator service."""

import pytest

from app.schemas.roi import ROICalculationCreate
from app.services.roi_service import (
    ROIBreakdown,
    _grade_label,
    _score_cap_rate,
    _score_cash_flow,
    _score_cash_on_cash,
    _score_gross_yield,
    _score_vacancy,
    calculate_mortgage_payment,
    calculate_projections,
    calculate_roi,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def standard_inputs() -> ROICalculationCreate:
    """Typical Berlin apartment investment scenario."""
    return ROICalculationCreate(
        name="Test Property",
        purchase_price=400_000.0,
        down_payment=80_000.0,
        monthly_rent=1_500.0,
        monthly_expenses=300.0,
        annual_appreciation=3.0,
        vacancy_rate=5.0,
        mortgage_rate=4.0,
        mortgage_term=25,
    )


@pytest.fixture
def cash_buyer_inputs() -> ROICalculationCreate:
    """All-cash purchase (no mortgage)."""
    return ROICalculationCreate(
        name="Cash Purchase",
        purchase_price=300_000.0,
        down_payment=300_000.0,
        monthly_rent=1_200.0,
        monthly_expenses=200.0,
        annual_appreciation=2.0,
        vacancy_rate=5.0,
        mortgage_rate=0.0,
        mortgage_term=25,
    )


# ---------------------------------------------------------------------------
# calculate_mortgage_payment
# ---------------------------------------------------------------------------


class TestCalculateMortgagePayment:
    def test_standard_mortgage(self) -> None:
        """320k loan at 4% for 25 years → ~1,687/month."""
        payment = calculate_mortgage_payment(320_000, 4.0, 25)
        assert 1_680 < payment < 1_700

    def test_zero_principal_returns_zero(self) -> None:
        assert calculate_mortgage_payment(0, 4.0, 25) == 0.0

    def test_zero_rate_returns_zero(self) -> None:
        assert calculate_mortgage_payment(320_000, 0.0, 25) == 0.0

    def test_zero_term_returns_zero(self) -> None:
        assert calculate_mortgage_payment(320_000, 4.0, 0) == 0.0

    def test_negative_principal_returns_zero(self) -> None:
        assert calculate_mortgage_payment(-100_000, 4.0, 25) == 0.0

    def test_higher_rate_yields_higher_payment(self) -> None:
        low = calculate_mortgage_payment(300_000, 3.0, 25)
        high = calculate_mortgage_payment(300_000, 5.0, 25)
        assert high > low

    def test_longer_term_yields_lower_payment(self) -> None:
        short = calculate_mortgage_payment(300_000, 4.0, 15)
        long_ = calculate_mortgage_payment(300_000, 4.0, 30)
        assert long_ < short


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------


class TestScoringHelpers:
    def test_gross_yield_excellent(self) -> None:
        assert _score_gross_yield(8.5) == 10.0

    def test_gross_yield_good(self) -> None:
        assert _score_gross_yield(7.0) == 8.0

    def test_gross_yield_moderate(self) -> None:
        assert _score_gross_yield(5.0) == 6.0

    def test_gross_yield_poor(self) -> None:
        assert _score_gross_yield(3.0) == 3.0

    def test_gross_yield_very_poor(self) -> None:
        assert _score_gross_yield(1.0) == 0.0

    def test_cap_rate_excellent(self) -> None:
        assert _score_cap_rate(7.5) == 10.0

    def test_cap_rate_good(self) -> None:
        assert _score_cap_rate(6.0) == 7.0

    def test_cap_rate_moderate(self) -> None:
        assert _score_cap_rate(4.0) == 4.0

    def test_cap_rate_poor(self) -> None:
        assert _score_cap_rate(2.0) == 0.0

    def test_cash_on_cash_excellent(self) -> None:
        assert _score_cash_on_cash(20.0) == 10.0

    def test_cash_on_cash_good(self) -> None:
        assert _score_cash_on_cash(12.0) == 8.0

    def test_cash_on_cash_moderate(self) -> None:
        assert _score_cash_on_cash(7.0) == 6.0

    def test_cash_on_cash_breakeven(self) -> None:
        assert _score_cash_on_cash(0.0) == 3.0

    def test_cash_on_cash_negative(self) -> None:
        assert _score_cash_on_cash(-5.0) == 0.0

    def test_cash_flow_positive(self) -> None:
        assert _score_cash_flow(1_000) == 10.0

    def test_cash_flow_zero(self) -> None:
        assert _score_cash_flow(0) == 5.0

    def test_cash_flow_negative(self) -> None:
        assert _score_cash_flow(-500) == 0.0

    def test_vacancy_low(self) -> None:
        assert _score_vacancy(3.0) == 10.0

    def test_vacancy_moderate(self) -> None:
        assert _score_vacancy(10.0) == 6.0

    def test_vacancy_high(self) -> None:
        assert _score_vacancy(20.0) == 2.0


# ---------------------------------------------------------------------------
# Grade label
# ---------------------------------------------------------------------------


class TestGradeLabel:
    def test_excellent(self) -> None:
        assert _grade_label(8.5) == "Excellent"

    def test_good(self) -> None:
        assert _grade_label(7.0) == "Good"

    def test_moderate(self) -> None:
        assert _grade_label(5.0) == "Moderate"

    def test_poor(self) -> None:
        assert _grade_label(3.0) == "Poor"

    def test_very_poor(self) -> None:
        assert _grade_label(1.0) == "Very Poor"

    def test_boundary_excellent(self) -> None:
        assert _grade_label(8.0) == "Excellent"

    def test_boundary_good(self) -> None:
        assert _grade_label(6.0) == "Good"


# ---------------------------------------------------------------------------
# calculate_roi
# ---------------------------------------------------------------------------


class TestCalculateROI:
    def test_returns_breakdown(self, standard_inputs: ROICalculationCreate) -> None:
        result = calculate_roi(standard_inputs)
        assert isinstance(result, ROIBreakdown)

    def test_gross_rental_income(self, standard_inputs: ROICalculationCreate) -> None:
        result = calculate_roi(standard_inputs)
        assert result.gross_rental_income == pytest.approx(18_000.0)

    def test_gross_yield_ratio(self, standard_inputs: ROICalculationCreate) -> None:
        result = calculate_roi(standard_inputs)
        # 18_000 / 400_000 = 4.5%
        assert result.gross_yield == pytest.approx(0.045, rel=1e-3)

    def test_monthly_mortgage_calculated(
        self, standard_inputs: ROICalculationCreate
    ) -> None:
        # Loan = 320_000, 4%, 25yr
        result = calculate_roi(standard_inputs)
        assert 1_680 < result.monthly_mortgage_payment < 1_700

    def test_investment_grade_in_range(
        self, standard_inputs: ROICalculationCreate
    ) -> None:
        result = calculate_roi(standard_inputs)
        assert 0 <= result.investment_grade <= 10

    def test_investment_grade_label_valid(
        self, standard_inputs: ROICalculationCreate
    ) -> None:
        result = calculate_roi(standard_inputs)
        valid_labels = {"Excellent", "Good", "Moderate", "Poor", "Very Poor"}
        assert result.investment_grade_label in valid_labels

    def test_cash_on_cash_zero_for_no_down_payment(self) -> None:
        inputs = ROICalculationCreate(
            purchase_price=200_000.0,
            down_payment=0.0,
            monthly_rent=1_000.0,
            monthly_expenses=100.0,
            annual_appreciation=2.0,
            vacancy_rate=5.0,
            mortgage_rate=4.0,
            mortgage_term=25,
        )
        result = calculate_roi(inputs)
        assert result.cash_on_cash_return == 0.0

    def test_no_mortgage_for_cash_buyer(
        self, cash_buyer_inputs: ROICalculationCreate
    ) -> None:
        result = calculate_roi(cash_buyer_inputs)
        assert result.monthly_mortgage_payment == 0.0

    def test_higher_rent_improves_cash_flow(
        self, standard_inputs: ROICalculationCreate
    ) -> None:
        low_rent = calculate_roi(standard_inputs)
        high_rent_inputs = ROICalculationCreate(
            **{
                **standard_inputs.model_dump(),
                "monthly_rent": 2_500.0,
            }
        )
        high_rent = calculate_roi(high_rent_inputs)
        assert high_rent.annual_cash_flow > low_rent.annual_cash_flow

    def test_vacancy_reduces_income(
        self, standard_inputs: ROICalculationCreate
    ) -> None:
        no_vacancy = calculate_roi(
            ROICalculationCreate(
                **{**standard_inputs.model_dump(), "vacancy_rate": 0.0}
            )
        )
        high_vacancy = calculate_roi(
            ROICalculationCreate(
                **{**standard_inputs.model_dump(), "vacancy_rate": 20.0}
            )
        )
        assert high_vacancy.net_operating_income < no_vacancy.net_operating_income


# ---------------------------------------------------------------------------
# calculate_projections
# ---------------------------------------------------------------------------


class TestCalculateProjections:
    def test_returns_10_years(self, standard_inputs: ROICalculationCreate) -> None:
        roi = calculate_roi(standard_inputs)
        projections = calculate_projections(
            standard_inputs, roi.annual_cash_flow, roi.monthly_mortgage_payment
        )
        assert len(projections) == 10

    def test_year_numbers_sequential(
        self, standard_inputs: ROICalculationCreate
    ) -> None:
        roi = calculate_roi(standard_inputs)
        projections = calculate_projections(
            standard_inputs, roi.annual_cash_flow, roi.monthly_mortgage_payment
        )
        assert [p["year"] for p in projections] == list(range(1, 11))

    def test_property_value_appreciates(
        self, standard_inputs: ROICalculationCreate
    ) -> None:
        roi = calculate_roi(standard_inputs)
        projections = calculate_projections(
            standard_inputs, roi.annual_cash_flow, roi.monthly_mortgage_payment
        )
        values = [p["property_value"] for p in projections]
        assert all(values[i] < values[i + 1] for i in range(len(values) - 1))

    def test_equity_grows_over_time(
        self, standard_inputs: ROICalculationCreate
    ) -> None:
        roi = calculate_roi(standard_inputs)
        projections = calculate_projections(
            standard_inputs, roi.annual_cash_flow, roi.monthly_mortgage_payment
        )
        equity = [p["equity"] for p in projections]
        assert all(equity[i] < equity[i + 1] for i in range(len(equity) - 1))

    def test_cumulative_cash_flow_monotonic_when_positive(
        self, standard_inputs: ROICalculationCreate
    ) -> None:
        # Use inputs that produce positive annual cash flow
        positive_inputs = ROICalculationCreate(
            purchase_price=200_000.0,
            down_payment=100_000.0,
            monthly_rent=2_000.0,
            monthly_expenses=100.0,
            annual_appreciation=3.0,
            vacancy_rate=5.0,
            mortgage_rate=4.0,
            mortgage_term=25,
        )
        roi = calculate_roi(positive_inputs)
        projections = calculate_projections(
            positive_inputs, roi.annual_cash_flow, roi.monthly_mortgage_payment
        )
        cf = [p["cumulative_cash_flow"] for p in projections]
        assert all(cf[i] < cf[i + 1] for i in range(len(cf) - 1))

    def test_projection_has_required_keys(
        self, standard_inputs: ROICalculationCreate
    ) -> None:
        roi = calculate_roi(standard_inputs)
        projections = calculate_projections(
            standard_inputs, roi.annual_cash_flow, roi.monthly_mortgage_payment
        )
        required = {
            "year",
            "property_value",
            "equity",
            "cumulative_cash_flow",
            "total_return",
            "total_return_percent",
        }
        for proj in projections:
            assert required.issubset(proj.keys())

    def test_year10_property_value(self, standard_inputs: ROICalculationCreate) -> None:
        roi = calculate_roi(standard_inputs)
        projections = calculate_projections(
            standard_inputs, roi.annual_cash_flow, roi.monthly_mortgage_payment
        )
        # 400_000 * (1.03)^10
        expected = 400_000 * (1.03**10)
        assert projections[-1]["property_value"] == pytest.approx(expected, rel=1e-3)
