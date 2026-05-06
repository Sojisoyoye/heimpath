"""Translation request/response schemas."""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class SupportedLanguage(str, Enum):
    """Supported languages for translation."""

    GERMAN = "de"
    ENGLISH = "en"
    FRENCH = "fr"
    SPANISH = "es"
    ITALIAN = "it"
    POLISH = "pl"
    TURKISH = "tr"
    RUSSIAN = "ru"
    ARABIC = "ar"
    CHINESE = "zh-Hans"


class RiskLevel(str, Enum):
    """Risk level for translated terms."""

    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class LegalTermWarning(BaseModel):
    """Warning about a legal or financial term in translation."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "original_term": "Grundschuld",
                "translated_term": "land charge",
                "risk_level": "high",
                "explanation": "Legal term specific to German property law. "
                "May not have exact equivalent in other jurisdictions.",
            }
        }
    )

    original_term: str = Field(..., description="Original term in source language")
    translated_term: str = Field(..., description="Translated term")
    risk_level: RiskLevel = Field(..., description="Risk level for this term")
    explanation: str = Field(
        ..., description="Explanation of why this term requires attention"
    )


class TranslationRequest(BaseModel):
    """Request schema for text translation."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "Der Kaufvertrag muss notariell beurkundet werden.",
                "source_language": "de",
                "target_language": "en",
                "include_legal_warnings": True,
            }
        }
    )

    text: str = Field(
        ...,
        min_length=1,
        max_length=50000,
        description="Text to translate",
    )
    source_language: SupportedLanguage = Field(
        default=SupportedLanguage.GERMAN,
        description="Source language code",
    )
    target_language: SupportedLanguage = Field(
        default=SupportedLanguage.ENGLISH,
        description="Target language code",
    )
    include_legal_warnings: bool = Field(
        default=True,
        description="Include warnings for legal/financial terms",
    )


class TranslationResult(BaseModel):
    """Result of a single text translation."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "original_text": "Der Kaufvertrag muss notariell beurkundet werden.",
                "translated_text": "The purchase agreement must be notarized.",
                "source_language": "de",
                "target_language": "en",
                "confidence": 0.95,
            }
        }
    )

    original_text: str = Field(..., description="Original text")
    translated_text: str = Field(..., description="Translated text")
    source_language: str = Field(
        ..., description="Detected or specified source language"
    )
    target_language: str = Field(..., description="Target language")
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score of the translation (0-1)",
    )


class TranslationResponse(BaseModel):
    """Response schema for text translation."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "translation": {
                    "original_text": "Der Kaufvertrag muss notariell beurkundet werden.",
                    "translated_text": "The purchase agreement must be notarized.",
                    "source_language": "de",
                    "target_language": "en",
                    "confidence": 0.95,
                },
                "legal_warnings": [
                    {
                        "original_term": "Kaufvertrag",
                        "translated_term": "purchase agreement",
                        "risk_level": "medium",
                        "explanation": "Legal contract for property purchase. "
                        "Ensure proper legal review.",
                    }
                ],
                "requires_review": True,
                "character_count": 48,
            }
        }
    )

    translation: TranslationResult = Field(..., description="Translation result")
    legal_warnings: list[LegalTermWarning] = Field(
        default_factory=list,
        description="Warnings about legal/financial terms",
    )
    requires_review: bool = Field(
        default=False,
        description="Whether the translation requires manual review",
    )
    character_count: int = Field(
        ...,
        ge=0,
        description="Number of characters translated",
    )


class LanguageDetectionRequest(BaseModel):
    """Request schema for language detection."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"text": "Der Kaufvertrag muss notariell beurkundet werden."}
        }
    )

    text: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Text to detect language of",
    )


class LanguageDetectionResponse(BaseModel):
    """Response schema for language detection."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "language": "de",
                "confidence": 0.98,
                "is_supported": True,
            }
        }
    )

    language: str = Field(..., description="Detected language code")
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score of detection (0-1)",
    )
    is_supported: bool = Field(
        ...,
        description="Whether the detected language is supported for translation",
    )


class BatchTranslationRequest(BaseModel):
    """Request schema for batch text translation."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "texts": [
                    "Der Kaufvertrag muss notariell beurkundet werden.",
                    "Die Grunderwerbsteuer betraegt 6% in Berlin.",
                ],
                "source_language": "de",
                "target_language": "en",
                "include_legal_warnings": True,
            }
        }
    )

    texts: list[str] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of texts to translate",
    )
    source_language: SupportedLanguage = Field(
        default=SupportedLanguage.GERMAN,
        description="Source language code",
    )
    target_language: SupportedLanguage = Field(
        default=SupportedLanguage.ENGLISH,
        description="Target language code",
    )
    include_legal_warnings: bool = Field(
        default=True,
        description="Include warnings for legal/financial terms",
    )


class BatchTranslationResponse(BaseModel):
    """Response schema for batch text translation."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "translations": [],
                "total_character_count": 96,
                "total_warnings": 2,
            }
        }
    )

    translations: list[TranslationResponse] = Field(
        ...,
        description="List of translation results",
    )
    total_character_count: int = Field(
        ...,
        ge=0,
        description="Total characters translated",
    )
    total_warnings: int = Field(
        ...,
        ge=0,
        description="Total number of legal warnings",
    )
