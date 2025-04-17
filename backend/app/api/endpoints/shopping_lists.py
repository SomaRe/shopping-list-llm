from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

# --- List Management ---

@router.post("/", response_model=schemas.List, status_code=status.HTTP_201_CREATED)
def create_list(
    list_in: schemas.ListCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Create a new shopping list. The creator is automatically the owner and a member.
    Optionally provide `share_with_usernames` to add other members initially.
    """
    # Validate usernames if provided
    if list_in.share_with_usernames:
        users_to_share = crud.get_users_by_usernames(db, list_in.share_with_usernames)
        found_usernames = {u.username for u in users_to_share}
        missing_usernames = set(list_in.share_with_usernames) - found_usernames
        if missing_usernames:
             raise HTTPException(
                 status_code=status.HTTP_404_NOT_FOUND,
                 detail=f"Users not found: {', '.join(missing_usernames)}"
             )
        # Prevent sharing with self explicitly if needed, though create_list handles it
        if current_user.username in list_in.share_with_usernames:
            list_in.share_with_usernames.remove(current_user.username)

    return crud.create_list(db=db, list_data=list_in, owner_id=current_user.id)

@router.get("/", response_model=List[schemas.List])
def read_lists(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Retrieve all lists the current user is a member of.
    """
    return crud.get_lists_for_user(db=db, user_id=current_user.id)

@router.get("/{list_id}", response_model=schemas.List)
def read_list(
    list_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Retrieve a specific list by ID, if the user has access.
    """
    if not crud.check_user_list_access(db=db, list_id=list_id, user_id=current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this list")
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    return db_list

@router.put("/{list_id}", response_model=schemas.List)
def update_list(
    list_id: int,
    list_in: schemas.ListUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Update a list's details (name, type). Only the list owner can update.
    """
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    if db_list.owner_id != current_user.id:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the list owner can update the list")

    # Prevent changing type from shared to private if there are other members? (Optional check)
    # if list_in.list_type == 'private' and db_list.list_type == 'shared':
    #     member_count = db.query(models.ListMember).filter(models.ListMember.list_id == list_id).count()
    #     if member_count > 1:
    #         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change list to private when other members exist.")

    return crud.update_list(db=db, db_list=db_list, list_update=list_in)


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Delete a list. Only the list owner can delete.
    This will cascade delete all categories and items within the list.
    """
    db_list = crud.get_list(db, list_id=list_id) # Fetch to check ownership
    if db_list is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    if db_list.owner_id != current_user.id:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the list owner can delete the list")
    crud.delete_list(db=db, db_list=db_list)
    return None # Return 204


# --- List Membership Management ---

class MemberRequest(BaseModel):
    username: str

@router.post("/{list_id}/members", response_model=schemas.ListMemberInfo, status_code=status.HTTP_201_CREATED)
def add_list_member(
    list_id: int,
    member_request: MemberRequest,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Add a user as a member to a list. Only the list owner can add members.
    """
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    if db_list.owner_id != current_user.id:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the list owner can add members")

    user_to_add = crud.get_user_by_username(db, username=member_request.username)
    if not user_to_add:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{member_request.username}' not found")

    member = crud.add_list_member(db=db, db_list=db_list, user_id=user_to_add.id)
    if member is None:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User '{member_request.username}' is already a member of this list")

    return member # Return member info

@router.delete("/{list_id}/members/{user_id_to_remove}", status_code=status.HTTP_204_NO_CONTENT)
def remove_list_member(
    list_id: int,
    user_id_to_remove: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Remove a member from a list. Only the list owner can remove members.
    The owner cannot remove themselves.
    """
    db_list = crud.get_list(db, list_id=list_id) # Fetch to check ownership
    if db_list is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    if db_list.owner_id != current_user.id:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the list owner can remove members")

    if db_list.owner_id == user_id_to_remove:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the list owner")

    user_to_remove_exists = crud.get_user(db, user_id_to_remove)
    if not user_to_remove_exists:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id_to_remove} not found")

    try:
        removed = crud.remove_list_member(db=db, db_list=db_list, user_id=user_id_to_remove)
        if not removed:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this list")
        return None # Return 204
    except ValueError as e: # Catches "Cannot remove owner" just in case
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
