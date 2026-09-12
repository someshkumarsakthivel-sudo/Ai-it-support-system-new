from datetime import datetime

import pytest
from pydantic import ValidationError

from app.schemas.ai_analysis import AIAnalysisResponse


def create_valid_ai_analysis():
    return AIAnalysisResponse(
        id=1,
        ticket_id=10,
        category="Network",
        subcategory="VPN Connection",
        priority="MEDIUM",
        sentiment="NEUTRAL",
        summary="VPN connection issue.",
        recommendation="Restart the VPN client and verify credentials.",
        confidence_score=0.85,
        model_name="gemini-3.6-flash",
        created_at=datetime.now(),
        knowledge_base_articles=[],
    )


def test_valid_ai_analysis_is_accepted():
    result = create_valid_ai_analysis()

    assert result.priority == "MEDIUM"
    assert result.sentiment == "NEUTRAL"
    assert result.confidence_score == 0.85


def test_invalid_priority_is_rejected():
    with pytest.raises(ValidationError):
        AIAnalysisResponse(
            id=1,
            ticket_id=10,
            category="Test",
            subcategory="Test",
            priority="URGENT",
            sentiment="NEUTRAL",
            summary="Test",
            recommendation="Test",
            confidence_score=0.9,
            model_name="test",
            created_at=datetime.now(),
            knowledge_base_articles=[],
        )


def test_invalid_sentiment_is_rejected():
    with pytest.raises(ValidationError):
        AIAnalysisResponse(
            id=1,
            ticket_id=10,
            category="Test",
            subcategory="Test",
            priority="LOW",
            sentiment="ANGRY",
            summary="Test",
            recommendation="Test",
            confidence_score=0.9,
            model_name="test",
            created_at=datetime.now(),
            knowledge_base_articles=[],
        )


def test_confidence_above_one_is_rejected():
    with pytest.raises(ValidationError):
        AIAnalysisResponse(
            id=1,
            ticket_id=10,
            category="Test",
            subcategory="Test",
            priority="LOW",
            sentiment="NEUTRAL",
            summary="Test",
            recommendation="Test",
            confidence_score=1.5,
            model_name="test",
            created_at=datetime.now(),
            knowledge_base_articles=[],
        )


def test_confidence_below_zero_is_rejected():
    with pytest.raises(ValidationError):
        AIAnalysisResponse(
            id=1,
            ticket_id=10,
            category="Test",
            subcategory="Test",
            priority="LOW",
            sentiment="NEUTRAL",
            summary="Test",
            recommendation="Test",
            confidence_score=-0.1,
            model_name="test",
            created_at=datetime.now(),
            knowledge_base_articles=[],
        )