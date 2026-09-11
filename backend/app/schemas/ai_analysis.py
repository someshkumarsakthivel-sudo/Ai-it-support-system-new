from datetime import datetime

from pydantic import BaseModel, Field


class AIAnalysisResponse(BaseModel):
    id: int
    ticket_id: int
    category: str | None
    subcategory: str | None
    priority: str | None
    sentiment: str | None
    summary: str | None
    recommendation: str | None
    confidence_score: float | None
    model_name: str | None
    created_at: datetime

    class Config:
        from_attributes = True