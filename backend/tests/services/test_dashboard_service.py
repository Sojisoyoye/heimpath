"""Tests for the Dashboard Service."""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.models.calculator import HiddenCostCalculation
from app.models.document import Document
from app.models.financing import FinancingAssessment
from app.models.journey import Journey, JourneyPhase, JourneyStep
from app.models.legal import Law, LawBookmark
from app.models.roi import ROICalculation
from app.schemas.dashboard import (
    ActivityType,
    DashboardOverviewResponse,
    JourneyOverview,
)
from app.services.dashboard_service import (
    _build_activity_timeline,
    _count_documents_this_month,
    _count_total_bookmarks,
    _count_total_calculations,
    _get_journey_overview,
    _get_recent_bookmarks,
    _get_recent_calculations,
    _get_recent_documents,
    get_dashboard_overview,
)


@pytest.fixture
def user_id() -> uuid.UUID:
    """Create a test user ID."""
    return uuid.uuid4()


class TestGetDashboardOverview:
    """Tests for the main aggregation function."""

    @patch("app.services.dashboard_service._count_total_bookmarks")
    @patch("app.services.dashboard_service._count_total_calculations")
    @patch("app.services.dashboard_service._count_documents_this_month")
    @patch("app.services.dashboard_service._build_activity_timeline")
    @patch("app.services.dashboard_service._get_recent_bookmarks")
    @patch("app.services.dashboard_service._get_recent_calculations")
    @patch("app.services.dashboard_service._get_recent_documents")
    @patch("app.services.dashboard_service._get_journey_overview")
    def test_returns_complete_response_with_journey(
        self,
        mock_journey,
        mock_docs,
        mock_calcs,
        mock_bookmarks,
        mock_activity,
        mock_doc_count,
        mock_calc_count,
        mock_bk_count,
        user_id: uuid.UUID,
    ) -> None:
        """Test that overview assembles all sub-queries."""
        mock_journey.return_value = JourneyOverview(
            id=uuid.uuid4(),
            title="Test",
            current_phase="research",
            current_step_number=1,
            progress_percentage=0.0,
            completed_steps=0,
            total_steps=10,
            estimated_days_remaining=60,
            started_at=None,
            next_step_title=None,
            next_step_id=None,
            phases={"research": {"total": 3, "completed": 0}},
        )
        mock_docs.return_value = []
        mock_calcs.return_value = []
        mock_bookmarks.return_value = []
        mock_activity.return_value = []
        mock_doc_count.return_value = 2
        mock_calc_count.return_value = 5
        mock_bk_count.return_value = 3

        session = MagicMock()
        result = get_dashboard_overview(session, user_id)

        assert isinstance(result, DashboardOverviewResponse)
        assert result.has_journey is True
        assert result.documents_translated_this_month == 2
        assert result.total_calculations == 5
        assert result.total_bookmarks == 3

    @patch("app.services.dashboard_service._count_total_bookmarks")
    @patch("app.services.dashboard_service._count_total_calculations")
    @patch("app.services.dashboard_service._count_documents_this_month")
    @patch("app.services.dashboard_service._build_activity_timeline")
    @patch("app.services.dashboard_service._get_recent_bookmarks")
    @patch("app.services.dashboard_service._get_recent_calculations")
    @patch("app.services.dashboard_service._get_recent_documents")
    @patch("app.services.dashboard_service._get_journey_overview")
    def test_returns_empty_state_without_journey(
        self,
        mock_journey,
        mock_docs,
        mock_calcs,
        mock_bookmarks,
        mock_activity,
        mock_doc_count,
        mock_calc_count,
        mock_bk_count,
        user_id: uuid.UUID,
    ) -> None:
        """Test that overview works for a new user with no data."""
        mock_journey.return_value = None
        mock_docs.return_value = []
        mock_calcs.return_value = []
        mock_bookmarks.return_value = []
        mock_activity.return_value = []
        mock_doc_count.return_value = 0
        mock_calc_count.return_value = 0
        mock_bk_count.return_value = 0

        session = MagicMock()
        result = get_dashboard_overview(session, user_id)

        assert result.has_journey is False
        assert result.journey is None
        assert result.recent_documents == []
        assert result.recent_calculations == []
        assert result.recent_activity == []


class TestGetJourneyOverview:
    """Tests for journey overview retrieval."""

    @patch("app.services.dashboard_service.get_journey_service")
    def test_returns_none_when_no_journeys(
        self, mock_get_service, user_id: uuid.UUID
    ) -> None:
        """Test that None is returned when user has no journeys."""
        mock_service = MagicMock()
        mock_service.get_user_journeys.return_value = []
        mock_get_service.return_value = mock_service

        result = _get_journey_overview(MagicMock(), user_id)
        assert result is None

    @patch("app.services.dashboard_service.get_journey_service")
    def test_returns_overview_for_active_journey(
        self, mock_get_service, user_id: uuid.UUID
    ) -> None:
        """Test that overview is built from the most recent active journey."""
        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.title = "Berlin Apartment"
        mock_journey.started_at = datetime(2026, 1, 1, tzinfo=timezone.utc)

        mock_next_step = MagicMock(spec=JourneyStep)
        mock_next_step.title = "Define Your Property Goals"
        mock_next_step.id = uuid.uuid4()

        mock_service = MagicMock()
        mock_service.get_user_journeys.return_value = [mock_journey]
        mock_service.get_progress.return_value = {
            "current_phase": JourneyPhase.RESEARCH,
            "current_step_number": 1,
            "progress_percentage": 0.0,
            "completed_steps": 0,
            "total_steps": 15,
            "estimated_days_remaining": 120,
            "phases": {
                "research": {"total": 3, "completed": 0},
                "preparation": {"total": 4, "completed": 0},
                "buying": {"total": 5, "completed": 0},
                "closing": {"total": 3, "completed": 0},
            },
        }
        mock_service.get_next_step.return_value = mock_next_step
        mock_get_service.return_value = mock_service

        result = _get_journey_overview(MagicMock(), user_id)

        assert result is not None
        assert result.title == "Berlin Apartment"
        assert result.total_steps == 15
        assert result.next_step_title == "Define Your Property Goals"
        assert result.next_step_id == mock_next_step.id

    @patch("app.services.dashboard_service.get_journey_service")
    def test_handles_completed_journey_no_next_step(
        self, mock_get_service, user_id: uuid.UUID
    ) -> None:
        """Test overview when journey is complete (no next step)."""
        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.title = "Completed Journey"
        mock_journey.started_at = datetime(2025, 6, 1, tzinfo=timezone.utc)

        mock_service = MagicMock()
        mock_service.get_user_journeys.return_value = [mock_journey]
        mock_service.get_progress.return_value = {
            "current_phase": JourneyPhase.CLOSING,
            "current_step_number": 15,
            "progress_percentage": 100.0,
            "completed_steps": 15,
            "total_steps": 15,
            "estimated_days_remaining": None,
            "phases": {
                "research": {"total": 3, "completed": 3},
                "preparation": {"total": 4, "completed": 4},
                "buying": {"total": 5, "completed": 5},
                "closing": {"total": 3, "completed": 3},
            },
        }
        mock_service.get_next_step.return_value = None
        mock_get_service.return_value = mock_service

        result = _get_journey_overview(MagicMock(), user_id)

        assert result is not None
        assert result.progress_percentage == 100.0
        assert result.next_step_title is None
        assert result.next_step_id is None


class TestGetRecentDocuments:
    """Tests for recent documents retrieval."""

    def test_returns_empty_list_when_no_documents(self, user_id: uuid.UUID) -> None:
        """Test empty result when user has no documents."""
        mock_session = MagicMock()
        mock_session.exec.return_value.all.return_value = []

        result = _get_recent_documents(mock_session, user_id, limit=3)
        assert result == []

    def test_returns_document_summaries(self, user_id: uuid.UUID) -> None:
        """Test that document summaries are returned correctly."""
        mock_doc = MagicMock(spec=Document)
        mock_doc.id = uuid.uuid4()
        mock_doc.original_filename = "kaufvertrag.pdf"
        mock_doc.document_type = "purchase_contract"
        mock_doc.status = "translated"
        mock_doc.created_at = datetime(2026, 2, 10, tzinfo=timezone.utc)

        mock_session = MagicMock()
        mock_session.exec.return_value.all.return_value = [mock_doc]

        result = _get_recent_documents(mock_session, user_id, limit=3)
        assert len(result) == 1
        assert result[0].original_filename == "kaufvertrag.pdf"
        assert result[0].document_type == "purchase_contract"


class TestGetRecentCalculations:
    """Tests for recent calculations across all calculator types."""

    def test_returns_empty_list_when_no_calculations(self, user_id: uuid.UUID) -> None:
        """Test empty result when user has no calculations."""
        mock_session = MagicMock()
        mock_session.exec.return_value.all.return_value = []

        result = _get_recent_calculations(mock_session, user_id, limit=2)
        assert result == []

    def test_merges_and_sorts_across_calculator_types(self, user_id: uuid.UUID) -> None:
        """Test that calculations from all types are merged and sorted."""
        hc_calc = MagicMock(spec=HiddenCostCalculation)
        hc_calc.id = uuid.uuid4()
        hc_calc.name = "Berlin Apartment"
        hc_calc.total_cost_of_ownership = 245000.0
        hc_calc.created_at = datetime(2026, 2, 10, tzinfo=timezone.utc)

        roi_calc = MagicMock(spec=ROICalculation)
        roi_calc.id = uuid.uuid4()
        roi_calc.name = "Munich Rental"
        roi_calc.cash_on_cash_return = 8.5
        roi_calc.created_at = datetime(2026, 2, 15, tzinfo=timezone.utc)

        fin_calc = MagicMock(spec=FinancingAssessment)
        fin_calc.id = uuid.uuid4()
        fin_calc.name = None
        fin_calc.likelihood_label = "Good"
        fin_calc.created_at = datetime(2026, 2, 12, tzinfo=timezone.utc)

        mock_session = MagicMock()
        # Three separate queries: hidden_costs, roi, financing
        mock_session.exec.return_value.all.side_effect = [
            [hc_calc],
            [roi_calc],
            [fin_calc],
        ]

        result = _get_recent_calculations(mock_session, user_id, limit=2)

        assert len(result) == 2
        # Sorted by created_at desc: roi (Feb 15) first, then financing (Feb 12)
        assert result[0].calculator_type == "roi"
        assert result[1].calculator_type == "financing"

    def test_hidden_cost_headline_format(self, user_id: uuid.UUID) -> None:
        """Test that hidden cost headline shows formatted euro value."""
        hc_calc = MagicMock(spec=HiddenCostCalculation)
        hc_calc.id = uuid.uuid4()
        hc_calc.name = "Test"
        hc_calc.total_cost_of_ownership = 350000.0
        hc_calc.created_at = datetime(2026, 2, 1, tzinfo=timezone.utc)

        mock_session = MagicMock()
        mock_session.exec.return_value.all.side_effect = [[hc_calc], [], []]

        result = _get_recent_calculations(mock_session, user_id, limit=5)
        assert len(result) == 1
        assert "\u20ac350,000" in result[0].headline_value

    def test_roi_headline_format(self, user_id: uuid.UUID) -> None:
        """Test that ROI headline shows CoC return percentage."""
        roi_calc = MagicMock(spec=ROICalculation)
        roi_calc.id = uuid.uuid4()
        roi_calc.name = "Test"
        roi_calc.cash_on_cash_return = 12.3
        roi_calc.created_at = datetime(2026, 2, 1, tzinfo=timezone.utc)

        mock_session = MagicMock()
        mock_session.exec.return_value.all.side_effect = [[], [roi_calc], []]

        result = _get_recent_calculations(mock_session, user_id, limit=5)
        assert len(result) == 1
        assert "12.3% CoC" in result[0].headline_value


class TestGetRecentBookmarks:
    """Tests for recent law bookmarks."""

    def test_returns_empty_list_when_no_bookmarks(self, user_id: uuid.UUID) -> None:
        """Test empty result when user has no bookmarks."""
        mock_session = MagicMock()
        mock_session.exec.return_value.all.return_value = []

        result = _get_recent_bookmarks(mock_session, user_id, limit=3)
        assert result == []

    def test_returns_bookmark_summaries_with_law_details(
        self, user_id: uuid.UUID
    ) -> None:
        """Test that bookmark summaries include law citation and title."""
        mock_bookmark = MagicMock(spec=LawBookmark)
        mock_bookmark.id = uuid.uuid4()
        mock_bookmark.created_at = datetime(2026, 2, 10, tzinfo=timezone.utc)

        mock_law = MagicMock(spec=Law)
        mock_law.citation = "\u00a7 433 BGB"
        mock_law.title_en = "Purchase Agreement"
        mock_law.category = "contract_law"

        mock_session = MagicMock()
        mock_session.exec.return_value.all.return_value = [(mock_bookmark, mock_law)]

        result = _get_recent_bookmarks(mock_session, user_id, limit=3)
        assert len(result) == 1
        assert result[0].citation == "\u00a7 433 BGB"
        assert result[0].title_en == "Purchase Agreement"


class TestBuildActivityTimeline:
    """Tests for activity timeline construction."""

    def test_returns_empty_list_when_no_activity(self, user_id: uuid.UUID) -> None:
        """Test empty timeline for new user."""
        mock_session = MagicMock()
        mock_session.exec.return_value.all.return_value = []

        result = _build_activity_timeline(mock_session, user_id, limit=10)
        assert result == []

    def test_merges_and_sorts_activities_by_timestamp(self, user_id: uuid.UUID) -> None:
        """Test that activities from different sources are merged and sorted."""
        mock_journey = MagicMock(spec=Journey)
        mock_journey.id = uuid.uuid4()
        mock_journey.title = "My Journey"
        mock_journey.started_at = datetime(2026, 2, 1, tzinfo=timezone.utc)

        mock_doc = MagicMock(spec=Document)
        mock_doc.id = uuid.uuid4()
        mock_doc.original_filename = "contract.pdf"
        mock_doc.created_at = datetime(2026, 2, 15, tzinfo=timezone.utc)

        mock_session = MagicMock()
        # 7 queries: journeys, steps, docs, hc_calcs, roi_calcs, fin_calcs, bookmarks
        mock_session.exec.return_value.all.side_effect = [
            [mock_journey],  # journeys
            [],  # completed steps
            [mock_doc],  # documents
            [],  # hidden cost calcs
            [],  # roi calcs
            [],  # financing
            [],  # bookmarks
        ]

        result = _build_activity_timeline(mock_session, user_id, limit=10)

        assert len(result) == 2
        # Document (Feb 15) should come before journey start (Feb 1)
        assert result[0].activity_type == ActivityType.DOCUMENT_UPLOADED
        assert result[1].activity_type == ActivityType.JOURNEY_STARTED

    def test_respects_limit(self, user_id: uuid.UUID) -> None:
        """Test that timeline respects the limit parameter."""
        docs = []
        for i in range(5):
            mock_doc = MagicMock(spec=Document)
            mock_doc.id = uuid.uuid4()
            mock_doc.original_filename = f"doc_{i}.pdf"
            mock_doc.created_at = datetime(2026, 2, i + 1, tzinfo=timezone.utc)
            docs.append(mock_doc)

        mock_session = MagicMock()
        mock_session.exec.return_value.all.side_effect = [
            [],  # journeys
            [],  # steps
            docs,  # documents
            [],  # hidden cost calcs
            [],  # roi calcs
            [],  # financing
            [],  # bookmarks
        ]

        result = _build_activity_timeline(mock_session, user_id, limit=3)
        assert len(result) == 3


class TestCountDocumentsThisMonth:
    """Tests for monthly document count."""

    def test_returns_count(self, user_id: uuid.UUID) -> None:
        """Test that count is returned correctly."""
        mock_session = MagicMock()
        mock_session.exec.return_value.one.return_value = 5

        result = _count_documents_this_month(mock_session, user_id)
        assert result == 5

    def test_returns_zero_when_no_documents(self, user_id: uuid.UUID) -> None:
        """Test zero count for no documents."""
        mock_session = MagicMock()
        mock_session.exec.return_value.one.return_value = 0

        result = _count_documents_this_month(mock_session, user_id)
        assert result == 0


class TestCountTotalCalculations:
    """Tests for total calculation count across types."""

    def test_sums_across_all_calculator_types(self, user_id: uuid.UUID) -> None:
        """Test that counts from all three types are summed."""
        mock_session = MagicMock()
        mock_session.exec.return_value.one.side_effect = [3, 2, 1]

        result = _count_total_calculations(mock_session, user_id)
        assert result == 6

    def test_returns_zero_when_no_calculations(self, user_id: uuid.UUID) -> None:
        """Test zero when user has no calculations."""
        mock_session = MagicMock()
        mock_session.exec.return_value.one.side_effect = [0, 0, 0]

        result = _count_total_calculations(mock_session, user_id)
        assert result == 0


class TestCountTotalBookmarks:
    """Tests for total bookmark count."""

    def test_returns_count(self, user_id: uuid.UUID) -> None:
        """Test that bookmark count is returned correctly."""
        mock_session = MagicMock()
        mock_session.exec.return_value.one.return_value = 7

        result = _count_total_bookmarks(mock_session, user_id)
        assert result == 7
