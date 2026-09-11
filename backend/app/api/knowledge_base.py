from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.knowledge_base import KnowledgeBaseArticle
from app.models.category import Category
from app.models.user import User
from app.schemas.knowledge_base import (
    KnowledgeBaseArticleCreate,
    KnowledgeBaseArticleUpdate,
    KnowledgeBaseArticleResponse,
)


router = APIRouter(
    prefix="/api/knowledge-base",
    tags=["Knowledge Base"],
)


def get_article_or_404(
    article_id: int,
    db: Session,
) -> KnowledgeBaseArticle:
    article = (
        db.query(KnowledgeBaseArticle)
        .filter(
            KnowledgeBaseArticle.id == article_id
        )
        .first()
    )

    if not article:
        raise HTTPException(
            status_code=404,
            detail="Knowledge Base article not found",
        )

    return article


def validate_category(
    category_id: int | None,
    db: Session,
):
    if category_id is None:
        return

    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.is_active == True,
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found or inactive",
        )


@router.post(
    "",
    response_model=KnowledgeBaseArticleResponse,
)
def create_article(
    article_data: KnowledgeBaseArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role_id != 3:
        raise HTTPException(
            status_code=403,
            detail=(
                "Only administrators can "
                "create Knowledge Base articles"
            ),
        )

    validate_category(
        article_data.category_id,
        db,
    )

    article = KnowledgeBaseArticle(
        title=article_data.title,
        content=article_data.content,
        category_id=article_data.category_id,
        created_by=current_user.id,
        is_published=article_data.is_published,
    )

    db.add(article)
    db.commit()
    db.refresh(article)

    return article


@router.get(
    "",
    response_model=list[KnowledgeBaseArticleResponse],
)
def get_articles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(KnowledgeBaseArticle)

    if current_user.role_id == 3:
        return (
            query
            .order_by(
                KnowledgeBaseArticle.id.desc()
            )
            .all()
        )

    return (
        query
        .filter(
            KnowledgeBaseArticle.is_published == True
        )
        .order_by(
            KnowledgeBaseArticle.id.desc()
        )
        .all()
    )


@router.get(
    "/{article_id}",
    response_model=KnowledgeBaseArticleResponse,
)
def get_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = get_article_or_404(
        article_id,
        db,
    )

    if (
        current_user.role_id != 3
        and not article.is_published
    ):
        raise HTTPException(
            status_code=404,
            detail="Knowledge Base article not found",
        )

    return article


@router.put(
    "/{article_id}",
    response_model=KnowledgeBaseArticleResponse,
)
def update_article(
    article_id: int,
    article_data: KnowledgeBaseArticleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role_id != 3:
        raise HTTPException(
            status_code=403,
            detail=(
                "Only administrators can "
                "update Knowledge Base articles"
            ),
        )

    article = get_article_or_404(
        article_id,
        db,
    )

    if article_data.title is not None:
        article.title = article_data.title

    if article_data.content is not None:
        article.content = article_data.content

    if article_data.category_id is not None:
        validate_category(
            article_data.category_id,
            db,
        )

        article.category_id = (
            article_data.category_id
        )

    if article_data.is_published is not None:
        article.is_published = (
            article_data.is_published
        )

    db.commit()
    db.refresh(article)

    return article


@router.patch(
    "/{article_id}/publish",
    response_model=KnowledgeBaseArticleResponse,
)
def update_article_publish_status(
    article_id: int,
    is_published: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role_id != 3:
        raise HTTPException(
            status_code=403,
            detail=(
                "Only administrators can "
                "publish or unpublish articles"
            ),
        )

    article = get_article_or_404(
        article_id,
        db,
    )

    article.is_published = is_published

    db.commit()
    db.refresh(article)

    return article


@router.delete(
    "/{article_id}",
)
def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role_id != 3:
        raise HTTPException(
            status_code=403,
            detail=(
                "Only administrators can "
                "delete Knowledge Base articles"
            ),
        )

    article = get_article_or_404(
        article_id,
        db,
    )

    db.delete(article)
    db.commit()

    return {
        "message": "Knowledge Base article deleted successfully"
    }