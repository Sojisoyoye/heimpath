"""Portfolio property and transaction database models."""

from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class TransactionType(str, PyEnum):
    """Types of portfolio transactions."""

    RENT_INCOME = "rent_income"
    OPERATING_EXPENSE = "operating_expense"
    MAINTENANCE = "maintenance"
    INSURANCE = "insurance"
    HAUSGELD = "hausgeld"
    MORTGAGE_INTEREST = "mortgage_interest"
    TAX_PAYMENT = "tax_payment"
    OTHER_INCOME = "other_income"
    OTHER_EXPENSE = "other_expense"


class CostCategory(str, PyEnum):
    """Fine-grained Nebenkosten (running cost) categories."""

    HAUSGELD = "hausgeld"
    GRUNDSTEUER = "grundsteuer"
    INSURANCE = "insurance"
    HEATING = "heating"
    WATER = "water"
    ELECTRICITY = "electricity"
    MAINTENANCE = "maintenance"
    MISC = "misc"


class RecurrenceInterval(str, PyEnum):
    """Recurrence interval for recurring transactions."""

    MONTHLY = "monthly"
    ANNUALLY = "annually"


INCOME_TYPES = {TransactionType.RENT_INCOME, TransactionType.OTHER_INCOME}
EXPENSE_TYPES = {
    TransactionType.OPERATING_EXPENSE,
    TransactionType.MAINTENANCE,
    TransactionType.INSURANCE,
    TransactionType.HAUSGELD,
    TransactionType.MORTGAGE_INTEREST,
    TransactionType.TAX_PAYMENT,
    TransactionType.OTHER_EXPENSE,
}

_transaction_type_enum = PgEnum(
    "rent_income",
    "operating_expense",
    "maintenance",
    "insurance",
    "hausgeld",
    "mortgage_interest",
    "tax_payment",
    "other_income",
    "other_expense",
    name="transactiontype",
    create_type=False,
)

_cost_category_enum = PgEnum(
    "hausgeld",
    "grundsteuer",
    "insurance",
    "heating",
    "water",
    "electricity",
    "maintenance",
    "misc",
    name="costcategory",
    create_type=False,
)

_recurrence_interval_enum = PgEnum(
    "monthly",
    "annually",
    name="recurrenceinterval",
    create_type=False,
)


class PortfolioProperty(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A rental property in the user's portfolio."""

    __tablename__ = "portfolio_property"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    address = Column(String(500), nullable=False)
    city = Column(String(255), nullable=False)
    postcode = Column(String(10), nullable=False)
    state_code = Column(String(2), nullable=True)

    purchase_price = Column(Float, nullable=False)
    purchase_date = Column(Date, nullable=True)
    square_meters = Column(Float, nullable=False)
    building_year = Column(Integer, nullable=True)

    current_value_estimate = Column(Float, nullable=True)
    monthly_rent_target = Column(Float, nullable=True)

    tenant_name = Column(String(255), nullable=True)
    lease_start_date = Column(Date, nullable=True)
    lease_end_date = Column(Date, nullable=True)

    monthly_hausgeld = Column(Float, nullable=True)
    land_share = Column(Float, nullable=True, default=20.0)
    is_vacant = Column(Boolean, default=False, nullable=False)

    notes = Column(Text, nullable=True)

    journey_id = Column(
        UUID(as_uuid=True),
        ForeignKey("journey.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )


class PortfolioTransaction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A financial transaction linked to a portfolio property."""

    __tablename__ = "portfolio_transaction"
    __table_args__ = (
        Index("ix_portfolio_transaction_property_date", "property_id", "date"),
    )

    property_id = Column(
        UUID(as_uuid=True),
        ForeignKey("portfolio_property.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(_transaction_type_enum, nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    category = Column(String(100), nullable=True)
    description = Column(String(500), nullable=True)
    is_recurring = Column(Boolean, default=False, nullable=False)
    cost_category = Column(_cost_category_enum, nullable=True)
    estimated_amount = Column(Float, nullable=True)
    recurrence_interval = Column(_recurrence_interval_enum, nullable=True)
    last_generated_date = Column(Date, nullable=True)
    is_generated = Column(
        Boolean, nullable=False, default=False, server_default="false"
    )
