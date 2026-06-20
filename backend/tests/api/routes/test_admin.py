"""Tests for /api/v1/admin endpoints."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings


class TestSchedulerHealth:
    """GET /api/v1/admin/jobs/health — scheduler job health check."""

    def test_returns_all_known_jobs(
        self, client: TestClient, superuser_token_headers: dict
    ) -> None:
        """Health check includes an entry for each known scheduler job."""
        recent = datetime.now(timezone.utc) - timedelta(minutes=1)
        with patch("app.api.routes.admin.get_last_run", return_value=recent):
            response = client.get(
                f"{settings.API_V1_STR}/admin/jobs/health",
                headers=superuser_token_headers,
            )

        assert response.status_code == 200
        body = response.json()
        assert "recurring_generation" in body
        assert "stuck_document_cleanup" in body

    def test_ok_status_for_recent_jobs(
        self, client: TestClient, superuser_token_headers: dict
    ) -> None:
        """Jobs with a recent last-run timestamp are reported as 'ok'."""
        recent = datetime.now(timezone.utc) - timedelta(minutes=1)
        with patch("app.api.routes.admin.get_last_run", return_value=recent):
            response = client.get(
                f"{settings.API_V1_STR}/admin/jobs/health",
                headers=superuser_token_headers,
            )

        body = response.json()
        for job in ("recurring_generation", "stuck_document_cleanup"):
            assert body[job]["status"] == "ok"
            assert body[job]["stale"] is False

    def test_stale_status_when_job_overdue(
        self, client: TestClient, superuser_token_headers: dict
    ) -> None:
        """Jobs not run within 2× their interval are reported as 'stale'."""
        old = datetime.now(timezone.utc) - timedelta(days=30)
        with patch("app.api.routes.admin.get_last_run", return_value=old):
            response = client.get(
                f"{settings.API_V1_STR}/admin/jobs/health",
                headers=superuser_token_headers,
            )

        body = response.json()
        assert body["recurring_generation"]["status"] == "stale"
        assert body["recurring_generation"]["stale"] is True

    def test_never_run_status_when_no_timestamp(
        self, client: TestClient, superuser_token_headers: dict
    ) -> None:
        """Jobs with no recorded run are reported as 'never_run'."""
        with patch("app.api.routes.admin.get_last_run", return_value=None):
            response = client.get(
                f"{settings.API_V1_STR}/admin/jobs/health",
                headers=superuser_token_headers,
            )

        body = response.json()
        assert body["recurring_generation"]["status"] == "never_run"
        assert body["recurring_generation"]["last_run"] is None

    def test_requires_superuser_authentication(self, client: TestClient) -> None:
        """Health endpoint returns 401 without authentication."""
        response = client.get(f"{settings.API_V1_STR}/admin/jobs/health")
        assert response.status_code == 401


class TestTriggerJob:
    """POST /api/v1/admin/jobs/{job_name}/trigger — manual job trigger."""

    def test_trigger_recurring_generation_returns_202(
        self, client: TestClient, superuser_token_headers: dict
    ) -> None:
        """Triggering recurring_generation returns 202 with count."""
        with (
            patch(
                "app.api.routes.admin.generate_recurring_transactions",
                return_value=5,
            ),
            patch("app.api.routes.admin.record_job_run"),
        ):
            response = client.post(
                f"{settings.API_V1_STR}/admin/jobs/recurring_generation/trigger",
                headers=superuser_token_headers,
            )

        assert response.status_code == 202
        body = response.json()
        assert body["job"] == "recurring_generation"
        assert body["status"] == "triggered"
        assert body["count"] == "5"

    @pytest.mark.asyncio
    async def test_trigger_stuck_document_cleanup_returns_202(
        self, client: TestClient, superuser_token_headers: dict
    ) -> None:
        """Triggering stuck_document_cleanup returns 202 with count."""
        with (
            patch(
                "app.api.routes.admin.mark_stuck_documents_failed",
                new_callable=AsyncMock,
                return_value=3,
            ),
            patch("app.api.routes.admin.record_job_run"),
        ):
            response = client.post(
                f"{settings.API_V1_STR}/admin/jobs/stuck_document_cleanup/trigger",
                headers=superuser_token_headers,
            )

        assert response.status_code == 202
        body = response.json()
        assert body["job"] == "stuck_document_cleanup"
        assert body["count"] == "3"

    def test_trigger_unknown_job_returns_404(
        self, client: TestClient, superuser_token_headers: dict
    ) -> None:
        """Triggering an unknown job name returns 404."""
        response = client.post(
            f"{settings.API_V1_STR}/admin/jobs/nonexistent_job/trigger",
            headers=superuser_token_headers,
        )
        assert response.status_code == 404

    def test_trigger_captures_sentry_on_failure(
        self, client: TestClient, superuser_token_headers: dict
    ) -> None:
        """When a job raises, Sentry capture_exception is called and 500 is returned."""
        with (
            patch(
                "app.api.routes.admin.generate_recurring_transactions",
                side_effect=RuntimeError("DB exploded"),
            ),
            patch("app.api.routes.admin.sentry_sdk") as mock_sentry,
        ):
            response = client.post(
                f"{settings.API_V1_STR}/admin/jobs/recurring_generation/trigger",
                headers=superuser_token_headers,
            )

        assert response.status_code == 500
        mock_sentry.capture_exception.assert_called_once()

    def test_trigger_requires_superuser_authentication(
        self, client: TestClient
    ) -> None:
        """Trigger endpoint returns 401 without authentication."""
        response = client.post(
            f"{settings.API_V1_STR}/admin/jobs/recurring_generation/trigger"
        )
        assert response.status_code == 401

    def test_trigger_recurring_generation_warns_on_zero_count(
        self, client: TestClient, superuser_token_headers: dict
    ) -> None:
        """Triggering recurring_generation with count=0 logs a warning."""
        with (
            patch(
                "app.api.routes.admin.generate_recurring_transactions",
                return_value=0,
            ),
            patch("app.api.routes.admin.record_job_run"),
            patch("app.api.routes.admin.logger") as mock_logger,
        ):
            response = client.post(
                f"{settings.API_V1_STR}/admin/jobs/recurring_generation/trigger",
                headers=superuser_token_headers,
            )

        assert response.status_code == 202
        mock_logger.warning.assert_called_once()


class TestGrowthMetrics:
    """GET /api/v1/admin/growth-metrics — GrowthOS dashboard metrics."""

    def test_returns_valid_structure(
        self, client: TestClient, superuser_token_headers: dict
    ) -> None:
        """Should return all expected metric fields."""
        response = client.get(
            f"{settings.API_V1_STR}/admin/growth-metrics",
            headers=superuser_token_headers,
        )

        assert response.status_code == 200
        body = response.json()
        assert set(body.keys()) == {
            "signups",
            "signups_this_week",
            "activation_rate",
            "return_visit_rate",
            "feedback_count",
            "feedback_this_week",
            "journeys_started",
            "journeys_active",
            "as_of",
        }

    def test_all_counts_are_non_negative(
        self, client: TestClient, superuser_token_headers: dict
    ) -> None:
        """All numeric metrics should be zero or positive."""
        response = client.get(
            f"{settings.API_V1_STR}/admin/growth-metrics",
            headers=superuser_token_headers,
        )

        body = response.json()
        for key in (
            "signups",
            "signups_this_week",
            "feedback_count",
            "feedback_this_week",
            "journeys_started",
            "journeys_active",
        ):
            assert body[key] >= 0, f"{key} must be >= 0"
        assert 0.0 <= body["activation_rate"] <= 100.0
        assert 0.0 <= body["return_visit_rate"] <= 100.0

    def test_requires_superuser_authentication(self, client: TestClient) -> None:
        """Should return 401 without authentication."""
        response = client.get(f"{settings.API_V1_STR}/admin/growth-metrics")
        assert response.status_code == 401
