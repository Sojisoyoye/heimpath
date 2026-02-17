"""Financing eligibility assessment request/response schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FinancingAssessmentCreate(BaseModel):
    """Request to create a financing eligibility assessment."""

    name: str | None = Field(None, max_length=255)
    employment_status: Literal[
        "permanent", "fixed_term", "self_employed", "freelance", "civil_servant"
    ] = Field(..., description="Current employment type")
    employment_years: int = Field(
        ..., ge=0, le=50, description="Years in current employment"
    )
    monthly_net_income: float = Field(
        ..., gt=0, description="Monthly net income in EUR"
    )
    monthly_debt: float = Field(
        ..., ge=0, description="Monthly debt obligations in EUR"
    )
    available_down_payment: float = Field(
        ..., ge=0, description="Available down payment in EUR"
    )
    schufa_rating: Literal[
        "excellent", "good", "satisfactory", "adequate", "poor", "unknown"
    ] = Field(..., description="SCHUFA credit rating category")
    residency_status: Literal[
        "german_citizen",
        "eu_citizen",
        "permanent_resident",
        "temporary_resident",
        "non_eu",
    ] = Field(..., description="Residency status in Germany")


class FinancingAssessmentResponse(BaseModel):
    """Full response for a saved financing assessment."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str | None = None
    share_id: str | None = None
    # Inputs
    employment_status: str
    employment_years: int
    monthly_net_income: float
    monthly_debt: float
    available_down_payment: float
    schufa_rating: str
    residency_status: str
    # Score breakdown
    employment_score: float
    income_ratio_score: float
    down_payment_score: float
    schufa_score: float
    residency_score: float
    years_bonus_score: float
    # Results
    total_score: float
    likelihood_label: str
    # Estimates
    max_loan_estimate: float
    recommended_down_payment_percent: float
    expected_rate_min: float
    expected_rate_max: float
    ltv_ratio: float
    # Advisory
    strengths: list[str]
    improvements: list[str]
    document_checklist: list[str]
    created_at: datetime


class FinancingAssessmentSummary(BaseModel):
    """Summary for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str | None = None
    share_id: str | None = None
    total_score: float
    likelihood_label: str
    max_loan_estimate: float
    created_at: datetime


class FinancingAssessmentListResponse(BaseModel):
    """List of saved financing assessments."""

    data: list[FinancingAssessmentSummary]
    count: int
