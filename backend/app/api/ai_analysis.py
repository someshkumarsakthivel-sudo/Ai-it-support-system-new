from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.ai_analysis import AIAnalysis
from app.models.ai_analysis_knowledge_base import (
    AIAnalysisKnowledgeBase,
)
from app.models.knowledge_base import KnowledgeBaseArticle
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.ai_analysis import AIAnalysisResponse
from app.services.gemini_service import analyze_ticket
from app.services.knowledge_base_service import search_knowledge_base


router = APIRouter(
    prefix="/api/ai",
    tags=["AI Support"],
)


class ValidatedAIResult(BaseModel):
    """
    Internal validation model for Gemini output.

    This model validates the AI response before it is
    stored in the database.
    """

    category: str | None = None

    subcategory: str | None = None

    priority: Literal[
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    ]

    sentiment: Literal[
        "POSITIVE",
        "NEUTRAL",
        "NEGATIVE",
    ]

    summary: str

    recommendation: str

    confidence_score: float = Field(
        ge=0.0,
        le=1.0,
    )


@router.post(
    "/tickets/{ticket_id}/analyze",
    response_model=AIAnalysisResponse,
)
def analyze_ticket_with_ai(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == ticket_id)
        .first()
    )

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    # Employees can analyze only their own tickets.
    if current_user.role_id == 1:
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only analyze "
                    "your own tickets"
                ),
            )

    # Engineers can analyze only tickets assigned to them.
    elif current_user.role_id == 2:
        if ticket.assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only analyze "
                    "tickets assigned to you"
                ),
            )

    # Administrators can analyze any ticket.
    elif current_user.role_id == 3:
        pass

    else:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to analyze tickets"
            ),
        )

    try:
        # Search the published Knowledge Base for
        # articles relevant to this ticket.
        knowledge_base_articles = search_knowledge_base(
            title=ticket.title,
            description=ticket.description,
            db=db,
            limit=5,
        )

        # Send the ticket together with relevant
        # Knowledge Base context to Gemini.
        ai_result = analyze_ticket(
            title=ticket.title,
            description=ticket.description,
            knowledge_base_articles=knowledge_base_articles,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI analysis failed: {str(exc)}",
        )

    # ------------------------------------------------
    # Validate Gemini output before database save
    # ------------------------------------------------

    try:
        validated_result = ValidatedAIResult.model_validate(
            ai_result
        )

    except ValidationError:
        raise HTTPException(
            status_code=502,
            detail=(
                "AI returned an invalid response. "
                "The analysis was not saved."
            ),
        )

    # ------------------------------------------------
    # Create database record only after validation
    # ------------------------------------------------

    analysis = AIAnalysis(
        ticket_id=ticket.id,
        category=validated_result.category,
        subcategory=validated_result.subcategory,
        priority=validated_result.priority,
        sentiment=validated_result.sentiment,
        summary=validated_result.summary,
        recommendation=validated_result.recommendation,
        confidence_score=validated_result.confidence_score,
        model_name="gemini-3.6-flash",
    )

    db.add(analysis)
    db.flush()

    # Store the Knowledge Base articles used for
    # this validated AI analysis.
    for article in knowledge_base_articles:
        analysis_knowledge_base = AIAnalysisKnowledgeBase(
            ai_analysis_id=analysis.id,
            knowledge_base_article_id=article.id,
        )

        db.add(analysis_knowledge_base)

    db.commit()
    db.refresh(analysis)

    # Load the Knowledge Base articles linked to this analysis.
    knowledge_base_links = (
        db.query(KnowledgeBaseArticle)
        .join(
            AIAnalysisKnowledgeBase,
            AIAnalysisKnowledgeBase.knowledge_base_article_id
            == KnowledgeBaseArticle.id,
        )
        .filter(
            AIAnalysisKnowledgeBase.ai_analysis_id
            == analysis.id,
        )
        .order_by(
            KnowledgeBaseArticle.id.asc(),
        )
        .all()
    )

    return {
        "id": analysis.id,
        "ticket_id": analysis.ticket_id,
        "category": analysis.category,
        "subcategory": analysis.subcategory,
        "priority": analysis.priority,
        "sentiment": analysis.sentiment,
        "summary": analysis.summary,
        "recommendation": analysis.recommendation,
        "confidence_score": analysis.confidence_score,
        "model_name": analysis.model_name,
        "created_at": analysis.created_at,
        "knowledge_base_articles": [
            {
                "id": article.id,
                "title": article.title,
            }
            for article in knowledge_base_links
        ],
    }