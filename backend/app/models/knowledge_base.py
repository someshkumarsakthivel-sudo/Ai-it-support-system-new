from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class KnowledgeBaseArticle(Base):
    __tablename__ = "knowledge_base_articles"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id"),
        nullable=True
    )

    created_by: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False
    )

    is_published: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )