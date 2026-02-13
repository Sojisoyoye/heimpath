"""Azure Translator Service.

Provides document translation for German real estate documents using
Microsoft Azure Translator API (free tier: 2M chars/month).
"""
import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import aiohttp

from app.core.config import settings
from app.schemas.translation import (
    BatchTranslationResponse,
    LegalTermWarning,
    RiskLevel,
    SupportedLanguage,
    TranslationResponse,
    TranslationResult as TranslationResultSchema,
)


class TranslationError(Exception):
    """Base exception for translation-related errors."""

    pass


class TranslationServiceNotConfiguredError(TranslationError):
    """Raised when translation service is not configured."""

    pass


# German legal and financial terms specific to real estate
# Format: (term, english_translation, risk_level, explanation)
GERMAN_LEGAL_TERMS: list[tuple[str, str, RiskLevel, str]] = [
    # High risk - legal documents and concepts
    (
        "Kaufvertrag",
        "purchase agreement",
        RiskLevel.HIGH,
        "Legal contract for property purchase. Must be notarized in Germany.",
    ),
    (
        "Grundbuch",
        "land register",
        RiskLevel.HIGH,
        "Official property register. Critical for ownership verification.",
    ),
    (
        "Grundschuld",
        "land charge",
        RiskLevel.HIGH,
        "Security interest on property. Specific to German law, differs from mortgages.",
    ),
    (
        "Auflassung",
        "conveyance declaration",
        RiskLevel.HIGH,
        "Legal declaration of ownership transfer. Requires notarization.",
    ),
    (
        "Notar",
        "notary",
        RiskLevel.HIGH,
        "Required for property transactions in Germany. Different from notaries in other countries.",
    ),
    (
        "Vormerkung",
        "priority notice",
        RiskLevel.HIGH,
        "Preliminary registration protecting buyer's rights before final transfer.",
    ),
    (
        "Wohnungseigentum",
        "condominium ownership",
        RiskLevel.HIGH,
        "German condominium ownership law differs from other jurisdictions.",
    ),
    (
        "Erbbaurecht",
        "hereditary building right",
        RiskLevel.HIGH,
        "Long-term land lease. Different ownership implications.",
    ),
    # Medium risk - financial and tax terms
    (
        "Grunderwerbsteuer",
        "property transfer tax",
        RiskLevel.MEDIUM,
        "Property transfer tax. Rates vary by federal state (3.5-6.5%).",
    ),
    (
        "Notarkosten",
        "notary fees",
        RiskLevel.MEDIUM,
        "Notary fees based on official fee schedule. Approximately 1-1.5% of price.",
    ),
    (
        "Maklerprovision",
        "broker commission",
        RiskLevel.MEDIUM,
        "Real estate agent commission. Varies by region, often split buyer/seller.",
    ),
    (
        "Nebenkosten",
        "additional costs",
        RiskLevel.MEDIUM,
        "Transaction costs including taxes, notary, registration fees.",
    ),
    (
        "Grundbuchamt",
        "land registry office",
        RiskLevel.MEDIUM,
        "Official authority for property registration.",
    ),
    (
        "Wertgutachten",
        "valuation report",
        RiskLevel.MEDIUM,
        "Property valuation. Methods may differ from other countries.",
    ),
    (
        "Eigenkapital",
        "equity capital",
        RiskLevel.MEDIUM,
        "Own funds for property purchase. German banks typically require 20-30%.",
    ),
    (
        "Finanzierungsbestätigung",
        "financing confirmation",
        RiskLevel.MEDIUM,
        "Bank confirmation of financing. Required before purchase contract.",
    ),
    # Low risk - common terms
    (
        "Immobilie",
        "real estate/property",
        RiskLevel.LOW,
        "General term for real estate property.",
    ),
    (
        "Eigentümer",
        "owner",
        RiskLevel.LOW,
        "Property owner.",
    ),
    (
        "Mieter",
        "tenant",
        RiskLevel.LOW,
        "Tenant. German tenant protection laws are strong.",
    ),
    (
        "Wohnfläche",
        "living space",
        RiskLevel.LOW,
        "Living area. Calculation methods defined by German law.",
    ),
    (
        "Baujahr",
        "year of construction",
        RiskLevel.LOW,
        "Construction year. Important for energy efficiency assessment.",
    ),
    (
        "Energieausweis",
        "energy certificate",
        RiskLevel.LOW,
        "Energy performance certificate. Required for property sales.",
    ),
]


@dataclass
class TranslationResult:
    """Internal result of a translation operation."""

    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    confidence: float


class TranslationService:
    """Azure Translator Service.

    Handles document translation for German real estate documents using
    Microsoft Azure Translator API. Includes legal term detection and
    risk warnings for terms requiring professional review.

    Attributes:
        _api_key: Azure Translator API key.
        _region: Azure service region.
        _endpoint: Azure Translator API endpoint.
    """

    DEFAULT_ENDPOINT = "https://api.cognitive.microsofttranslator.com"

    def __init__(
        self,
        api_key: str,
        region: str,
        endpoint: str | None = None,
    ) -> None:
        """Initialize the translation service.

        Args:
            api_key: Azure Translator API key.
            region: Azure service region (e.g., 'westeurope').
            endpoint: Azure Translator API endpoint (optional).
        """
        self._api_key = api_key
        self._region = region
        self._endpoint = endpoint or self.DEFAULT_ENDPOINT

    def _get_headers(self) -> dict[str, str]:
        """Get HTTP headers for Azure Translator API requests."""
        return {
            "Ocp-Apim-Subscription-Key": self._api_key,
            "Ocp-Apim-Subscription-Region": self._region,
            "Content-Type": "application/json",
        }

    async def _make_request(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> list[dict[str, Any]]:
        """Make a translation request to Azure Translator API.

        Args:
            text: Text to translate.
            source_language: Source language code.
            target_language: Target language code.

        Returns:
            API response as list of translation results.

        Raises:
            TranslationError: If the API request fails.
        """
        url = f"{self._endpoint}/translate"
        params = {
            "api-version": "3.0",
            "from": source_language,
            "to": target_language,
        }
        body = [{"text": text}]

        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                headers=self._get_headers(),
                params=params,
                json=body,
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise TranslationError(
                        f"Translation API error (status {response.status}): {error_text}"
                    )
                return await response.json()

    async def _make_batch_request(
        self,
        texts: list[str],
        source_language: str,
        target_language: str,
    ) -> list[dict[str, Any]]:
        """Make a batch translation request to Azure Translator API.

        Args:
            texts: List of texts to translate.
            source_language: Source language code.
            target_language: Target language code.

        Returns:
            API response as list of translation results.

        Raises:
            TranslationError: If the API request fails.
        """
        url = f"{self._endpoint}/translate"
        params = {
            "api-version": "3.0",
            "from": source_language,
            "to": target_language,
        }
        body = [{"text": text} for text in texts]

        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                headers=self._get_headers(),
                params=params,
                json=body,
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise TranslationError(
                        f"Translation API error (status {response.status}): {error_text}"
                    )
                return await response.json()

    async def _make_detect_request(self, text: str) -> list[dict[str, Any]]:
        """Make a language detection request to Azure Translator API.

        Args:
            text: Text to detect language of.

        Returns:
            API response as list of detection results.

        Raises:
            TranslationError: If the API request fails.
        """
        url = f"{self._endpoint}/detect"
        params = {"api-version": "3.0"}
        body = [{"text": text}]

        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                headers=self._get_headers(),
                params=params,
                json=body,
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise TranslationError(
                        f"Language detection API error (status {response.status}): {error_text}"
                    )
                return await response.json()

    async def translate_text(
        self,
        text: str,
        source_language: SupportedLanguage,
        target_language: SupportedLanguage,
    ) -> TranslationResult:
        """Translate text from source to target language.

        Args:
            text: Text to translate.
            source_language: Source language.
            target_language: Target language.

        Returns:
            TranslationResult with translated text and metadata.

        Raises:
            TranslationError: If translation fails.
        """
        try:
            response = await self._make_request(
                text=text,
                source_language=source_language.value,
                target_language=target_language.value,
            )

            if not response:
                raise TranslationError("Empty response from translation API")

            result = response[0]
            translations = result.get("translations", [])
            if not translations:
                raise TranslationError("No translations in response")

            detected = result.get("detectedLanguage", {})
            confidence = detected.get("score", 1.0)
            detected_lang = detected.get("language", source_language.value)

            return TranslationResult(
                original_text=text,
                translated_text=translations[0]["text"],
                source_language=detected_lang,
                target_language=target_language.value,
                confidence=confidence,
            )
        except TranslationError:
            raise
        except Exception as e:
            raise TranslationError(f"Translation failed: {e}") from e

    async def detect_language(self, text: str) -> tuple[str, float, bool]:
        """Detect the language of given text.

        Args:
            text: Text to detect language of.

        Returns:
            Tuple of (language_code, confidence, is_supported).

        Raises:
            TranslationError: If detection fails.
        """
        try:
            response = await self._make_detect_request(text)

            if not response:
                raise TranslationError("Empty response from detection API")

            result = response[0]
            language = result.get("language", "unknown")
            confidence = result.get("score", 0.0)
            is_supported = result.get("isTranslationSupported", False)

            return language, confidence, is_supported
        except TranslationError:
            raise
        except Exception as e:
            raise TranslationError(f"Language detection failed: {e}") from e

    def detect_legal_terms(self, text: str) -> list[LegalTermWarning]:
        """Detect German legal and financial terms in text.

        Scans text for terms that may require special attention when
        translating real estate documents.

        Args:
            text: Text to scan for legal terms.

        Returns:
            List of LegalTermWarning objects for detected terms.
        """
        warnings: list[LegalTermWarning] = []
        text_lower = text.lower()

        for term, translation, risk_level, explanation in GERMAN_LEGAL_TERMS:
            # Case-insensitive search with word boundaries
            pattern = rf"\b{re.escape(term.lower())}\b"
            if re.search(pattern, text_lower):
                warnings.append(
                    LegalTermWarning(
                        original_term=term,
                        translated_term=translation,
                        risk_level=risk_level,
                        explanation=explanation,
                    )
                )

        return warnings

    async def translate_with_warnings(
        self,
        text: str,
        source_language: SupportedLanguage,
        target_language: SupportedLanguage,
        include_legal_warnings: bool = True,
    ) -> TranslationResponse:
        """Translate text and include legal term warnings.

        Translates the given text and optionally scans for legal/financial
        terms that may require professional review.

        Args:
            text: Text to translate.
            source_language: Source language.
            target_language: Target language.
            include_legal_warnings: Whether to include legal term warnings.

        Returns:
            TranslationResponse with translation and warnings.

        Raises:
            TranslationError: If translation fails.
        """
        result = await self.translate_text(
            text=text,
            source_language=source_language,
            target_language=target_language,
        )

        legal_warnings: list[LegalTermWarning] = []
        requires_review = False

        if include_legal_warnings:
            legal_warnings = self.detect_legal_terms(text)
            # Require review if any high-risk terms are present
            requires_review = any(
                w.risk_level == RiskLevel.HIGH for w in legal_warnings
            )

        translation_result = TranslationResultSchema(
            original_text=result.original_text,
            translated_text=result.translated_text,
            source_language=result.source_language,
            target_language=result.target_language,
            confidence=result.confidence,
        )

        return TranslationResponse(
            translation=translation_result,
            legal_warnings=legal_warnings,
            requires_review=requires_review,
            character_count=len(text),
        )

    async def batch_translate(
        self,
        texts: list[str],
        source_language: SupportedLanguage,
        target_language: SupportedLanguage,
        include_legal_warnings: bool = True,
    ) -> BatchTranslationResponse:
        """Translate multiple texts in a single request.

        Args:
            texts: List of texts to translate.
            source_language: Source language.
            target_language: Target language.
            include_legal_warnings: Whether to include legal term warnings.

        Returns:
            BatchTranslationResponse with all translations.

        Raises:
            TranslationError: If translation fails.
        """
        try:
            response = await self._make_batch_request(
                texts=texts,
                source_language=source_language.value,
                target_language=target_language.value,
            )

            translations: list[TranslationResponse] = []
            total_chars = 0
            total_warnings = 0

            for i, result in enumerate(response):
                original_text = texts[i]
                translated = result.get("translations", [{}])[0]
                detected = result.get("detectedLanguage", {})

                translation_result = TranslationResultSchema(
                    original_text=original_text,
                    translated_text=translated.get("text", ""),
                    source_language=detected.get("language", source_language.value),
                    target_language=target_language.value,
                    confidence=detected.get("score", 1.0),
                )

                legal_warnings: list[LegalTermWarning] = []
                requires_review = False

                if include_legal_warnings:
                    legal_warnings = self.detect_legal_terms(original_text)
                    requires_review = any(
                        w.risk_level == RiskLevel.HIGH for w in legal_warnings
                    )
                    total_warnings += len(legal_warnings)

                char_count = len(original_text)
                total_chars += char_count

                translations.append(
                    TranslationResponse(
                        translation=translation_result,
                        legal_warnings=legal_warnings,
                        requires_review=requires_review,
                        character_count=char_count,
                    )
                )

            return BatchTranslationResponse(
                translations=translations,
                total_character_count=total_chars,
                total_warnings=total_warnings,
            )
        except TranslationError:
            raise
        except Exception as e:
            raise TranslationError(f"Batch translation failed: {e}") from e


# Singleton instance
_translation_service: TranslationService | None = None


@lru_cache
def get_translation_service() -> TranslationService | None:
    """Get the translation service singleton.

    Returns:
        TranslationService instance if Azure Translator is configured,
        None otherwise.
    """
    global _translation_service
    if _translation_service is None and settings.translator_enabled:
        _translation_service = TranslationService(
            api_key=settings.AZURE_TRANSLATOR_KEY or "",
            region=settings.AZURE_TRANSLATOR_REGION,
            endpoint=settings.AZURE_TRANSLATOR_ENDPOINT,
        )
    return _translation_service
