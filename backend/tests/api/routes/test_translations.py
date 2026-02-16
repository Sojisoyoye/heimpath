"""Tests for Translation API endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.schemas.translation import (
    LegalTermWarning,
    RiskLevel,
    TranslationResponse,
    TranslationResult,
)
from app.services.translation_service import TranslationError


def test_translate_text_service_not_configured(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test translation fails when service is not configured."""
    with patch(
        "app.api.routes.translations.get_translation_service", return_value=None
    ):
        r = client.post(
            f"{settings.API_V1_STR}/translations/translate",
            headers=normal_user_token_headers,
            json={
                "text": "Der Kaufvertrag",
                "source_language": "de",
                "target_language": "en",
            },
        )
        assert r.status_code == 503
        assert "not configured" in r.json()["detail"]


def test_translate_text_unauthenticated(client: TestClient) -> None:
    """Test that unauthenticated users cannot translate."""
    r = client.post(
        f"{settings.API_V1_STR}/translations/translate",
        json={
            "text": "Der Kaufvertrag",
            "source_language": "de",
            "target_language": "en",
        },
    )
    assert r.status_code == 401


def test_translate_text_success(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test successful text translation."""
    mock_service = MagicMock()
    mock_service.translate_with_warnings = AsyncMock(
        return_value=TranslationResponse(
            translation=TranslationResult(
                original_text="Der Kaufvertrag",
                translated_text="The purchase agreement",
                source_language="de",
                target_language="en",
                confidence=0.98,
            ),
            legal_warnings=[
                LegalTermWarning(
                    original_term="Kaufvertrag",
                    translated_term="purchase agreement",
                    risk_level=RiskLevel.HIGH,
                    explanation="Legal contract for property purchase.",
                )
            ],
            requires_review=True,
            character_count=15,
        )
    )

    with patch(
        "app.api.routes.translations.get_translation_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/translations/translate",
            headers=normal_user_token_headers,
            json={
                "text": "Der Kaufvertrag",
                "source_language": "de",
                "target_language": "en",
                "include_legal_warnings": True,
            },
        )

    assert r.status_code == 200
    data = r.json()
    assert data["translation"]["translated_text"] == "The purchase agreement"
    assert data["translation"]["confidence"] == 0.98
    assert len(data["legal_warnings"]) == 1
    assert data["requires_review"] is True
    assert data["character_count"] == 15


def test_translate_text_without_warnings(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test translation without legal warnings."""
    mock_service = MagicMock()
    mock_service.translate_with_warnings = AsyncMock(
        return_value=TranslationResponse(
            translation=TranslationResult(
                original_text="Der Kaufvertrag",
                translated_text="The purchase agreement",
                source_language="de",
                target_language="en",
                confidence=0.98,
            ),
            legal_warnings=[],
            requires_review=False,
            character_count=15,
        )
    )

    with patch(
        "app.api.routes.translations.get_translation_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/translations/translate",
            headers=normal_user_token_headers,
            json={
                "text": "Der Kaufvertrag",
                "source_language": "de",
                "target_language": "en",
                "include_legal_warnings": False,
            },
        )

    assert r.status_code == 200
    data = r.json()
    assert len(data["legal_warnings"]) == 0
    assert data["requires_review"] is False


def test_translate_text_validation_error_empty_text(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test validation error for empty text."""
    mock_service = MagicMock()

    with patch(
        "app.api.routes.translations.get_translation_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/translations/translate",
            headers=normal_user_token_headers,
            json={
                "text": "",
                "source_language": "de",
                "target_language": "en",
            },
        )

    assert r.status_code == 422


def test_translate_text_api_error(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test error handling when translation API fails."""
    mock_service = MagicMock()
    mock_service.translate_with_warnings = AsyncMock(
        side_effect=TranslationError("API error")
    )

    with patch(
        "app.api.routes.translations.get_translation_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/translations/translate",
            headers=normal_user_token_headers,
            json={
                "text": "Der Kaufvertrag",
                "source_language": "de",
                "target_language": "en",
            },
        )

    assert r.status_code == 500
    assert "Translation failed" in r.json()["detail"]


def test_detect_language_success(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test successful language detection."""
    mock_service = MagicMock()
    mock_service.detect_language = AsyncMock(return_value=("de", 0.95, True))

    with patch(
        "app.api.routes.translations.get_translation_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/translations/detect",
            headers=normal_user_token_headers,
            json={"text": "Der Kaufvertrag muss notariell beurkundet werden."},
        )

    assert r.status_code == 200
    data = r.json()
    assert data["language"] == "de"
    assert data["confidence"] == 0.95
    assert data["is_supported"] is True


def test_detect_language_service_not_configured(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test language detection fails when service is not configured."""
    with patch(
        "app.api.routes.translations.get_translation_service", return_value=None
    ):
        r = client.post(
            f"{settings.API_V1_STR}/translations/detect",
            headers=normal_user_token_headers,
            json={"text": "Der Kaufvertrag"},
        )
        assert r.status_code == 503


def test_batch_translate_success(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test successful batch translation."""
    from app.schemas.translation import BatchTranslationResponse

    mock_service = MagicMock()
    mock_service.batch_translate = AsyncMock(
        return_value=BatchTranslationResponse(
            translations=[
                TranslationResponse(
                    translation=TranslationResult(
                        original_text="Der Kaufvertrag",
                        translated_text="The purchase agreement",
                        source_language="de",
                        target_language="en",
                        confidence=0.98,
                    ),
                    legal_warnings=[],
                    requires_review=False,
                    character_count=15,
                ),
                TranslationResponse(
                    translation=TranslationResult(
                        original_text="Die Grunderwerbsteuer",
                        translated_text="The property transfer tax",
                        source_language="de",
                        target_language="en",
                        confidence=0.97,
                    ),
                    legal_warnings=[],
                    requires_review=False,
                    character_count=21,
                ),
            ],
            total_character_count=36,
            total_warnings=0,
        )
    )

    with patch(
        "app.api.routes.translations.get_translation_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/translations/batch",
            headers=normal_user_token_headers,
            json={
                "texts": ["Der Kaufvertrag", "Die Grunderwerbsteuer"],
                "source_language": "de",
                "target_language": "en",
            },
        )

    assert r.status_code == 200
    data = r.json()
    assert len(data["translations"]) == 2
    assert data["total_character_count"] == 36


def test_batch_translate_too_many_texts(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test validation error for too many texts in batch."""
    mock_service = MagicMock()

    with patch(
        "app.api.routes.translations.get_translation_service", return_value=mock_service
    ):
        # Create list with more than 100 texts
        texts = ["text"] * 101
        r = client.post(
            f"{settings.API_V1_STR}/translations/batch",
            headers=normal_user_token_headers,
            json={
                "texts": texts,
                "source_language": "de",
                "target_language": "en",
            },
        )

    assert r.status_code == 422


def test_get_supported_languages(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test getting list of supported languages."""
    r = client.get(
        f"{settings.API_V1_STR}/translations/languages",
        headers=normal_user_token_headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert "languages" in data
    # Check that German and English are supported
    lang_codes = [lang["code"] for lang in data["languages"]]
    assert "de" in lang_codes
    assert "en" in lang_codes
