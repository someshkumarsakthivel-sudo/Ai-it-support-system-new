from datetime import datetime

from pydantic import BaseModel, Field


class TicketCreate(BaseModel):

    title: str = Field(
        ...,
        min_length=3,
        max_length=255
    )

    description: str = Field(
        ...,
        min_length=5
    )

    category_id: int | None = None

    priority: str = "MEDIUM"


class TicketUpdate(BaseModel):

    title: str | None = Field(
        default=None,
        min_length=3,
        max_length=255
    )

    description: str | None = Field(
        default=None,
        min_length=5
    )

    category_id: int | None = None

    priority: str | None = None


class TicketStatusUpdate(BaseModel):

    status: str


class TicketAssignmentUpdate(BaseModel):

    assigned_to: int | None = None

    team_id: int | None = None


class TicketRatingCreate(BaseModel):

    rating: int = Field(
        ...,
        ge=1,
        le=5
    )

    feedback: str | None = Field(
        default=None,
        max_length=2000
    )


class TicketResponse(BaseModel):

    id: int

    ticket_number: str

    title: str

    description: str

    created_by: int

    assigned_to: int | None

    team_id: int | None

    category_id: int | None

    priority: str

    status: str

    created_at: datetime

    updated_at: datetime

    resolved_at: datetime | None

    closed_at: datetime | None

    rating: int | None

    feedback: str | None

    sla_response_deadline: datetime | None

    sla_resolution_deadline: datetime | None

    sla_response_met: bool | None

    sla_resolution_met: bool | None

    class Config:

        from_attributes = True