from datetime import datetime

from pydantic import BaseModel, Field


class KnowledgeBaseArticleCreate(BaseModel):
    title: str = Field(
        ...,
        min_length=3,
        max_length=255
    )

    content: str = Field(
        ...,
        min_length=10
    )

    category_id: int | None = None

    is_published: bool = True


class KnowledgeBaseArticleUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=3,
        max_length=255
    )

    content: str | None = Field(
        default=None,
        min_length=10
    )

    category_id: int | None = None

    is_published: bool | None = None


class KnowledgeBaseArticleResponse(BaseModel):
    id: int
    title: str
    content: str
    category_id: int | None
    created_by: int
    is_published: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True