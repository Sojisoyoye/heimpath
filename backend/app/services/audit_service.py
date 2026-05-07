"""Fire-and-forget audit logging service.

Records security-relevant actions to the audit_log table. log_action()
NEVER raises — any failure is swallowed and logged to prevent audit
infrastructure from disrupting user-facing requests.
"""

import logging
from typing import Any
from uuid import UUID

from sqlmodel import Session
from starlette.requests import Request

from app.models.audit_log import AuditLog

_logger = logging.getLogger(__name__)

# ── Action constants ───────────────────────────────────────────────────────────

ACTION_DOCUMENT_UPLOAD = "document.upload"
ACTION_DOCUMENT_DELETE = "document.delete"
ACTION_DOCUMENT_SHARE = "document.share"
ACTION_TRANSLATION_START = "translation.start"
ACTION_TRANSLATION_COMPLETE = "translation.complete"
ACTION_TRANSLATION_FAILED = "translation.failed"
ACTION_PAYMENT_CHECKOUT_CREATED = "payment.checkout_created"
ACTION_PAYMENT_WEBHOOK_RECEIVED = "payment.webhook_received"
ACTION_PAYMENT_SUBSCRIPTION_UPGRADED = "payment.subscription_upgraded"
ACTION_USER_PASSWORD_RESET = "user.password_reset"
ACTION_USER_EMAIL_VERIFIED = "user.email_verified"


def log_action(
    session: Session,
    *,
    action: str,
    user_id: UUID | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    status: str = "success",
    metadata: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    """Write one audit log row. Never raises under any circumstances.

    Args:
        session: Sync SQLModel session (caller's session).
        action: One of the ACTION_* constants, e.g. ACTION_DOCUMENT_UPLOAD.
        user_id: Acting user, or None for system/anonymous actions.
        resource_type: Entity type, e.g. "document", "payment".
        resource_id: Entity identifier as a string.
        status: "success" or "failure".
        metadata: Arbitrary extra payload (user-agent, tier, etc.).
        request: Starlette Request — used to extract ip_address and request_id.
    """
    try:
        ip_address: str | None = None
        request_id: str | None = None

        if request is not None:
            if request.client is not None:
                ip_address = request.client.host
            try:
                request_id = request.state.request_id
            except AttributeError:
                pass

        row = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            request_id=request_id,
            status=status,
            extra_data=metadata,
        )
        try:
            session.add(row)
            session.commit()
        except Exception as db_exc:
            _logger.error(
                "audit_service: DB error writing audit log (action=%s): %s",
                action,
                db_exc,
            )
            try:
                session.rollback()
            except Exception:
                pass
    except Exception as exc:
        _logger.error(
            "audit_service: unexpected error in log_action (action=%s): %s",
            action,
            exc,
        )
