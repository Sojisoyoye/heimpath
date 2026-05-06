"""Contract analysis service.

Orchestrates PDF text extraction and AI-powered clause-by-clause analysis
of German Kaufverträge (purchase contracts).
"""

import logging
import secrets
import tempfile
import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.models.contract import ContractAnalysis
from app.services.clause_analyzer_service import analyze_kaufvertrag

logger = logging.getLogger(__name__)

# Number of clauses visible to free-tier users
FREE_TIER_CLAUSE_LIMIT = 3


class ContractAnalysisNotFoundError(Exception):
    """Raised when a contract analysis is not found."""


def _extract_pages_from_bytes(file_bytes: bytes) -> list[dict]:
    """Extract text from PDF bytes using pdfplumber (blocking — run in thread)."""
    import pdfplumber

    pages = []
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
        tmp.write(file_bytes)
        tmp.flush()
        with pdfplumber.open(tmp.name) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                pages.append(
                    {
                        "page_number": i,
                        "original_text": text,
                        "translated_text": "",
                    }
                )
    return pages


async def analyze_contract_pdf(
    session: Session,
    user_id: uuid.UUID,
    filename: str,
    file_bytes: bytes,
) -> ContractAnalysis:
    """Upload and analyze a PDF contract.

    Extracts text from the PDF, sends it to Claude for clause-by-clause
    analysis, and stores the result in the database.

    Args:
        session: Synchronous DB session.
        user_id: ID of the requesting user.
        filename: Original filename of the upload.
        file_bytes: Raw PDF content.

    Returns:
        Newly created ContractAnalysis record.
    """
    import asyncio

    # Extract pages in a thread (pdfplumber is blocking)
    pages = await asyncio.to_thread(_extract_pages_from_bytes, file_bytes)

    # Run Claude analysis (always as "kaufvertrag" document type)
    analysis_data = await analyze_kaufvertrag(pages, document_type="kaufvertrag")

    record = ContractAnalysis(
        user_id=user_id,
        filename=filename,
    )

    if analysis_data:
        record.summary = analysis_data.get("summary")
        record.analyzed_clauses = analysis_data.get("analyzed_clauses", [])
        record.notary_checklist = analysis_data.get("notary_checklist", [])
        record.overall_risk_assessment = analysis_data.get("overall_risk_assessment")
        record.overall_risk_explanation = analysis_data.get("overall_risk_explanation")
        raw_price = analysis_data.get("purchase_price_euros")
        record.purchase_price = (
            float(raw_price) if isinstance(raw_price, (int, float)) else None
        )

    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def get_analysis_by_id(
    session: Session,
    analysis_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ContractAnalysis:
    """Get a contract analysis by ID, scoped to the owning user.

    Raises:
        ContractAnalysisNotFoundError: If not found or not owned by user.
    """
    result = (
        session.execute(
            select(ContractAnalysis).where(
                ContractAnalysis.id == analysis_id,
                ContractAnalysis.user_id == user_id,
            )
        )
        .scalars()
        .first()
    )

    if not result:
        raise ContractAnalysisNotFoundError(f"Analysis {analysis_id} not found")
    return result


def get_analysis_by_share_id(
    session: Session,
    share_id: str,
) -> ContractAnalysis:
    """Get a contract analysis by its public share_id (no auth required).

    Raises:
        ContractAnalysisNotFoundError: If not found or not shared.
    """
    result = (
        session.execute(
            select(ContractAnalysis).where(ContractAnalysis.share_id == share_id)
        )
        .scalars()
        .first()
    )

    if not result:
        raise ContractAnalysisNotFoundError(f"Shared analysis {share_id} not found")
    return result


def list_analyses(
    session: Session,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[ContractAnalysis], int]:
    """List contract analyses for a user, newest first."""
    base_query = select(ContractAnalysis).where(ContractAnalysis.user_id == user_id)

    total = (
        session.execute(
            select(func.count()).select_from(base_query.subquery())
        ).scalar()
        or 0
    )

    offset = (page - 1) * page_size
    records = list(
        session.execute(
            base_query.order_by(ContractAnalysis.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        .scalars()
        .all()
    )
    return records, total


def generate_share_id(
    session: Session,
    analysis_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ContractAnalysis:
    """Generate or return an existing share_id for a contract analysis.

    Raises:
        ContractAnalysisNotFoundError: If analysis not found or not owned.
    """
    record = get_analysis_by_id(session, analysis_id, user_id)
    if not record.share_id:
        for _ in range(5):
            try:
                record.share_id = secrets.token_urlsafe(8)
                session.add(record)
                session.commit()
                session.refresh(record)
                break
            except IntegrityError:
                session.rollback()
        else:
            logger.error(
                "share_id collision: failed to generate unique id for analysis %s after 5 attempts",
                analysis_id,
            )
            raise RuntimeError("Failed to generate a unique share_id after 5 attempts")
    return record
