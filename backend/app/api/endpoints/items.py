from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

# --- Helper Dependency for Item Access ---
async def get_item_and_check_access(
    item_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> models.Item:
    """Dependency to fetch an item and verify user access via its list membership."""
    db_item = crud.get_item(db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    # Check access to the list this item belongs to
    if not crud.check_user_list_access(db, list_id=db_item.category.list_id, user_id=current_user.id):
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this item's list")
    return db_item

# --- Item Routes ---

@router.post("/", response_model=schemas.Item, status_code=status.HTTP_201_CREATED)
def create_item(
    item_in: schemas.ItemCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Create a new item. User must have access to the list containing the item's category.
    """
    # Check if category exists first
    db_category = crud.get_category(db, item_in.category_id)
    if not db_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Category with id {item_in.category_id} not found")

    # Check user access to the list the category belongs to
    if not crud.check_user_list_access(db, list_id=db_category.list_id, user_id=current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add items to this list")

    try:
        # Creator ID is passed from current_user
        return crud.create_item(db=db, item_data=item_in, user_id=current_user.id)
    except ValueError as e: # Should not happen if category check passed, but safety
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/", response_model=schemas.ItemListResponse)
def read_items(
    list_id: Optional[int] = None, # Allow filtering by list_id
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Retrieve items. Requires `list_id` query parameter.
    User must have access to the specified list.
    """
    if list_id is None:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query parameter 'list_id' is required.")

    # Check user access to the list
    if not crud.check_user_list_access(db, list_id=list_id, user_id=current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this list's items")

    items = crud.get_items_for_list(db, list_id=list_id)
    return {"items": items}


@router.get("/{item_id}", response_model=schemas.Item)
async def read_item(
    item: models.Item = Depends(get_item_and_check_access) # Use dependency
):
    """
    Retrieve a specific item by ID. Access checked via dependency.
    """
    return item


@router.put("/{item_id}", response_model=schemas.Item)
async def update_item(
    item_update: schemas.ItemUpdate,
    item: models.Item = Depends(get_item_and_check_access), # Use dependency
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user) # Needed for updater ID
):
    """
    Update an item. Access checked via dependency.
    """
    try:
        updated_item = crud.update_item(
            db=db,
            db_item=item,
            item_update=item_update,
            user_id=current_user.id # Pass updater ID
        )
        return updated_item
    except ValueError as e: # Catches category not found or list mismatch
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item: models.Item = Depends(get_item_and_check_access), # Use dependency
    db: Session = Depends(deps.get_db)
):
    """
    Delete an item. Access checked via dependency.
    """
    crud.delete_item(db=db, db_item=item)
    return None # 204 response
