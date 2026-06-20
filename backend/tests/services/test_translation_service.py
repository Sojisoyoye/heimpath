"""Tests for the Translation Service (Claude-based)."""

from unittest.mock import AsyncMock, MagicMock, patch

import anthropic
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


def _make_claude_response(
    translated_text: str,
    detected_language: str = "de",
    confidence: float = 0.98,
    tool_name: str = "translation_result",
) -> MagicMock:
    """Build a mock anthropic.Message with a single tool_use block."""
    tool_block = MagicMock()
    tool_block.type = "tool_use"
    tool_block.name = tool_name
    tool_block.input = {
        "translated_text": translated_text,
        "detected_language": detected_language,
        "confidence": confidence,
    }
    msg = MagicMock()
    msg.content = [tool_block]
    return msg


def _make_batch_claude_response(
    translations: list[dict],
) -> MagicMock:
    """Build a mock anthropic.Message for a batch translation tool_use block."""
    tool_block = MagicMock()
    tool_block.type = "tool_use"
    tool_block.name = "batch_translation_result"
    tool_block.input = {"translations": translations}
    msg = MagicMock()
    msg.content = [tool_block]
    return msg


def _make_detect_claude_response(
    language: str = "de",
    confidence: float = 0.95,
    is_supported: bool = True,
) -> MagicMock:
    """Build a mock anthropic.Message for a language detection tool_use block."""
    tool_block = MagicMock()
    tool_block.type = "tool_use"
    tool_block.name = "language_detection_result"
    tool_block.input = {
        "language": language,
        "confidence": confidence,
        "is_translation_supported": is_supported,
    }
    msg = MagicMock()
    msg.content = [tool_block]
    return msg


@pytest.fixture
def translation_service() -> TranslationService:
    """Create a translation service instance for testing."""
    return TranslationService(api_key="test_api_key_12345")


class TestTranslationServiceInit:
    """Tests for TranslationService initialization."""

    def test_init_creates_anthropic_client(self) -> None:
        """Test that initialization creates an AsyncAnthropic client."""
        service = TranslationService(api_key="test_key")
        assert isinstance(service._client, anthropic.AsyncAnthropic)

    def test_init_with_different_key(self) -> None:
        """Test that a different API key produces a valid client."""
        service = TranslationService(api_key="another_key")
        assert isinstance(service._client, anthropic.AsyncAnthropic)


class TestExtractToolInput:
    """Tests for _extract_tool_input helper."""

    def test_extracts_matching_tool(
        self, translation_service: TranslationService
    ) -> None:
        """Returns the input dict when the tool name matches."""
        response = _make_claude_response("Hello")
        result = translation_service._extract_tool_input(response, "translation_result")
        assert result["translated_text"] == "Hello"

    def test_raises_when_no_matching_tool(
        self, translation_service: TranslationService
    ) -> None:
        """Raises TranslationError when no matching tool_use block is present."""
        msg = MagicMock()
        msg.content = []
        with pytest.raises(TranslationError, match="No 'translation_result'"):
            translation_service._extract_tool_input(msg, "translation_result")


class TestTranslateText:
    """Tests for translate_text method."""

    @pytest.mark.asyncio
    async def test_translates_text_successfully(
        self, translation_service: TranslationService
    ) -> None:
        """Test successful text translation."""
        with patch.object(
            translation_service,
            "_make_request",
            new_callable=AsyncMock,
            return_value={
                "translated_text": "The purchase agreement",
                "detected_language": "de",
                "confidence": 0.98,
            },
        ):
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
        """Test translation when detected_language is absent — falls back to source."""
        with patch.object(
            translation_service,
            "_make_request",
            new_callable=AsyncMock,
            return_value={
                "translated_text": "The purchase agreement",
                "confidence": 1.0,
            },
        ):
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
        """Test TranslationError raised on unexpected exception."""
        with patch.object(
            translation_service, "_make_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.side_effect = Exception("API error")

            with pytest.raises(TranslationError, match="Translation failed"):
                await translation_service.translate_text(
                    text="Test text",
                    source_language=SupportedLanguage.GERMAN,
                    target_language=SupportedLanguage.ENGLISH,
                )

    @pytest.mark.asyncio
    async def test_re_raises_translation_error(
        self, translation_service: TranslationService
    ) -> None:
        """TranslationError from _make_request propagates as-is."""
        with patch.object(
            translation_service,
            "_make_request",
            new_callable=AsyncMock,
            side_effect=TranslationError("No tool_use block"),
        ):
            with pytest.raises(TranslationError):
                await translation_service.translate_text(
                    text="Test text",
                    source_language=SupportedLanguage.GERMAN,
                    target_language=SupportedLanguage.ENGLISH,
                )


class TestMakeRequest:
    """Tests for _make_request low-level method."""

    @pytest.mark.asyncio
    async def test_returns_translation_dict(
        self, translation_service: TranslationService
    ) -> None:
        """_make_request returns the tool_use input dict on success."""
        expected_response = _make_claude_response("Hello")
        translation_service._client.messages.create = AsyncMock(  # type: ignore[method-assign]
            return_value=expected_response
        )
        result = await translation_service._make_request(
            text="Hallo",
            source_language="de",
            target_language="en",
        )
        assert result["translated_text"] == "Hello"
        assert result["detected_language"] == "de"
        assert result["confidence"] == 0.98

    @pytest.mark.asyncio
    async def test_raises_translation_error_on_api_error(
        self, translation_service: TranslationService
    ) -> None:
        """_make_request wraps anthropic.APIError as TranslationError."""
        translation_service._client.messages.create = AsyncMock(  # type: ignore[method-assign]
            side_effect=anthropic.APIConnectionError(request=MagicMock())
        )
        with pytest.raises(TranslationError, match="Translation API error"):
            await translation_service._make_request(
                text="Hallo",
                source_language="de",
                target_language="en",
            )

    @pytest.mark.asyncio
    async def test_raises_on_missing_tool_use_block(
        self, translation_service: TranslationService
    ) -> None:
        """_make_request raises TranslationError when response has no tool_use block."""
        empty_msg = MagicMock()
        empty_msg.content = []
        translation_service._client.messages.create = AsyncMock(  # type: ignore[method-assign]
            return_value=empty_msg
        )
        with pytest.raises(TranslationError, match="No 'translation_result'"):
            await translation_service._make_request(
                text="Hallo",
                source_language="de",
                target_language="en",
            )


class TestMakeBatchRequest:
    """Tests for _make_batch_request low-level method."""

    @pytest.mark.asyncio
    async def test_returns_list_of_dicts(
        self, translation_service: TranslationService
    ) -> None:
        """_make_batch_request returns a list of translation dicts."""
        batch_response = _make_batch_claude_response(
            [
                {
                    "translated_text": "Hello",
                    "detected_language": "de",
                    "confidence": 0.98,
                },
                {
                    "translated_text": "World",
                    "detected_language": "de",
                    "confidence": 0.97,
                },
            ]
        )
        translation_service._client.messages.create = AsyncMock(  # type: ignore[method-assign]
            return_value=batch_response
        )
        result = await translation_service._make_batch_request(
            texts=["Hallo", "Welt"],
            source_language="de",
            target_language="en",
        )
        assert len(result) == 2
        assert result[0]["translated_text"] == "Hello"
        assert result[1]["translated_text"] == "World"

    @pytest.mark.asyncio
    async def test_raises_on_api_timeout(
        self, translation_service: TranslationService
    ) -> None:
        """_make_batch_request wraps anthropic.APITimeoutError as TranslationError."""
        translation_service._client.messages.create = AsyncMock(  # type: ignore[method-assign]
            side_effect=anthropic.APITimeoutError(request=MagicMock())
        )
        with pytest.raises(TranslationError, match="Batch translation API error"):
            await translation_service._make_batch_request(
                texts=["test"],
                source_language="de",
                target_language="en",
            )


class TestMakeDetectRequest:
    """Tests for _make_detect_request low-level method."""

    @pytest.mark.asyncio
    async def test_returns_detection_dict(
        self, translation_service: TranslationService
    ) -> None:
        """_make_detect_request returns the detection dict."""
        detect_response = _make_detect_claude_response(
            language="de", confidence=0.99, is_supported=True
        )
        translation_service._client.messages.create = AsyncMock(  # type: ignore[method-assign]
            return_value=detect_response
        )
        result = await translation_service._make_detect_request(text="Kaufvertrag")
        assert result["language"] == "de"
        assert result["confidence"] == 0.99
        assert result["is_translation_supported"] is True

    @pytest.mark.asyncio
    async def test_raises_on_api_error(
        self, translation_service: TranslationService
    ) -> None:
        """_make_detect_request wraps anthropic.APIError as TranslationError."""
        translation_service._client.messages.create = AsyncMock(  # type: ignore[method-assign]
            side_effect=anthropic.APIConnectionError(request=MagicMock())
        )
        with pytest.raises(TranslationError, match="Language detection API error"):
            await translation_service._make_detect_request(text="Kaufvertrag")


class TestDetectLanguage:
    """Tests for detect_language method."""

    @pytest.mark.asyncio
    async def test_detects_language_successfully(
        self, translation_service: TranslationService
    ) -> None:
        """Test successful language detection."""
        with patch.object(
            translation_service,
            "_make_detect_request",
            new_callable=AsyncMock,
            return_value={
                "language": "de",
                "confidence": 0.95,
                "is_translation_supported": True,
            },
        ):
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
        with patch.object(
            translation_service,
            "_make_detect_request",
            new_callable=AsyncMock,
            return_value={
                "language": "xx",
                "confidence": 0.5,
                "is_translation_supported": False,
            },
        ):
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
        text_high = "Kaufvertrag und Grundbuch"
        warnings_high = translation_service.detect_legal_terms(text_high)
        high_risk_terms = [w for w in warnings_high if w.risk_level == RiskLevel.HIGH]
        assert len(high_risk_terms) >= 1

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
        with patch.object(
            translation_service,
            "_make_request",
            new_callable=AsyncMock,
            return_value={
                "translated_text": "The purchase agreement must be notarized.",
                "detected_language": "de",
                "confidence": 0.98,
            },
        ):
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
        with patch.object(
            translation_service,
            "_make_request",
            new_callable=AsyncMock,
            return_value={
                "translated_text": "The land register",
                "detected_language": "de",
                "confidence": 0.98,
            },
        ):
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
        with patch.object(
            translation_service,
            "_make_request",
            new_callable=AsyncMock,
            return_value={
                "translated_text": "The purchase agreement",
                "detected_language": "de",
                "confidence": 0.98,
            },
        ):
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
        with patch.object(
            translation_service,
            "_make_batch_request",
            new_callable=AsyncMock,
            return_value=[
                {
                    "translated_text": "The purchase agreement",
                    "detected_language": "de",
                    "confidence": 0.98,
                },
                {
                    "translated_text": "The property tax",
                    "detected_language": "de",
                    "confidence": 0.97,
                },
            ],
        ):
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

            import app.services.translation_service as ts_module

            ts_module._translation_service = None
            ts_module.get_translation_service.cache_clear()

            result = get_translation_service()

        assert result is None

    def test_returns_service_when_configured(self) -> None:
        """Test service returned when properly configured."""
        with patch("app.services.translation_service.settings") as mock_settings:
            mock_settings.translator_enabled = True
            mock_settings.ANTHROPIC_API_KEY = "test_key"

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
        with patch.object(
            translation_service,
            "_make_request",
            new_callable=AsyncMock,
            return_value={
                "translated_text": "The purchase agreement",
                "detected_language": "de",
                "confidence": 0.98,
            },
        ):
            result = await translation_service.translate_with_warnings(
                text="Der Kaufvertrag",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.character_count == len("Der Kaufvertrag")


class TestReliability:
    """Tests for retry, timeout, and confidence-gating behaviour."""

    @pytest.mark.asyncio
    async def test_low_confidence_sets_requires_review(
        self, translation_service: TranslationService
    ) -> None:
        """Confidence below threshold sets requires_review regardless of legal terms."""
        with patch.object(
            translation_service,
            "_make_request",
            new_callable=AsyncMock,
            return_value={
                "translated_text": "The plot of land",
                "detected_language": "de",
                "confidence": 0.55,
            },
        ):
            result = await translation_service.translate_with_warnings(
                text="Das Grundstück",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.requires_review is True

    @pytest.mark.asyncio
    async def test_high_confidence_no_legal_terms_no_review(
        self, translation_service: TranslationService
    ) -> None:
        """High confidence and no legal terms means requires_review is False."""
        with patch.object(
            translation_service,
            "_make_request",
            new_callable=AsyncMock,
            return_value={
                "translated_text": "The weather is nice.",
                "detected_language": "de",
                "confidence": 0.99,
            },
        ):
            result = await translation_service.translate_with_warnings(
                text="Das Wetter ist schön.",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.requires_review is False

    @pytest.mark.asyncio
    async def test_api_timeout_raises_translation_error(
        self, translation_service: TranslationService
    ) -> None:
        """anthropic.APITimeoutError from _make_request surfaces as TranslationError."""
        with patch.object(
            translation_service,
            "_make_request",
            new_callable=AsyncMock,
            side_effect=TranslationError("Translation API error: timeout"),
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
        success_data = {
            "translated_text": "The purchase agreement",
            "detected_language": "de",
            "confidence": 0.98,
        }

        async def _flaky(text: str, source_language: str, target_language: str) -> dict:  # noqa: ARG001
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise TranslationError(
                    "Translation API error (status 503): Service unavailable"
                )
            return success_data

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
        """batch_translate raises TranslationError when Claude returns fewer results."""
        with patch.object(
            translation_service,
            "_make_batch_request",
            new_callable=AsyncMock,
            return_value=[
                {
                    "translated_text": f"Translation {i}",
                    "detected_language": "de",
                    "confidence": 0.98,
                }
                for i in range(3)
            ],
        ):
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
        with patch.object(
            translation_service,
            "_make_batch_request",
            new_callable=AsyncMock,
            return_value=[
                {
                    "translated_text": f"Translation {i}",
                    "detected_language": "de",
                    "confidence": 0.98,
                }
                for i in range(3)
            ],
        ):
            result = await translation_service.batch_translate(
                texts=["Text 1", "Text 2", "Text 3", "Text 4", "Text 5"],
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
                partial=True,
            )

        assert len(result.translations) == 5
        for i in range(3):
            assert (
                result.translations[i].translation.translated_text == f"Translation {i}"
            )
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
        with (
            patch.object(
                translation_service,
                "_make_batch_request",
                new_callable=AsyncMock,
                return_value=[
                    {
                        "translated_text": f"T{i}",
                        "detected_language": "de",
                        "confidence": 0.98,
                    }
                    for i in range(2)
                ],
            ),
            patch("app.services.translation_service.logger") as mock_logger,
        ):
            await translation_service.batch_translate(
                texts=["A", "B"],
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert mock_logger.debug.call_count >= 2
        all_debug_args = " ".join(
            str(args) for args, _ in mock_logger.debug.call_args_list
        )
        assert "2" in all_debug_args
