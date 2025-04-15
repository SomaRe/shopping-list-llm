import json
from sqlalchemy.orm import Session
from app import crud, models, schemas

tools = [
    {
        "type": "function",
        "function": {
            "name": "list_items",
            "description": "List grocery items, optionally filtering by category.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category_name": {
                        "type": "string",
                        "description": "The name of the category to filter by.",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_item",
            "description": "Add a new item to the grocery list with category name. if category doesn't exist i will be created.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the item to add.",
                    },
                    "category_name": {
                        "type": "string",
                        "description": "The name of the category for the item.",
                    },
                    "note": {
                        "type": "string",
                        "description": "Optional note for the item.",
                    },
                    "price_match": {
                        "type": "boolean",
                        "description": "Whether to flag the item for price matching.",
                        "default": False,
                    }
                },
                "required": ["name", "category_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_item",
            "description": "Delete an item from the grocery list by its name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the item to delete.",
                    }
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_item",
            "description": "Update an existing item in the grocery list.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "description": "The ID of the item to update.",
                    },
                    "name": {
                        "type": "string",
                        "description": "New name for the item.",
                    },
                    "category_name": {
                        "type": "string",
                        "description": "New category name for the item.",
                    },
                    "note": {
                        "type": "string",
                        "description": "New note for the item.",
                    },
                    "price_match": {
                        "type": "boolean",
                        "description": "New price match status for the item.",
                    }
                },
                "required": ["id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_categories",
            "description": "List all available grocery categories.",
            "parameters": {
                "type": "object",
                "properties": {}
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_category",
            "description": "Add a new category for organizing grocery items.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the new category.",
                    }
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_category",
            "description": "Delete a category if it's empty.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the category to delete.",
                    }
                },
                "required": ["name"],
            },
        },
    }
]

def _list_items_impl(db: Session, current_user: models.User, category_name: str | None = None):
    items = crud.get_items(db, owner_id=current_user.id)
    if category_name:
        category = crud.get_category_by_name(db, name=category_name)
        if not category:
            return f"Error: Category '{category_name}' not found."
        items = [item for item in items if item.category_id == category.id]

    if not items:
        return f"No items found{f' in category {category_name}' if category_name else ''}."

    item_list_str = "\n".join([
        f"- {item.name}{f' ({item.note})' if item.note else ''}{' [Price Match]' if item.price_match else ''} (Category: {item.category.name})"
        for item in items
    ])
    return f"Current items{f' in {category_name}' if category_name else ''}:\n{item_list_str}"

def _add_item_impl(db: Session, current_user: models.User, name: str, category_name: str, note: str | None = None, price_match: bool = False):
    category = crud.get_category_by_name(db, name=category_name)
    if not category:
        try:
            category = crud.create_category(db, schemas.CategoryCreate(name=category_name))
        except Exception as e:
            db.rollback()
            category = crud.get_category_by_name(db, name=category_name)
            if not category:
                return f"Error creating/finding category '{category_name}': {e}"

    item_create = schemas.ItemCreate(
        name=name,
        category_id=category.id,
        note=note,
        price_match=price_match
    )
    try:
        item = crud.create_item(db=db, item=item_create, owner_id=current_user.id)
        return f"Successfully added item: {item.name} to category {category.name}."
    except Exception as e:
        db.rollback()
        return f"Error adding item '{name}': {e}"

def _delete_item_impl(db: Session, current_user: models.User, name: str):
    items = crud.get_items(db, owner_id=current_user.id)
    matching_items = [item for item in items if item.name.lower() == name.lower()]
    
    if not matching_items:
        return f"Error: Item '{name}' not found."
    
    try:
        crud.delete_item(db, item_id=matching_items[0].id, owner_id=current_user.id)
        return f"Successfully deleted item: {name}."
    except Exception as e:
        db.rollback()
        return f"Error deleting item '{name}': {str(e)}"

def _update_item_impl(db: Session, current_user: models.User, id: int, **kwargs):
    try:
        item_update = schemas.ItemUpdate(**kwargs)
        updated_item = crud.update_item(db, item_id=id, item_update=item_update, owner_id=current_user.id)
        return f"Successfully updated item: {updated_item.name}."
    except Exception as e:
        db.rollback()
        return f"Error updating item: {str(e)}"

def _list_categories_impl(db: Session):
    categories = crud.get_categories(db)
    if not categories:
        return "No categories found."
    return "Available categories:\n" + "\n".join([f"- {cat.name}" for cat in categories])

def _add_category_impl(db: Session, name: str):
    try:
        category = crud.create_category(db, schemas.CategoryCreate(name=name))
        return f"Successfully added category: {category.name}."
    except Exception as e:
        db.rollback()
        return f"Error adding category '{name}': {str(e)}"

def _delete_category_impl(db: Session, name: str):
    category = crud.get_category_by_name(db, name=name)
    if not category:
        return f"Error: Category '{name}' not found."
    
    if category.items:
        return f"Cannot delete category '{name}' - it still contains items."
    
    try:
        crud.delete_category(db, category_id=category.id)
        return f"Successfully deleted category: {name}."
    except Exception as e:
        db.rollback()
        return f"Error deleting category '{name}': {str(e)}"

available_functions = {
    "list_items": _list_items_impl,
    "add_item": _add_item_impl,
    "delete_item": _delete_item_impl,
    "update_item": _update_item_impl,
    "list_categories": _list_categories_impl,
    "add_category": _add_category_impl,
    "delete_category": _delete_category_impl,
}

async def execute_function_call(tool_call, db: Session, current_user: models.User):
    function_name = tool_call.function.name
    function_to_call = available_functions.get(function_name)
    try:
        function_args = json.loads(tool_call.function.arguments)
    except json.JSONDecodeError:
        return f"Error: Invalid arguments for function {function_name}."

    if not function_to_call:
        return f"Error: Function {function_name} not found."

    print(f"Executing function: {function_name} with args: {function_args}")

    try:
        # Add db to all functions
        function_args['db'] = db
        
        # Only add current_user to functions that need it
        if function_name in ['list_items', 'add_item', 'delete_item', 'update_item']:
            function_args['current_user'] = current_user
            
        return function_to_call(**function_args)
    except Exception as e:
        print(f"Error executing function {function_name}: {e}")
        return f"Error executing {function_name}: {str(e)}"
