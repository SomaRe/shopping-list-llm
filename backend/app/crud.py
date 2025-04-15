from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from . import models, schemas
from app.core.security import get_password_hash, verify_password

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
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def get_category(db: Session, category_id: int) -> Optional[models.Category]:
    return db.query(models.Category).filter(models.Category.id == category_id).first()

def get_category_by_name(db: Session, name: str) -> Optional[models.Category]:
    return db.query(models.Category).filter(models.Category.name == name).first()

def get_categories(db: Session, skip: int = 0, limit: int = 100) -> List[models.Category]:
    return db.query(models.Category).offset(skip).limit(limit).all()

def create_category(db: Session, category: schemas.CategoryCreate) -> models.Category:
    db_category = models.Category(name=category.name)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def update_category(db: Session, category_id: int, category_update: schemas.CategoryUpdate) -> Optional[models.Category]:
    db_category = get_category(db, category_id)
    if db_category:
        update_data = category_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_category, key, value)
        db.commit()
        db.refresh(db_category)
    return db_category

def delete_category(db: Session, category_id: int) -> Optional[models.Category]:
    db_category = get_category(db, category_id)
    if db_category:
        db.delete(db_category)
        db.commit()
    return db_category

def get_item(db: Session, item_id: int, owner_id: int) -> Optional[models.Item]:
    return db.query(models.Item).options(
        joinedload(models.Item.category),
    ).filter(models.Item.id == item_id, models.Item.owner_id == owner_id).first()

def get_items(db: Session, owner_id: int, skip: int = 0, limit: int = 100) -> List[models.Item]:
    return db.query(models.Item).options(
        joinedload(models.Item.category),
    ).filter(models.Item.owner_id == owner_id).offset(skip).limit(limit).all()

def create_item(db: Session, item: schemas.ItemCreate, owner_id: int) -> models.Item:
    db_category = get_category(db, item.category_id)
    if not db_category:
        raise ValueError(f"Category with id {item.category_id} not found")

    item_data = item.model_dump()
    db_item = models.Item(**item_data, owner_id=owner_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    db.refresh(db_item, attribute_names=['category'])
    return db_item

def update_item(db: Session, item_id: int, item_update: schemas.ItemUpdate, owner_id: int) -> Optional[models.Item]:
    db_item = get_item(db, item_id=item_id, owner_id=owner_id)
    if db_item:
        update_data = item_update.model_dump(exclude_unset=True)

        if 'category_id' in update_data:
            db_category = get_category(db, update_data['category_id'])
            if not db_category:
                 raise ValueError(f"Category with id {update_data['category_id']} not found")

        for key, value in update_data.items():
            setattr(db_item, key, value)

        db.commit()
        db.refresh(db_item)
        db.refresh(db_item, attribute_names=['category'])
    return db_item


def delete_item(db: Session, item_id: int, owner_id: int) -> Optional[models.Item]:
    db_item = get_item(db, item_id=item_id, owner_id=owner_id)
    if db_item:
        db.delete(db_item)
        db.commit()
    return db_item
