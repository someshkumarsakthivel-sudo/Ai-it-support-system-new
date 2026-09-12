from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Identity,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AIAnalysisKnowledgeBase(Base):
    __tablename__ = "ai_analysis_knowledge_base"

    id: Mapped[int] = mapped_column(
        BigInteger,
        Identity(),
        primary_key=True,
    )

    ai_analysis_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "ai_analyses.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    knowledge_base_article_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "knowledge_base_articles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )