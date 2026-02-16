"""Tests for the Translation Service."""

from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.translation import RiskLevel, SupportedLanguage
from app.services.translation_service import (
    TranslationError,
    TranslationResult,
    TranslationService,
    get_translation_service,
)


@pytest.fixture
def translation_service() -> TranslationService:
    """Create a translation service instance for testing."""
    return TranslationService(
        api_key="test_api_key_12345",
        region="westeurope",
        endpoint="https://api.cognitive.microsofttranslator.com",
    )


class TestTranslationServiceInit:
    """Tests for TranslationService initialization."""

    def test_init_stores_configuration(self) -> None:
        """Test that initialization stores the configuration."""
        service = TranslationService(
            api_key="test_key",
            region="eastus",
            endpoint="https://test.endpoint.com",
        )
        assert service._api_key == "test_key"
        assert service._region == "eastus"
        assert service._endpoint == "https://test.endpoint.com"

    def test_init_uses_default_endpoint(self) -> None:
        """Test that default endpoint is used when not provided."""
        service = TranslationService(api_key="test_key", region="westeurope")
        assert service._endpoint == "https://api.cognitive.microsofttranslator.com"


class TestTranslateText:
    """Tests for translate_text method."""

    @pytest.mark.asyncio
    async def test_translates_text_successfully(
        self, translation_service: TranslationService
    ) -> None:
        """Test successful text translation."""
        mock_response = [
            {
                "detectedLanguage": {"language": "de", "score": 0.98},
                "translations": [{"text": "The purchase agreement", "to": "en"}],
            }
        ]

        with patch.object(
            translation_service, "_make_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            result = await translation_service.translate_text(
                text="Der Kaufvertrag",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert isinstance(result, TranslationResult)
        assert result.original_text == "Der Kaufvertrag"
        assert result.translated_text == "The purchase agreement"
        assert result.source_language == "de"
        assert result.target_language == "en"
        assert result.confidence == 0.98

    @pytest.mark.asyncio
    async def test_translates_without_detected_language(
        self, translation_service: TranslationService
    ) -> None:
        """Test translation when language detection is not returned."""
        mock_response = [
            {
                "translations": [{"text": "The purchase agreement", "to": "en"}],
            }
        ]

        with patch.object(
            translation_service, "_make_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            result = await translation_service.translate_text(
                text="Der Kaufvertrag",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.confidence == 1.0
        assert result.source_language == "de"

    @pytest.mark.asyncio
    async def test_raises_error_on_api_failure(
        self, translation_service: TranslationService
    ) -> None:
        """Test TranslationError raised on API failure."""
        with patch.object(
            translation_service, "_make_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.side_effect = Exception("API error")

            with pytest.raises(TranslationError) as exc_info:
                await translation_service.translate_text(
                    text="Test text",
                    source_language=SupportedLanguage.GERMAN,
                    target_language=SupportedLanguage.ENGLISH,
                )
            assert "Translation failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_raises_error_on_empty_response(
        self, translation_service: TranslationService
    ) -> None:
        """Test TranslationError raised when response is empty."""
        with patch.object(
            translation_service, "_make_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = []

            with pytest.raises(TranslationError) as exc_info:
                await translation_service.translate_text(
                    text="Test text",
                    source_language=SupportedLanguage.GERMAN,
                    target_language=SupportedLanguage.ENGLISH,
                )
            assert "Empty response" in str(exc_info.value)


class TestDetectLanguage:
    """Tests for detect_language method."""

    @pytest.mark.asyncio
    async def test_detects_language_successfully(
        self, translation_service: TranslationService
    ) -> None:
        """Test successful language detection."""
        mock_response = [
            {
                "language": "de",
                "score": 0.95,
                "isTranslationSupported": True,
                "isTransliterationSupported": False,
            }
        ]

        with patch.object(
            translation_service, "_make_detect_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            (
                language,
                confidence,
                is_supported,
            ) = await translation_service.detect_language(
                text="Der Kaufvertrag muss notariell beurkundet werden."
            )

        assert language == "de"
        assert confidence == 0.95
        assert is_supported is True

    @pytest.mark.asyncio
    async def test_returns_unsupported_for_unknown_language(
        self, translation_service: TranslationService
    ) -> None:
        """Test detection of unsupported language."""
        mock_response = [
            {
                "language": "xx",
                "score": 0.5,
                "isTranslationSupported": False,
                "isTransliterationSupported": False,
            }
        ]

        with patch.object(
            translation_service, "_make_detect_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            (
                language,
                confidence,
                is_supported,
            ) = await translation_service.detect_language(text="Unknown language text")

        assert language == "xx"
        assert is_supported is False


class TestLegalTermDetection:
    """Tests for legal term warning detection."""

    def test_detects_german_legal_terms(
        self, translation_service: TranslationService
    ) -> None:
        """Test detection of German legal/financial terms."""
        text = "Der Kaufvertrag enthält eine Grundschuld und Notarkosten."

        warnings = translation_service.detect_legal_terms(text)

        assert len(warnings) >= 2
        term_names = [w.original_term.lower() for w in warnings]
        assert "kaufvertrag" in term_names
        assert "grundschuld" in term_names

    def test_returns_empty_for_non_legal_text(
        self, translation_service: TranslationService
    ) -> None:
        """Test no warnings for everyday text."""
        text = "Das Wetter ist heute sehr schön."

        warnings = translation_service.detect_legal_terms(text)

        assert len(warnings) == 0

    def test_assigns_correct_risk_levels(
        self, translation_service: TranslationService
    ) -> None:
        """Test that risk levels are assigned correctly."""
        # High risk: legal contracts
        text_high = "Kaufvertrag und Grundbuch"
        warnings_high = translation_service.detect_legal_terms(text_high)
        high_risk_terms = [w for w in warnings_high if w.risk_level == RiskLevel.HIGH]
        assert len(high_risk_terms) >= 1

        # Medium risk: financial terms
        text_medium = "Grunderwerbsteuer und Maklerprovision"
        warnings_medium = translation_service.detect_legal_terms(text_medium)
        assert len(warnings_medium) >= 1


class TestTranslateWithWarnings:
    """Tests for translate_with_warnings method."""

    @pytest.mark.asyncio
    async def test_includes_legal_warnings(
        self, translation_service: TranslationService
    ) -> None:
        """Test translation includes legal warnings."""
        mock_response = [
            {
                "detectedLanguage": {"language": "de", "score": 0.98},
                "translations": [
                    {"text": "The purchase agreement must be notarized.", "to": "en"}
                ],
            }
        ]

        with patch.object(
            translation_service, "_make_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            result = await translation_service.translate_with_warnings(
                text="Der Kaufvertrag muss notariell beurkundet werden.",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.translation is not None
        assert len(result.legal_warnings) >= 1
        assert any(
            w.original_term.lower() == "kaufvertrag" for w in result.legal_warnings
        )

    @pytest.mark.asyncio
    async def test_sets_requires_review_for_high_risk(
        self, translation_service: TranslationService
    ) -> None:
        """Test requires_review is True when high risk terms present."""
        mock_response = [
            {
                "detectedLanguage": {"language": "de", "score": 0.98},
                "translations": [{"text": "The land register", "to": "en"}],
            }
        ]

        with patch.object(
            translation_service, "_make_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            result = await translation_service.translate_with_warnings(
                text="Das Grundbuch",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.requires_review is True

    @pytest.mark.asyncio
    async def test_skips_warnings_when_disabled(
        self, translation_service: TranslationService
    ) -> None:
        """Test legal warnings skipped when include_legal_warnings is False."""
        mock_response = [
            {
                "detectedLanguage": {"language": "de", "score": 0.98},
                "translations": [{"text": "The purchase agreement", "to": "en"}],
            }
        ]

        with patch.object(
            translation_service, "_make_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            result = await translation_service.translate_with_warnings(
                text="Der Kaufvertrag",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
                include_legal_warnings=False,
            )

        assert len(result.legal_warnings) == 0
        assert result.requires_review is False


class TestBatchTranslation:
    """Tests for batch_translate method."""

    @pytest.mark.asyncio
    async def test_translates_multiple_texts(
        self, translation_service: TranslationService
    ) -> None:
        """Test batch translation of multiple texts."""
        mock_response = [
            {
                "detectedLanguage": {"language": "de", "score": 0.98},
                "translations": [{"text": "The purchase agreement", "to": "en"}],
            },
            {
                "detectedLanguage": {"language": "de", "score": 0.97},
                "translations": [{"text": "The property tax", "to": "en"}],
            },
        ]

        with patch.object(
            translation_service, "_make_batch_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            result = await translation_service.batch_translate(
                texts=["Der Kaufvertrag", "Die Grunderwerbsteuer"],
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert len(result.translations) == 2
        assert result.total_character_count > 0


class TestGetTranslationService:
    """Tests for get_translation_service factory function."""

    def test_returns_none_when_not_configured(self) -> None:
        """Test None returned when translator is not configured."""
        with patch("app.services.translation_service.settings") as mock_settings:
            mock_settings.translator_enabled = False

            # Clear any cached service
            import app.services.translation_service as ts_module

            ts_module._translation_service = None
            ts_module.get_translation_service.cache_clear()

            result = get_translation_service()

        assert result is None

    def test_returns_service_when_configured(self) -> None:
        """Test service returned when properly configured."""
        with patch("app.services.translation_service.settings") as mock_settings:
            mock_settings.translator_enabled = True
            mock_settings.AZURE_TRANSLATOR_KEY = "test_key"
            mock_settings.AZURE_TRANSLATOR_REGION = "westeurope"
            mock_settings.AZURE_TRANSLATOR_ENDPOINT = "https://api.test.com"

            # Clear any cached service
            import app.services.translation_service as ts_module

            ts_module._translation_service = None
            ts_module.get_translation_service.cache_clear()

            result = get_translation_service()

        assert result is not None
        assert isinstance(result, TranslationService)


class TestCharacterCounting:
    """Tests for character counting."""

    @pytest.mark.asyncio
    async def test_counts_characters_correctly(
        self, translation_service: TranslationService
    ) -> None:
        """Test character count is accurate."""
        mock_response = [
            {
                "detectedLanguage": {"language": "de", "score": 0.98},
                "translations": [{"text": "The purchase agreement", "to": "en"}],
            }
        ]

        with patch.object(
            translation_service, "_make_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            result = await translation_service.translate_with_warnings(
                text="Der Kaufvertrag",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.character_count == len("Der Kaufvertrag")
