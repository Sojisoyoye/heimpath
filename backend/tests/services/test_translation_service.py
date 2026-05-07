"""Tests for the Translation Service."""

import asyncio
from unittest.mock import AsyncMock, patch

import aiohttp
import pytest
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_none

from app.core.reliability import _is_transient_translator_error
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


def _mock_session(
    status: int, body: list | None = None, error_text: str = ""
) -> object:
    """Return a mock aiohttp ClientSession that responds with *status* and optional *body*."""

    class _MockResponse:
        async def __aenter__(self) -> "_MockResponse":
            return self

        async def __aexit__(self, *args: object) -> bool:
            return False

        @property
        def status(self) -> int:  # noqa: A003
            return status

        async def json(self) -> list:
            return body or []

        async def text(self) -> str:
            return error_text

    class _MockSession:
        async def __aenter__(self) -> "_MockSession":
            return self

        async def __aexit__(self, *args: object) -> bool:
            return False

        def post(self, *args: object, **kwargs: object) -> _MockResponse:
            return _MockResponse()

    return _MockSession()


def _timeout_session(error: BaseException) -> object:
    """Return a mock aiohttp ClientSession that raises *error* when entering session.post()."""

    class _TimeoutResponse:
        async def __aenter__(self) -> None:
            raise error

        async def __aexit__(self, *args: object) -> bool:
            return False

    class _TimeoutSession:
        async def __aenter__(self) -> "_TimeoutSession":
            return self

        async def __aexit__(self, *args: object) -> bool:
            return False

        def post(self, *args: object, **kwargs: object) -> _TimeoutResponse:
            return _TimeoutResponse()

    return _TimeoutSession()


class TestReliability:
    """Tests for retry, timeout, and confidence-gating behaviour."""

    @pytest.mark.asyncio
    async def test_low_confidence_sets_requires_review(
        self, translation_service: TranslationService
    ) -> None:
        """Confidence below threshold sets requires_review regardless of legal terms."""
        mock_response = [
            {
                "detectedLanguage": {"language": "de", "score": 0.55},
                "translations": [{"text": "The plot of land", "to": "en"}],
            }
        ]

        with patch.object(
            translation_service, "_make_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            result = await translation_service.translate_with_warnings(
                text="Das Grundstück",  # no high-risk legal terms
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.requires_review is True

    @pytest.mark.asyncio
    async def test_high_confidence_no_legal_terms_no_review(
        self, translation_service: TranslationService
    ) -> None:
        """High confidence and no legal terms means requires_review is False."""
        mock_response = [
            {
                "detectedLanguage": {"language": "de", "score": 0.99},
                "translations": [{"text": "The weather is nice.", "to": "en"}],
            }
        ]

        with patch.object(
            translation_service, "_make_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_response

            result = await translation_service.translate_with_warnings(
                text="Das Wetter ist schön.",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.requires_review is False

    @pytest.mark.asyncio
    async def test_timeout_raises_translation_error(
        self, translation_service: TranslationService
    ) -> None:
        """aiohttp.ServerTimeoutError from _make_request surfaces as TranslationError."""
        with patch.object(
            translation_service,
            "_make_request",
            new_callable=AsyncMock,
            side_effect=aiohttp.ServerTimeoutError(),
        ):
            with pytest.raises(TranslationError):
                await translation_service.translate_text(
                    text="Der Kaufvertrag",
                    source_language=SupportedLanguage.GERMAN,
                    target_language=SupportedLanguage.ENGLISH,
                )

    @pytest.mark.asyncio
    async def test_retries_on_503(
        self, translation_service: TranslationService
    ) -> None:
        """translate_text retries when _make_request raises a 503 TranslationError."""
        call_count = 0
        success_data = [
            {
                "detectedLanguage": {"language": "de", "score": 0.98},
                "translations": [{"text": "The purchase agreement", "to": "en"}],
            }
        ]

        async def _flaky(text: str, source_language: str, target_language: str) -> list:  # noqa: ARG001
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise TranslationError(
                    "Translation API error (status 503): Service unavailable"
                )
            return success_data

        # Replace _make_request with a no-wait retry version to keep tests fast
        fast_retry = retry(
            stop=stop_after_attempt(3),
            wait=wait_none(),
            retry=retry_if_exception(_is_transient_translator_error),
            reraise=True,
        )
        translation_service._make_request = fast_retry(_flaky)  # type: ignore[method-assign]

        result = await translation_service.translate_text(
            text="Der Kaufvertrag",
            source_language=SupportedLanguage.GERMAN,
            target_language=SupportedLanguage.ENGLISH,
        )

        assert call_count == 2
        assert result.translated_text == "The purchase agreement"

    @pytest.mark.asyncio
    async def test_batch_response_length_mismatch_raises(
        self, translation_service: TranslationService
    ) -> None:
        """batch_translate raises TranslationError when API returns fewer results."""
        # API returns 3 results but we sent 5 texts
        mock_response = [
            {
                "detectedLanguage": {"language": "de", "score": 0.98},
                "translations": [{"text": f"Translation {i}", "to": "en"}],
            }
            for i in range(3)
        ]

        with patch.object(
            translation_service, "_make_batch_request", new_callable=AsyncMock
        ) as mock_batch:
            mock_batch.return_value = mock_response

            with pytest.raises(TranslationError) as exc_info:
                await translation_service.batch_translate(
                    texts=["Text 1", "Text 2", "Text 3", "Text 4", "Text 5"],
                    source_language=SupportedLanguage.GERMAN,
                    target_language=SupportedLanguage.ENGLISH,
                )

        assert "mismatch" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_batch_partial_mode_maps_received_and_marks_missing(
        self, translation_service: TranslationService
    ) -> None:
        """partial=True: first 3 translations mapped, texts 4 and 5 marked translation_failed."""
        mock_response = [
            {
                "detectedLanguage": {"language": "de", "score": 0.98},
                "translations": [{"text": f"Translation {i}", "to": "en"}],
            }
            for i in range(3)
        ]

        with patch.object(
            translation_service, "_make_batch_request", new_callable=AsyncMock
        ) as mock_batch:
            mock_batch.return_value = mock_response

            result = await translation_service.batch_translate(
                texts=["Text 1", "Text 2", "Text 3", "Text 4", "Text 5"],
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
                partial=True,
            )

        assert len(result.translations) == 5
        # First 3 are normal translations
        for i in range(3):
            assert (
                result.translations[i].translation.translated_text == f"Translation {i}"
            )
        # Last 2 are failure placeholders
        for i in range(3, 5):
            assert (
                result.translations[i].translation.translated_text
                == "translation_failed"
            )
            assert result.translations[i].translation.confidence == 0.0
            assert result.translations[i].requires_review is True

    @pytest.mark.asyncio
    async def test_batch_debug_log_emitted(
        self, translation_service: TranslationService
    ) -> None:
        """batch_translate calls logger.debug with sent/received counts."""
        mock_response = [
            {
                "detectedLanguage": {"language": "de", "score": 0.98},
                "translations": [{"text": f"T{i}", "to": "en"}],
            }
            for i in range(2)
        ]

        with (
            patch.object(
                translation_service, "_make_batch_request", new_callable=AsyncMock
            ) as mock_batch,
            patch("app.services.translation_service.logger") as mock_logger,
        ):
            mock_batch.return_value = mock_response
            await translation_service.batch_translate(
                texts=["A", "B"],
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        # Two debug calls: one before the request (sent count) and one after (received count)
        assert mock_logger.debug.call_count >= 2
        all_debug_args = " ".join(
            str(args) for args, _ in mock_logger.debug.call_args_list
        )
        assert "2" in all_debug_args

    def test_translation_timeout_constant_has_connect_and_sock_read(self) -> None:
        """_TRANSLATION_TIMEOUT uses total from settings plus explicit connect/sock_read."""
        from app.core.config import settings
        from app.services.translation_service import _TRANSLATION_TIMEOUT

        assert _TRANSLATION_TIMEOUT.total == settings.AZURE_TRANSLATOR_TIMEOUT_SECONDS
        assert _TRANSLATION_TIMEOUT.connect is not None
        assert _TRANSLATION_TIMEOUT.sock_read is not None

    @pytest.mark.asyncio
    async def test_post_happy_path_returns_json(
        self, translation_service: TranslationService
    ) -> None:
        """_post returns JSON body on a successful 200 response."""
        expected = [{"translations": [{"text": "Hello", "to": "en"}]}]
        with patch(
            "aiohttp.ClientSession", return_value=_mock_session(200, body=expected)
        ):
            result = await translation_service._make_request(
                text="Hallo",
                source_language="de",
                target_language="en",
            )
        assert result == expected

    @pytest.mark.asyncio
    async def test_post_non_200_raises_translation_error(
        self, translation_service: TranslationService
    ) -> None:
        """_post raises TranslationError when Azure returns a non-200 status."""
        with patch(
            "aiohttp.ClientSession",
            return_value=_mock_session(400, error_text="Bad request"),
        ):
            with pytest.raises(TranslationError, match="400"):
                await translation_service._make_request(
                    text="Hallo",
                    source_language="de",
                    target_language="en",
                )

    @pytest.mark.asyncio
    async def test_asyncio_timeout_in_make_request_raises_translation_error(
        self, translation_service: TranslationService
    ) -> None:
        """asyncio.TimeoutError during the HTTP call raises TranslationError with 'timed out'."""
        with patch(
            "aiohttp.ClientSession",
            return_value=_timeout_session(asyncio.TimeoutError()),
        ):
            with pytest.raises(TranslationError, match="timed out"):
                await translation_service._make_request(
                    text="test",
                    source_language="de",
                    target_language="en",
                )

    @pytest.mark.asyncio
    async def test_server_timeout_in_make_batch_request_raises_translation_error(
        self, translation_service: TranslationService
    ) -> None:
        """aiohttp.ServerTimeoutError in batch HTTP call raises TranslationError with 'timed out'."""
        with patch(
            "aiohttp.ClientSession",
            return_value=_timeout_session(aiohttp.ServerTimeoutError()),
        ):
            with pytest.raises(TranslationError, match="timed out"):
                await translation_service._make_batch_request(
                    texts=["test"],
                    source_language="de",
                    target_language="en",
                )

    @pytest.mark.asyncio
    async def test_asyncio_timeout_in_make_detect_request_raises_translation_error(
        self, translation_service: TranslationService
    ) -> None:
        """asyncio.TimeoutError in detect HTTP call raises TranslationError with 'timed out'."""
        with patch(
            "aiohttp.ClientSession",
            return_value=_timeout_session(asyncio.TimeoutError()),
        ):
            with pytest.raises(TranslationError, match="timed out"):
                await translation_service._make_detect_request(text="test")
