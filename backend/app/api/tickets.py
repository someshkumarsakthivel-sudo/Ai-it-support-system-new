from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.ticket import Ticket
from app.models.user import User
from app.models.category import Category
from app.models.team import Team
from app.schemas.ticket import (
    TicketCreate,
    TicketResponse,
    TicketUpdate,
    TicketStatusUpdate,
    TicketAssignmentUpdate
)


router = APIRouter(
    prefix="/api/tickets",
    tags=["Tickets"]
)


def generate_ticket_number(db: Session) -> str:
    year = datetime.utcnow().year

    last_ticket = (
        db.query(Ticket)
        .order_by(Ticket.id.desc())
        .first()
    )

    if last_ticket:
        next_number = last_ticket.id + 1
    else:
        next_number = 1

    return f"IT-{year}-{next_number:06d}"


@router.post("", response_model=TicketResponse)
def create_ticket(
    ticket_data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(
        User.id == current_user.id,
        User.is_active == True
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Creating user not found or inactive"
        )

    if ticket_data.category_id is not None:
        category = db.query(Category).filter(
            Category.id == ticket_data.category_id,
            Category.is_active == True
        ).first()

        if not category:
            raise HTTPException(
                status_code=404,
                detail="Category not found or inactive"
            )

    valid_priorities = [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
    ]

    if ticket_data.priority not in valid_priorities:
        raise HTTPException(
            status_code=400,
            detail="Invalid priority"
        )

    ticket_number = generate_ticket_number(db)

    new_ticket = Ticket(
        ticket_number=ticket_number,
        title=ticket_data.title,
        description=ticket_data.description,
        created_by=current_user.id,
        category_id=ticket_data.category_id,
        priority=ticket_data.priority,
        status="OPEN"
    )

    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    return new_ticket


@router.get("", response_model=list[TicketResponse])
def get_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Ticket)

    if current_user.role_id == 3:
        tickets = (
            query
            .order_by(Ticket.id.desc())
            .all()
        )

    elif current_user.role_id == 1:
        tickets = (
            query
            .filter(Ticket.created_by == current_user.id)
            .order_by(Ticket.id.desc())
            .all()
        )

    elif current_user.role_id == 2:
        tickets = (
            query
            .filter(Ticket.assigned_to == current_user.id)
            .order_by(Ticket.id.desc())
            .all()
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view tickets"
        )

    return tickets


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    if current_user.role_id == 3:
        return ticket

    if current_user.role_id == 1:
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to view this ticket"
            )

        return ticket

    if current_user.role_id == 2:
        if ticket.assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to view this ticket"
            )

        return ticket

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to view this ticket"
    )


@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    if current_user.role_id == 3:
        pass

    elif current_user.role_id == 1:
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to update this ticket"
            )

    elif current_user.role_id == 2:
        if ticket.assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to update this ticket"
            )

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update this ticket"
        )

    if ticket_data.title is not None:
        ticket.title = ticket_data.title

    if ticket_data.description is not None:
        ticket.description = ticket_data.description

    if ticket_data.category_id is not None:
        category = db.query(Category).filter(
            Category.id == ticket_data.category_id,
            Category.is_active == True
        ).first()

        if not category:
            raise HTTPException(
                status_code=404,
                detail="Category not found or inactive"
            )

        ticket.category_id = ticket_data.category_id

    if ticket_data.priority is not None:
        valid_priorities = [
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL"
        ]

        if ticket_data.priority not in valid_priorities:
            raise HTTPException(
                status_code=400,
                detail="Invalid priority"
            )

        ticket.priority = ticket_data.priority

    db.commit()
    db.refresh(ticket)

    return ticket


@router.patch(
    "/{ticket_id}/status",
    response_model=TicketResponse
)
def update_ticket_status(
    ticket_id: int,
    status_data: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    # Authorization
    if current_user.role_id == 3:
        pass

    elif current_user.role_id == 1:
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to update this ticket"
            )

    elif current_user.role_id == 2:
        if ticket.assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to update this ticket"
            )

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update this ticket"
        )

    new_status = status_data.status

    valid_statuses = [
        "OPEN",
        "ASSIGNED",
        "IN_PROGRESS",
        "PENDING",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
        "CANCELLED"
    ]

    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid ticket status"
        )

    if current_user.role_id == 1:
        employee_allowed_statuses = [
            "CANCELLED",
            "REOPENED"
        ]

        if new_status not in employee_allowed_statuses:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Employees can only cancel or reopen "
                    "their own tickets"
                )
            )

    elif current_user.role_id == 2:
        engineer_allowed_statuses = [
            "IN_PROGRESS",
            "PENDING",
            "RESOLVED",
            "REOPENED"
        ]

        if new_status not in engineer_allowed_statuses:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Engineers can only update tickets "
                    "through the supported workflow"
                )
            )

    allowed_transitions = {
        "OPEN": ["ASSIGNED", "CANCELLED"],
        "ASSIGNED": ["IN_PROGRESS", "CANCELLED"],
        "IN_PROGRESS": [
            "PENDING",
            "RESOLVED",
            "CANCELLED"
        ],
        "PENDING": [
            "IN_PROGRESS",
            "CANCELLED"
        ],
        "RESOLVED": [
            "CLOSED",
            "REOPENED"
        ],
        "CLOSED": ["REOPENED"],
        "REOPENED": [
            "ASSIGNED",
            "IN_PROGRESS",
            "CANCELLED"
        ],
        "CANCELLED": ["REOPENED"]
    }

    current_status = ticket.status

    if new_status == current_status:
        raise HTTPException(
            status_code=400,
            detail=f"Ticket is already {current_status}"
        )

    if new_status not in allowed_transitions.get(
        current_status,
        []
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot change ticket status "
                f"from {current_status} to {new_status}"
            )
        )

    if new_status in [
        "OPEN",
        "ASSIGNED",
        "IN_PROGRESS",
        "PENDING",
        "REOPENED"
    ]:
        ticket.resolved_at = None
        ticket.closed_at = None

    elif new_status == "RESOLVED":
        ticket.resolved_at = datetime.utcnow()
        ticket.closed_at = None

    elif new_status == "CLOSED":
        if ticket.resolved_at is None:
            ticket.resolved_at = datetime.utcnow()

        ticket.closed_at = datetime.utcnow()

    elif new_status == "CANCELLED":
        ticket.resolved_at = None
        ticket.closed_at = None

    ticket.status = new_status

    db.commit()
    db.refresh(ticket)

    return ticket


@router.patch(
    "/{ticket_id}/assignment",
    response_model=TicketResponse
)
def update_ticket_assignment(
    ticket_id: int,
    assignment_data: TicketAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    # Only administrators can assign or unassign tickets.
    if current_user.role_id != 3:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can assign tickets"
        )

    if ticket.status in [
        "CLOSED",
        "RESOLVED",
        "CANCELLED"
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot assign a ticket "
                f"with status {ticket.status}"
            )
        )

    # Explicitly unassign the ticket.
    if assignment_data.assigned_to is None:
        ticket.assigned_to = None

    else:
        engineer = db.query(User).filter(
            User.id == assignment_data.assigned_to,
            User.is_active == True
        ).first()

        if not engineer:
            raise HTTPException(
                status_code=404,
                detail="Assigned user not found or inactive"
            )

        if engineer.role_id != 2:
            raise HTTPException(
                status_code=400,
                detail="Assigned user must be an engineer"
            )

        ticket.assigned_to = assignment_data.assigned_to

    # Update team when explicitly provided.
    if assignment_data.team_id is not None:
        team = db.query(Team).filter(
            Team.id == assignment_data.team_id
        ).first()

        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )

        ticket.team_id = assignment_data.team_id

    # If the ticket has an engineer assigned,
    # mark it as ASSIGNED.
    # If it is unassigned, return it to OPEN.
    if ticket.assigned_to is not None:
        ticket.status = "ASSIGNED"
        ticket.resolved_at = None
        ticket.closed_at = None
    else:
        ticket.status = "OPEN"
        ticket.resolved_at = None
        ticket.closed_at = None

    db.commit()
    db.refresh(ticket)

    return ticket