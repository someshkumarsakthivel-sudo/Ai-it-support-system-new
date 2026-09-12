from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.models.sla_policy import SLAPolicy


router = APIRouter(
    prefix="/api/sla-policies",
    tags=["SLA Policies"],
)


@router.get("")
def get_sla_policies(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("EMPLOYEE", "ENGINEER", "ADMIN")
    ),
):
    """
    Get SLA policies.

    Employees and engineers can see active policies.
    Admins can see all policies.
    """

    query = db.query(SLAPolicy)

    if current_user.role_id != 3:
        query = query.filter(
            SLAPolicy.is_active == True
        )

    return (
        query
        .order_by(SLAPolicy.priority)
        .all()
    )


@router.get("/{sla_id}")
def get_sla_policy(
    sla_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("EMPLOYEE", "ENGINEER", "ADMIN")
    ),
):
    """
    Get a single SLA policy.
    """

    policy = (
        db.query(SLAPolicy)
        .filter(SLAPolicy.id == sla_id)
        .first()
    )

    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA policy not found",
        )

    if (
        current_user.role_id != 3
        and not policy.is_active
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA policy not found",
        )

    return policy


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def create_sla_policy(
    priority: str,
    response_time_minutes: int,
    resolution_time_minutes: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    ),
):
    """
    Create a new SLA policy.

    Admin only.
    """

    priority = priority.upper().strip()

    allowed_priorities = {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

    if priority not in allowed_priorities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Priority must be one of "
                "LOW, MEDIUM, HIGH, CRITICAL"
            ),
        )

    if response_time_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Response time must be greater than 0"
            ),
        )

    if resolution_time_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Resolution time must be greater than 0"
            ),
        )

    existing_policy = (
        db.query(SLAPolicy)
        .filter(
            SLAPolicy.priority == priority
        )
        .first()
    )

    if existing_policy:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"SLA policy for {priority} "
                "priority already exists"
            ),
        )

    policy = SLAPolicy(
        priority=priority,
        response_time_minutes=response_time_minutes,
        resolution_time_minutes=resolution_time_minutes,
        is_active=True,
    )

    db.add(policy)
    db.commit()
    db.refresh(policy)

    return policy


@router.put("/{sla_id}")
def update_sla_policy(
    sla_id: int,
    priority: str,
    response_time_minutes: int,
    resolution_time_minutes: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    ),
):
    """
    Update an existing SLA policy.

    Admin only.
    """

    policy = (
        db.query(SLAPolicy)
        .filter(SLAPolicy.id == sla_id)
        .first()
    )

    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA policy not found",
        )

    priority = priority.upper().strip()

    allowed_priorities = {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

    if priority not in allowed_priorities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Priority must be one of "
                "LOW, MEDIUM, HIGH, CRITICAL"
            ),
        )

    if response_time_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Response time must be greater than 0"
            ),
        )

    if resolution_time_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Resolution time must be greater than 0"
            ),
        )

    duplicate_policy = (
        db.query(SLAPolicy)
        .filter(
            SLAPolicy.priority == priority,
            SLAPolicy.id != sla_id,
        )
        .first()
    )

    if duplicate_policy:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"SLA policy for {priority} "
                "priority already exists"
            ),
        )

    policy.priority = priority
    policy.response_time_minutes = (
        response_time_minutes
    )
    policy.resolution_time_minutes = (
        resolution_time_minutes
    )

    db.commit()
    db.refresh(policy)

    return policy


@router.patch("/{sla_id}/status")
def update_sla_policy_status(
    sla_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    ),
):
    """
    Activate or deactivate an SLA policy.

    Admin only.
    """

    policy = (
        db.query(SLAPolicy)
        .filter(SLAPolicy.id == sla_id)
        .first()
    )

    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA policy not found",
        )

    policy.is_active = is_active

    db.commit()
    db.refresh(policy)

    return policy


@router.delete("/{sla_id}")
def delete_sla_policy(
    sla_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    ),
):
    """
    Delete an SLA policy.

    Admin only.
    """

    policy = (
        db.query(SLAPolicy)
        .filter(SLAPolicy.id == sla_id)
        .first()
    )

    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA policy not found",
        )

    db.delete(policy)
    db.commit()

    return {
        "message": "SLA policy deleted successfully"
    }