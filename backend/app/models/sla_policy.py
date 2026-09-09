from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SLAPolicy(Base):
    __tablename__ = "sla_policies"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    priority: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False
    )

    response_time_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    resolution_time_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )