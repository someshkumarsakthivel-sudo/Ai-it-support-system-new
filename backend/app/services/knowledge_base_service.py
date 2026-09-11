from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.knowledge_base import KnowledgeBaseArticle


def search_knowledge_base(
    title: str,
    description: str,
    db: Session,
    limit: int = 5,
) -> list[KnowledgeBaseArticle]:
    """
    Find published Knowledge Base articles that may be relevant
    to an IT support ticket.

    The search uses simple PostgreSQL text matching across article
    title and content. This is intentionally lightweight and will
    later be replaceable with embeddings/vector search for RAG.
    """

    search_text = f"{title} {description}".strip()

    if not search_text:
        return []

    words = [
        word.strip(".,!?;:()[]{}\"'")
        for word in search_text.lower().split()
    ]

    words = [
        word
        for word in words
        if len(word) >= 3
    ]

    if not words:
        return []

    filters = []

    for word in words:
        pattern = f"%{word}%"

        filters.append(
            or_(
                KnowledgeBaseArticle.title.ilike(pattern),
                KnowledgeBaseArticle.content.ilike(pattern),
            )
        )

    query = (
        db.query(KnowledgeBaseArticle)
        .filter(
            KnowledgeBaseArticle.is_published == True
        )
        .filter(
            or_(*filters)
        )
        .order_by(
            KnowledgeBaseArticle.id.desc()
        )
    )

    return query.limit(limit).all()