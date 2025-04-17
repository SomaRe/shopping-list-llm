from sqlalchemy import (
    Boolean, Column, ForeignKey, Integer, String, DateTime, func,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base
import datetime
#import enum

# Optional: Use Enum for list type for better validation
# class ListTypeEnum(enum.Enum):
#     private = "private"
#     shared = "shared"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    # Lists owned by the user
    owned_lists = relationship("ShoppingList", back_populates="owner")
    # Memberships in lists
    list_memberships = relationship("ListMember", back_populates="user")
    # Items created by the user
    created_items = relationship("Item", back_populates="creator", foreign_keys="Item.created_by_user_id")
    # Items last updated by the user
    updated_items = relationship("Item", back_populates="updater", foreign_keys="Item.updated_by_user_id")
    # Categories created by the user
    created_categories = relationship("Category", back_populates="creator", foreign_keys="Category.created_by_user_id")
    # Categories last updated by the user
    updated_categories = relationship("Category", back_populates="updater", foreign_keys="Category.updated_by_user_id")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"


class ShoppingList(Base):
    __tablename__ = "lists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    # Use String for flexibility, could use Enum later
    list_type = Column(String, nullable=False, default='private', index=True) # 'private' or 'shared'

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="owned_lists")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    categories = relationship("Category", back_populates="list", cascade="all, delete-orphan", lazy="dynamic") # Use lazy loading if lists can have many categories
    members = relationship("ListMember", back_populates="list", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<List(id={self.id}, name='{self.name}', type='{self.list_type}', owner_id={self.owner_id})>"


class ListMember(Base):
    __tablename__ = "list_members"

    list_id = Column(Integer, ForeignKey("lists.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    list = relationship("List", back_populates="members")
    user = relationship("User", back_populates="list_memberships")

    def __repr__(self):
        return f"<ListMember(list_id={self.list_id}, user_id={self.user_id})>"


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint('list_id', 'name', name='uq_category_list_name'),) # Unique name within a list

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)

    list_id = Column(Integer, ForeignKey("lists.id"), nullable=False)
    list = relationship("List", back_populates="categories")

    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="created_categories", foreign_keys=[created_by_user_id])
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updater = relationship("User", back_populates="updated_categories", foreign_keys=[updated_by_user_id])
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    items = relationship("Item", back_populates="category", cascade="all, delete-orphan", lazy="dynamic") # Use lazy loading

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}', list_id={self.list_id})>"


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    note = Column(String, nullable=True)
    price_match = Column(Boolean, default=False, nullable=False)
    is_ticked = Column(Boolean, default=False, nullable=False)

    # Timestamps renamed for consistency
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    category = relationship("Category", back_populates="items")

    # Creator (replaces owner)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="created_items", foreign_keys=[created_by_user_id])

    # Updater
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updater = relationship("User", back_populates="updated_items", foreign_keys=[updated_by_user_id])

    def __repr__(self):
        return f"<Item(id={self.id}, name='{self.name}', ticked={self.is_ticked}, category_id={self.category_id}, creator_id={self.created_by_user_id})>"

# Drop old columns if necessary (using migrations is better)
# Note: If you are just recreating the DB via init_db, these renames won't matter as much,
# but it's good practice. The key is the ForeignKey and relationship setup.

# Update the old timestamp names in the model if you prefer clarity over potential recreation issues
# Item.added_on = Item.created_at
# Item.updated_on = Item.updated_at
# Item.owner_id = Item.created_by_user_id
# Item.owner = Item.creator
