from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.post("/", response_model=schemas.Category, status_code=status.HTTP_201_CREATED)
def create_category(
    category: schemas.CategoryCreate,
    db: Session = Depends(deps.get_db)
):
    db_category = crud.get_category_by_name(db, name=category.name)
    if db_category:
        raise HTTPException(status_code=400, detail=f"Category '{category.name}' already exists")
    return crud.create_category(db=db, category=category)

@router.get("/", response_model=schemas.CategoryList)
def read_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db)
):
    categories = crud.get_categories(db, skip=skip, limit=limit)
    return {"categories": categories}

@router.get("/{category_id}", response_model=schemas.Category)
def read_category(
    category_id: int,
    db: Session = Depends(deps.get_db)
):
    db_category = crud.get_category(db, category_id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category

@router.put("/{category_id}", response_model=schemas.Category)
def update_category(
    category_id: int,
    category: schemas.CategoryUpdate,
    db: Session = Depends(deps.get_db)
):
    db_category = crud.get_category(db, category_id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.name and category.name != db_category.name:
         existing_category = crud.get_category_by_name(db, name=category.name)
         if existing_category:
             raise HTTPException(status_code=400, detail=f"Category name '{category.name}' already exists")
    updated_category = crud.update_category(db, category_id=category_id, category_update=category)
    return updated_category


@router.delete("/{category_id}", response_model=schemas.Category)
def delete_category(
    category_id: int,
    db: Session = Depends(deps.get_db)
):
    db_category = crud.get_category(db, category_id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    if db_category.items:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail="Cannot delete category: it has associated items. Delete items first or reassign them."
         )
    deleted_category = crud.delete_category(db, category_id=category_id)
    if deleted_category is None:
         raise HTTPException(status_code=404, detail="Category not found")
    return deleted_category
