from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

# --- Helper Dependency for List Access ---
def get_shopping_list_for_check_access(
    list_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> int:
    """Dependency to get list and verify user access."""
    if not crud.check_user_list_access(db=db, list_id=list_id, user_id=current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this list")
    db_list = crud.get_list(db, list_id=list_id) # Fetch list object if needed later, or just return list_id
    if db_list is None: # Should not happen if check_user_list_access passed, but safety check
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    # return db_list # Return the list object if needed by the endpoint
    return list_id # Or just return the validated list_id


# --- Category Routes (Now require list_id) ---

@router.post("/", response_model=schemas.Category, status_code=status.HTTP_201_CREATED)
def create_category_for_list(
    category_in: schemas.CategoryCreate,
    list_id: int = Depends(get_shopping_list_for_check_access), # Use dependency for access check
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user) # Needed for creator ID
):
    """
    Create a new category within the specified list. User must be a member.
    """
    try:
        return crud.create_category(
            db=db,
            category_data=category_in,
            list_id=list_id,
            user_id=current_user.id
        )
    except ValueError as e: # Catches unique name error from CRUD
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=schemas.CategoryListResponse)
def read_categories_for_list(
    list_id: int = Depends(get_shopping_list_for_check_access), # Use dependency
    db: Session = Depends(deps.get_db)
    # current_user: models.User = Depends(deps.get_current_user) # Not needed if dependency handles access
):
    """
    Retrieve all categories for a specific list. User must be a member.
    """
    categories = crud.get_categories_for_list(db, list_id=list_id)
    return {"categories": categories}

@router.get("/{category_id}", response_model=schemas.Category)
def read_category(
    category_id: int,
    list_id: int = Depends(get_shopping_list_for_check_access), # Ensure user can access parent list
    db: Session = Depends(deps.get_db)
    # current_user: models.User = Depends(deps.get_current_user) # Not needed
):
    """
    Retrieve a specific category by ID. User must have access to the list it belongs to.
    """
    db_category = crud.get_category(db, category_id=category_id)
    if db_category is None or db_category.list_id != list_id:
        raise HTTPException(status_code=404, detail="Category not found in this list")
    return db_category

@router.put("/{category_id}", response_model=schemas.Category)
def update_category(
    category_id: int,
    category_in: schemas.CategoryUpdate,
    list_id: int = Depends(get_shopping_list_for_check_access), # Check access to list
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user) # Needed for updater ID
):
    """
    Update a category's name. User must have access to the list.
    """
    db_category = crud.get_category(db, category_id=category_id)
    if db_category is None or db_category.list_id != list_id:
        raise HTTPException(status_code=404, detail="Category not found in this list")
    try:
        return crud.update_category(
            db=db,
            db_category=db_category,
            category_update=category_in,
            user_id=current_user.id
        )
    except ValueError as e: # Catches unique name error
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    list_id: int = Depends(get_shopping_list_for_check_access), # Check access to list
    db: Session = Depends(deps.get_db)
    # current_user: models.User = Depends(deps.get_current_user) # Not strictly needed for delete access check
):
    """
    Delete a category if it's empty. User must have access to the list.
    """
    db_category = crud.get_category(db, category_id=category_id)
    if db_category is None or db_category.list_id != list_id:
        raise HTTPException(status_code=404, detail="Category not found in this list")
    try:
        crud.delete_category(db, db_category=db_category)
        return None # 204 response
    except ValueError as e: # Catches "cannot delete with items" error
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
