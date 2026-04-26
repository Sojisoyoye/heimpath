"""Tests for generate_recurring_transactions service function."""

import uuid
from datetime import date
from unittest.mock import MagicMock, patch

from app.models.portfolio import (
    PortfolioTransaction,
    RecurrenceInterval,
    TransactionType,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_template(
    *,
    recurrence_interval: RecurrenceInterval,
    last_generated_date: date | None = None,
    user_id: uuid.UUID | None = None,
    property_id: uuid.UUID | None = None,
) -> MagicMock:
    """Build a mock recurring template transaction."""
    tmpl = MagicMock(spec=PortfolioTransaction)
    tmpl.id = uuid.uuid4()
    tmpl.user_id = user_id or uuid.uuid4()
    tmpl.property_id = property_id or uuid.uuid4()
    tmpl.type = TransactionType.RENT_INCOME
    tmpl.amount = 1200.0
    tmpl.category = "Rent"
    tmpl.description = "Monthly rent"
    tmpl.is_recurring = True
    tmpl.is_generated = False
    tmpl.recurrence_interval = recurrence_interval
    tmpl.last_generated_date = last_generated_date
    tmpl.cost_category = None
    tmpl.estimated_amount = None
    return tmpl


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@patch("app.services.portfolio_service.select")
def test_generates_monthly_entry_on_first_run(_mock_select: MagicMock) -> None:
    """No prior generation → creates one entry and returns count=1."""
    from app.services.portfolio_service import generate_recurring_transactions

    tmpl = _make_template(
        recurrence_interval=RecurrenceInterval.MONTHLY,
        last_generated_date=None,
    )
    session = MagicMock()
    session.exec.return_value.all.return_value = [tmpl]

    count = generate_recurring_transactions(session)

    assert count == 1
    session.add.assert_called_once()
    session.commit.assert_called_once()
    assert tmpl.last_generated_date == date.today()


@patch("app.services.portfolio_service.select")
def test_skips_if_already_generated_this_month(_mock_select: MagicMock) -> None:
    """last_generated_date is in the current month → skip, return 0."""
    from app.services.portfolio_service import generate_recurring_transactions

    today = date.today()
    tmpl = _make_template(
        recurrence_interval=RecurrenceInterval.MONTHLY,
        last_generated_date=today.replace(day=1),
    )
    session = MagicMock()
    session.exec.return_value.all.return_value = [tmpl]

    count = generate_recurring_transactions(session)

    assert count == 0
    session.add.assert_not_called()


@patch("app.services.portfolio_service.select")
def test_generates_annual_entry_on_first_run(_mock_select: MagicMock) -> None:
    """No prior generation for annual → creates one entry."""
    from app.services.portfolio_service import generate_recurring_transactions

    tmpl = _make_template(
        recurrence_interval=RecurrenceInterval.ANNUALLY,
        last_generated_date=None,
    )
    session = MagicMock()
    session.exec.return_value.all.return_value = [tmpl]

    count = generate_recurring_transactions(session)

    assert count == 1
    session.add.assert_called_once()


@patch("app.services.portfolio_service.select")
def test_skips_if_already_generated_this_year(_mock_select: MagicMock) -> None:
    """last_generated_date.year == today.year → skip annual entry."""
    from app.services.portfolio_service import generate_recurring_transactions

    today = date.today()
    tmpl = _make_template(
        recurrence_interval=RecurrenceInterval.ANNUALLY,
        last_generated_date=date(today.year, 1, 1),
    )
    session = MagicMock()
    session.exec.return_value.all.return_value = [tmpl]

    count = generate_recurring_transactions(session)

    assert count == 0
    session.add.assert_not_called()


@patch("app.services.portfolio_service.select")
def test_is_idempotent(_mock_select: MagicMock) -> None:
    """Calling generate twice in the same period creates exactly 1 entry total."""
    from app.services.portfolio_service import generate_recurring_transactions

    today = date.today()
    tmpl = _make_template(
        recurrence_interval=RecurrenceInterval.MONTHLY,
        last_generated_date=None,
    )
    session = MagicMock()

    # First call: template has no last_generated_date
    session.exec.return_value.all.return_value = [tmpl]
    count1 = generate_recurring_transactions(session)

    # After first call, tmpl.last_generated_date was set to today
    assert tmpl.last_generated_date == today

    # Second call: template now has last_generated_date = today (this month)
    count2 = generate_recurring_transactions(session)

    assert count1 == 1
    assert count2 == 0


@patch("app.services.portfolio_service.select")
def test_skips_non_recurring_templates(_mock_select: MagicMock) -> None:
    """Templates with recurrence_interval=None are not queried (filtered by DB)."""
    from app.services.portfolio_service import generate_recurring_transactions

    # The query filters at the DB level; if exec returns empty, count is 0
    session = MagicMock()
    session.exec.return_value.all.return_value = []

    count = generate_recurring_transactions(session)

    assert count == 0
    session.add.assert_not_called()


@patch("app.services.portfolio_service.select")
def test_copy_preserves_template_fields(_mock_select: MagicMock) -> None:
    """Generated copy matches template's amount, type, category, description."""
    from app.services.portfolio_service import generate_recurring_transactions

    user_id = uuid.uuid4()
    property_id = uuid.uuid4()
    tmpl = _make_template(
        recurrence_interval=RecurrenceInterval.MONTHLY,
        last_generated_date=None,
        user_id=user_id,
        property_id=property_id,
    )
    session = MagicMock()
    session.exec.return_value.all.return_value = [tmpl]

    generate_recurring_transactions(session)

    added_txn = session.add.call_args[0][0]
    assert added_txn.amount == tmpl.amount
    assert added_txn.type == tmpl.type
    assert added_txn.category == tmpl.category
    assert added_txn.description == tmpl.description
    assert added_txn.property_id == property_id
    assert added_txn.user_id == user_id


@patch("app.services.portfolio_service.select")
def test_copy_has_is_generated_true(_mock_select: MagicMock) -> None:
    """Generated copy has is_generated=True and is_recurring=False."""
    from app.services.portfolio_service import generate_recurring_transactions

    tmpl = _make_template(
        recurrence_interval=RecurrenceInterval.MONTHLY,
        last_generated_date=None,
    )
    session = MagicMock()
    session.exec.return_value.all.return_value = [tmpl]

    generate_recurring_transactions(session)

    added_txn = session.add.call_args[0][0]
    assert added_txn.is_generated is True
    assert added_txn.is_recurring is False


@patch("app.services.portfolio_service.select")
def test_returns_count_of_created_entries(_mock_select: MagicMock) -> None:
    """Returns the correct count when multiple templates are processed."""
    from app.services.portfolio_service import generate_recurring_transactions

    templates = [
        _make_template(
            recurrence_interval=RecurrenceInterval.MONTHLY,
            last_generated_date=None,
        )
        for _ in range(3)
    ]
    session = MagicMock()
    session.exec.return_value.all.return_value = templates

    count = generate_recurring_transactions(session)

    assert count == 3
    assert session.add.call_count == 3


@patch("app.services.portfolio_service.select")
def test_generates_entry_for_previous_month_template(_mock_select: MagicMock) -> None:
    """Template last generated in a previous month triggers new monthly entry."""
    from app.services.portfolio_service import generate_recurring_transactions

    today = date.today()
    # Use a date that is clearly in a previous month
    if today.month == 1:
        prev_month_date = date(today.year - 1, 12, 1)
    else:
        prev_month_date = date(today.year, today.month - 1, 1)

    tmpl = _make_template(
        recurrence_interval=RecurrenceInterval.MONTHLY,
        last_generated_date=prev_month_date,
    )
    session = MagicMock()
    session.exec.return_value.all.return_value = [tmpl]

    count = generate_recurring_transactions(session)

    assert count == 1


@patch("app.services.portfolio_service.select")
def test_generates_entry_for_previous_year_template(_mock_select: MagicMock) -> None:
    """Template last generated in a previous year triggers new annual entry."""
    from app.services.portfolio_service import generate_recurring_transactions

    today = date.today()
    tmpl = _make_template(
        recurrence_interval=RecurrenceInterval.ANNUALLY,
        last_generated_date=date(today.year - 1, 6, 1),
    )
    session = MagicMock()
    session.exec.return_value.all.return_value = [tmpl]

    count = generate_recurring_transactions(session)

    assert count == 1
