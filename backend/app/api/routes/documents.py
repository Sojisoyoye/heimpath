"""Document upload and translation API endpoints.

Provides endpoints for uploading German real estate PDFs, checking
processing status, and retrieving translations with clause detection
and risk warnings.
"""

import uuid

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models import SubscriptionTier
from app.models.document import Document, DocumentStatus, DocumentType
from app.schemas.document import (
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentShareResponse,
    DocumentStatusResponse,
    DocumentSummary,
    DocumentTranslationResponse,
    DocumentUploadResponse,
    DocumentUsageResponse,
)
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["documents"])


async def get_async_session() -> AsyncSession:  # type: ignore[misc]
    """Provide async database session for document endpoints."""
    async with AsyncSessionLocal() as session:
        try:
            yield session  # type: ignore[misc]
        finally:
            await session.close()


def _build_detail_response(document: Document) -> DocumentDetailResponse:
    """Build DocumentDetailResponse from a Document model instance."""
    translation_response = None
    if document.translation:
        t = document.translation
        translation_response = DocumentTranslationResponse(
            id=str(t.id),
            document_id=str(t.document_id),
            source_language=t.source_language,
            target_language=t.target_language,
            translated_pages=t.translated_pages or [],
            clauses_detected=t.clauses_detected or [],
            risk_warnings=t.risk_warnings or [],
            processing_started_at=t.processing_started_at,
            processing_completed_at=t.processing_completed_at,
        )

    return DocumentDetailResponse(
        id=str(document.id),
        original_filename=document.original_filename,
        file_size_bytes=document.file_size_bytes,
        page_count=document.page_count,
        document_type=document.document_type,
        status=document.status,
        error_message=document.error_message,
        share_id=document.share_id,
        journey_step_id=document.journey_step_id,
        created_at=document.created_at,
        translation=translation_response,
    )


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    journey_step_id: uuid.UUID | None = Query(default=None),
    session: AsyncSession = Depends(get_async_session),
) -> DocumentUploadResponse:
    """
    Upload a German real estate PDF document for translation.

    Accepts PDF files up to 20 MB. The document will be queued for
    background processing including text extraction, translation,
    clause detection, and risk warnings.

    **Page limits:**
    - Free tier: 10 pages
    - Premium/Enterprise: 20 pages
    """
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    is_premium = current_user.subscription_tier in (
        SubscriptionTier.PREMIUM,
        SubscriptionTier.ENTERPRISE,
    )

    try:
        document = await document_service.save_upload(
            session=session,
            user_id=current_user.id,
            file_content=content,
            filename=file.filename or "document.pdf",
            is_premium=is_premium,
            journey_step_id=journey_step_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Queue background processing
    background_tasks.add_task(
        document_service.process_document,
        document_id=document.id,
        session_factory=AsyncSessionLocal,
    )

    return DocumentUploadResponse(
        id=str(document.id),
        original_filename=document.original_filename,
        file_size_bytes=document.file_size_bytes,
        page_count=document.page_count,
        document_type=document.document_type,
        status=document.status,
        journey_step_id=document.journey_step_id,
    )


@router.get("/usage", response_model=DocumentUsageResponse)
async def get_usage(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> DocumentUsageResponse:
    """
    Get document usage information for the current user.

    Returns the number of documents uploaded and the page-per-document limit
    based on the user's subscription tier.
    """
    count = await document_service.count_user_documents(
        session=session, user_id=current_user.id
    )

    is_premium = current_user.subscription_tier in (
        SubscriptionTier.PREMIUM,
        SubscriptionTier.ENTERPRISE,
    )

    return DocumentUsageResponse(
        documents_used=count,
        page_limit=settings.MAX_PAGES_PREMIUM
        if is_premium
        else settings.MAX_PAGES_FREE,
        subscription_tier=current_user.subscription_tier.value,
    )


@router.get("/shared/{share_id}", response_model=DocumentDetailResponse)
async def get_shared_document(
    share_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> DocumentDetailResponse:
    """
    Get a shared document by share_id.

    No authentication required.
    """
    document = await document_service.get_by_share_id(session, share_id)
    return _build_detail_response(document)


@router.get("/by-step/{step_id}", response_model=list[DocumentSummary])
async def get_documents_by_step(
    step_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> list[DocumentSummary]:
    """
    Get all documents linked to a journey step.

    Returns documents owned by the current user that were uploaded
    for the specified journey step.
    """
    documents = await document_service.get_documents_by_step_id(
        session=session,
        step_id=step_id,
        user_id=current_user.id,
    )
    return [
        DocumentSummary(
            id=str(doc.id),
            original_filename=doc.original_filename,
            file_size_bytes=doc.file_size_bytes,
            page_count=doc.page_count,
            document_type=doc.document_type,
            status=doc.status,
            share_id=doc.share_id,
            journey_step_id=doc.journey_step_id,
            created_at=doc.created_at,
        )
        for doc in documents
    ]


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=200),
    document_type: DocumentType | None = Query(default=None),
    document_status: DocumentStatus | None = Query(default=None, alias="status"),
    session: AsyncSession = Depends(get_async_session),
) -> DocumentListResponse:
    """
    Get paginated list of the current user's uploaded documents.

    Supports optional filtering by search term, document type, and status.
    """
    documents, total = await document_service.list_documents(
        session=session,
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        search=search,
        document_type=document_type.value if document_type else None,
        status_filter=document_status.value if document_status else None,
    )

    return DocumentListResponse(
        data=[
            DocumentSummary(
                id=str(doc.id),
                original_filename=doc.original_filename,
                file_size_bytes=doc.file_size_bytes,
                page_count=doc.page_count,
                document_type=doc.document_type,
                status=doc.status,
                share_id=doc.share_id,
                journey_step_id=doc.journey_step_id,
                created_at=doc.created_at,
            )
            for doc in documents
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: str,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> DocumentDetailResponse:
    """
    Get full document details including translation if completed.
    """
    document = await document_service.get_document(
        session=session,
        document_id=document_id,
        user_id=current_user.id,
    )
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return _build_detail_response(document)


@router.post("/{document_id}/share", response_model=DocumentShareResponse)
async def share_document(
    document_id: str,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> DocumentShareResponse:
    """
    Generate a shareable link for a completed document.

    Returns the existing share_id if one was already generated.
    """
    document = await document_service.generate_share_id(
        session=session,
        document_id=document_id,
        user_id=current_user.id,
    )

    return DocumentShareResponse(
        id=str(document.id),
        share_id=document.share_id,
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_document(
    document_id: str,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> None:
    """
    Delete a document and its associated file.
    """
    await document_service.delete_document(
        session=session,
        document_id=document_id,
        user_id=current_user.id,
    )


@router.get("/{document_id}/translation", response_model=DocumentTranslationResponse)
async def get_document_translation(
    document_id: str,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> DocumentTranslationResponse:
    """
    Get translation results for a document.

    Returns 409 if the document has not finished processing yet.
    """
    document = await document_service.get_document(
        session=session,
        document_id=document_id,
        user_id=current_user.id,
    )
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if not document.translation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document translation is not yet completed",
        )

    t = document.translation
    return DocumentTranslationResponse(
        id=str(t.id),
        document_id=str(t.document_id),
        source_language=t.source_language,
        target_language=t.target_language,
        translated_pages=t.translated_pages or [],
        clauses_detected=t.clauses_detected or [],
        risk_warnings=t.risk_warnings or [],
        processing_started_at=t.processing_started_at,
        processing_completed_at=t.processing_completed_at,
    )


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> DocumentStatusResponse:
    """
    Lightweight polling endpoint for document processing status.
    """
    document = await document_service.get_document(
        session=session,
        document_id=document_id,
        user_id=current_user.id,
    )
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return DocumentStatusResponse(
        id=str(document.id),
        status=document.status,
        error_message=document.error_message,
        page_count=document.page_count,
    )
