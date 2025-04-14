from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    items = relationship("Item", back_populates="category")

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    note = Column(String, nullable=True)
    price_match = Column(Boolean, default=False, nullable=False)
    added_on = Column(DateTime(timezone=True), server_default=func.now())
    updated_on = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    category = relationship("Category", back_populates="items")

    def __repr__(self):
        return f"<Item(id={self.id}, name='{self.name}', category_id={self.category_id})>"
