
from datetime import datetime

from pydantic import BaseModel


class AttachmentResponse(BaseModel):
    id: int
    ticket_id: int
    uploaded_by: int
    file_name: str
    file_path: str
    file_type: str | None
    file_size: int | None
    created_at: datetime

    class Config:
        from_attributes = True