from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.attachment import Attachment
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.attachment import AttachmentResponse


router = APIRouter(
    prefix="/api/tickets",
    tags=["Attachments"]
)


UPLOAD_DIR = Path("uploads")
MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".txt",
    ".csv",
    ".docx",
}


def check_ticket_access(
    ticket: Ticket,
    current_user: User
):
    """
    Check whether the authenticated user can
    access attachments for this ticket.
    """

    # Admin can access every ticket.
    if current_user.role_id == 3:
        return

    # Employee can access only their own tickets.
    if current_user.role_id == 1:
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Employees can only access attachments "
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
                    "Engineers can only access attachments "
                    "on tickets assigned to them"
                )
            )
        return

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to access this ticket"
    )


@router.post(
    "/{ticket_id}/attachments",
    response_model=AttachmentResponse
)
async def upload_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check whether the ticket exists.
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    # Check whether the user can access this ticket.
    check_ticket_access(
        ticket,
        current_user
    )

    # Check file extension.
    original_filename = file.filename or ""
    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "File type not allowed. "
                "Allowed types: PDF, PNG, JPG, JPEG, TXT, CSV, DOCX"
            )
        )

    # Make sure the upload directory exists.
    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    # Generate a unique server-side filename.
    stored_filename = f"{uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / stored_filename

    total_size = 0

    try:
        with file_path.open("wb") as output_file:
            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    output_file.close()

                    if file_path.exists():
                        file_path.unlink()

                    raise HTTPException(
                        status_code=400,
                        detail="File size cannot exceed 10 MB"
                    )

                output_file.write(chunk)

    except HTTPException:
        raise

    except Exception:
        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded file"
        )

    finally:
        await file.close()

    new_attachment = Attachment(
        ticket_id=ticket_id,
        uploaded_by=current_user.id,
        file_name=original_filename,
        file_path=str(file_path),
        file_type=file.content_type,
        file_size=total_size
    )

    db.add(new_attachment)
    db.commit()
    db.refresh(new_attachment)

    return new_attachment


@router.get(
    "/{ticket_id}/attachments",
    response_model=list[AttachmentResponse]
)
def get_ticket_attachments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check whether the ticket exists.
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    # Check whether the user can access this ticket.
    check_ticket_access(
        ticket,
        current_user
    )

    attachments = (
        db.query(Attachment)
        .filter(
            Attachment.ticket_id == ticket_id
        )
        .order_by(
            Attachment.created_at.asc()
        )
        .all()
    )

    return attachments


@router.get(
    "/{ticket_id}/attachments/{attachment_id}/download"
)
def download_attachment(
    ticket_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check whether the ticket exists.
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    # Check whether the user can access this ticket.
    check_ticket_access(
        ticket,
        current_user
    )

    # Find the attachment belonging to this ticket.
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.ticket_id == ticket_id
    ).first()

    if not attachment:
        raise HTTPException(
            status_code=404,
            detail="Attachment not found"
        )

    # Convert the stored path into a Path object.
    file_path = Path(attachment.file_path)

    # Make sure the physical file still exists.
    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Attachment file not found on server"
        )

    # Return the file to the authenticated user.
    return FileResponse(
        path=file_path,
        filename=attachment.file_name,
        media_type=attachment.file_type or "application/octet-stream"
    )