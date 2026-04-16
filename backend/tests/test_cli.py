"""Tests for CLI management commands."""

from unittest.mock import MagicMock, patch

import pytest

from app.cli import main, send_weekly_digest


class TestMain:
    @patch("app.cli.send_weekly_digest")
    def test_dispatches_send_weekly_digest(self, mock_send) -> None:
        with patch("sys.argv", ["app.cli", "send-weekly-digest"]):
            main()
        mock_send.assert_called_once()

    def test_exits_with_no_command(self) -> None:
        with patch("sys.argv", ["app.cli"]):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 1

    def test_exits_with_invalid_command(self) -> None:
        with patch("sys.argv", ["app.cli", "unknown-command"]):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 1


class TestSendWeeklyDigestCmd:
    @patch("app.cli.engine", new_callable=MagicMock)
    def test_calls_digest_service(self, mock_engine) -> None:
        mock_session = MagicMock()
        mock_digest = MagicMock()
        mock_digest.send_weekly_digest.return_value = 5

        with (
            patch("app.cli.Session") as mock_session_cls,
            patch(
                "app.services.digest_service.send_weekly_digest",
                mock_digest.send_weekly_digest,
            ),
        ):
            mock_session_cls.return_value.__enter__ = MagicMock(
                return_value=mock_session
            )
            mock_session_cls.return_value.__exit__ = MagicMock(return_value=False)

            send_weekly_digest()

            mock_digest.send_weekly_digest.assert_called_once_with(mock_session)
