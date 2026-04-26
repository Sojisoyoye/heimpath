"""Tests for WEG-Protokolle analysis via the document type analyzer service."""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.document_type_analyzer_service import (
    _parse_response,
    analyze_document_type,
)

# --- Sample data ---

WEG_PAGES = [
    {
        "page_number": 1,
        "original_text": (
            "Protokoll der Eigentümerversammlung\n"
            "Datum: 15. März 2024\n"
            "Tagesordnungspunkt 3: Sonderumlage\n"
            "Die Versammlung beschloss eine Sonderumlage in Höhe von 5.000 EUR "
            "pro Wohneinheit für die Dachsanierung."
        ),
    },
    {
        "page_number": 2,
        "original_text": (
            "Instandhaltungsrücklage: aktueller Bestand 45.000 EUR\n"
            "Verwalter: Immobilienverwaltung Muster GmbH\n"
            "Beschluss: Erneuerung der Heizungsanlage im nächsten Jahr."
        ),
    },
    {"page_number": 3, "original_text": ""},
]

WEG_ANALYSIS = {
    "risk_flags": [
        {
            "flag": "Sonderumlage beschlossen",
            "description": "A special levy of €5,000 per unit was voted for roof repair.",
            "risk_level": "high",
            "source_quote_de": "Sonderumlage in Höhe von 5.000 EUR pro Wohneinheit",
            "source_quote_en": "Special levy of €5,000 per residential unit",
        }
    ],
    "reserve_assessment": {
        "reserve_balance_eur": 45000,
        "assessment": "low",
        "details": "Reserve of €45,000 across 10 units equals €4,500 per unit, below the €10,000 threshold.",
    },
    "upcoming_costs": [
        {
            "description": "Renewal of heating system",
            "estimated_eur": None,
            "timeline": "next year",
            "source_quote_de": "Erneuerung der Heizungsanlage im nächsten Jahr",
            "source_quote_en": "Renewal of the heating system next year",
        }
    ],
    "disputes": [],
    "meeting_dates": ["2024-03-15"],
    "low_confidence_warning": False,
    "is_ai_generated": True,
}

WEG_ANALYSIS_CLEAN = {
    "risk_flags": [],
    "reserve_assessment": {
        "reserve_balance_eur": 120000,
        "assessment": "adequate",
        "details": "Reserve is well-funded.",
    },
    "upcoming_costs": [],
    "disputes": [],
    "meeting_dates": ["2024-01-10"],
    "low_confidence_warning": False,
    "is_ai_generated": True,
}


# --- _parse_response for weg_protokolle ---


class TestParseWegResponse:
    def test_valid_weg_response_parsed(self) -> None:
        raw = json.dumps(WEG_ANALYSIS)
        required = {"risk_flags", "reserve_assessment", "low_confidence_warning"}
        result = _parse_response(raw, required)
        assert result is not None
        assert "risk_flags" in result
        assert "reserve_assessment" in result
        assert "low_confidence_warning" in result
        assert result["is_ai_generated"] is True

    def test_missing_required_keys_returns_none(self) -> None:
        # Missing risk_flags key
        incomplete = {
            "reserve_assessment": {
                "reserve_balance_eur": None,
                "assessment": "unknown",
                "details": "",
            },
            "low_confidence_warning": False,
        }
        required = {"risk_flags", "reserve_assessment", "low_confidence_warning"}
        result = _parse_response(json.dumps(incomplete), required)
        assert result is None


# --- analyze_document_type for weg_protokolle ---


class TestAnalyzeWegProtokolle:
    @pytest.mark.asyncio
    async def test_returns_none_when_unsupported_type(self) -> None:
        result = await analyze_document_type(WEG_PAGES, "expose")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_when_anthropic_not_configured(self) -> None:
        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=None,
        ):
            result = await analyze_document_type(WEG_PAGES, "weg_protokolle")
            assert result is None

    @pytest.mark.asyncio
    async def test_returns_analysis_on_success(self) -> None:
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(WEG_ANALYSIS))]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_document_type(WEG_PAGES, "weg_protokolle")

        assert result is not None
        assert "risk_flags" in result
        assert "reserve_assessment" in result
        assert "low_confidence_warning" in result
        assert result["is_ai_generated"] is True

    @pytest.mark.asyncio
    async def test_sonderumlage_detected_as_high_risk(self) -> None:
        # Verifies that risk_level="high" from Claude's JSON is preserved
        # through the parsing layer and returned in the result.
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(WEG_ANALYSIS))]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_document_type(WEG_PAGES, "weg_protokolle")

        assert result is not None
        assert len(result["risk_flags"]) > 0
        sonderumlage_flags = [
            f for f in result["risk_flags"] if "sonderumlage" in f["flag"].lower()
        ]
        assert len(sonderumlage_flags) > 0
        assert sonderumlage_flags[0]["risk_level"] == "high"

    @pytest.mark.asyncio
    async def test_clean_protokoll_has_no_risk_flags(self) -> None:
        # Verifies that an empty risk_flags list from Claude's JSON is
        # correctly propagated through the parsing layer.
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(WEG_ANALYSIS_CLEAN))]
        mock_client.messages.create.return_value = mock_message

        clean_pages = [
            {
                "page_number": 1,
                "original_text": "Protokoll ohne besondere Vorkommnisse.",
            }
        ]

        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_document_type(clean_pages, "weg_protokolle")

        assert result is not None
        assert result["risk_flags"] == []

    @pytest.mark.asyncio
    async def test_returns_none_on_api_error(self) -> None:
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = RuntimeError("API error")

        with patch(
            "app.services.document_type_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_document_type(WEG_PAGES, "weg_protokolle")
            assert result is None
