from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None


class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    name: Optional[str] = None


class Category(CategoryBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CategoryList(BaseModel):
    categories: List[Category]


class ItemBase(BaseModel):
    name: str
    note: Optional[str] = None
    price_match: bool = False

class ItemCreate(ItemBase):
    category_id: int

class ItemUpdate(ItemBase):
    name: Optional[str] = None
    note: Optional[str] = None
    price_match: Optional[bool] = None
    category_id: Optional[int] = None

class Item(ItemBase):
    id: int
    added_on: datetime.datetime
    updated_on: datetime.datetime
    category: Category
    owner_id: int

    model_config = ConfigDict(from_attributes=True)


class ItemList(BaseModel):
    items: List[Item]

class ChatMessageInput(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessageInput]

class ChatMessageOutput(BaseModel):
    role: str
    content: Optional[str] = None

class ChatResponse(BaseModel):
    message: ChatMessageOutput
