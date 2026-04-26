"""Tests for AI-powered document type analysis service."""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.document_type_analyzer_service import (
    _build_document_text,
    _parse_response,
    analyze_document_type,
)

# --- Sample data ---

SAMPLE_PAGES = [
    {"page_number": 1, "original_text": "Grundbuchauszug\nAmtsgericht Berlin"},
    {"page_number": 2, "original_text": "Abteilung I: Eigentümer Hans Müller"},
    {"page_number": 3, "original_text": ""},
]

GRUNDBUCH_ANALYSIS = {
    "property_description": "Apartment in Berlin, 3rd floor, 80 sqm.",
    "abteilung1": {
        "owners": [
            {"name": "Hans Müller", "share": "1/1", "acquisition_date": "2010-01-15"}
        ]
    },
    "abteilung2": {"encumbrances": []},
    "abteilung3": {"charges": []},
    "risk_flags": [],
}

TEILUNG_ANALYSIS = {
    "unit_description": "Apartment unit 3 on 2nd floor.",
    "miteigentumsanteil": "150/1000",
    "sondereigentum": [{"area": "living area", "description": "80 sqm apartment"}],
    "sondernutzungsrechte": [],
    "gemeinschaftseigentum": ["staircase", "roof"],
    "weg_rules": [],
    "risk_flags": [],
}

MIETVERTRAG_ANALYSIS = {
    "monthly_rent_eur": 1200.0,
    "deposit_eur": 3600.0,
    "notice_period_months": 3,
    "lease_start": "2024-01-01",
    "lease_end": None,
    "is_unlimited": True,
    "maintenance_obligations": [],
    "renewal_clauses": [],
    "special_agreements": [],
    "risk_flags": [],
}

GRUNDRISS_ANALYSIS = {
    "rooms": [
        {"name_de": "Wohnzimmer", "name_en": "Living Room", "area_sqm": 25.0},
        {"name_de": "Schlafzimmer", "name_en": "Bedroom", "area_sqm": 15.0},
    ],
    "total_area_sqm": 80.0,
    "floor": "3rd floor",
    "features": ["balcony"],
    "notes": [],
}


# --- _build_document_text ---


class TestBuildDocumentText:
    def test_joins_pages_with_markers(self) -> None:
        result = _build_document_text(SAMPLE_PAGES)
        assert "--- PAGE 1 ---" in result
        assert "--- PAGE 2 ---" in result
        assert "Grundbuchauszug" in result

    def test_skips_empty_pages(self) -> None:
        result = _build_document_text(SAMPLE_PAGES)
        assert "--- PAGE 3 ---" not in result

    def test_empty_pages_list(self) -> None:
        result = _build_document_text([])
        assert result == ""

    def test_all_empty_text(self) -> None:
        pages = [{"page_number": 1, "original_text": "   "}]
        result = _build_document_text(pages)
        assert result == ""


# --- _parse_response ---


class TestParseResponse:
    def test_parses_valid_grundbuch_json(self) -> None:
        raw = json.dumps(GRUNDBUCH_ANALYSIS)
        required = {"property_description", "abteilung1", "abteilung2", "abteilung3"}
        result = _parse_response(raw, required)
        assert result is not None
        assert (
            result["property_description"] == GRUNDBUCH_ANALYSIS["property_description"]
        )
        assert result["is_ai_generated"] is True

    def test_strips_markdown_fences(self) -> None:
        raw = f"```json\n{json.dumps(GRUNDBUCH_ANALYSIS)}\n```"
        required = {"property_description", "abteilung1", "abteilung2", "abteilung3"}
        result = _parse_response(raw, required)
        assert result is not None
        assert (
            result["property_description"] == GRUNDBUCH_ANALYSIS["property_description"]
        )

    def test_strips_plain_fences(self) -> None:
        raw = f"```\n{json.dumps(GRUNDBUCH_ANALYSIS)}\n```"
        required = {"property_description", "abteilung1", "abteilung2", "abteilung3"}
        result = _parse_response(raw, required)
        assert result is not None

    def test_returns_none_for_invalid_json(self) -> None:
        result = _parse_response("not valid json", {"rooms"})
        assert result is None

    def test_returns_none_for_missing_keys(self) -> None:
        incomplete = {"rooms": []}
        result = _parse_response(json.dumps(incomplete), {"rooms", "total_area_sqm"})
        assert result is None

    def test_adds_is_ai_generated(self) -> None:
        raw = json.dumps(GRUNDRISS_ANALYSIS)
        result = _parse_response(raw, {"rooms"})
        assert result is not None
        assert result["is_ai_generated"] is True


# --- analyze_document_type ---


class TestAnalyzeDocumentType:
    @pytest.mark.asyncio
    async def test_returns_none_for_unsupported_type(self) -> None:
        result = await analyze_document_type(SAMPLE_PAGES, "expose")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_when_anthropic_unconfigured(self) -> None:
        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=None,
        ):
            result = await analyze_document_type(SAMPLE_PAGES, "grundbuchauszug")
            assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_when_empty_pages(self) -> None:
        empty_pages = [{"page_number": 1, "original_text": ""}]
        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=MagicMock(),
        ):
            result = await analyze_document_type(empty_pages, "grundbuchauszug")
            assert result is None

    @pytest.mark.asyncio
    async def test_analyze_grundbuchauszug_returns_expected_keys(self) -> None:
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(GRUNDBUCH_ANALYSIS))]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_document_type(SAMPLE_PAGES, "grundbuchauszug")

        assert result is not None
        assert "property_description" in result
        assert "abteilung1" in result
        assert "abteilung2" in result
        assert "abteilung3" in result
        assert result["is_ai_generated"] is True

    @pytest.mark.asyncio
    async def test_analyze_mietvertrag_parses_monthly_rent(self) -> None:
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(MIETVERTRAG_ANALYSIS))]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_document_type(SAMPLE_PAGES, "mietvertrag")

        assert result is not None
        assert result["monthly_rent_eur"] == 1200.0
        assert result["is_unlimited"] is True

    @pytest.mark.asyncio
    async def test_analyze_teilungserklaerung_parses_miteigentumsanteil(self) -> None:
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(TEILUNG_ANALYSIS))]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_document_type(SAMPLE_PAGES, "teilungserklaerung")

        assert result is not None
        assert result["miteigentumsanteil"] == "150/1000"
        assert isinstance(result["gemeinschaftseigentum"], list)

    @pytest.mark.asyncio
    async def test_analyze_wohnungsgrundriss_parses_rooms(self) -> None:
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(GRUNDRISS_ANALYSIS))]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_document_type(SAMPLE_PAGES, "wohnungsgrundriss")

        assert result is not None
        assert len(result["rooms"]) == 2
        assert result["rooms"][0]["name_de"] == "Wohnzimmer"

    @pytest.mark.asyncio
    async def test_returns_none_on_api_error(self) -> None:
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = RuntimeError("API error")

        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_document_type(SAMPLE_PAGES, "grundbuchauszug")
            assert result is None
