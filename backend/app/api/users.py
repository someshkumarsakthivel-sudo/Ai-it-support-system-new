from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserUpdate,
)


router = APIRouter(
    prefix="/api/users",
    tags=["Users"],
)


@router.post("", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    ),
):
    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(
            user_data.password
        ),
        role_id=user_data.role_id,
        team_id=user_data.team_id,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get(
    "",
    response_model=list[UserResponse],
)
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    ),
):
    users = (
        db.query(User)
        .order_by(User.id.asc())
        .all()
    )

    return users


@router.get(
    "/{user_id}",
    response_model=UserResponse,
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    ),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user


@router.put(
    "/{user_id}",
    response_model=UserResponse,
)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    ),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if user_data.name is not None:
        user.name = user_data.name

    if user_data.email is not None:
        existing_user = (
            db.query(User)
            .filter(
                User.email == user_data.email,
                User.id != user_id,
            )
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered",
            )

        user.email = user_data.email

    if user_data.password:
        user.password_hash = hash_password(
            user_data.password
        )

    if user_data.role_id is not None:
        user.role_id = user_data.role_id

    # team_id can be:
    # 5    -> assign user to team 5
    # null -> remove user from team
    if "team_id" in user_data.model_fields_set:
        user.team_id = user_data.team_id

    db.commit()
    db.refresh(user)

    return user


@router.patch(
    "/{user_id}/status",
    response_model=UserResponse,
)
def update_user_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    ),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    user.is_active = is_active

    db.commit()
    db.refresh(user)

    return user


@router.delete(
    "/{user_id}",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    ),
):
    # Prevent the currently logged-in administrator
    # from accidentally deleting their own account.
    if (
        current_user.id == user_id
    ):
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account.",
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Check every table that has a foreign-key
    # reference to users.id.
    relationship_checks = [
        (
            "attachments",
            "uploaded_by",
            "uploaded attachments",
        ),
        (
            "audit_logs",
            "user_id",
            "audit log records",
        ),
        (
            "knowledge_base_articles",
            "created_by",
            "knowledge base articles",
        ),
        (
            "notifications",
            "user_id",
            "notifications",
        ),
        (
            "ticket_comments",
            "user_id",
            "ticket comments",
        ),
        (
            "tickets",
            "assigned_to",
            "assigned tickets",
        ),
        (
            "tickets",
            "created_by",
            "created tickets",
        ),
    ]

    related_records = []

    for table_name, column_name, description in relationship_checks:
        query = text(
            f"""
            SELECT EXISTS (
                SELECT 1
                FROM "{table_name}"
                WHERE "{column_name}" = :user_id
            )
            """
        )

        result = db.execute(
            query,
            {"user_id": user_id},
        ).scalar()

        if result:
            related_records.append(description)

    if related_records:
        related_text = ", ".join(
            related_records
        )

        raise HTTPException(
            status_code=400,
            detail=(
                f'User "{user.name}" cannot be deleted because '
                f"the account has related records: "
                f"{related_text}. "
                f"Set the user to Inactive instead of deleting "
                f"the account."
            ),
        )

    # The user has no dependent records, so it is
    # safe to remove the account.
    db.delete(user)
    db.commit()

    return {
        "message": (
            f'User "{user.name}" deleted successfully'
        )
    }