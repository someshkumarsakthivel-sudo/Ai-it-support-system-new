from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models.team import Team
from app.schemas.team import (
    TeamCreate,
    TeamResponse,
    TeamUpdate
)


router = APIRouter(
    prefix="/api/teams",
    tags=["Teams"]
)


@router.post("", response_model=TeamResponse)
def create_team(
    team_data: TeamCreate,
    db: Session = Depends(get_db)
):
    existing_team = db.query(Team).filter(
        Team.name == team_data.name
    ).first()

    if existing_team:
        raise HTTPException(
            status_code=400,
            detail="Team already exists"
        )

    new_team = Team(
        name=team_data.name,
        description=team_data.description
    )

    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    return new_team


@router.get("", response_model=list[TeamResponse])
def get_teams(
    db: Session = Depends(get_db)
):
    teams = db.query(Team).all()

    return teams


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: int,
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(
        Team.id == team_id
    ).first()

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Team not found"
        )

    return team


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: int,
    team_data: TeamUpdate,
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(
        Team.id == team_id
    ).first()

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Team not found"
        )

    if team_data.name is not None:
        existing_team = db.query(Team).filter(
            Team.name == team_data.name,
            Team.id != team_id
        ).first()

        if existing_team:
            raise HTTPException(
                status_code=400,
                detail="Team already exists"
            )

        team.name = team_data.name

    if team_data.description is not None:
        team.description = team_data.description

    db.commit()
    db.refresh(team)

    return team


@router.delete("/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(
        Team.id == team_id
    ).first()

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Team not found"
        )

    db.delete(team)
    db.commit()

    return {
        "message": "Team deleted successfully"
    }