from sqlalchemy.orm import Session, joinedload
from . import models, schemas
from typing import List, Optional

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

def get_item(db: Session, item_id: int) -> Optional[models.Item]:
    return db.query(models.Item).options(joinedload(models.Item.category)).filter(models.Item.id == item_id).first()

def get_items(db: Session, skip: int = 0, limit: int = 100) -> List[models.Item]:
    return db.query(models.Item).options(joinedload(models.Item.category)).offset(skip).limit(limit).all()

def create_item(db: Session, item: schemas.ItemCreate) -> models.Item:
    db_category = get_category(db, item.category_id)
    if not db_category:
        raise ValueError(f"Category with id {item.category_id} not found")

    db_item = models.Item(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    db.refresh(db_item, attribute_names=['category'])
    return db_item

def update_item(db: Session, item_id: int, item_update: schemas.ItemUpdate) -> Optional[models.Item]:
    db_item = get_item(db, item_id)
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


def delete_item(db: Session, item_id: int) -> Optional[models.Item]:
    db_item = get_item(db, item_id)
    if db_item:
        db.delete(db_item)
        db.commit()
    return db_item
