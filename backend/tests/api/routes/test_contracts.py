"""Tests for Contract Explainer API endpoints."""

import io
import uuid
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate
from tests.utils.utils import random_email, random_lower_string

# Minimal PDF bytes (1-page PDF with no text content)
_MINIMAL_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
    b"xref\n0 4\n0000000000 65535 f\n"
    b"0000000009 00000 n\n0000000068 00000 n\n0000000125 00000 n\n"
    b"trailer\n<< /Size 4 /Root 1 0 R >>\n"
    b"startxref\n197\n%%EOF"
)

# Mocked analysis returned by analyze_kaufvertrag
_MOCK_ANALYSIS = {
    "summary": "A standard purchase contract for residential property.",
    "analyzed_clauses": [
        {
            "section_name": "Kaufgegenstand",
            "section_name_en": "Subject of Sale",
            "original_text": "Das Objekt wird wie besehen verkauft.",
            "plain_english_explanation": "The property is sold as-is.",
            "risk_level": "medium",
            "risk_reason": "No warranty provided.",
            "is_unusual": False,
            "unusual_terms": [],
            "page_number": 1,
        },
        {
            "section_name": "Kaufpreis",
            "section_name_en": "Purchase Price",
            "original_text": "EUR 500.000",
            "plain_english_explanation": "The purchase price is EUR 500,000.",
            "risk_level": "low",
            "risk_reason": "Standard pricing clause.",
            "is_unusual": False,
            "unusual_terms": [],
            "page_number": 1,
        },
        {
            "section_name": "Zahlung",
            "section_name_en": "Payment Terms",
            "original_text": "Zahlung innerhalb 30 Tagen.",
            "plain_english_explanation": "Payment due within 30 days.",
            "risk_level": "low",
            "risk_reason": "Standard payment terms.",
            "is_unusual": False,
            "unusual_terms": [],
            "page_number": 2,
        },
        {
            "section_name": "Gewährleistung",
            "section_name_en": "Warranty",
            "original_text": "Keine Gewährleistung.",
            "plain_english_explanation": "No warranty is given.",
            "risk_level": "high",
            "risk_reason": "All warranties excluded — buyer bears full risk.",
            "is_unusual": True,
            "unusual_terms": ["Gewährleistungsausschluss"],
            "page_number": 3,
        },
    ],
    "notary_checklist": [
        {
            "question": "Are there any encumbrances on the property?",
            "related_clause": "Grundbuch",
            "priority": "essential",
        }
    ],
    "overall_risk_assessment": "medium",
    "overall_risk_explanation": "The contract is largely standard but excludes all warranties.",
    "is_ai_generated": True,
}


def _get_auth_headers(client: TestClient, db: Session) -> tuple[dict, str]:
    """Create a user and return auth headers and user ID."""
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    login_data = {"username": email, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    return headers, str(user.id)


# ---------------------------------------------------------------------------
# POST /contracts/analyze
# ---------------------------------------------------------------------------


def test_analyze_contract_success(client: TestClient, db: Session) -> None:
    """Test uploading a PDF returns 201 with analysis data."""
    headers, _ = _get_auth_headers(client, db)

    with patch(
        "app.services.contract_service.analyze_kaufvertrag",
        new=AsyncMock(return_value=_MOCK_ANALYSIS),
    ), patch(
        "app.services.contract_service._extract_pages_from_bytes",
        return_value=[{"page_number": 1, "original_text": "Test", "translated_text": ""}],
    ):
        r = client.post(
            f"{settings.API_V1_STR}/contracts/analyze",
            files={"file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")},
            headers=headers,
        )

    assert r.status_code == 201
    data = r.json()
    assert data["filename"] == "test.pdf"
    assert data["clause_count"] == 4
    assert data["overall_risk_assessment"] == "medium"
    assert "id" in data
    assert "created_at" in data


def test_analyze_contract_free_user_truncated(client: TestClient, db: Session) -> None:
    """Test that free users see only the first 3 clauses."""
    headers, _ = _get_auth_headers(client, db)

    with patch(
        "app.services.contract_service.analyze_kaufvertrag",
        new=AsyncMock(return_value=_MOCK_ANALYSIS),
    ), patch(
        "app.services.contract_service._extract_pages_from_bytes",
        return_value=[{"page_number": 1, "original_text": "Test", "translated_text": ""}],
    ):
        r = client.post(
            f"{settings.API_V1_STR}/contracts/analyze",
            files={"file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")},
            headers=headers,
        )

    assert r.status_code == 201
    data = r.json()
    # Free user sees 3 clauses (FREE_TIER_CLAUSE_LIMIT)
    assert len(data["analyzed_clauses"]) == 3
    assert data["is_truncated"] is True
    # No notary checklist for free users
    assert data["notary_checklist"] == []


def test_analyze_contract_unauthenticated(client: TestClient) -> None:
    """Test that unauthenticated requests return 401."""
    r = client.post(
        f"{settings.API_V1_STR}/contracts/analyze",
        files={"file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")},
    )
    assert r.status_code == 401


def test_analyze_contract_invalid_file_type(client: TestClient, db: Session) -> None:
    """Test that non-PDF files return 422."""
    headers, _ = _get_auth_headers(client, db)

    r = client.post(
        f"{settings.API_V1_STR}/contracts/analyze",
        files={"file": ("contract.docx", io.BytesIO(b"fake docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers=headers,
    )
    assert r.status_code == 400


def test_analyze_contract_no_api_key(client: TestClient, db: Session) -> None:
    """Test that analysis succeeds (with no clauses) when Anthropic not configured."""
    headers, _ = _get_auth_headers(client, db)

    with patch(
        "app.services.contract_service.analyze_kaufvertrag",
        new=AsyncMock(return_value=None),
    ), patch(
        "app.services.contract_service._extract_pages_from_bytes",
        return_value=[{"page_number": 1, "original_text": "", "translated_text": ""}],
    ):
        r = client.post(
            f"{settings.API_V1_STR}/contracts/analyze",
            files={"file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")},
            headers=headers,
        )

    assert r.status_code == 201
    data = r.json()
    assert data["clause_count"] == 0
    assert data["analyzed_clauses"] == []


# ---------------------------------------------------------------------------
# GET /contracts/
# ---------------------------------------------------------------------------


def test_list_analyses_empty(client: TestClient, db: Session) -> None:
    """Test listing analyses returns empty list for new user."""
    headers, _ = _get_auth_headers(client, db)
    r = client.get(f"{settings.API_V1_STR}/contracts/", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["data"] == []
    assert data["total"] == 0


def test_list_analyses_unauthenticated(client: TestClient) -> None:
    """Test that listing analyses requires auth."""
    r = client.get(f"{settings.API_V1_STR}/contracts/")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# GET /contracts/{analysis_id}
# ---------------------------------------------------------------------------


def test_get_analysis_not_found(client: TestClient, db: Session) -> None:
    """Test fetching a non-existent analysis returns 404."""
    headers, _ = _get_auth_headers(client, db)
    r = client.get(
        f"{settings.API_V1_STR}/contracts/{uuid.uuid4()}",
        headers=headers,
    )
    assert r.status_code == 404


def test_get_analysis_not_owned(client: TestClient, db: Session) -> None:
    """Test that a user cannot access another user's analysis."""
    headers1, _ = _get_auth_headers(client, db)
    headers2, _ = _get_auth_headers(client, db)

    with patch(
        "app.services.contract_service.analyze_kaufvertrag",
        new=AsyncMock(return_value=_MOCK_ANALYSIS),
    ), patch(
        "app.services.contract_service._extract_pages_from_bytes",
        return_value=[{"page_number": 1, "original_text": "Test", "translated_text": ""}],
    ):
        r = client.post(
            f"{settings.API_V1_STR}/contracts/analyze",
            files={"file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")},
            headers=headers1,
        )

    analysis_id = r.json()["id"]

    # User 2 cannot see user 1's analysis
    r = client.get(
        f"{settings.API_V1_STR}/contracts/{analysis_id}",
        headers=headers2,
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# POST /contracts/{analysis_id}/share + GET /contracts/shared/{share_id}
# ---------------------------------------------------------------------------


def test_share_and_retrieve_analysis(client: TestClient, db: Session) -> None:
    """Test generating a share_id and retrieving via public endpoint."""
    headers, _ = _get_auth_headers(client, db)

    with patch(
        "app.services.contract_service.analyze_kaufvertrag",
        new=AsyncMock(return_value=_MOCK_ANALYSIS),
    ), patch(
        "app.services.contract_service._extract_pages_from_bytes",
        return_value=[{"page_number": 1, "original_text": "Test", "translated_text": ""}],
    ):
        r = client.post(
            f"{settings.API_V1_STR}/contracts/analyze",
            files={"file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")},
            headers=headers,
        )

    analysis_id = r.json()["id"]

    # Generate share link
    r = client.post(
        f"{settings.API_V1_STR}/contracts/{analysis_id}/share",
        headers=headers,
    )
    assert r.status_code == 200
    share_id = r.json()["share_id"]
    assert share_id is not None

    # Retrieve via public endpoint (no auth) — shared view shows all clauses
    r = client.get(f"{settings.API_V1_STR}/contracts/shared/{share_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["clause_count"] == 4
    assert len(data["analyzed_clauses"]) == 4
    assert data["is_truncated"] is False


def test_get_shared_analysis_not_found(client: TestClient) -> None:
    """Test retrieving a non-existent shared analysis returns 404."""
    r = client.get(f"{settings.API_V1_STR}/contracts/shared/nonexistent12")
    assert r.status_code == 404
