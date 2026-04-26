"""Tests for AI-powered clause risk annotation service."""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.clause_risk_analyzer_service import (
    _add_defaults,
    _build_clauses_text,
    _estimate_confidence,
    _parse_risk_response,
    analyze_clause_risks,
)

# --- Sample data ---

SAMPLE_CLAUSES = [
    {
        "clause_type": "warranty_exclusion",
        "original_text": "Die Gewährleistung wird ausgeschlossen.",
        "translated_text": "The warranty is excluded.",
        "page_number": 3,
        "risk_level": "high",
    },
    {
        "clause_type": "purchase_price",
        "original_text": "Der Kaufpreis beträgt EUR 350.000.",
        "translated_text": "The purchase price is EUR 350,000.",
        "page_number": 2,
        "risk_level": "high",
    },
    {
        "clause_type": "deadline",
        "original_text": "Frist bis zum 31.03.2025.",
        "translated_text": "Deadline by 31.03.2025.",
        "page_number": 4,
        "risk_level": "high",
    },
]

VALID_RISK_RESPONSE = [
    {
        "risk_level": "high",
        "risk_reason": "Full warranty exclusion is unusual; buyer accepts all defects.",
        "confidence_level": "high",
        "confidence_score": 92,
    },
    {
        "risk_level": "medium",
        "risk_reason": "Standard purchase price clause — verify amount matches offer.",
        "confidence_level": "high",
        "confidence_score": 95,
    },
    {
        "risk_level": "medium",
        "risk_reason": "Standard deadline; confirm timeline is achievable.",
        "confidence_level": "medium",
        "confidence_score": 75,
    },
]


# --- _build_clauses_text ---


class TestBuildClausesText:
    def test_includes_all_clause_numbers(self) -> None:
        result = _build_clauses_text(SAMPLE_CLAUSES)
        assert "CLAUSE 1" in result
        assert "CLAUSE 2" in result
        assert "CLAUSE 3" in result

    def test_includes_clause_types_and_pages(self) -> None:
        result = _build_clauses_text(SAMPLE_CLAUSES)
        assert "warranty_exclusion" in result
        assert "page: 3" in result

    def test_includes_german_and_english_text(self) -> None:
        result = _build_clauses_text(SAMPLE_CLAUSES)
        assert "Gewährleistung" in result
        assert "warranty is excluded" in result

    def test_empty_clauses(self) -> None:
        result = _build_clauses_text([])
        assert result == ""

    def test_skips_empty_english_translation(self) -> None:
        clauses = [
            {
                "clause_type": "deadline",
                "original_text": "Frist bis 31.03.2025",
                "translated_text": "",
                "page_number": 1,
                "risk_level": "high",
            }
        ]
        result = _build_clauses_text(clauses)
        assert "English:" not in result
        assert "German:" in result


# --- _parse_risk_response ---


class TestParseRiskResponse:
    def test_parses_valid_json_array(self) -> None:
        raw = json.dumps(VALID_RISK_RESPONSE)
        result = _parse_risk_response(raw, 3)
        assert result is not None
        assert len(result) == 3
        assert result[0]["risk_level"] == "high"
        assert "warranty" in result[0]["risk_reason"]

    def test_parses_confidence_fields(self) -> None:
        raw = json.dumps(VALID_RISK_RESPONSE)
        result = _parse_risk_response(raw, 3)
        assert result is not None
        assert result[0]["confidence_level"] == "high"
        assert result[0]["confidence_score"] == 92
        assert result[2]["confidence_level"] == "medium"

    def test_strips_markdown_json_fences(self) -> None:
        raw = f"```json\n{json.dumps(VALID_RISK_RESPONSE)}\n```"
        result = _parse_risk_response(raw, 3)
        assert result is not None
        assert len(result) == 3

    def test_strips_plain_markdown_fences(self) -> None:
        raw = f"```\n{json.dumps(VALID_RISK_RESPONSE)}\n```"
        result = _parse_risk_response(raw, 3)
        assert result is not None

    def test_returns_none_for_invalid_json(self) -> None:
        result = _parse_risk_response("not json", 3)
        assert result is None

    def test_returns_none_for_non_list_response(self) -> None:
        result = _parse_risk_response(json.dumps({"risk_level": "high"}), 1)
        assert result is None

    def test_coerces_invalid_risk_level_to_medium(self) -> None:
        data = [
            {
                "risk_level": "extreme",
                "risk_reason": "Very bad.",
                "confidence_level": "high",
                "confidence_score": 90,
            }
        ]
        result = _parse_risk_response(json.dumps(data), 1)
        assert result is not None
        assert result[0]["risk_level"] == "medium"

    def test_coerces_invalid_confidence_level_to_high(self) -> None:
        data = [
            {
                "risk_level": "low",
                "risk_reason": "Fine.",
                "confidence_level": "excellent",
                "confidence_score": 90,
            }
        ]
        result = _parse_risk_response(json.dumps(data), 1)
        assert result is not None
        assert result[0]["confidence_level"] == "high"

    def test_defaults_out_of_range_confidence_score(self) -> None:
        data = [
            {
                "risk_level": "low",
                "risk_reason": "Fine.",
                "confidence_level": "high",
                "confidence_score": 150,
            }
        ]
        result = _parse_risk_response(json.dumps(data), 1)
        assert result is not None
        assert result[0]["confidence_score"] == 92

    def test_tolerates_count_mismatch(self) -> None:
        data = [{"risk_level": "high", "risk_reason": "test"}]
        result = _parse_risk_response(json.dumps(data), 3)
        assert result is not None
        assert len(result) == 1

    def test_defaults_missing_risk_reason_to_empty(self) -> None:
        data = [{"risk_level": "low"}]
        result = _parse_risk_response(json.dumps(data), 1)
        assert result is not None
        assert result[0]["risk_reason"] == ""


# --- _estimate_confidence ---


class TestEstimateConfidence:
    def test_short_simple_clause_is_high(self) -> None:
        clause = {"original_text": "Der Kaufpreis beträgt EUR 350.000."}
        level, score = _estimate_confidence(clause)
        assert level == "high"
        assert score >= 85

    def test_clause_with_one_archaic_pattern_is_medium(self) -> None:
        clause = {"original_text": "gemäß den Vereinbarungen gilt folgendes."}
        level, score = _estimate_confidence(clause)
        assert level == "medium"
        assert 60 <= score < 85

    def test_clause_with_multiple_archaic_patterns_is_low(self) -> None:
        clause = {
            "original_text": "Gemäß § 433 BGB vorbehaltlich der Regelungen des Abs. 2."
        }
        level, score = _estimate_confidence(clause)
        assert level == "low"
        assert score < 60

    def test_long_clause_over_50_words_is_low(self) -> None:
        long_text = " ".join(["Wort"] * 55)
        clause = {"original_text": long_text}
        level, score = _estimate_confidence(clause)
        assert level == "low"

    def test_medium_length_clause_is_medium(self) -> None:
        medium_text = " ".join(["Wort"] * 30)
        clause = {"original_text": medium_text}
        level, score = _estimate_confidence(clause)
        assert level == "medium"

    def test_empty_text_returns_high(self) -> None:
        clause = {"original_text": ""}
        level, score = _estimate_confidence(clause)
        assert level == "high"


# --- analyze_clause_risks ---


class TestAnalyzeClauseRisks:
    @pytest.mark.asyncio
    async def test_returns_empty_list_for_no_clauses(self) -> None:
        result = await analyze_clause_risks([])
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_clauses_with_defaults_when_not_configured(
        self,
    ) -> None:
        with patch(
            "app.services.clause_risk_analyzer_service._get_anthropic_client",
            return_value=None,
        ):
            result = await analyze_clause_risks(SAMPLE_CLAUSES)
        assert len(result) == 3
        assert all("risk_reason" in c for c in result)
        assert all("confidence_level" in c for c in result)
        assert all("confidence_score" in c for c in result)
        assert all(c["confidence_level"] in {"high", "medium", "low"} for c in result)

    @pytest.mark.asyncio
    async def test_enriches_clauses_on_success(self) -> None:
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(VALID_RISK_RESPONSE))]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.clause_risk_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_clause_risks(SAMPLE_CLAUSES)

        assert len(result) == 3
        assert result[0]["risk_level"] == "high"
        assert "warranty" in result[0]["risk_reason"]
        assert result[1]["risk_level"] == "medium"
        assert result[0]["confidence_level"] == "high"
        assert result[0]["confidence_score"] == 92
        assert result[2]["confidence_level"] == "medium"

    @pytest.mark.asyncio
    async def test_preserves_original_fields(self) -> None:
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(VALID_RISK_RESPONSE))]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.clause_risk_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_clause_risks(SAMPLE_CLAUSES)

        assert result[0]["original_text"] == SAMPLE_CLAUSES[0]["original_text"]
        assert result[0]["page_number"] == SAMPLE_CLAUSES[0]["page_number"]
        assert result[0]["clause_type"] == SAMPLE_CLAUSES[0]["clause_type"]

    @pytest.mark.asyncio
    async def test_falls_back_on_api_error(self) -> None:
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = RuntimeError("API error")

        with patch(
            "app.services.clause_risk_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_clause_risks(SAMPLE_CLAUSES)

        assert len(result) == 3
        assert all("confidence_level" in c for c in result)
        assert all("confidence_score" in c for c in result)
        assert all(c["risk_reason"] == "" for c in result)

    @pytest.mark.asyncio
    async def test_falls_back_on_invalid_response(self) -> None:
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="not valid json")]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.clause_risk_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_clause_risks(SAMPLE_CLAUSES)

        assert len(result) == 3
        assert all("confidence_level" in c for c in result)

    @pytest.mark.asyncio
    async def test_caps_batch_at_max_clauses(self) -> None:
        many_clauses = [
            {
                "clause_type": "financial_term",
                "original_text": f"Term {i}",
                "translated_text": f"Translation {i}",
                "page_number": i,
                "risk_level": "medium",
            }
            for i in range(25)
        ]
        ai_response = [
            {
                "risk_level": "medium",
                "risk_reason": f"Reason {i}",
                "confidence_level": "high",
                "confidence_score": 90,
            }
            for i in range(20)
        ]
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(ai_response))]
        mock_client.messages.create.return_value = mock_message

        with patch(
            "app.services.clause_risk_analyzer_service._get_anthropic_client",
            return_value=mock_client,
        ):
            result = await analyze_clause_risks(many_clauses)

        assert len(result) == 25
        assert result[0]["risk_reason"] == "Reason 0"
        assert result[24]["risk_reason"] == ""
        # Remainder clauses (indices 20-24) use heuristic confidence, not AI's score of 90
        assert result[24]["confidence_level"] in {"high", "medium", "low"}
        # "Term 24" is short with no archaic patterns → heuristic returns "high"/92
        assert result[24]["confidence_score"] == 92


# --- _add_defaults ---


class TestAddDefaults:
    def test_adds_confidence_fields(self) -> None:
        clauses = [
            {"clause_type": "deadline", "risk_level": "high", "original_text": "Frist"}
        ]
        result = _add_defaults(clauses)
        assert "confidence_level" in result[0]
        assert "confidence_score" in result[0]

    def test_adds_risk_reason_field(self) -> None:
        clauses = [
            {"clause_type": "deadline", "risk_level": "high", "original_text": "Frist"}
        ]
        result = _add_defaults(clauses)
        assert result[0]["risk_reason"] == ""

    def test_preserves_existing_risk_reason(self) -> None:
        clauses = [
            {
                "clause_type": "deadline",
                "risk_level": "high",
                "risk_reason": "Tight",
                "original_text": "Frist",
            }
        ]
        result = _add_defaults(clauses)
        assert result[0]["risk_reason"] == "Tight"

    def test_does_not_mutate_original(self) -> None:
        clauses = [
            {"clause_type": "deadline", "risk_level": "high", "original_text": "Frist"}
        ]
        result = _add_defaults(clauses)
        assert "risk_reason" not in clauses[0]
        assert "confidence_level" not in clauses[0]
        assert result[0]["risk_reason"] == ""
