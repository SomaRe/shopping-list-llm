from sqlalchemy.orm import Session, joinedload, contains_eager, selectinload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from . import models, schemas
from app.core.security import get_password_hash, verify_password

# --- User CRUD (mostly unchanged, add helpers) ---
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    hashed_password = get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    user = get_user_by_username(db, username=username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def get_users_by_usernames(db: Session, usernames: List[str]) -> List[models.User]:
    """Helper to get multiple users by username."""
    if not usernames:
        return []
    return db.query(models.User).filter(models.User.username.in_(usernames)).all()


# --- ShoppingList CRUD ---
def create_shopping_list(db: Session, list_data: schemas.ShoppingListCreate, owner_id: int) -> models.ShoppingList:
    """Creates a new shopping list and adds the owner as a member."""
    db_list = models.ShoppingList(
        name=list_data.name,
        list_type=list_data.list_type,
        owner_id=owner_id
    )
    db.add(db_list)
    db.flush() # Get the list ID before adding members

    # Add owner as the first member
    owner_member = models.ListMember(list_id=db_list.id, user_id=owner_id)
    db.add(owner_member)

    # Add other initial members if provided
    if list_data.share_with_usernames:
        users_to_share = get_users_by_usernames(db, list_data.share_with_usernames)
        for user in users_to_share:
            if user.id != owner_id: # Don't add owner twice
                member = models.ListMember(list_id=db_list.id, user_id=user.id)
                db.add(member)

    db.commit()
    db.refresh(db_list)
    # Eager load members and owner for the response
    db.refresh(db_list, attribute_names=['members', 'owner'])
    for member in db_list.members:
        db.refresh(member, attribute_names=['user'])

    return db_list

def get_shopping_list(db: Session, list_id: int) -> Optional[models.ShoppingList]:
    """Gets a single shopping list by ID, eager loading owner and members."""
    return db.query(models.ShoppingList).options(
        selectinload(models.ShoppingList.owner),
        selectinload(models.ShoppingList.members).selectinload(models.ListMember.user)
    ).filter(models.ShoppingList.id == list_id).first()

def get_shopping_lists_for_user(db: Session, user_id: int) -> List[models.ShoppingList]:
    """Gets all shopping lists a user is a member of."""
    return db.query(models.ShoppingList).join(models.ListMember).options(
         selectinload(models.ShoppingList.owner),
         selectinload(models.ShoppingList.members).selectinload(models.ListMember.user)
    ).filter(models.ListMember.user_id == user_id).order_by(models.ShoppingList.name).all()

def update_shopping_list(db: Session, db_list: models.ShoppingList, list_update: schemas.ShoppingListUpdate) -> models.ShoppingList:
    """Updates list properties."""
    update_data = list_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_list, key, value)
    db.commit()
    db.refresh(db_list)
    # Eager load again after refresh if needed for response
    db.refresh(db_list, attribute_names=['owner', 'members'])
    for member in db_list.members:
        db.refresh(member, attribute_names=['user'])
    return db_list

def delete_shopping_list(db: Session, db_list: models.ShoppingList):
    """Deletes a list and its cascaded members/categories/items."""
    db.delete(db_list)
    db.commit()

def add_list_member(db: Session, db_list: models.ShoppingList, user_id: int) -> Optional[models.ListMember]:
    """Adds a user to a list if they are not already a member."""
    existing_member = db.query(models.ListMember).filter(
        models.ListMember.list_id == db_list.id,
        models.ListMember.user_id == user_id
    ).first()
    if existing_member:
        return None # Already a member

    member = models.ListMember(list_id=db_list.id, user_id=user_id)
    db.add(member)
    db.commit()
    db.refresh(member)
    db.refresh(member, attribute_names=['user']) # Load user for response if needed
    return member

def remove_list_member(db: Session, db_list: models.ShoppingList, user_id: int) -> bool:
    """Removes a member from a list. Cannot remove the owner."""
    if db_list.owner_id == user_id:
        raise ValueError("Cannot remove the owner from the list.")

    member = db.query(models.ListMember).filter(
        models.ListMember.list_id == db_list.id,
        models.ListMember.user_id == user_id
    ).first()

    if member:
        db.delete(member)
        db.commit()
        return True
    return False

def check_user_list_access(db: Session, list_id: int, user_id: int) -> bool:
    """Checks if a user is a member of a specific list."""
    return db.query(models.ListMember).filter(
        models.ListMember.list_id == list_id,
        models.ListMember.user_id == user_id
    ).count() > 0

def get_shopping_list_owner(db: Session, list_id: int) -> Optional[int]:
    """Gets the owner ID of a list."""
    list_obj = db.query(models.List.owner_id).filter(models.List.id == list_id).first()
    return list_obj.owner_id if list_obj else None


# --- Category CRUD (Updated) ---
def get_category(db: Session, category_id: int) -> Optional[models.Category]:
    """Gets a category by ID, including its list."""
    return db.query(models.Category).options(
        selectinload(models.Category.list),
        selectinload(models.Category.creator),
        selectinload(models.Category.updater)
        ).filter(models.Category.id == category_id).first()

def get_category_by_name(db: Session, list_id: int, name: str) -> Optional[models.Category]:
    """Gets a category by name *within* a specific list."""
    return db.query(models.Category).filter(
        models.Category.list_id == list_id,
        models.Category.name == name
        ).first()

def get_categories_for_list(db: Session, list_id: int) -> List[models.Category]:
    """Gets all categories for a specific list."""
    return db.query(models.Category).options(
        selectinload(models.Category.creator), # Eager load creator
        selectinload(models.Category.updater)  # Eager load updater
        ).filter(models.Category.list_id == list_id).order_by(models.Category.name).all()

def create_category(db: Session, category_data: schemas.CategoryCreate, list_id: int, user_id: int) -> models.Category:
    """Creates a category within a list."""
    db_category = models.Category(
        **category_data.model_dump(),
        list_id=list_id,
        created_by_user_id=user_id,
        updated_by_user_id=user_id # Initially set updater same as creator
    )
    db.add(db_category)
    try:
        db.commit()
        db.refresh(db_category)
        db.refresh(db_category, attribute_names=['creator', 'updater']) # Refresh relations
        return db_category
    except IntegrityError: # Handles unique constraint violation
        db.rollback()
        raise ValueError(f"Category name '{category_data.name}' already exists in this list.")

def update_category(db: Session, db_category: models.Category, category_update: schemas.CategoryUpdate, user_id: int) -> models.Category:
    """Updates a category's name."""
    update_data = category_update.model_dump(exclude_unset=True)
    if not update_data:
         return db_category # No changes

    for key, value in update_data.items():
        setattr(db_category, key, value)
    db_category.updated_by_user_id = user_id # Track who updated

    try:
        db.commit()
        db.refresh(db_category)
        db.refresh(db_category, attribute_names=['creator', 'updater']) # Refresh relations
        return db_category
    except IntegrityError: # Handles unique constraint violation if name changes
        db.rollback()
        raise ValueError(f"Category name '{category_update.name}' already exists in this list.")

def delete_category(db: Session, db_category: models.Category):
    """Deletes a category if it has no items."""
    # Check items - using lazy='dynamic' allows efficient count
    if db_category.items.count() > 0:
        raise ValueError("Cannot delete category: it has associated items.")
    db.delete(db_category)
    db.commit()


# --- Item CRUD (Updated) ---
def get_item(db: Session, item_id: int) -> Optional[models.Item]:
    """Gets a single item by ID, loading relations."""
    # We need to check permissions based on the list *after* fetching the item
    return db.query(models.Item).options(
        joinedload(models.Item.category).joinedload(models.Category.list), # Load category and its list
        selectinload(models.Item.creator),
        selectinload(models.Item.updater)
    ).filter(models.Item.id == item_id).first()

def get_items_for_list(db: Session, list_id: int) -> List[models.Item]:
    """Gets all items belonging to categories within a specific list."""
    return db.query(models.Item).join(models.Item.category).options(
        contains_eager(models.Item.category), # Optimizes loading category info
        selectinload(models.Item.creator),
        selectinload(models.Item.updater)
        ).filter(models.Category.list_id == list_id).order_by(models.Category.name, models.Item.name).all() # Order by cat then item

def create_item(db: Session, item_data: schemas.ItemCreate, user_id: int) -> models.Item:
    """Creates an item, ensuring category exists."""
    db_category = get_category(db, item_data.category_id)
    if not db_category:
        raise ValueError(f"Category with id {item_data.category_id} not found")

    # Permission check happens in the endpoint before calling this

    item_dict = item_data.model_dump()
    db_item = models.Item(
        **item_dict,
        created_by_user_id=user_id,
        updated_by_user_id=user_id # Initially set updater
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    # Eager load for response
    db.refresh(db_item, attribute_names=['category', 'creator', 'updater'])
    db.refresh(db_item.category, attribute_names=['list']) # Ensure list is loaded on category
    return db_item

def update_item(db: Session, db_item: models.Item, item_update: schemas.ItemUpdate, user_id: int) -> models.Item:
    """Updates an item."""
    update_data = item_update.model_dump(exclude_unset=True)
    if not update_data:
        return db_item # No actual changes

    # Handle category change: ensure new category is in the same list
    if 'category_id' in update_data and update_data['category_id'] != db_item.category_id:
        new_category = get_category(db, update_data['category_id'])
        if not new_category:
             raise ValueError(f"New category with id {update_data['category_id']} not found")
        # Check if the new category belongs to the same list as the old one
        if new_category.list_id != db_item.category.list_id:
             raise ValueError("Cannot move item to a category in a different list.")

    for key, value in update_data.items():
        setattr(db_item, key, value)
    db_item.updated_by_user_id = user_id # Track updater

    db.commit()
    db.refresh(db_item)
    # Eager load for response
    db.refresh(db_item, attribute_names=['category', 'creator', 'updater'])
    db.refresh(db_item.category, attribute_names=['list'])
    return db_item


def delete_item(db: Session, db_item: models.Item):
    """Deletes an item."""
    # Permission check happens in the endpoint
    db.delete(db_item)
    db.commit()

# --- Helper to find item by name within a list (for chat) ---
def find_item_by_name_in_list(db: Session, list_id: int, item_name: str) -> Optional[models.Item]:
     return db.query(models.Item).join(models.Item.category)\
         .filter(models.Category.list_id == list_id, models.Item.name.ilike(item_name))\
         .options(joinedload(models.Item.category))\
         .first()
