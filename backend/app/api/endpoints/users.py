from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps

router = APIRouter()

@router.get("/me", response_model=schemas.User)
def read_users_me(
    current_user: models.User = Depends(deps.get_current_user),
):
    """
    Get current user details.
    """
    return current_user
