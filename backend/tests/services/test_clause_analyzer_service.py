"""Tests for AI-powered Kaufvertrag clause analysis service."""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.clause_analyzer_service import (
    _build_contract_text,
    _parse_analysis_response,
    analyze_kaufvertrag,
)

# --- Sample data ---

VALID_ANALYSIS = {
    "summary": "Standard purchase contract for a Berlin apartment.",
    "analyzed_clauses": [
        {
            "section_name": "Kaufpreis",
            "section_name_en": "Purchase Price",
            "original_text": "Der Kaufpreis beträgt EUR 350.000.",
            "plain_english_explanation": "The purchase price is 350,000 EUR.",
            "risk_level": "medium",
            "risk_reason": "Standard clause, but verify amount matches agreement.",
            "is_unusual": False,
            "unusual_terms": [],
            "page_number": 2,
        }
    ],
    "notary_checklist": [
        {
            "question": "Can you confirm the payment deadline is realistic?",
            "related_clause": "Kaufpreis",
            "priority": "essential",
        }
    ],
    "overall_risk_assessment": "medium",
    "overall_risk_explanation": "Contract contains standard terms with some clauses needing review.",
}

SAMPLE_PAGES = [
    {"page_number": 1, "original_text": "Kaufvertrag\nzwischen Herrn Müller"},
    {"page_number": 2, "original_text": "Der Kaufpreis beträgt EUR 350.000."},
    {"page_number": 3, "original_text": ""},
]


# --- _build_contract_text ---


class TestBuildContractText:
    def test_joins_pages_with_markers(self) -> None:
        result = _build_contract_text(SAMPLE_PAGES)
        assert "--- PAGE 1 ---" in result
        assert "--- PAGE 2 ---" in result
        assert "Kaufvertrag" in result
        assert "EUR 350.000" in result

    def test_skips_empty_pages(self) -> None:
        result = _build_contract_text(SAMPLE_PAGES)
        assert "--- PAGE 3 ---" not in result

    def test_empty_pages_list(self) -> None:
        result = _build_contract_text([])
        assert result == ""

    def test_all_empty_text(self) -> None:
        pages = [{"page_number": 1, "original_text": "   "}]
        result = _build_contract_text(pages)
        assert result == ""


# --- _parse_analysis_response ---


class TestParseAnalysisResponse:
    def test_parses_valid_json(self) -> None:
        raw = json.dumps(VALID_ANALYSIS)
        result = _parse_analysis_response(raw)
        assert result is not None
        assert result["summary"] == VALID_ANALYSIS["summary"]
        assert result["is_ai_generated"] is True

    def test_parses_json_with_markdown_fences(self) -> None:
        raw = f"```json\n{json.dumps(VALID_ANALYSIS)}\n```"
        result = _parse_analysis_response(raw)
        assert result is not None
        assert result["summary"] == VALID_ANALYSIS["summary"]

    def test_parses_json_with_plain_fences(self) -> None:
        raw = f"```\n{json.dumps(VALID_ANALYSIS)}\n```"
        result = _parse_analysis_response(raw)
        assert result is not None

    def test_returns_none_for_invalid_json(self) -> None:
        result = _parse_analysis_response("not json at all")
        assert result is None

    def test_returns_none_for_missing_keys(self) -> None:
        incomplete = {"summary": "Only a summary"}
        result = _parse_analysis_response(json.dumps(incomplete))
        assert result is None

    def test_adds_is_ai_generated(self) -> None:
        raw = json.dumps(VALID_ANALYSIS)
        result = _parse_analysis_response(raw)
        assert result is not None
        assert result["is_ai_generated"] is True


# --- analyze_kaufvertrag ---


class TestAnalyzeKaufvertrag:
    @pytest.mark.asyncio
    async def test_returns_none_for_non_kaufvertrag(self) -> None:
        result = await analyze_kaufvertrag(SAMPLE_PAGES, "mietvertrag")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_when_anthropic_not_configured(self) -> None:
        with patch(
            "app.services.clause_analyzer_service._get_anthropic_client",
            return_value=None,
        ):
            result = await analyze_kaufvertrag(SAMPLE_PAGES, "kaufvertrag")
            assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_for_empty_text(self) -> None:
        empty_pages = [{"page_number": 1, "original_text": ""}]
        with patch(
            "app.services.clause_analyzer_service._get_anthropic_client",
            return_value=MagicMock(),
        ):
            result = await analyze_kaufvertrag(empty_pages, "kaufvertrag")
            assert result is None

    @pytest.mark.asyncio
    async def test_successful_analysis(self) -> None:
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(VALID_ANALYSIS))]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.clause_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_kaufvertrag(SAMPLE_PAGES, "kaufvertrag")

        assert result is not None
        assert result["summary"] == VALID_ANALYSIS["summary"]
        assert len(result["analyzed_clauses"]) == 1
        assert len(result["notary_checklist"]) == 1
        assert result["is_ai_generated"] is True

    @pytest.mark.asyncio
    async def test_returns_none_on_api_error(self) -> None:
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = RuntimeError("API error")

        with patch(
            "app.services.clause_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_kaufvertrag(SAMPLE_PAGES, "kaufvertrag")
            assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_on_invalid_response(self) -> None:
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="not valid json")]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.clause_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_kaufvertrag(SAMPLE_PAGES, "kaufvertrag")
            assert result is None
