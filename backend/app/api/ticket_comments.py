from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.ticket import Ticket
from app.models.ticket_comment import TicketComment
from app.models.user import User
from app.schemas.ticket_comment import (
    TicketCommentCreate,
    TicketCommentResponse
)


router = APIRouter(
    prefix="/api/tickets",
    tags=["Ticket Comments"]
)


def check_ticket_access(
    ticket: Ticket,
    current_user: User
):
    """
    Check whether the current user is allowed
    to access this ticket's comments.
    """

    # Admin can access every ticket.
    if current_user.role_id == 3:
        return

    # Employee can access only tickets they created.
    if current_user.role_id == 1:
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Employees can only access comments "
                    "on their own tickets"
                )
            )
        return

    # Engineer can access only tickets assigned to them.
    if current_user.role_id == 2:
        if ticket.assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Engineers can only access comments "
                    "on tickets assigned to them"
                )
            )
        return

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to access this ticket"
    )


@router.post(
    "/{ticket_id}/comments",
    response_model=TicketCommentResponse
)
def create_ticket_comment(
    ticket_id: int,
    comment_data: TicketCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check whether ticket exists.
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    # Check ticket access.
    check_ticket_access(
        ticket,
        current_user
    )

    # Employees are not allowed to create
    # internal support comments.
    if (
        current_user.role_id == 1
        and comment_data.is_internal
    ):
        raise HTTPException(
            status_code=403,
            detail="Employees cannot create internal comments"
        )

    # Make sure the authenticated user is still active.
    user = db.query(User).filter(
        User.id == current_user.id,
        User.is_active == True
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Current user is inactive or no longer exists"
        )

    new_comment = TicketComment(
        ticket_id=ticket_id,
        user_id=current_user.id,
        comment=comment_data.comment.strip(),
        is_internal=comment_data.is_internal
    )

    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return new_comment


@router.get(
    "/{ticket_id}/comments",
    response_model=list[TicketCommentResponse]
)
def get_ticket_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check whether ticket exists.
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    # Check ticket access.
    check_ticket_access(
        ticket,
        current_user
    )

    comments_query = db.query(
        TicketComment
    ).filter(
        TicketComment.ticket_id == ticket_id
    )

    # Employees should not see internal comments.
    if current_user.role_id == 1:
        comments_query = comments_query.filter(
            TicketComment.is_internal == False
        )

    comments = (
        comments_query
        .order_by(TicketComment.created_at.asc())
        .all()
    )

    return comments