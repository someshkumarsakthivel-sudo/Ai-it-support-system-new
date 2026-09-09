from datetime import datetime

from pydantic import BaseModel, Field


class TicketCommentCreate(BaseModel):
    comment: str = Field(
        ...,
        min_length=1,
        max_length=5000
    )

    is_internal: bool = False


class TicketCommentResponse(BaseModel):
    id: int
    ticket_id: int
    user_id: int
    comment: str
    is_internal: bool
    created_at: datetime

    class Config:
        from_attributes = True