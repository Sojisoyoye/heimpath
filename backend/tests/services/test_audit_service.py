"""Tests for audit_service.log_action() fire-and-forget behavior."""

from unittest.mock import MagicMock
from uuid import uuid4

from app.models.audit_log import AuditLog
from app.services.audit_service import (
    ACTION_DOCUMENT_UPLOAD,
    log_action,
)


def _mock_session() -> MagicMock:
    """Return a fresh MagicMock that stands in for a sync SQLModel Session."""
    return MagicMock()


def test_writes_audit_log_to_db() -> None:
    """Happy path — log_action adds an AuditLog row with the correct fields."""
    session = _mock_session()
    user_id = uuid4()

    log_action(
        session,
        action=ACTION_DOCUMENT_UPLOAD,
        user_id=user_id,
        resource_type="document",
        resource_id="doc-123",
        status="success",
    )

    session.add.assert_called_once()
    session.commit.assert_called_once()

    row: AuditLog = session.add.call_args[0][0]
    assert isinstance(row, AuditLog)
    assert row.action == ACTION_DOCUMENT_UPLOAD
    assert str(row.user_id) == str(user_id)
    assert row.resource_type == "document"
    assert row.resource_id == "doc-123"
    assert row.status == "success"


def test_never_raises_on_db_error() -> None:
    """session.add raising RuntimeError must not propagate out of log_action."""
    session = _mock_session()
    session.add.side_effect = RuntimeError("simulated DB failure")

    # Must not raise
    log_action(session, action=ACTION_DOCUMENT_UPLOAD)


def test_extracts_ip_from_request() -> None:
    """log_action writes ip_address and request_id from the Starlette Request."""
    session = _mock_session()

    mock_request = MagicMock()
    mock_request.client.host = "1.2.3.4"
    mock_request.state.request_id = "test-uuid-123"

    log_action(
        session,
        action="user.email_verified",
        request=mock_request,
    )

    session.add.assert_called_once()
    row: AuditLog = session.add.call_args[0][0]
    assert row.ip_address == "1.2.3.4"
    assert row.request_id == "test-uuid-123"


def test_handles_none_user_id() -> None:
    """log_action with user_id=None writes a row with a null user_id field."""
    session = _mock_session()

    log_action(
        session,
        action="user.password_reset",
        user_id=None,
        status="success",
    )

    session.add.assert_called_once()
    row: AuditLog = session.add.call_args[0][0]
    assert row.user_id is None
