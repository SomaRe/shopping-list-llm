import json
from sqlalchemy.orm import Session
from app import crud, models, schemas

tools = [
    {
        "type": "function",
        "function": {
            "name": "list_items",
            "description": "List grocery items, optionally filtering by category. Shows ticked status.",
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
            "description": "Add a new item to the grocery list with category name. if category doesn't exist i will be created. Items are added unticked by default.",
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
            "description": "Update an existing item in the grocery list by its ID.",
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
                        "description": "New category name for the item. Requires category to exist.",
                    },
                    "note": {
                        "type": "string",
                        "description": "New note for the item.",
                    },
                    "price_match": {
                        "type": "boolean",
                        "description": "New price match status for the item.",
                    },
                    "is_ticked": {
                        "type": "boolean",
                        "description": "New ticked status for the item (true/false)."
                    }
                },
                "required": ["id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "tick_item",
            "description": "Mark a specific grocery item as ticked/acquired by its name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The exact name of the item to mark as ticked.",
                    }
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "untick_item",
            "description": "Mark a specific grocery item as unticked by its name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The exact name of the item to mark as unticked.",
                    }
                },
                "required": ["name"],
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
        f"- [{'x' if item.is_ticked else ' '}] {item.name}{f' ({item.note})' if item.note else ''}{' [Price Match]' if item.price_match else ''} (Category: {item.category.name}, ID: {item.id})"
        for item in items
    ])
    return f"Current items{f' in {category_name}' if category_name else ''}:\n{item_list_str}"

def _add_item_impl(db: Session, current_user: models.User, name: str, category_name: str, note: str | None = None, price_match: bool = False):
    category = crud.get_category_by_name(db, name=category_name)
    if not category:
        existing = crud.get_category_by_name(db, name=category_name)
        if existing:
             category = existing
        else:
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
        price_match=price_match,
    )
    try:
        existing_item = db.query(models.Item).filter(
             models.Item.owner_id == current_user.id,
             models.Item.name == name,
             models.Item.category_id == category.id
         ).first()

        if existing_item:
            return f"Item '{name}' already exists in category '{category_name}'."

        item = crud.create_item(db=db, item=item_create, owner_id=current_user.id)
        return f"Successfully added item: {item.name} to category {category.name}."
    except Exception as e:
        db.rollback()
        return f"Error adding item '{name}': {e}"

def _delete_item_impl(db: Session, current_user: models.User, name: str):
    db_item = db.query(models.Item).filter(
        models.Item.owner_id == current_user.id,
        models.Item.name.ilike(name)
    ).first()

    if not db_item:
        return f"Error: Item '{name}' not found."

    item_id = db_item.id
    try:
        deleted_item = crud.delete_item(db, item_id=item_id, owner_id=current_user.id)
        if deleted_item:
             return f"Successfully deleted item: {deleted_item.name} (ID: {item_id})."
        else:
             return f"Error: Item '{name}' (ID: {item_id}) could not be deleted or was already gone."
    except Exception as e:
        db.rollback()
        return f"Error deleting item '{name}' (ID: {item_id}): {str(e)}"


def _update_item_impl(db: Session, current_user: models.User, id: int, **kwargs):
    db_item = crud.get_item(db, item_id=id, owner_id=current_user.id)
    if not db_item:
         return f"Error: Item with ID {id} not found."

    category_id = db_item.category_id
    if 'category_name' in kwargs:
        category_name = kwargs.pop('category_name')
        category = crud.get_category_by_name(db, name=category_name)
        if not category:
            return f"Error: Category '{category_name}' not found. Cannot update item."
        category_id = category.id

    update_payload = {k: v for k, v in kwargs.items() if v is not None}
    update_payload['category_id'] = category_id

    if not update_payload:
        return f"No updates specified for item ID {id}."

    try:
        item_update_schema = schemas.ItemUpdate(**update_payload)
        updated_item = crud.update_item(db, item_id=id, item_update=item_update_schema, owner_id=current_user.id)
        return f"Successfully updated item: {updated_item.name} (ID: {id})."
    except ValueError as ve:
         db.rollback()
         return f"Error updating item ID {id}: {str(ve)}"
    except Exception as e:
        db.rollback()
        return f"Error updating item ID {id}: {str(e)}"


def _tick_or_untick_item_impl(db: Session, current_user: models.User, name: str, tick_status: bool):
    db_item = db.query(models.Item).filter(
        models.Item.owner_id == current_user.id,
        models.Item.name.ilike(name)
    ).first()

    if not db_item:
        return f"Error: Item '{name}' not found."

    if db_item.is_ticked == tick_status:
        action = "ticked" if tick_status else "unticked"
        return f"Item '{name}' is already {action}."

    try:
        item_update_schema = schemas.ItemUpdate(is_ticked=tick_status)
        updated_item = crud.update_item(db, item_id=db_item.id, item_update=item_update_schema, owner_id=current_user.id)
        action = "ticked" if tick_status else "unticked"
        return f"Successfully marked item '{updated_item.name}' as {action}."
    except Exception as e:
        db.rollback()
        return f"Error updating ticked status for item '{name}': {str(e)}"

def _tick_item_impl(db: Session, current_user: models.User, name: str):
    return _tick_or_untick_item_impl(db, current_user, name, tick_status=True)

def _untick_item_impl(db: Session, current_user: models.User, name: str):
    return _tick_or_untick_item_impl(db, current_user, name, tick_status=False)

def _list_categories_impl(db: Session):
    categories = crud.get_categories(db)
    if not categories:
        return "No categories found."
    return "Available categories:\n" + "\n".join([f"- {cat.name}" for cat in categories])

def _add_category_impl(db: Session, name: str):
    existing_category = crud.get_category_by_name(db, name=name)
    if existing_category:
        return f"Category '{name}' already exists."
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
        item_count = db.query(models.Item).filter(models.Item.category_id == category.id).count()
        if item_count > 0:
             return f"Cannot delete category '{name}' - it still contains {item_count} item(s)."

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
    "tick_item": _tick_item_impl,
    "untick_item": _untick_item_impl,
    "list_categories": _list_categories_impl,
    "add_category": _add_category_impl,
    "delete_category": _delete_category_impl,
}

async def execute_function_call(tool_call, db: Session, current_user: models.User):
    function_name = tool_call.function.name
    function_to_call = available_functions.get(function_name)
    try:
        arguments_str = tool_call.function.arguments or "{}"
        function_args = json.loads(arguments_str)
    except json.JSONDecodeError:
        return f"Error: Invalid arguments format for function {function_name}. Expected JSON."

    if not function_to_call:
        return f"Error: Function {function_name} not found."

    print(f"Executing function: {function_name} with args: {function_args}")

    try:
        function_args['db'] = db

        if function_name in ['list_items', 'add_item', 'delete_item', 'update_item', 'tick_item', 'untick_item']:
            function_args['current_user'] = current_user

        result = function_to_call(**function_args)
        return result

    except TypeError as te:
         print(f"Argument mismatch error executing function {function_name}: {te}")
         import inspect
         sig = inspect.signature(function_to_call)
         expected_args = list(sig.parameters.keys())
         return f"Error calling {function_name}: Incorrect arguments provided. Expected arguments like: {expected_args}. Received: {list(function_args.keys())}. Error: {str(te)}"
    except Exception as e:
        print(f"Error executing function {function_name}: {e}")
        return f"Error executing {function_name}: {str(e)}"
