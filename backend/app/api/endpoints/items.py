from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.post("/", response_model=schemas.Item, status_code=status.HTTP_201_CREATED)
def create_item(
    item: schemas.ItemCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    try:
        return crud.create_item(db=db, item=item, owner_id=current_user.id)
    except ValueError as e:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/", response_model=schemas.ItemList)
def read_items(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    items = crud.get_items(db, owner_id=current_user.id, skip=skip, limit=limit)
    return {"items": items}

@router.get("/{item_id}", response_model=schemas.Item)
def read_item(
    item_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    db_item = crud.get_item(db, item_id=item_id, owner_id=current_user.id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return db_item

@router.put("/{item_id}", response_model=schemas.Item)
def update_item(
    item_id: int,
    item: schemas.ItemUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    db_item = crud.get_item(db, item_id=item_id, owner_id=current_user.id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    try:
        updated_item = crud.update_item(
            db=db, 
            item_id=item_id, 
            item_update=item,
            owner_id=current_user.id
        )
        return updated_item
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{item_id}", response_model=schemas.Item)
def delete_item(
    item_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    deleted_item = crud.delete_item(db=db, item_id=item_id, owner_id=current_user.id)
    if deleted_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return deleted_item
