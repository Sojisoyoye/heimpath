"""Document upload, PDF extraction, and translation service.

Handles document lifecycle: upload, PDF text extraction, clause detection,
translation via Azure Translator, and risk warning collection.
"""

import asyncio
import logging
import os
import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.document import (
    Document,
    DocumentStatus,
    DocumentTranslation,
    DocumentType,
)
from app.schemas.translation import SupportedLanguage
from app.services.translation_service import get_translation_service

logger = logging.getLogger(__name__)


# Regex patterns for German legal clause detection
CLAUSE_PATTERNS: list[tuple[str, str, str]] = [
    # (clause_type, pattern, risk_level)
    (
        "purchase_price",
        r"(?:Kaufpreis|kaufpreis)\s*(?:beträgt|:|\s)\s*(?:EUR|€)?\s*[\d.,]+",
        "high",
    ),
    (
        "deadline",
        r"(?:Frist|frist|Termin|termin|bis\s+(?:zum|spätestens))\s+\d{1,2}\.\s*\d{1,2}\.\s*\d{2,4}",
        "high",
    ),
    (
        "warranty_exclusion",
        r"(?:Gewährleistung|Sachmängelhaftung|Haftung)\s+(?:wird\s+)?(?:ausgeschlossen|ausschließen|entfällt)",
        "high",
    ),
    (
        "special_condition",
        r"(?:Sonderbedingung|Besondere\s+Vereinbarung|Auflage|Bedingung)\s*[:.]",
        "medium",
    ),
    (
        "financial_term",
        r"(?:Grundschuld|Hypothek|Darlehen|Zinsen|Tilgung|Annuität)\s*(?:in\s+Höhe\s+von|beträgt|:)?\s*(?:EUR|€)?\s*[\d.,]*",
        "medium",
    ),
]

# Keywords for document type detection
DOCUMENT_TYPE_KEYWORDS: dict[DocumentType, list[str]] = {
    DocumentType.KAUFVERTRAG: [
        "kaufvertrag",
        "purchase agreement",
        "notarvertrag",
        "kaufpreis",
        "veräußerung",
        "eigentumsübertragung",
        "auflassung",
    ],
    DocumentType.MIETVERTRAG: [
        "mietvertrag",
        "mieter",
        "vermieter",
        "miete",
        "kaltmiete",
        "warmmiete",
        "mietverhältnis",
        "kaution",
    ],
    DocumentType.EXPOSE: [
        "exposé",
        "expose",
        "objektbeschreibung",
        "lagebeschreibung",
        "wohnfläche",
        "zimmer",
        "baujahr",
        "energieausweis",
    ],
    DocumentType.NEBENKOSTENABRECHNUNG: [
        "nebenkostenabrechnung",
        "betriebskostenabrechnung",
        "heizkosten",
        "hausgeld",
        "umlageschlüssel",
    ],
    DocumentType.GRUNDBUCHAUSZUG: [
        "grundbuch",
        "grundbuchauszug",
        "abteilung",
        "flur",
        "flurstück",
        "bestandsverzeichnis",
        "eigentümer",
    ],
    DocumentType.TEILUNGSERKLAERUNG: [
        "teilungserklärung",
        "sondereigentum",
        "gemeinschaftseigentum",
        "miteigentumsanteil",
        "wohnungseigentum",
    ],
    DocumentType.HAUSGELDABRECHNUNG: [
        "hausgeldabrechnung",
        "wirtschaftsplan",
        "instandhaltungsrücklage",
        "verwaltergebühr",
        "rücklage",
    ],
}


def _detect_document_type(text: str) -> DocumentType:
    """Detect document type based on keyword frequency in extracted text."""
    text_lower = text.lower()
    scores: dict[DocumentType, int] = {}

    for doc_type, keywords in DOCUMENT_TYPE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[doc_type] = score

    if not scores:
        return DocumentType.UNKNOWN

    return max(scores, key=scores.get)  # type: ignore[arg-type]


def _detect_clauses(text: str, page_number: int) -> list[dict]:
    """Detect legal clauses in text using regex patterns."""
    clauses = []
    for clause_type, pattern, risk_level in CLAUSE_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            clauses.append(
                {
                    "clause_type": clause_type,
                    "original_text": match.group(0).strip(),
                    "translated_text": "",
                    "page_number": page_number,
                    "risk_level": risk_level,
                }
            )
    return clauses


def _extract_pages_sync(file_path: str) -> list[dict]:
    """Extract text from PDF pages (blocking — run in thread)."""
    import pdfplumber

    pages = []
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            pages.append(
                {"page_number": i, "original_text": text, "translated_text": ""}
            )
    return pages


def _count_pages_sync(file_path: str) -> int:
    """Count PDF pages (blocking — run in thread)."""
    import pdfplumber

    with pdfplumber.open(file_path) as pdf:
        return len(pdf.pages)


async def save_upload(
    session: AsyncSession,
    user_id: uuid.UUID,
    file_content: bytes,
    filename: str,
    is_premium: bool,
) -> Document:
    """Validate, save, and register an uploaded PDF document.

    Args:
        session: Async database session.
        user_id: Owner's user ID.
        file_content: Raw file bytes.
        filename: Original filename.
        is_premium: Whether user has premium subscription.

    Returns:
        Created Document database record.

    Raises:
        ValueError: If file exceeds size or page limits.
    """
    # Validate file size
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(file_content) > max_bytes:
        raise ValueError(f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB")

    # Write file to disk
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    stored_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(upload_dir, stored_filename)

    with open(file_path, "wb") as f:
        f.write(file_content)

    # Extract page count and detect type
    page_count = await asyncio.to_thread(_count_pages_sync, file_path)

    max_pages = settings.MAX_PAGES_PREMIUM if is_premium else settings.MAX_PAGES_FREE
    if page_count > max_pages:
        os.remove(file_path)
        raise ValueError(
            f"Document has {page_count} pages, exceeding the {max_pages}-page limit. "
            f"{'Upgrade to premium for more pages.' if not is_premium else 'Maximum pages exceeded.'}"
        )

    # Quick type detection from first pages
    pages = await asyncio.to_thread(_extract_pages_sync, file_path)
    combined_text = " ".join(p["original_text"] for p in pages[:3])
    document_type = _detect_document_type(combined_text)

    # Create DB record
    document = Document(
        user_id=user_id,
        original_filename=filename,
        stored_filename=stored_filename,
        file_path=file_path,
        file_size_bytes=len(file_content),
        page_count=page_count,
        document_type=document_type.value,
        status=DocumentStatus.UPLOADED.value,
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)

    return document


async def process_document(document_id: uuid.UUID, session_factory) -> None:  # type: ignore[type-arg]
    """Background task: extract text, translate, detect clauses, save results.

    Args:
        document_id: ID of the document to process.
        session_factory: Async session factory (AsyncSessionLocal) for
            creating a new session outside the request lifecycle.
    """
    async with session_factory() as session:
        try:
            # Load document
            result = await session.execute(
                select(Document).where(Document.id == document_id)
            )
            document = result.scalar_one_or_none()
            if not document:
                logger.error("Document %s not found for processing", document_id)
                return

            # Mark as processing
            document.status = DocumentStatus.PROCESSING.value
            await session.commit()

            processing_started_at = datetime.now(timezone.utc)

            # Extract text from PDF
            pages = await asyncio.to_thread(_extract_pages_sync, document.file_path)

            # Detect clauses across all pages
            all_clauses: list[dict] = []
            for page in pages:
                clauses = _detect_clauses(page["original_text"], page["page_number"])
                all_clauses.extend(clauses)

            # Translate pages using Azure Translator
            translation_service = get_translation_service()
            all_risk_warnings: list[dict] = []

            if translation_service:
                # Translate page texts
                page_texts = [
                    p["original_text"] for p in pages if p["original_text"].strip()
                ]
                if page_texts:
                    batch_result = await translation_service.batch_translate(
                        texts=page_texts,
                        source_language=SupportedLanguage.GERMAN,
                        target_language=SupportedLanguage.ENGLISH,
                        include_legal_warnings=True,
                    )

                    # Map translations back to pages
                    text_idx = 0
                    for page in pages:
                        if page["original_text"].strip() and text_idx < len(
                            batch_result.translations
                        ):
                            tr = batch_result.translations[text_idx]
                            page["translated_text"] = tr.translation.translated_text

                            # Collect risk warnings from this page
                            for warning in tr.legal_warnings:
                                all_risk_warnings.append(
                                    {
                                        "original_term": warning.original_term,
                                        "translated_term": warning.translated_term,
                                        "risk_level": warning.risk_level.value,
                                        "explanation": warning.explanation,
                                        "page_number": page["page_number"],
                                    }
                                )
                            text_idx += 1

                # Translate clause contexts
                clause_texts = [
                    c["original_text"]
                    for c in all_clauses
                    if c["original_text"].strip()
                ]
                if clause_texts:
                    clause_batch = await translation_service.batch_translate(
                        texts=clause_texts,
                        source_language=SupportedLanguage.GERMAN,
                        target_language=SupportedLanguage.ENGLISH,
                        include_legal_warnings=False,
                    )
                    text_idx = 0
                    for clause in all_clauses:
                        if clause["original_text"].strip() and text_idx < len(
                            clause_batch.translations
                        ):
                            clause["translated_text"] = clause_batch.translations[
                                text_idx
                            ].translation.translated_text
                            text_idx += 1

            # Deduplicate risk warnings by term
            seen_terms: set[str] = set()
            unique_warnings: list[dict] = []
            for w in all_risk_warnings:
                if w["original_term"] not in seen_terms:
                    seen_terms.add(w["original_term"])
                    unique_warnings.append(w)

            # Save translation record
            translation = DocumentTranslation(
                document_id=document_id,
                source_language="de",
                target_language="en",
                translated_pages=pages,
                clauses_detected=all_clauses,
                risk_warnings=unique_warnings,
                processing_started_at=processing_started_at,
                processing_completed_at=datetime.now(timezone.utc),
            )
            session.add(translation)

            document.status = DocumentStatus.COMPLETED.value
            await session.commit()

            logger.info("Document %s processed successfully", document_id)

        except Exception as e:
            logger.exception("Failed to process document %s", document_id)
            # Mark as failed
            try:
                result = await session.execute(
                    select(Document).where(Document.id == document_id)
                )
                document = result.scalar_one_or_none()
                if document:
                    document.status = DocumentStatus.FAILED.value
                    document.error_message = str(e)[:1000]
                    await session.commit()
            except Exception:
                logger.exception("Failed to update document status to failed")


async def get_document(
    session: AsyncSession,
    document_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Document | None:
    """Get a document with its translation, checking ownership.

    Args:
        session: Async database session.
        document_id: Document UUID.
        user_id: User UUID for ownership check.

    Returns:
        Document with translation loaded, or None if not found / not owned.
    """
    result = await session.execute(
        select(Document)
        .options(selectinload(Document.translation))
        .where(Document.id == document_id, Document.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_documents(
    session: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Document], int]:
    """Get paginated list of user's documents.

    Args:
        session: Async database session.
        user_id: User UUID.
        page: Page number (1-indexed).
        page_size: Items per page.

    Returns:
        Tuple of (documents list, total count).
    """
    # Count total
    count_result = await session.execute(
        select(func.count()).select_from(Document).where(Document.user_id == user_id)
    )
    total = count_result.scalar() or 0

    # Fetch page
    offset = (page - 1) * page_size
    result = await session.execute(
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    documents = list(result.scalars().all())

    return documents, total
