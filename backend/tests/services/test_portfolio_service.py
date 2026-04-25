"""Tests for portfolio service module-level functions."""

import uuid
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models.portfolio import (
    PortfolioProperty,
    PortfolioTransaction,
    TransactionType,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_property(**overrides) -> MagicMock:
    """Create a mock portfolio property."""
    prop = MagicMock(spec=PortfolioProperty)
    prop.id = overrides.get("id", uuid.uuid4())
    prop.user_id = overrides.get("user_id", uuid.uuid4())
    prop.address = overrides.get("address", "Musterstr. 1")
    prop.city = overrides.get("city", "Berlin")
    prop.postcode = overrides.get("postcode", "10115")
    prop.state_code = overrides.get("state_code", "BE")
    prop.purchase_price = overrides.get("purchase_price", 300000.0)
    prop.purchase_date = overrides.get("purchase_date", None)
    prop.square_meters = overrides.get("square_meters", 75.0)
    prop.building_year = overrides.get("building_year", None)
    prop.current_value_estimate = overrides.get("current_value_estimate", None)
    prop.monthly_rent_target = overrides.get("monthly_rent_target", 1200.0)
    prop.tenant_name = overrides.get("tenant_name", None)
    prop.lease_start_date = overrides.get("lease_start_date", None)
    prop.lease_end_date = overrides.get("lease_end_date", None)
    prop.monthly_hausgeld = overrides.get("monthly_hausgeld", None)
    prop.land_share = overrides.get("land_share", 20.0)
    prop.is_vacant = overrides.get("is_vacant", False)
    prop.notes = overrides.get("notes", None)
    prop.created_at = overrides.get("created_at", None)
    return prop


def _make_transaction(**overrides) -> MagicMock:
    """Create a mock portfolio transaction."""
    txn = MagicMock(spec=PortfolioTransaction)
    txn.id = overrides.get("id", uuid.uuid4())
    txn.property_id = overrides.get("property_id", uuid.uuid4())
    txn.user_id = overrides.get("user_id", uuid.uuid4())
    txn.type = overrides.get("type", TransactionType.RENT_INCOME.value)
    txn.amount = overrides.get("amount", 1200.0)
    txn.date = overrides.get("date", date.today())
    txn.category = overrides.get("category", None)
    txn.description = overrides.get("description", None)
    txn.is_recurring = overrides.get("is_recurring", False)
    txn.created_at = overrides.get("created_at", None)
    return txn


def _make_create_data(**overrides) -> MagicMock:
    """Create a mock PortfolioPropertyCreate schema."""
    data = MagicMock()
    data.address = overrides.get("address", "Musterstr. 1")
    data.city = overrides.get("city", "Berlin")
    data.postcode = overrides.get("postcode", "10115")
    data.state_code = overrides.get("state_code", None)
    data.purchase_price = overrides.get("purchase_price", 300000.0)
    data.purchase_date = overrides.get("purchase_date", None)
    data.square_meters = overrides.get("square_meters", 75.0)
    data.building_year = overrides.get("building_year", None)
    data.current_value_estimate = overrides.get("current_value_estimate", None)
    data.monthly_rent_target = overrides.get("monthly_rent_target", 1200.0)
    data.tenant_name = overrides.get("tenant_name", None)
    data.lease_start_date = overrides.get("lease_start_date", None)
    data.lease_end_date = overrides.get("lease_end_date", None)
    data.monthly_hausgeld = overrides.get("monthly_hausgeld", None)
    data.is_vacant = overrides.get("is_vacant", False)
    data.notes = overrides.get("notes", None)
    data.model_dump.return_value = {
        "address": data.address,
        "city": data.city,
        "postcode": data.postcode,
        "state_code": data.state_code,
        "purchase_price": data.purchase_price,
        "purchase_date": data.purchase_date,
        "square_meters": data.square_meters,
        "building_year": data.building_year,
        "current_value_estimate": data.current_value_estimate,
        "monthly_rent_target": data.monthly_rent_target,
        "tenant_name": data.tenant_name,
        "lease_start_date": data.lease_start_date,
        "lease_end_date": data.lease_end_date,
        "monthly_hausgeld": data.monthly_hausgeld,
        "is_vacant": data.is_vacant,
        "notes": data.notes,
    }
    return data


# ---------------------------------------------------------------------------
# Property CRUD tests
# ---------------------------------------------------------------------------


def test_create_property() -> None:
    """Test creating a portfolio property persists and returns it."""
    from app.services.portfolio_service import create_property

    session = MagicMock()
    user_id = uuid.uuid4()
    data = _make_create_data()

    result = create_property(session, user_id, data)

    session.add.assert_called_once()
    session.commit.assert_called_once()
    session.refresh.assert_called_once()
    assert result is not None


def test_create_property_with_minimal_fields() -> None:
    """Test creating a property with only required fields."""
    from app.services.portfolio_service import create_property

    session = MagicMock()
    user_id = uuid.uuid4()
    data = _make_create_data(
        state_code=None,
        purchase_date=None,
        building_year=None,
        current_value_estimate=None,
        monthly_rent_target=None,
        tenant_name=None,
        monthly_hausgeld=None,
        notes=None,
    )

    result = create_property(session, user_id, data)

    session.add.assert_called_once()
    session.commit.assert_called_once()
    assert result is not None


def test_get_property_for_owner() -> None:
    """Test getting a property owned by the requesting user."""
    from app.services.portfolio_service import get_property

    user_id = uuid.uuid4()
    prop_id = uuid.uuid4()
    mock_prop = _make_property(id=prop_id, user_id=user_id)

    session = MagicMock()
    session.get.return_value = mock_prop

    result = get_property(session, prop_id, user_id)
    assert result.id == prop_id


def test_get_property_wrong_user_raises_404() -> None:
    """Test that accessing another user's property raises 404."""
    from app.services.portfolio_service import get_property

    owner_id = uuid.uuid4()
    other_id = uuid.uuid4()
    mock_prop = _make_property(user_id=owner_id)

    session = MagicMock()
    session.get.return_value = mock_prop

    with pytest.raises(HTTPException) as exc_info:
        get_property(session, mock_prop.id, other_id)
    assert exc_info.value.status_code == 404


def test_get_property_not_found_raises_404() -> None:
    """Test that a missing property raises 404."""
    from app.services.portfolio_service import get_property

    session = MagicMock()
    session.get.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        get_property(session, uuid.uuid4(), uuid.uuid4())
    assert exc_info.value.status_code == 404


@patch("app.services.portfolio_service.select")
def test_list_user_properties_empty(_mock_select: MagicMock) -> None:
    """Test listing properties for user with none returns empty list."""
    from app.services.portfolio_service import list_user_properties

    session = MagicMock()
    session.exec.return_value.all.return_value = []

    result = list_user_properties(session, uuid.uuid4())
    assert result == []


@patch("app.services.portfolio_service.select")
def test_list_user_properties_multiple(_mock_select: MagicMock) -> None:
    """Test listing multiple properties returns all."""
    from app.services.portfolio_service import list_user_properties

    user_id = uuid.uuid4()
    props = [_make_property(user_id=user_id) for _ in range(3)]

    session = MagicMock()
    session.exec.return_value.all.return_value = props

    result = list_user_properties(session, user_id)
    assert len(result) == 3


def test_update_property_partial() -> None:
    """Test partial property update only changes provided fields."""
    from app.services.portfolio_service import update_property

    user_id = uuid.uuid4()
    prop_id = uuid.uuid4()
    mock_prop = _make_property(id=prop_id, user_id=user_id)

    session = MagicMock()
    session.get.return_value = mock_prop

    update_data = MagicMock()
    update_data.model_dump.return_value = {"city": "Munich"}

    result = update_property(session, prop_id, user_id, update_data)

    assert result.city == "Munich"
    session.add.assert_called_once()
    session.commit.assert_called_once()


def test_delete_property() -> None:
    """Test deleting a property calls session.delete."""
    from app.services.portfolio_service import delete_property

    user_id = uuid.uuid4()
    prop_id = uuid.uuid4()
    mock_prop = _make_property(id=prop_id, user_id=user_id)

    session = MagicMock()
    session.get.return_value = mock_prop

    delete_property(session, prop_id, user_id)

    session.delete.assert_called_once_with(mock_prop)
    session.commit.assert_called_once()


# ---------------------------------------------------------------------------
# Transaction CRUD tests
# ---------------------------------------------------------------------------


def test_create_transaction_income() -> None:
    """Test creating an income transaction."""
    from app.services.portfolio_service import create_transaction

    user_id = uuid.uuid4()
    prop_id = uuid.uuid4()
    mock_prop = _make_property(id=prop_id, user_id=user_id)

    session = MagicMock()
    session.get.return_value = mock_prop

    data = MagicMock()
    data.type = TransactionType.RENT_INCOME.value
    data.amount = 1200.0
    data.date = date.today()
    data.category = None
    data.description = "Monthly rent"
    data.is_recurring = True

    result = create_transaction(session, prop_id, user_id, data)

    session.add.assert_called_once()
    session.commit.assert_called_once()
    assert result is not None


def test_create_transaction_expense() -> None:
    """Test creating an expense transaction."""
    from app.services.portfolio_service import create_transaction

    user_id = uuid.uuid4()
    prop_id = uuid.uuid4()
    mock_prop = _make_property(id=prop_id, user_id=user_id)

    session = MagicMock()
    session.get.return_value = mock_prop

    data = MagicMock()
    data.type = TransactionType.MAINTENANCE.value
    data.amount = 500.0
    data.date = date.today()
    data.category = "Plumbing"
    data.description = "Fix leaking pipe"
    data.is_recurring = False

    result = create_transaction(session, prop_id, user_id, data)

    session.add.assert_called_once()
    session.commit.assert_called_once()
    assert result is not None


def test_create_transaction_wrong_owner_raises_404() -> None:
    """Test creating a transaction on another user's property raises 404."""
    from app.services.portfolio_service import create_transaction

    owner_id = uuid.uuid4()
    other_id = uuid.uuid4()
    prop_id = uuid.uuid4()
    mock_prop = _make_property(id=prop_id, user_id=owner_id)

    session = MagicMock()
    session.get.return_value = mock_prop

    data = MagicMock()

    with pytest.raises(HTTPException) as exc_info:
        create_transaction(session, prop_id, other_id, data)
    assert exc_info.value.status_code == 404


@patch("app.services.portfolio_service.select")
def test_list_transactions_all(_mock_select: MagicMock) -> None:
    """Test listing all transactions for a property."""
    from app.services.portfolio_service import list_transactions

    user_id = uuid.uuid4()
    prop_id = uuid.uuid4()
    mock_prop = _make_property(id=prop_id, user_id=user_id)
    txns = [_make_transaction(property_id=prop_id) for _ in range(3)]

    session = MagicMock()
    session.get.return_value = mock_prop
    session.exec.return_value.all.return_value = txns

    result = list_transactions(session, prop_id, user_id)
    assert len(result) == 3


@patch("app.services.portfolio_service.select")
def test_list_transactions_with_date_filter(_mock_select: MagicMock) -> None:
    """Test listing transactions with date range filter."""
    from app.services.portfolio_service import list_transactions

    user_id = uuid.uuid4()
    prop_id = uuid.uuid4()
    mock_prop = _make_property(id=prop_id, user_id=user_id)
    txns = [_make_transaction(property_id=prop_id)]

    session = MagicMock()
    session.get.return_value = mock_prop
    session.exec.return_value.all.return_value = txns

    result = list_transactions(
        session,
        prop_id,
        user_id,
        date_from=date.today() - timedelta(days=30),
        date_to=date.today(),
    )
    assert len(result) == 1


def test_delete_transaction() -> None:
    """Test deleting a transaction with ownership check."""
    from app.services.portfolio_service import delete_transaction

    user_id = uuid.uuid4()
    txn = _make_transaction(user_id=user_id)

    session = MagicMock()
    session.get.return_value = txn

    delete_transaction(session, txn.id, user_id)

    session.delete.assert_called_once_with(txn)
    session.commit.assert_called_once()


def test_delete_transaction_wrong_user_raises_404() -> None:
    """Test deleting another user's transaction raises 404."""
    from app.services.portfolio_service import delete_transaction

    owner_id = uuid.uuid4()
    other_id = uuid.uuid4()
    txn = _make_transaction(user_id=owner_id)

    session = MagicMock()
    session.get.return_value = txn

    with pytest.raises(HTTPException) as exc_info:
        delete_transaction(session, txn.id, other_id)
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# KPI calculation tests
# ---------------------------------------------------------------------------


@patch("app.services.portfolio_service.select")
def test_summary_empty_portfolio(_mock_select: MagicMock) -> None:
    """Test summary for user with no properties returns zeros."""
    from app.services.portfolio_service import calculate_portfolio_summary

    session = MagicMock()
    session.exec.return_value.all.side_effect = [[], []]

    result = calculate_portfolio_summary(session, uuid.uuid4())

    assert result["total_properties"] == 0
    assert result["total_purchase_value"] == 0.0
    assert result["total_current_value"] == 0.0
    assert result["total_income"] == 0.0
    assert result["total_expenses"] == 0.0
    assert result["net_cash_flow"] == 0.0
    assert result["vacancy_rate"] == 0.0
    assert result["average_gross_yield"] == 0.0


@patch("app.services.portfolio_service.select")
def test_summary_single_property_no_transactions(_mock_select: MagicMock) -> None:
    """Test summary with one property and no transactions."""
    from app.services.portfolio_service import calculate_portfolio_summary

    prop = _make_property(
        purchase_price=250000.0, current_value_estimate=260000.0, is_vacant=False
    )

    session = MagicMock()
    session.exec.return_value.all.side_effect = [[prop], []]

    result = calculate_portfolio_summary(session, prop.user_id)

    assert result["total_properties"] == 1
    assert result["total_purchase_value"] == 250000.0
    assert result["total_current_value"] == 260000.0
    assert result["total_income"] == 0.0
    assert result["total_expenses"] == 0.0
    assert result["net_cash_flow"] == 0.0
    assert result["vacancy_rate"] == 0.0


@patch("app.services.portfolio_service.select")
def test_summary_income_and_expense_sums(_mock_select: MagicMock) -> None:
    """Test that income and expenses are summed correctly."""
    from app.services.portfolio_service import calculate_portfolio_summary

    prop = _make_property(
        purchase_price=300000.0, current_value_estimate=None, is_vacant=False
    )
    txns = [
        _make_transaction(type=TransactionType.RENT_INCOME.value, amount=1200.0),
        _make_transaction(type=TransactionType.RENT_INCOME.value, amount=1200.0),
        _make_transaction(type=TransactionType.MAINTENANCE.value, amount=500.0),
        _make_transaction(type=TransactionType.HAUSGELD.value, amount=300.0),
    ]

    session = MagicMock()
    session.exec.return_value.all.side_effect = [[prop], txns]

    result = calculate_portfolio_summary(session, prop.user_id)

    assert result["total_income"] == 2400.0
    assert result["total_expenses"] == 800.0
    assert result["net_cash_flow"] == 1600.0


@patch("app.services.portfolio_service.select")
def test_summary_vacancy_rate(_mock_select: MagicMock) -> None:
    """Test vacancy rate calculation."""
    from app.services.portfolio_service import calculate_portfolio_summary

    props = [
        _make_property(purchase_price=200000.0, is_vacant=False),
        _make_property(purchase_price=250000.0, is_vacant=True),
        _make_property(purchase_price=300000.0, is_vacant=False),
        _make_property(purchase_price=350000.0, is_vacant=True),
    ]
    for p in props:
        p.current_value_estimate = None

    session = MagicMock()
    session.exec.return_value.all.side_effect = [props, []]

    result = calculate_portfolio_summary(session, uuid.uuid4())

    assert result["vacancy_rate"] == 50.0


@patch("app.services.portfolio_service.select")
def test_summary_gross_yield_annualization(_mock_select: MagicMock) -> None:
    """Test average gross yield is annualized correctly."""
    from app.services.portfolio_service import calculate_portfolio_summary

    prop = _make_property(
        purchase_price=240000.0, current_value_estimate=None, is_vacant=False
    )
    # 6 months of rent at 1000/month = 6000 trailing income
    # Annualized = 6000 * (12/12) = 6000 ... but annualized means
    # total_income from trailing 12 months. If we have 12000 in income:
    txns = [
        _make_transaction(type=TransactionType.RENT_INCOME.value, amount=1000.0)
        for _ in range(12)
    ]

    session = MagicMock()
    session.exec.return_value.all.side_effect = [[prop], txns]

    result = calculate_portfolio_summary(session, prop.user_id)

    # Gross yield = 12000 / 240000 * 100 = 5.0%
    assert result["average_gross_yield"] == 5.0


@patch("app.services.portfolio_service.select")
def test_summary_current_value_fallback_to_purchase(_mock_select: MagicMock) -> None:
    """Test that current_value falls back to purchase_price when estimate is None."""
    from app.services.portfolio_service import calculate_portfolio_summary

    prop = _make_property(
        purchase_price=300000.0, current_value_estimate=None, is_vacant=False
    )

    session = MagicMock()
    session.exec.return_value.all.side_effect = [[prop], []]

    result = calculate_portfolio_summary(session, prop.user_id)

    assert result["total_current_value"] == 300000.0


@patch("app.services.portfolio_service.select")
def test_summary_net_cash_flow_negative(_mock_select: MagicMock) -> None:
    """Test net cash flow can be negative when expenses exceed income."""
    from app.services.portfolio_service import calculate_portfolio_summary

    prop = _make_property(
        purchase_price=300000.0, current_value_estimate=None, is_vacant=False
    )
    txns = [
        _make_transaction(type=TransactionType.RENT_INCOME.value, amount=500.0),
        _make_transaction(type=TransactionType.MORTGAGE_INTEREST.value, amount=1500.0),
    ]

    session = MagicMock()
    session.exec.return_value.all.side_effect = [[prop], txns]

    result = calculate_portfolio_summary(session, prop.user_id)

    assert result["net_cash_flow"] == -1000.0


# ---------------------------------------------------------------------------
# Monthly performance
# ---------------------------------------------------------------------------


@patch("app.services.portfolio_service.select")
def test_performance_no_transactions(_mock_select: MagicMock) -> None:
    """Test performance with no transactions returns 12 months of zeros."""
    from app.services.portfolio_service import calculate_monthly_performance

    session = MagicMock()
    session.exec.return_value.all.return_value = []

    result = calculate_monthly_performance(session, uuid.uuid4())

    assert result["has_data"] is False
    assert len(result["months"]) == 12
    for month in result["months"]:
        assert month["income"] == 0.0
        assert month["expenses"] == 0.0
        assert month["net_cash_flow"] == 0.0


@patch("app.services.portfolio_service.select")
def test_performance_with_transactions(_mock_select: MagicMock) -> None:
    """Test performance buckets income and expenses by month."""
    from app.services.portfolio_service import calculate_monthly_performance

    today = date.today()
    current_month = today.replace(day=15)

    txns = [
        _make_transaction(
            type=TransactionType.RENT_INCOME.value,
            amount=1200.0,
            date=current_month,
        ),
        _make_transaction(
            type=TransactionType.OPERATING_EXPENSE.value,
            amount=500.0,
            date=current_month,
        ),
        _make_transaction(
            type=TransactionType.RENT_INCOME.value,
            amount=800.0,
            date=current_month,
        ),
    ]

    session = MagicMock()
    session.exec.return_value.all.return_value = txns

    result = calculate_monthly_performance(session, uuid.uuid4())

    assert result["has_data"] is True
    assert len(result["months"]) == 12

    # Find the current month entry
    current_key = today.strftime("%Y-%m")
    current_entry = next(m for m in result["months"] if m["month"] == current_key)

    assert current_entry["income"] == 2000.0
    assert current_entry["expenses"] == 500.0
    assert current_entry["net_cash_flow"] == 1500.0


@patch("app.services.portfolio_service.select")
def test_performance_months_are_ordered(_mock_select: MagicMock) -> None:
    """Test that the 12 months are returned in chronological order."""
    from app.services.portfolio_service import calculate_monthly_performance

    session = MagicMock()
    session.exec.return_value.all.return_value = []

    result = calculate_monthly_performance(session, uuid.uuid4())

    months = [m["month"] for m in result["months"]]
    assert months == sorted(months)
    assert len(set(months)) == 12


@patch("app.services.portfolio_service.select")
def test_performance_net_cash_flow_negative(_mock_select: MagicMock) -> None:
    """Test net cash flow is negative when expenses exceed income."""
    from app.services.portfolio_service import calculate_monthly_performance

    today = date.today().replace(day=10)
    txns = [
        _make_transaction(
            type=TransactionType.RENT_INCOME.value, amount=500.0, date=today
        ),
        _make_transaction(
            type=TransactionType.MORTGAGE_INTEREST.value,
            amount=1500.0,
            date=today,
        ),
    ]

    session = MagicMock()
    session.exec.return_value.all.return_value = txns

    result = calculate_monthly_performance(session, uuid.uuid4())

    current_key = today.strftime("%Y-%m")
    current_entry = next(m for m in result["months"] if m["month"] == current_key)

    assert current_entry["net_cash_flow"] == -1000.0


# ---------------------------------------------------------------------------
# Anlage V tax summary tests
# ---------------------------------------------------------------------------


@patch("app.services.portfolio_service.select")
def test_anlage_v_summary_basic(_mock_select: MagicMock) -> None:
    """Basic Anlage V summary with all transaction types produces correct totals."""
    from app.services.portfolio_service import calculate_anlage_v_summary

    user_id = uuid.uuid4()
    property_id = uuid.uuid4()
    prop = _make_property(
        id=property_id,
        user_id=user_id,
        purchase_price=300_000.0,
        building_year=2000,
        land_share=20.0,
    )

    year = 2024
    txns = [
        _make_transaction(
            type=TransactionType.RENT_INCOME.value,
            amount=12_000.0,
            date=date(year, 6, 1),
        ),
        _make_transaction(
            type=TransactionType.MORTGAGE_INTEREST.value,
            amount=6_000.0,
            date=date(year, 6, 1),
        ),
        _make_transaction(
            type=TransactionType.HAUSGELD.value,
            amount=1_200.0,
            date=date(year, 6, 1),
        ),
        _make_transaction(
            type=TransactionType.INSURANCE.value,
            amount=400.0,
            date=date(year, 6, 1),
        ),
        _make_transaction(
            type=TransactionType.MAINTENANCE.value,
            amount=500.0,
            date=date(year, 6, 1),
        ),
        _make_transaction(
            type=TransactionType.TAX_PAYMENT.value,
            amount=300.0,
            date=date(year, 6, 1),
        ),
    ]

    session = MagicMock()
    session.get.return_value = prop
    session.exec.return_value.all.return_value = txns

    result = calculate_anlage_v_summary(session, property_id, user_id, year)

    # AfA: 300_000 * 0.80 * 0.02 = 4_800
    assert result.afa_rate_percent == 2.0
    assert result.building_value == 240_000.0
    assert result.afa_deduction == 4_800.0
    assert result.gross_rent_income == 12_000.0
    assert result.mortgage_interest == 6_000.0
    assert result.hausgeld == 1_200.0
    assert result.insurance == 400.0
    assert result.maintenance == 500.0
    assert result.grundsteuer == 300.0
    assert result.other_werbungskosten == 0.0
    expected_wk = 4_800 + 6_000 + 1_200 + 400 + 500 + 300
    assert result.total_werbungskosten == expected_wk
    assert result.net_taxable_income == round(12_000 - expected_wk, 2)
    assert result.year == year
    assert len(result.line_items) == 8


@patch("app.services.portfolio_service.select")
def test_anlage_v_summary_pre_1925_afa_rate(_mock_select: MagicMock) -> None:
    """Pre-1925 building year uses 2.5% AfA rate."""
    from app.services.portfolio_service import calculate_anlage_v_summary

    user_id = uuid.uuid4()
    property_id = uuid.uuid4()
    prop = _make_property(
        id=property_id,
        user_id=user_id,
        purchase_price=200_000.0,
        building_year=1910,
        land_share=30.0,
    )

    session = MagicMock()
    session.get.return_value = prop
    session.exec.return_value.all.return_value = []

    result = calculate_anlage_v_summary(session, property_id, user_id, 2024)

    assert result.afa_rate_percent == 2.5
    assert result.building_value == 140_000.0  # 200_000 * 0.70
    assert result.afa_deduction == 3_500.0  # 140_000 * 0.025


@patch("app.services.portfolio_service.select")
def test_anlage_v_summary_post_2023_afa_rate(_mock_select: MagicMock) -> None:
    """Post-2022 building year uses 3.0% AfA rate."""
    from app.services.portfolio_service import calculate_anlage_v_summary

    user_id = uuid.uuid4()
    property_id = uuid.uuid4()
    prop = _make_property(
        id=property_id,
        user_id=user_id,
        purchase_price=400_000.0,
        building_year=2023,
        land_share=25.0,
    )

    session = MagicMock()
    session.get.return_value = prop
    session.exec.return_value.all.return_value = []

    result = calculate_anlage_v_summary(session, property_id, user_id, 2024)

    assert result.afa_rate_percent == 3.0
    assert result.building_value == 300_000.0  # 400_000 * 0.75
    assert result.afa_deduction == 9_000.0  # 300_000 * 0.03


@patch("app.services.portfolio_service.select")
def test_anlage_v_summary_default_land_share(_mock_select: MagicMock) -> None:
    """When land_share is None the default 20% is applied."""
    from app.services.portfolio_service import calculate_anlage_v_summary

    user_id = uuid.uuid4()
    property_id = uuid.uuid4()
    prop = _make_property(
        id=property_id,
        user_id=user_id,
        purchase_price=200_000.0,
        building_year=1990,
        land_share=None,
    )

    session = MagicMock()
    session.get.return_value = prop
    session.exec.return_value.all.return_value = []

    result = calculate_anlage_v_summary(session, property_id, user_id, 2024)

    assert result.land_share_percent == 20.0
    assert result.building_value == 160_000.0  # 200_000 * 0.80


@patch("app.services.portfolio_service.select")
def test_anlage_v_summary_property_not_found(_mock_select: MagicMock) -> None:
    """Raises 404 when property does not belong to user."""
    from app.services.portfolio_service import calculate_anlage_v_summary

    session = MagicMock()
    session.get.return_value = None  # property not found

    with pytest.raises(HTTPException) as exc_info:
        calculate_anlage_v_summary(session, uuid.uuid4(), uuid.uuid4(), 2024)

    assert exc_info.value.status_code == 404
