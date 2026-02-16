"""Financing eligibility assessment service.

Handles scoring, likelihood assessment, loan estimates,
advisory generation, and CRUD operations for saved assessments.
"""
import secrets
import uuid
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.financing import FinancingAssessment
from app.schemas.financing import FinancingAssessmentCreate


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ScoreBreakdown:
    """Individual factor scores."""

    employment: float
    income_ratio: float
    down_payment: float
    schufa: float
    residency: float
    years_bonus: float


@dataclass
class AssessmentResult:
    """Intermediate result of a financing assessment."""

    scores: ScoreBreakdown
    total_score: float
    likelihood_label: str
    max_loan_estimate: float
    recommended_down_payment_percent: float
    expected_rate_min: float
    expected_rate_max: float
    ltv_ratio: float
    strengths: list[str]
    improvements: list[str]
    document_checklist: list[str]


# ---------------------------------------------------------------------------
# Scoring functions (pure, no DB)
# ---------------------------------------------------------------------------

ASSUMED_PROPERTY_PRICE = 300_000.0


def _score_employment(employment_status: str) -> float:
    """Score employment type on 0-20 scale."""
    scores = {
        "civil_servant": 20.0,
        "permanent": 18.0,
        "fixed_term": 10.0,
        "self_employed": 8.0,
        "freelance": 6.0,
    }
    return scores.get(employment_status, 5.0)


def _score_income_ratio(monthly_income: float, monthly_debt: float) -> float:
    """Score debt-to-income ratio on 0-20 scale.

    German banks typically want debt ratio below 35%.
    """
    if monthly_income <= 0:
        return 0.0
    ratio = monthly_debt / monthly_income
    if ratio <= 0.15:
        return 20.0
    if ratio <= 0.25:
        return 16.0
    if ratio <= 0.35:
        return 12.0
    if ratio <= 0.45:
        return 6.0
    return 2.0


def _score_down_payment(available_dp: float) -> float:
    """Score down payment on 0-20 scale.

    Based on percentage of assumed 300k property price.
    """
    if ASSUMED_PROPERTY_PRICE <= 0:
        return 0.0
    dp_pct = available_dp / ASSUMED_PROPERTY_PRICE
    if dp_pct >= 0.30:
        return 20.0
    if dp_pct >= 0.20:
        return 16.0
    if dp_pct >= 0.10:
        return 12.0
    if dp_pct >= 0.05:
        return 6.0
    return 2.0


def _score_schufa(rating: str) -> float:
    """Score SCHUFA rating on 0-15 scale."""
    scores = {
        "excellent": 15.0,
        "good": 12.0,
        "satisfactory": 9.0,
        "adequate": 5.0,
        "poor": 2.0,
        "unknown": 3.0,
    }
    return scores.get(rating, 3.0)


def _score_residency(residency_status: str) -> float:
    """Score residency status on 0-15 scale."""
    scores = {
        "german_citizen": 15.0,
        "eu_citizen": 13.0,
        "permanent_resident": 11.0,
        "temporary_resident": 6.0,
        "non_eu": 4.0,
    }
    return scores.get(residency_status, 4.0)


def _score_employment_years(years: int) -> float:
    """Score years in current employment on 0-10 scale."""
    if years >= 5:
        return 10.0
    if years >= 3:
        return 8.0
    if years >= 2:
        return 6.0
    if years >= 1:
        return 4.0
    return 2.0


def _likelihood_label(score: float) -> str:
    """Map total score (0-100) to likelihood label."""
    if score >= 80:
        return "High"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Moderate"
    if score >= 20:
        return "Low"
    return "Very Low"


# ---------------------------------------------------------------------------
# Estimate functions
# ---------------------------------------------------------------------------

def _estimate_max_loan(monthly_income: float, monthly_debt: float) -> float:
    """Estimate maximum loan amount.

    Based on German bank rule: ~100x disposable monthly income.
    """
    disposable = monthly_income - monthly_debt
    if disposable <= 0:
        return 0.0
    return round(disposable * 100, 2)


def _recommended_dp_percent(residency_status: str, schufa_rating: str) -> float:
    """Recommend down payment percentage based on risk profile."""
    base = 20.0
    if residency_status in ("non_eu", "temporary_resident"):
        base += 10.0
    if schufa_rating in ("poor", "unknown"):
        base += 5.0
    if residency_status == "german_citizen" and schufa_rating in ("excellent", "good"):
        base = 15.0
    return min(base, 40.0)


def _estimate_rate_range(
    total_score: float,
) -> tuple[float, float]:
    """Estimate expected mortgage interest rate range based on score."""
    if total_score >= 80:
        return (3.0, 3.8)
    if total_score >= 60:
        return (3.5, 4.5)
    if total_score >= 40:
        return (4.0, 5.5)
    if total_score >= 20:
        return (5.0, 7.0)
    return (6.0, 8.5)


def _estimate_ltv(available_dp: float, max_loan: float) -> float:
    """Calculate loan-to-value ratio."""
    total = available_dp + max_loan
    if total <= 0:
        return 0.0
    return round(max_loan / total, 4)


# ---------------------------------------------------------------------------
# Advisory builders
# ---------------------------------------------------------------------------

def _build_strengths(
    scores: ScoreBreakdown,
    inputs: FinancingAssessmentCreate,
) -> list[str]:
    """Build list of strength messages for high-scoring factors."""
    strengths = []
    if scores.employment >= 16:
        strengths.append("Stable employment type is highly valued by German banks")
    if scores.income_ratio >= 16:
        strengths.append("Healthy debt-to-income ratio well within bank limits")
    if scores.down_payment >= 16:
        strengths.append("Strong down payment reduces risk and improves loan terms")
    if scores.schufa >= 12:
        strengths.append("Good SCHUFA credit rating strengthens your application")
    if scores.residency >= 11:
        strengths.append("Residency status provides favorable lending conditions")
    if scores.years_bonus >= 8:
        strengths.append("Long employment tenure demonstrates financial stability")
    return strengths


def _build_improvements(
    scores: ScoreBreakdown,
    inputs: FinancingAssessmentCreate,
) -> list[str]:
    """Build actionable improvement advice for weak factors."""
    improvements = []
    if scores.employment < 12:
        improvements.append(
            "Consider securing permanent employment before applying — "
            "banks prefer unbefristete Arbeitsverträge"
        )
    if scores.income_ratio < 12:
        improvements.append(
            "Reduce monthly debt obligations to improve your debt-to-income ratio "
            "below 35%"
        )
    if scores.down_payment < 12:
        improvements.append(
            "Save for a larger down payment — aim for at least 20% of property price "
            "to unlock better rates"
        )
    if scores.schufa < 9:
        improvements.append(
            "Improve your SCHUFA score by paying debts on time and closing unused "
            "credit accounts"
        )
    if scores.residency < 11:
        improvements.append(
            "Apply for permanent residency (Niederlassungserlaubnis) to improve "
            "lending eligibility"
        )
    if scores.years_bonus < 6:
        improvements.append(
            "Wait until you have at least 2 years at your current employer — "
            "banks value employment stability"
        )
    return improvements


def _build_document_checklist(inputs: FinancingAssessmentCreate) -> list[str]:
    """Build list of required documents based on applicant profile."""
    docs = [
        "Valid passport or ID (Personalausweis)",
        "Proof of income — last 3 payslips (Gehaltsabrechnungen)",
        "Bank statements — last 3 months (Kontoauszüge)",
        "SCHUFA credit report (Selbstauskunft)",
        "Employment contract (Arbeitsvertrag)",
        "Tax returns — last 2 years (Steuerbescheide)",
    ]

    if inputs.employment_status in ("self_employed", "freelance"):
        docs.extend([
            "Business financial statements — last 3 years (BWA + Bilanz)",
            "Tax advisor confirmation letter (Steuerberater-Bescheinigung)",
            "Business registration certificate (Gewerbeanmeldung)",
        ])

    if inputs.residency_status in ("temporary_resident", "non_eu"):
        docs.extend([
            "Residence permit (Aufenthaltstitel)",
            "Registration certificate (Meldebescheinigung)",
        ])

    if inputs.residency_status == "eu_citizen":
        docs.append("EU registration certificate (Freizügigkeitsbescheinigung)")

    if inputs.available_down_payment > 0:
        docs.append("Proof of down payment funds (Eigenkapitalnachweis)")

    return docs


# ---------------------------------------------------------------------------
# Main assessment (pure calculation)
# ---------------------------------------------------------------------------

def assess(inputs: FinancingAssessmentCreate) -> AssessmentResult:
    """Run full financing eligibility assessment.

    Args:
        inputs: Validated assessment inputs.

    Returns:
        AssessmentResult with scores, estimates, and advisory content.
    """
    scores = ScoreBreakdown(
        employment=_score_employment(inputs.employment_status),
        income_ratio=_score_income_ratio(inputs.monthly_net_income, inputs.monthly_debt),
        down_payment=_score_down_payment(inputs.available_down_payment),
        schufa=_score_schufa(inputs.schufa_rating),
        residency=_score_residency(inputs.residency_status),
        years_bonus=_score_employment_years(inputs.employment_years),
    )

    total = round(
        scores.employment
        + scores.income_ratio
        + scores.down_payment
        + scores.schufa
        + scores.residency
        + scores.years_bonus,
        1,
    )

    label = _likelihood_label(total)
    max_loan = _estimate_max_loan(inputs.monthly_net_income, inputs.monthly_debt)
    rec_dp = _recommended_dp_percent(inputs.residency_status, inputs.schufa_rating)
    rate_min, rate_max = _estimate_rate_range(total)
    ltv = _estimate_ltv(inputs.available_down_payment, max_loan)

    return AssessmentResult(
        scores=scores,
        total_score=total,
        likelihood_label=label,
        max_loan_estimate=max_loan,
        recommended_down_payment_percent=rec_dp,
        expected_rate_min=rate_min,
        expected_rate_max=rate_max,
        ltv_ratio=ltv,
        strengths=_build_strengths(scores, inputs),
        improvements=_build_improvements(scores, inputs),
        document_checklist=_build_document_checklist(inputs),
    )


# ---------------------------------------------------------------------------
# CRUD operations
# ---------------------------------------------------------------------------

def save_assessment(
    session: Session,
    user_id: uuid.UUID,
    inputs: FinancingAssessmentCreate,
) -> FinancingAssessment:
    """Assess, generate share_id, and persist.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.
        inputs: Validated assessment inputs.

    Returns:
        Persisted FinancingAssessment model.
    """
    result = assess(inputs)

    assessment = FinancingAssessment(
        user_id=user_id,
        name=inputs.name,
        share_id=secrets.token_urlsafe(8),
        # Inputs
        employment_status=inputs.employment_status,
        employment_years=inputs.employment_years,
        monthly_net_income=inputs.monthly_net_income,
        monthly_debt=inputs.monthly_debt,
        available_down_payment=inputs.available_down_payment,
        schufa_rating=inputs.schufa_rating,
        residency_status=inputs.residency_status,
        # Score breakdown
        employment_score=result.scores.employment,
        income_ratio_score=result.scores.income_ratio,
        down_payment_score=result.scores.down_payment,
        schufa_score=result.scores.schufa,
        residency_score=result.scores.residency,
        years_bonus_score=result.scores.years_bonus,
        # Results
        total_score=result.total_score,
        likelihood_label=result.likelihood_label,
        # Estimates
        max_loan_estimate=result.max_loan_estimate,
        recommended_down_payment_percent=result.recommended_down_payment_percent,
        expected_rate_min=result.expected_rate_min,
        expected_rate_max=result.expected_rate_max,
        ltv_ratio=result.ltv_ratio,
        # Advisory
        strengths=result.strengths,
        improvements=result.improvements,
        document_checklist=result.document_checklist,
    )
    session.add(assessment)
    session.commit()
    session.refresh(assessment)
    return assessment


def get_assessment(
    session: Session,
    assessment_id: uuid.UUID,
    user_id: uuid.UUID,
) -> FinancingAssessment:
    """Get an assessment by ID with ownership check.

    Args:
        session: Sync database session.
        assessment_id: Assessment UUID.
        user_id: Authenticated user's UUID.

    Returns:
        FinancingAssessment model.

    Raises:
        HTTPException: If not found or not owned by user.
    """
    assessment = session.get(FinancingAssessment, assessment_id)
    if not assessment or assessment.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financing assessment not found",
        )
    return assessment


def get_by_share_id(session: Session, share_id: str) -> FinancingAssessment:
    """Get an assessment by share_id (no auth required).

    Args:
        session: Sync database session.
        share_id: Short URL-safe share identifier.

    Returns:
        FinancingAssessment model.

    Raises:
        HTTPException: If not found.
    """
    statement = select(FinancingAssessment).where(
        FinancingAssessment.share_id == share_id
    )
    assessment = session.exec(statement).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared financing assessment not found",
        )
    return assessment


def list_user_assessments(
    session: Session,
    user_id: uuid.UUID,
) -> list[FinancingAssessment]:
    """Get all saved assessments for a user, newest first.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.

    Returns:
        List of FinancingAssessment models.
    """
    statement = (
        select(FinancingAssessment)
        .where(FinancingAssessment.user_id == user_id)
        .order_by(FinancingAssessment.created_at.desc())
    )
    return list(session.exec(statement).all())


def delete_assessment(
    session: Session,
    assessment_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Delete an assessment with ownership check.

    Args:
        session: Sync database session.
        assessment_id: Assessment UUID.
        user_id: Authenticated user's UUID.

    Raises:
        HTTPException: If not found or not owned by user.
    """
    assessment = get_assessment(session, assessment_id, user_id)
    session.delete(assessment)
    session.commit()
