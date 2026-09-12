from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user

from app.models.ticket import Ticket
from app.models.user import User
from app.models.category import Category
from app.models.team import Team
from app.models.sla_policy import SLAPolicy
from app.models.notification import Notification

from app.schemas.ticket import (
    TicketCreate,
    TicketResponse,
    TicketUpdate,
    TicketStatusUpdate,
    TicketAssignmentUpdate,
    TicketRatingCreate,
)


router = APIRouter(
    prefix="/api/tickets",
    tags=["Tickets"],
)


VALID_PRIORITIES = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
]


VALID_STATUSES = [
    "OPEN",
    "ASSIGNED",
    "IN_PROGRESS",
    "PENDING",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "CANCELLED",
]


ALLOWED_TRANSITIONS = {
    "OPEN": [
        "ASSIGNED",
        "CANCELLED",
    ],
    "ASSIGNED": [
        "IN_PROGRESS",
        "CANCELLED",
    ],
    "IN_PROGRESS": [
        "PENDING",
        "RESOLVED",
        "CANCELLED",
    ],
    "PENDING": [
        "IN_PROGRESS",
        "CANCELLED",
    ],
    "RESOLVED": [
        "CLOSED",
        "REOPENED",
    ],
    "CLOSED": [
        "REOPENED",
    ],
    "REOPENED": [
        "ASSIGNED",
        "IN_PROGRESS",
        "CANCELLED",
    ],
    "CANCELLED": [
        "REOPENED",
    ],
}


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


def get_active_sla_policy(
    db: Session,
    priority: str,
) -> SLAPolicy:
    """
    Find the active SLA policy for a ticket priority.
    """

    policy = (
        db.query(SLAPolicy)
        .filter(
            SLAPolicy.priority == priority,
            SLAPolicy.is_active == True,
        )
        .first()
    )

    if not policy:
        raise HTTPException(
            status_code=400,
            detail=(
                f"No active SLA policy exists "
                f"for priority {priority}"
            ),
        )

    return policy


def calculate_sla_deadlines(
    created_at: datetime,
    policy: SLAPolicy,
) -> tuple[datetime, datetime]:
    """
    Calculate response and resolution deadlines
    using the SLA policy.
    """

    response_deadline = (
        created_at
        + timedelta(
            minutes=policy.response_time_minutes
        )
    )

    resolution_deadline = (
        created_at
        + timedelta(
            minutes=policy.resolution_time_minutes
        )
    )

    return (
        response_deadline,
        resolution_deadline,
    )


def check_ticket_view_access(
    ticket: Ticket,
    current_user: User,
):
    if current_user.role_id == 3:
        return

    if current_user.role_id == 1:
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not have permission "
                    "to view this ticket"
                ),
            )
        return

    if current_user.role_id == 2:
        if ticket.assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not have permission "
                    "to view this ticket"
                ),
            )
        return

    raise HTTPException(
        status_code=403,
        detail=(
            "You do not have permission "
            "to view this ticket"
        ),
    )


def check_ticket_update_access(
    ticket: Ticket,
    current_user: User,
):
    if current_user.role_id == 3:
        return

    if current_user.role_id == 1:
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not have permission "
                    "to update this ticket"
                ),
            )
        return

    if current_user.role_id == 2:
        if ticket.assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not have permission "
                    "to update this ticket"
                ),
            )
        return

    raise HTTPException(
        status_code=403,
        detail=(
            "You do not have permission "
            "to update this ticket"
        ),
    )


@router.post(
    "",
    response_model=TicketResponse,
)
def create_ticket(
    ticket_data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = (
        db.query(User)
        .filter(
            User.id == current_user.id,
            User.is_active == True,
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Creating user not found or inactive",
        )

    if ticket_data.category_id is not None:
        category = (
            db.query(Category)
            .filter(
                Category.id == ticket_data.category_id,
                Category.is_active == True,
            )
            .first()
        )

        if not category:
            raise HTTPException(
                status_code=404,
                detail="Category not found or inactive",
            )

    priority = ticket_data.priority.upper().strip()

    if priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=400,
            detail="Invalid priority",
        )

    sla_policy = get_active_sla_policy(
        db=db,
        priority=priority,
    )

    created_at = datetime.utcnow()

    (
        sla_response_deadline,
        sla_resolution_deadline,
    ) = calculate_sla_deadlines(
        created_at=created_at,
        policy=sla_policy,
    )

    ticket_number = generate_ticket_number(db)

    new_ticket = Ticket(
        ticket_number=ticket_number,
        title=ticket_data.title,
        description=ticket_data.description,
        created_by=current_user.id,
        category_id=ticket_data.category_id,
        priority=priority,
        status="OPEN",
        created_at=created_at,
        updated_at=created_at,
        sla_response_deadline=sla_response_deadline,
        sla_resolution_deadline=sla_resolution_deadline,
        sla_response_met=None,
        sla_resolution_met=None,
    )

    db.add(new_ticket)

    # Flush the ticket so that the database generates
    # the ticket ID before creating notifications.
    db.flush()

    # -------------------------------------------------
    # Create notification for all active administrators
    # -------------------------------------------------

    administrators = (
        db.query(User)
        .filter(
            User.role_id == 3,
            User.is_active == True,
        )
        .all()
    )

    for administrator in administrators:
        # Do not notify the creator if an administrator
        # creates a ticket themselves.
        if administrator.id == current_user.id:
            continue

        notification = Notification(
            user_id=administrator.id,
            ticket_id=new_ticket.id,
            type="NEW_TICKET",
            title="New Ticket Created",
            message=(
                f"Ticket {new_ticket.ticket_number} "
                f"has been created: "
                f"{new_ticket.title}"
            ),
            is_read=False,
            created_at=datetime.utcnow(),
            read_at=None,
        )

        db.add(notification)

    db.commit()
    db.refresh(new_ticket)

    return new_ticket


@router.get(
    "",
    response_model=list[TicketResponse],
)
def get_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
            .filter(
                Ticket.created_by == current_user.id
            )
            .order_by(Ticket.id.desc())
            .all()
        )

    elif current_user.role_id == 2:
        tickets = (
            query
            .filter(
                Ticket.assigned_to == current_user.id
            )
            .order_by(Ticket.id.desc())
            .all()
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view tickets",
        )

    return tickets


@router.get(
    "/{ticket_id}",
    response_model=TicketResponse,
)
def get_ticket(
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

    check_ticket_view_access(
        ticket,
        current_user,
    )

    return ticket


@router.put(
    "/{ticket_id}",
    response_model=TicketResponse,
)
def update_ticket(
    ticket_id: int,
    ticket_data: TicketUpdate,
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

    check_ticket_update_access(
        ticket,
        current_user,
    )

    if ticket_data.title is not None:
        ticket.title = ticket_data.title

    if ticket_data.description is not None:
        ticket.description = ticket_data.description

    if ticket_data.category_id is not None:
        category = (
            db.query(Category)
            .filter(
                Category.id == ticket_data.category_id,
                Category.is_active == True,
            )
            .first()
        )

        if not category:
            raise HTTPException(
                status_code=404,
                detail="Category not found or inactive",
            )

        ticket.category_id = ticket_data.category_id

    if ticket_data.priority is not None:
        priority = (
            ticket_data.priority
            .upper()
            .strip()
        )

        if priority not in VALID_PRIORITIES:
            raise HTTPException(
                status_code=400,
                detail="Invalid priority",
            )

        sla_policy = get_active_sla_policy(
            db=db,
            priority=priority,
        )

        ticket.priority = priority

        (
            ticket.sla_response_deadline,
            ticket.sla_resolution_deadline,
        ) = calculate_sla_deadlines(
            created_at=ticket.created_at,
            policy=sla_policy,
        )

        ticket.sla_response_met = None
        ticket.sla_resolution_met = None

    db.commit()
    db.refresh(ticket)

    return ticket


@router.patch(
    "/{ticket_id}/status",
    response_model=TicketResponse,
)
def update_ticket_status(
    ticket_id: int,
    status_data: TicketStatusUpdate,
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

    new_status = status_data.status

    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid ticket status",
        )

    current_status = ticket.status

    if new_status == current_status:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Ticket is already "
                f"{current_status}"
            ),
        )

    allowed_next_statuses = (
        ALLOWED_TRANSITIONS.get(
            current_status,
            [],
        )
    )

    if new_status not in allowed_next_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot change ticket status "
                f"from {current_status} "
                f"to {new_status}"
            ),
        )

    # -------------------------------------------------
    # Employee permissions
    # -------------------------------------------------

    if current_user.role_id == 1:
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only change the "
                    "status of your own tickets"
                ),
            )

        employee_allowed_statuses = [
            "CANCELLED",
            "REOPENED",
        ]

        if new_status not in employee_allowed_statuses:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Employees can only cancel "
                    "or reopen their own tickets"
                ),
            )

    # -------------------------------------------------
    # Support Engineer permissions
    # -------------------------------------------------

    elif current_user.role_id == 2:
        if ticket.assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Engineers can only update "
                    "tickets assigned to them"
                ),
            )

        engineer_allowed_statuses = [
            "IN_PROGRESS",
            "PENDING",
            "RESOLVED",
            "REOPENED",
        ]

        if new_status not in engineer_allowed_statuses:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Engineers can only update "
                    "tickets through the "
                    "supported workflow"
                ),
            )

    # -------------------------------------------------
    # Administrator permissions
    # -------------------------------------------------

    elif current_user.role_id == 3:
        pass

    else:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to update ticket status"
            ),
        )

    # -------------------------------------------------
    # Update timestamps
    # -------------------------------------------------

    now = datetime.utcnow()

    if new_status in [
        "OPEN",
        "ASSIGNED",
        "IN_PROGRESS",
        "PENDING",
        "REOPENED",
    ]:
        ticket.resolved_at = None
        ticket.closed_at = None

    elif new_status == "RESOLVED":
        ticket.resolved_at = now
        ticket.closed_at = None

    elif new_status == "CLOSED":
        if ticket.resolved_at is None:
            ticket.resolved_at = now

        ticket.closed_at = now

    elif new_status == "CANCELLED":
        ticket.resolved_at = None
        ticket.closed_at = None

    ticket.status = new_status

    # -------------------------------------------------
    # SLA response tracking
    # -------------------------------------------------

    if (
        ticket.sla_response_met is None
        and new_status in [
            "ASSIGNED",
            "IN_PROGRESS",
            "PENDING",
            "RESOLVED",
            "CLOSED",
        ]
    ):
        if (
            ticket.sla_response_deadline
            and now <= ticket.sla_response_deadline
        ):
            ticket.sla_response_met = True
        else:
            ticket.sla_response_met = False

    # -------------------------------------------------
    # SLA resolution tracking
    # -------------------------------------------------

    if (
        ticket.sla_resolution_met is None
        and new_status in [
            "RESOLVED",
            "CLOSED",
        ]
    ):
        if (
            ticket.sla_resolution_deadline
            and now <= ticket.sla_resolution_deadline
        ):
            ticket.sla_resolution_met = True
        else:
            ticket.sla_resolution_met = False

    # -------------------------------------------------
    # Create notification for ticket creator
    # -------------------------------------------------

    if (
        ticket.created_by != current_user.id
        and ticket.created_by is not None
    ):
        status_messages = {
            "OPEN": (
                "Your ticket has been moved to OPEN."
            ),
            "ASSIGNED": (
                "Your ticket has been assigned "
                "to a support engineer."
            ),
            "IN_PROGRESS": (
                "A support engineer is now "
                "working on your ticket."
            ),
            "PENDING": (
                "Your ticket is currently pending."
            ),
            "RESOLVED": (
                "Your ticket has been resolved."
            ),
            "CLOSED": (
                "Your ticket has been closed."
            ),
            "REOPENED": (
                "Your ticket has been reopened."
            ),
            "CANCELLED": (
                "Your ticket has been cancelled."
            ),
        }

        status_titles = {
            "OPEN": "Ticket Status Updated",
            "ASSIGNED": "Ticket Assigned",
            "IN_PROGRESS": "Ticket In Progress",
            "PENDING": "Ticket Pending",
            "RESOLVED": "Ticket Resolved",
            "CLOSED": "Ticket Closed",
            "REOPENED": "Ticket Reopened",
            "CANCELLED": "Ticket Cancelled",
        }

        notification = Notification(
            user_id=ticket.created_by,
            ticket_id=ticket.id,
            type="TICKET_STATUS_CHANGED",
            title=status_titles.get(
                new_status,
                "Ticket Status Updated",
            ),
            message=(
                f"Ticket {ticket.ticket_number}: "
                f"{status_messages.get(
                    new_status,
                    f'Status changed to {new_status}.'
                )}"
            ),
            is_read=False,
            created_at=datetime.utcnow(),
            read_at=None,
        )

        db.add(notification)

    db.commit()
    db.refresh(ticket)

    return ticket


@router.patch(
    "/{ticket_id}/assignment",
    response_model=TicketResponse,
)
def update_ticket_assignment(
    ticket_id: int,
    assignment_data: TicketAssignmentUpdate,
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

    # Only administrators can assign tickets.
    if current_user.role_id != 3:
        raise HTTPException(
            status_code=403,
            detail=(
                "Only administrators can "
                "assign tickets"
            ),
        )

    if ticket.status in [
        "CLOSED",
        "RESOLVED",
        "CANCELLED",
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot assign a ticket "
                f"with status {ticket.status}"
            ),
        )

    # -------------------------------------------------
    # Engineer assignment
    # -------------------------------------------------

    if assignment_data.assigned_to is None:
        ticket.assigned_to = None

    else:
        engineer = (
            db.query(User)
            .filter(
                User.id == assignment_data.assigned_to,
                User.is_active == True,
            )
            .first()
        )

        if not engineer:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Assigned user not found "
                    "or inactive"
                ),
            )

        if engineer.role_id != 2:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Assigned user must "
                    "be an engineer"
                ),
            )

        ticket.assigned_to = (
            assignment_data.assigned_to
        )

    # -------------------------------------------------
    # Team assignment
    # -------------------------------------------------

    if assignment_data.team_id is not None:
        team = (
            db.query(Team)
            .filter(
                Team.id == assignment_data.team_id
            )
            .first()
        )

        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found",
            )

        ticket.team_id = assignment_data.team_id

    # -------------------------------------------------
    # Automatically update workflow status
    # -------------------------------------------------

    if ticket.assigned_to is not None:
        ticket.status = "ASSIGNED"
    else:
        ticket.status = "OPEN"

    ticket.resolved_at = None
    ticket.closed_at = None

    # -------------------------------------------------
    # SLA response tracking
    # -------------------------------------------------

    if ticket.sla_response_met is None:
        now = datetime.utcnow()

        if (
            ticket.sla_response_deadline
            and now <= ticket.sla_response_deadline
        ):
            ticket.sla_response_met = True
        else:
            ticket.sla_response_met = False

    # -------------------------------------------------
    # Create notification for assigned engineer
    # -------------------------------------------------

    if ticket.assigned_to is not None:
        notification = Notification(
            user_id=ticket.assigned_to,
            ticket_id=ticket.id,
            type="TICKET_ASSIGNED",
            title="New Ticket Assigned",
            message=(
                f"Ticket {ticket.ticket_number} "
                f"has been assigned to you: "
                f"{ticket.title}"
            ),
            is_read=False,
            created_at=datetime.utcnow(),
            read_at=None,
        )

        db.add(notification)

    db.commit()
    db.refresh(ticket)

    return ticket


@router.post(
    "/{ticket_id}/rating",
    response_model=TicketResponse,
)
def rate_ticket(
    ticket_id: int,
    rating_data: TicketRatingCreate,
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

    # Only the employee who created the ticket
    # can submit its rating.
    if current_user.role_id != 1:
        raise HTTPException(
            status_code=403,
            detail=(
                "Only employees can rate "
                "support tickets"
            ),
        )

    if ticket.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail=(
                "You can only rate "
                "your own tickets"
            ),
        )

    # Rating is available only after the ticket
    # has been resolved or closed.
    if ticket.status not in [
        "RESOLVED",
        "CLOSED",
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "You can only rate a ticket "
                "after it has been resolved"
            ),
        )

    # Prevent submitting a second rating.
    if ticket.rating is not None:
        raise HTTPException(
            status_code=400,
            detail="This ticket has already been rated",
        )

    ticket.rating = rating_data.rating

    ticket.feedback = (
        rating_data.feedback.strip()
        if rating_data.feedback is not None
        else None
    )

    db.commit()
    db.refresh(ticket)

    return ticket