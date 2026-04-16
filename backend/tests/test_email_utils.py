"""Tests for email utility functions (SendGrid dispatch, send_email routing)."""

import sys
from unittest.mock import MagicMock, patch

import pytest


class TestSendEmail:
    @patch("app.utils._send_email_sendgrid")
    @patch("app.utils.settings")
    def test_prefers_sendgrid_when_enabled(self, mock_settings, mock_sg) -> None:
        mock_settings.emails_enabled = True
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
