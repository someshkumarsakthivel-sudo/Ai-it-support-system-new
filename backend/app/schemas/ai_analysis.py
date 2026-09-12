from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class KnowledgeBaseArticleUsed(BaseModel):
    id: int
    title: str


class AIAnalysisResponse(BaseModel):
    id: int
    ticket_id: int

    category: str | None = None
    subcategory: str | None = None

    priority: Literal[
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    ] | None = None

    sentiment: Literal[
        "POSITIVE",
        "NEUTRAL",
        "NEGATIVE",
    ] | None = None

    summary: str | None = None
    recommendation: str | None = None

    confidence_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )

    model_name: str | None = None
    created_at: datetime

    knowledge_base_articles: list[
        KnowledgeBaseArticleUsed
    ] = Field(default_factory=list)

    model_config = ConfigDict(
        from_attributes=True
    )