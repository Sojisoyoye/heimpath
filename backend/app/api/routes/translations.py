"""Document translation API endpoints.

Provides translation services for German real estate documents using
Microsoft Azure Translator API with legal term detection and warnings.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.schemas.translation import (
    BatchTranslationRequest,
    BatchTranslationResponse,
    LanguageDetectionRequest,
    LanguageDetectionResponse,
    SupportedLanguage,
    TranslationRequest,
    TranslationResponse,
)
from app.services.translation_service import (
    TranslationError,
    TranslationService,
    get_translation_service,
)

router = APIRouter(prefix="/translations", tags=["translations"])


# Response schemas specific to this router


class SupportedLanguageInfo(BaseModel):
    """Information about a supported language."""

    code: str
    name: str


class SupportedLanguagesResponse(BaseModel):
    """Response with list of supported languages."""

    languages: list[SupportedLanguageInfo]


# Language name mapping
LANGUAGE_NAMES = {
    "de": "German",
    "en": "English",
    "fr": "French",
    "es": "Spanish",
    "it": "Italian",
    "pl": "Polish",
    "tr": "Turkish",
    "ru": "Russian",
    "ar": "Arabic",
    "zh-Hans": "Chinese (Simplified)",
}


# Dependency to require translation service configuration


def require_translation_service() -> TranslationService:
    """Dependency that requires translation service to be configured."""
    service = get_translation_service()
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Translation service is not configured. Please set AZURE_TRANSLATOR_KEY.",
        )
    return service


# Endpoints


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(
    request: TranslationRequest,
    current_user: CurrentUser,  # noqa: ARG001
    translation_service: TranslationService = Depends(require_translation_service),
) -> TranslationResponse:
    """
    Translate text from source to target language.

    Translates the given text and optionally includes warnings for legal
    and financial terms that may require professional review.

    **Features:**
    - Neural machine translation via Microsoft Azure
    - Detection of German legal/financial terms
    - Risk level warnings for terms requiring review
    - Confidence scores for translation quality

    **Supported Languages:**
    - German (de) - primary source language
    - English (en) - primary target language
    - Plus French, Spanish, Italian, Polish, Turkish, Russian, Arabic, Chinese

    **Rate Limits:**
    - Free tier: 2 million characters/month
    - Character count included in response for tracking
    """
    try:
        result = await translation_service.translate_with_warnings(
            text=request.text,
            source_language=request.source_language,
            target_language=request.target_language,
            include_legal_warnings=request.include_legal_warnings,
        )
        return result
    except TranslationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {e}",
        )


@router.post("/detect", response_model=LanguageDetectionResponse)
async def detect_language(
    request: LanguageDetectionRequest,
    current_user: CurrentUser,  # noqa: ARG001
    translation_service: TranslationService = Depends(require_translation_service),
) -> LanguageDetectionResponse:
    """
    Detect the language of given text.

    Returns the detected language code, confidence score, and whether
    the language is supported for translation.
    """
    try:
        language, confidence, is_supported = await translation_service.detect_language(
            text=request.text
        )
        return LanguageDetectionResponse(
            language=language,
            confidence=confidence,
            is_supported=is_supported,
        )
    except TranslationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Language detection failed: {e}",
        )


@router.post("/batch", response_model=BatchTranslationResponse)
async def batch_translate(
    request: BatchTranslationRequest,
    current_user: CurrentUser,  # noqa: ARG001
    translation_service: TranslationService = Depends(require_translation_service),
) -> BatchTranslationResponse:
    """
    Translate multiple texts in a single request.

    More efficient for translating multiple paragraphs or document sections.
    Returns individual translations with legal warnings for each text.

    **Limits:**
    - Maximum 100 texts per request
    - Each text limited to 50,000 characters
    """
    try:
        result = await translation_service.batch_translate(
            texts=request.texts,
            source_language=request.source_language,
            target_language=request.target_language,
            include_legal_warnings=request.include_legal_warnings,
        )
        return result
    except TranslationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch translation failed: {e}",
        )


@router.get("/languages", response_model=SupportedLanguagesResponse)
async def get_supported_languages(
    current_user: CurrentUser,  # noqa: ARG001
) -> SupportedLanguagesResponse:
    """
    Get list of supported languages for translation.

    Returns all languages that can be used as source or target
    for document translation.
    """
    languages = [
        SupportedLanguageInfo(
            code=lang.value, name=LANGUAGE_NAMES.get(lang.value, lang.value)
        )
        for lang in SupportedLanguage
    ]
    return SupportedLanguagesResponse(languages=languages)
