from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models.category import Category
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)

router = APIRouter(
    prefix="/api/categories",
    tags=["Categories"],
)


@router.post("", response_model=CategoryResponse)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
):
    existing_category = (
        db.query(Category)
        .filter(Category.name == category_data.name)
        .first()
    )

    if existing_category:
        raise HTTPException(
            status_code=400,
            detail="Category already exists",
        )

    if category_data.parent_id is not None:
        parent_category = (
            db.query(Category)
            .filter(Category.id == category_data.parent_id)
            .first()
        )

        if not parent_category:
            raise HTTPException(
                status_code=404,
                detail="Parent category not found",
            )

    new_category = Category(
        name=category_data.name,
        description=category_data.description,
        parent_id=category_data.parent_id,
        is_active=(
            category_data.is_active
            if category_data.is_active is not None
            else True
        ),
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category


@router.get("", response_model=list[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
):
    categories = (
        db.query(Category)
        .order_by(Category.id)
        .all()
    )

    return categories


@router.get(
    "/{category_id}",
    response_model=CategoryResponse,
)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id)
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    return category


@router.put(
    "/{category_id}",
    response_model=CategoryResponse,
)
def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id)
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    if category_data.name is not None:
        existing_category = (
            db.query(Category)
            .filter(
                Category.name == category_data.name,
                Category.id != category_id,
            )
            .first()
        )

        if existing_category:
            raise HTTPException(
                status_code=400,
                detail="Category already exists",
            )

        category.name = category_data.name

    if category_data.description is not None:
        category.description = (
            category_data.description
        )

    if category_data.parent_id is not None:
        if (
            category_data.parent_id
            == category_id
        ):
            raise HTTPException(
                status_code=400,
                detail="Category cannot be its own parent",
            )

        parent_category = (
            db.query(Category)
            .filter(
                Category.id
                == category_data.parent_id
            )
            .first()
        )

        if not parent_category:
            raise HTTPException(
                status_code=404,
                detail="Parent category not found",
            )

        category.parent_id = (
            category_data.parent_id
        )

    # IMPORTANT:
    # Update Active / Inactive status.
    if category_data.is_active is not None:
        category.is_active = (
            category_data.is_active
        )

    db.commit()
    db.refresh(category)

    return category


@router.delete(
    "/{category_id}",
)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id)
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    child_category = (
        db.query(Category)
        .filter(
            Category.parent_id
            == category_id
        )
        .first()
    )

    if child_category:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category with child categories",
        )

    db.delete(category)
    db.commit()

    return {
        "message": "Category deleted successfully",
    }