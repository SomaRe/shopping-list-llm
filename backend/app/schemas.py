from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
import datetime

# --- User Schemas (Minor adjustments maybe needed for nesting) ---
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

# Minimal User representation for nesting
class UserInfo(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Keep existing User schemas for auth/direct user operations
class User(UserBase):
    id: int
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

class UserInDB(User):
    hashed_password: str

# --- Token Schemas (No changes needed) ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- ShoppingList Schemas (Renamed from List) ---
class ShoppingListBase(BaseModel):
    name: str
    list_type: str = 'private' # Default to private

class ShoppingListCreate(ShoppingListBase):
    # Owner is determined by current_user in endpoint
    share_with_usernames: Optional[List[str]] = None # Optional: list of usernames to share with initially

class ShoppingListUpdate(BaseModel):
    name: Optional[str] = None
    list_type: Optional[str] = None # Allow changing type
    model_config = ConfigDict(from_attributes=True)

class ShoppingListMemberInfo(BaseModel):
    user: UserInfo
    added_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

class ShoppingList(ShoppingListBase):
    id: int
    owner: UserInfo # Nested owner info
    created_at: datetime.datetime
    updated_at: datetime.datetime
    members: List[ShoppingListMemberInfo] = [] # Include members
    model_config = ConfigDict(from_attributes=True)

class SimpleShoppingListInfo(BaseModel): # For simpler nesting in categories/items
    id: int
    name: str
    list_type: str
    model_config = ConfigDict(from_attributes=True)


# --- Category Schemas (Updated) ---
class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    # list_id is provided via path parameter in API
    # created_by_user_id is provided by current_user
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    # updated_by_user_id is provided by current_user

class Category(CategoryBase):
    id: int
    list_id: int
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None
    creator: UserInfo
    updater: Optional[UserInfo] = None
    # list: SimpleListInfo # Avoid deep nesting unless needed
    model_config = ConfigDict(from_attributes=True)

class CategoryListResponse(BaseModel): # Changed name from CategoryList
    categories: List[Category]


# --- Item Schemas (Updated) ---
class ItemBase(BaseModel):
    name: str
    note: Optional[str] = None
    price_match: bool = False
    is_ticked: bool = False

class ItemCreate(ItemBase):
    category_id: int # category implies list; check access in endpoint/crud
    # created_by_user_id derived from current_user

class ItemUpdate(BaseModel): # Allow partial updates
    name: Optional[str] = None
    note: Optional[str] = None
    price_match: Optional[bool] = None
    is_ticked: Optional[bool] = None
    category_id: Optional[int] = None # Allow moving between categories *within the same list* (enforce in CRUD/API)
    # updated_by_user_id derived from current_user

class Item(ItemBase):
    id: int
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None # Make optional if not updated yet
    category: Category # Nested category info
    creator: UserInfo # Nested creator info
    updater: Optional[UserInfo] = None # Nested updater info (optional)
    # Removed owner_id, implicitly available via creator.id

    model_config = ConfigDict(from_attributes=True)

class ItemListResponse(BaseModel): # Changed name from ItemList
    items: List[Item]

# --- Chat Schemas (Add list_id context) ---
class ChatMessageInput(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessageInput]
    list_id: Optional[int] = None # Add context for which list to talk about

class ChatMessageOutput(BaseModel):
    role: str
    content: Optional[str] = None

class ChatResponse(BaseModel):
    message: ChatMessageOutput
