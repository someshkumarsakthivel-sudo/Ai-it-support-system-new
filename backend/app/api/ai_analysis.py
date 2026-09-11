from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.ticket import Ticket
from app.models.ai_analysis import AIAnalysis
from app.models.user import User
from app.schemas.ai_analysis import AIAnalysisResponse
from app.services.gemini_service import analyze_ticket
from app.services.knowledge_base_service import search_knowledge_base


router = APIRouter(
    prefix="/api/ai",
    tags=["AI Support"],
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
        # Search the published Knowledge Base for relevant articles.
        knowledge_base_articles = search_knowledge_base(
            title=ticket.title,
            description=ticket.description,
            db=db,
            limit=5,
        )

        # Send the ticket together with relevant KB context to Gemini.
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

    try:
        confidence_score = float(
            ai_result.get(
                "confidence_score",
                0.0,
            )
        )
    except (TypeError, ValueError):
        confidence_score = 0.0

    confidence_score = max(
        0.0,
        min(
            1.0,
            confidence_score,
        ),
    )

    analysis = AIAnalysis(
        ticket_id=ticket.id,
        category=ai_result.get("category"),
        subcategory=ai_result.get("subcategory"),
        priority=ai_result.get("priority"),
        sentiment=ai_result.get("sentiment"),
        summary=ai_result.get("summary"),
        recommendation=ai_result.get("recommendation"),
        confidence_score=confidence_score,
        model_name="gemini-3.6-flash",
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return analysis