"""Tests for email utility functions (send_email routing, Resend/SendGrid/SMTP backends)."""

import sys
from unittest.mock import MagicMock, patch

import pytest


class TestSendEmail:
    @patch("app.utils._send_email_resend")
    @patch("app.utils.settings")
    def test_prefers_resend_when_enabled(self, mock_settings, mock_resend) -> None:
        mock_settings.emails_enabled = True
        mock_settings.resend_enabled = True

        from app.utils import send_email

        send_email(
            email_to="a@b.com",
            subject="Hi",
            html_content="<p>test</p>",
        )

        mock_resend.assert_called_once()

    @patch("app.utils._send_email_sendgrid")
    @patch("app.utils.settings")
    def test_prefers_sendgrid_when_resend_disabled(
        self, mock_settings, mock_sg
    ) -> None:
        mock_settings.emails_enabled = True
        mock_settings.resend_enabled = False
        mock_settings.sendgrid_enabled = True

        from app.utils import send_email

        send_email(
            email_to="a@b.com",
            subject="Hi",
            html_content="<p>test</p>",
        )

        mock_sg.assert_called_once()

    @patch("app.utils._send_email_smtp")
    @patch("app.utils.settings")
    def test_falls_back_to_smtp(self, mock_settings, mock_smtp) -> None:
        mock_settings.emails_enabled = True
        mock_settings.resend_enabled = False
        mock_settings.sendgrid_enabled = False

        from app.utils import send_email

        send_email(
            email_to="a@b.com",
            subject="Hi",
            html_content="<p>test</p>",
        )

        mock_smtp.assert_called_once()

    @patch("app.utils.settings")
    def test_raises_when_emails_disabled(self, mock_settings) -> None:
        mock_settings.emails_enabled = False

        from app.utils import send_email

        with pytest.raises(AssertionError):
            send_email(email_to="a@b.com", subject="Hi", html_content="<p>test</p>")

    @patch("app.utils._send_email_resend")
    @patch("app.utils._send_email_sendgrid")
    @patch("app.utils.settings")
    def test_resend_takes_priority_over_sendgrid(
        self, mock_settings, mock_sg, mock_resend
    ) -> None:
        mock_settings.emails_enabled = True
        mock_settings.resend_enabled = True
        mock_settings.sendgrid_enabled = True

        from app.utils import send_email

        send_email(email_to="a@b.com", subject="Hi", html_content="<p>test</p>")

        mock_resend.assert_called_once()
        mock_sg.assert_not_called()


class TestSendEmailResend:
    @patch("app.utils.settings")
    def test_sends_basic_email(self, mock_settings) -> None:
        mock_settings.RESEND_API_KEY = "re_test_key"
        mock_settings.EMAILS_FROM_EMAIL = "from@test.com"
        mock_settings.EMAILS_FROM_NAME = "Test Sender"

        mock_resend_module = MagicMock()
        mock_resend_module.Emails.send.return_value = {"id": "abc123"}

        with patch.dict(sys.modules, {"resend": mock_resend_module}):
            from app.utils import _send_email_resend

            _send_email_resend(
                email_to="to@test.com",
                subject="Test subject",
                html_content="<p>Hello</p>",
            )

        mock_resend_module.Emails.send.assert_called_once()
        call_params = mock_resend_module.Emails.send.call_args[0][0]
        assert call_params["to"] == ["to@test.com"]
        assert call_params["subject"] == "Test subject"
        assert "headers" not in call_params

    @patch("app.utils.settings")
    def test_sends_with_unsubscribe_headers(self, mock_settings) -> None:
        mock_settings.RESEND_API_KEY = "re_test_key"
        mock_settings.EMAILS_FROM_EMAIL = "from@test.com"
        mock_settings.EMAILS_FROM_NAME = "Test Sender"

        mock_resend_module = MagicMock()
        mock_resend_module.Emails.send.return_value = {"id": "abc123"}

        with patch.dict(sys.modules, {"resend": mock_resend_module}):
            from app.utils import _send_email_resend

            _send_email_resend(
                email_to="to@test.com",
                subject="Test",
                html_content="<p>Hello</p>",
                unsubscribe_url="https://example.com/unsub",
            )

        call_params = mock_resend_module.Emails.send.call_args[0][0]
        assert "headers" in call_params
        assert "List-Unsubscribe" in call_params["headers"]

    @patch("app.utils.settings")
    def test_from_address_format_with_name(self, mock_settings) -> None:
        mock_settings.RESEND_API_KEY = "re_test_key"
        mock_settings.EMAILS_FROM_EMAIL = "no-reply@heimpath.com"
        mock_settings.EMAILS_FROM_NAME = "HeimPath"

        mock_resend_module = MagicMock()
        mock_resend_module.Emails.send.return_value = {"id": "abc123"}

        with patch.dict(sys.modules, {"resend": mock_resend_module}):
            from app.utils import _send_email_resend

            _send_email_resend(
                email_to="user@example.com",
                subject="Welcome",
                html_content="<p>Hi</p>",
            )

        call_params = mock_resend_module.Emails.send.call_args[0][0]
        assert call_params["from"] == "HeimPath <no-reply@heimpath.com>"

    @patch("app.utils.settings")
    def test_from_address_format_without_name(self, mock_settings) -> None:
        mock_settings.RESEND_API_KEY = "re_test_key"
        mock_settings.EMAILS_FROM_EMAIL = "no-reply@heimpath.com"
        mock_settings.EMAILS_FROM_NAME = None

        mock_resend_module = MagicMock()
        mock_resend_module.Emails.send.return_value = {"id": "abc123"}

        with patch.dict(sys.modules, {"resend": mock_resend_module}):
            from app.utils import _send_email_resend

            _send_email_resend(
                email_to="user@example.com",
                subject="Welcome",
                html_content="<p>Hi</p>",
            )

        call_params = mock_resend_module.Emails.send.call_args[0][0]
        assert call_params["from"] == "no-reply@heimpath.com"


class TestSendEmailSendgrid:
    @patch("app.utils.settings")
    def test_sends_with_unsubscribe_headers(self, mock_settings) -> None:
        mock_settings.SENDGRID_API_KEY = "test-key"
        mock_settings.EMAILS_FROM_EMAIL = "from@test.com"
        mock_settings.EMAILS_FROM_NAME = "Test"

        mock_sg_client = MagicMock()
        mock_sg_client.send.return_value = MagicMock(status_code=202)
        mock_sendgrid = MagicMock()
        mock_sendgrid.SendGridAPIClient.return_value = mock_sg_client

        with patch.dict(
            sys.modules,
            {
                "sendgrid": mock_sendgrid,
                "sendgrid.helpers": MagicMock(),
                "sendgrid.helpers.mail": MagicMock(),
            },
        ):
            from app.utils import _send_email_sendgrid

            _send_email_sendgrid(
                email_to="to@test.com",
                subject="Test",
                html_content="<p>Hello</p>",
                unsubscribe_url="https://example.com/unsub",
            )

            mock_sg_client.send.assert_called_once()

    @patch("app.utils.settings")
    def test_sends_without_unsubscribe_headers(self, mock_settings) -> None:
        mock_settings.SENDGRID_API_KEY = "test-key"
        mock_settings.EMAILS_FROM_EMAIL = "from@test.com"
        mock_settings.EMAILS_FROM_NAME = "Test"

        mock_sg_client = MagicMock()
        mock_sg_client.send.return_value = MagicMock(status_code=202)
        mock_sendgrid = MagicMock()
        mock_sendgrid.SendGridAPIClient.return_value = mock_sg_client

        with patch.dict(
            sys.modules,
            {
                "sendgrid": mock_sendgrid,
                "sendgrid.helpers": MagicMock(),
                "sendgrid.helpers.mail": MagicMock(),
            },
        ):
            from app.utils import _send_email_sendgrid

            _send_email_sendgrid(
                email_to="to@test.com",
                subject="Test",
                html_content="<p>Hello</p>",
            )

            mock_sg_client.send.assert_called_once()
