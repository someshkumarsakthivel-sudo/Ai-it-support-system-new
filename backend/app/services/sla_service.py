from datetime import datetime

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.ticket import Ticket


TERMINAL_STATUSES = {
    "RESOLVED",
    "CLOSED",
    "CANCELLED",
}


def create_sla_notification(
    db: Session,
    ticket: Ticket,
    notification_type: str,
    title: str,
    message: str,
    now: datetime,
) -> int:
    """
    Create SLA breach notifications for the ticket creator
    and assigned engineer.

    Returns:
        Number of notifications created.
    """

    existing_notification = (
        db.query(Notification)
        .filter(
            Notification.ticket_id == ticket.id,
            Notification.type == notification_type,
        )
        .first()
    )

    if existing_notification:
        return 0

    recipients = []

    if ticket.assigned_to:
        recipients.append(ticket.assigned_to)

    if ticket.created_by:
        recipients.append(ticket.created_by)

    notifications_created = 0

    for user_id in set(recipients):
        notification = Notification(
            user_id=user_id,
            ticket_id=ticket.id,
            type=notification_type,
            title=title,
            message=message,
            is_read=False,
            created_at=now,
            read_at=None,
        )

        db.add(notification)
        notifications_created += 1

    return notifications_created


def check_sla_breaches(db: Session) -> int:
    """
    Check active tickets for response and resolution SLA breaches.

    A response SLA breach occurs when:
        - The ticket is not in a terminal status.
        - The response deadline exists.
        - The response SLA has not been met.
        - The current time is past the response deadline.

    A resolution SLA breach occurs when:
        - The ticket is not in a terminal status.
        - The resolution deadline exists.
        - The resolution SLA has not been met.
        - The current time is past the resolution deadline.

    Returns:
        Number of new SLA breach notifications created.
    """

    now = datetime.now()
    notifications_created = 0

    tickets = (
        db.query(Ticket)
        .filter(
            ~Ticket.status.in_(TERMINAL_STATUSES)
        )
        .all()
    )

    for ticket in tickets:

        # --------------------------------------------------
        # Response SLA
        # --------------------------------------------------

        response_breached = (
            ticket.sla_response_deadline is not None
            and ticket.sla_response_met is not True
            and now > ticket.sla_response_deadline
        )

        if response_breached:
            notifications_created += create_sla_notification(
                db=db,
                ticket=ticket,
                notification_type="SLA_RESPONSE_BREACH",
                title="Response SLA Breached",
                message=(
                    f"Ticket {ticket.ticket_number} has exceeded "
                    "its response SLA deadline."
                ),
                now=now,
            )

        # --------------------------------------------------
        # Resolution SLA
        # --------------------------------------------------

        resolution_breached = (
            ticket.sla_resolution_deadline is not None
            and ticket.sla_resolution_met is not True
            and now > ticket.sla_resolution_deadline
        )

        if resolution_breached:
            notifications_created += create_sla_notification(
                db=db,
                ticket=ticket,
                notification_type="SLA_RESOLUTION_BREACH",
                title="Resolution SLA Breached",
                message=(
                    f"Ticket {ticket.ticket_number} has exceeded "
                    "its resolution SLA deadline."
                ),
                now=now,
            )

    if notifications_created > 0:
        db.commit()

    return notifications_created