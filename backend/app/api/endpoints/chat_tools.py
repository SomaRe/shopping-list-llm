import json
from sqlalchemy.orm import Session
from app import crud, models, schemas
import inspect # For debugging argument mismatches

# --- Tool Definitions (Update descriptions slightly) ---
tools = [
    {
        "type": "function",
        "function": {
            "name": "list_items",
            "description": "List grocery items in the current list, optionally filtering by category name. Shows ticked status, category, and item ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category_name": {
                        "type": "string",
                        "description": "The name of the category within the current list to filter by.",
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
            "description": "Add a new item to the current grocery list. Specify item name and category name. If the category doesn't exist in the current list, it will be created. Items are added unticked by default.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "The name of the item to add."},
                    "category_name": {"type": "string", "description": "The name of the category for the item (will be created in the current list if needed)."},
                    "note": {"type": "string", "description": "Optional note for the item."},
                    "price_match": {"type": "boolean", "description": "Whether to flag the item for price matching.", "default": False}
                },
                "required": ["name", "category_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_item",
            "description": "Delete an item from the current grocery list by its name. Use item ID if name is ambiguous.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "The name of the item to delete from the current list."},
                    # Optional: Add ID parameter if needed for disambiguation
                    # "id": {"type": "integer", "description": "The ID of the item to delete, if name is not unique."}
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_item",
            "description": "Update an existing item in the current grocery list, identified by its ID. Allows changing name, category, note, price match, or ticked status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer", "description": "The ID of the item in the current list to update."},
                    "name": {"type": "string", "description": "New name for the item."},
                    "category_name": {"type": "string", "description": "New category name for the item (must exist in the current list)."},
                    "note": {"type": "string", "description": "New note for the item."},
                    "price_match": {"type": "boolean", "description": "New price match status."},
                    "is_ticked": {"type": "boolean", "description": "New ticked status (true/false)."}
                },
                "required": ["id"], # ID is mandatory to identify item
            },
        },
    },
     {
        "type": "function",
        "function": {
            "name": "tick_item",
            "description": "Mark a specific grocery item in the current list as ticked/acquired by its name. Use ID if ambiguous.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "The exact name of the item in the current list to mark as ticked."}
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "untick_item",
            "description": "Mark a specific grocery item in the current list as unticked by its name. Use ID if ambiguous.",
             "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "The exact name of the item in the current list to mark as unticked."}
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_categories",
            "description": "List all available grocery categories within the current list.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_category",
            "description": "Add a new category to the current list.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "The name of the new category for the current list."}
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_category",
            "description": "Delete a category from the current list if it's empty.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "The name of the category in the current list to delete."}
                },
                "required": ["name"],
            },
        },
    }
]


# --- Tool Implementation Functions (Accept list_id) ---

def _list_items_impl(db: Session, list_id: int, category_name: str | None = None):
    # Permission check already done in chat endpoint
    items = crud.get_items_for_list(db, list_id=list_id)

    if category_name:
        # Filter items further by category name (case-insensitive check might be better)
        items = [item for item in items if item.category.name.lower() == category_name.lower()]
        if not items:
             return f"No items found in category '{category_name}' within this list."

    if not items:
        return "This list is currently empty."

    item_list_str = "\n".join([
        f"- [{'x' if item.is_ticked else ' '}] {item.name} (ID: {item.id})"
        f"{f' [Note: {item.note}]' if item.note else ''}"
        f"{' [Price Match]' if item.price_match else ''}"
        f" (Category: {item.category.name})"
        for item in items
    ])
    return f"Items in the current list{f' (filtered by category {category_name})' if category_name else ''}:\n{item_list_str}"

def _add_item_impl(db: Session, current_user: models.User, list_id: int, name: str, category_name: str, note: str | None = None, price_match: bool = False):
    # Check if category exists in this list, create if not
    category = crud.get_category_by_name(db, list_id=list_id, name=category_name)
    if not category:
        try:
            category_create_schema = schemas.CategoryCreate(name=category_name)
            category = crud.create_category(db, category_data=category_create_schema, list_id=list_id, user_id=current_user.id)
            # Confirmation message part? Let the final AI response handle confirmation.
        except ValueError as e: # Handles duplicate category name if created concurrently
            db.rollback()
            # Attempt to fetch again in case of race condition
            category = crud.get_category_by_name(db, list_id=list_id, name=category_name)
            if not category: # If still not found after rollback and fetch, raise error
                 return f"Error: Could not create or find category '{category_name}' in this list: {e}"
        except Exception as e:
             db.rollback()
             return f"Error creating category '{category_name}': {str(e)}"


    # Check if item already exists in this category in this list
    existing_item = db.query(models.Item).filter(
         models.Item.category_id == category.id,
         models.Item.name.ilike(name) # Case-insensitive check?
    ).first()
    if existing_item:
         return f"Item '{name}' already exists in category '{category.name}' in this list (ID: {existing_item.id})."


    item_create_schema = schemas.ItemCreate(
        name=name,
        category_id=category.id,
        note=note,
        price_match=price_match
    )
    try:
        item = crud.create_item(db=db, item_data=item_create_schema, user_id=current_user.id)
        return f"Successfully added item: '{item.name}' (ID: {item.id}) to category '{category.name}' in the current list."
    except Exception as e:
        db.rollback()
        return f"Error adding item '{name}': {str(e)}"

def _delete_item_impl(db: Session, list_id: int, name: str):
     # Find item by name within the specific list
    db_item = crud.find_item_by_name_in_list(db, list_id=list_id, item_name=name)

    if not db_item:
        # Maybe list similar items? Or just report not found.
        return f"Error: Item '{name}' not found in this list."
        # Consider searching across all user's lists if name is unique enough? Too complex for now.

    item_id_to_delete = db_item.id
    item_name_deleted = db_item.name # Get exact name before deleting
    try:
        crud.delete_item(db, db_item=db_item)
        return f"Successfully deleted item: '{item_name_deleted}' (ID: {item_id_to_delete}) from the current list."
    except Exception as e:
        db.rollback()
        return f"Error deleting item '{item_name_deleted}' (ID: {item_id_to_delete}): {str(e)}"


def _update_item_impl(db: Session, current_user: models.User, list_id: int, id: int, **kwargs):
    # Get the item and check if it belongs to the context list_id
    db_item = crud.get_item(db, item_id=id)
    if not db_item or db_item.category.list_id != list_id:
         return f"Error: Item with ID {id} not found in the current list."

    # Process category_name separately if provided
    update_payload = {}
    if 'category_name' in kwargs and kwargs['category_name'] is not None:
        category_name = kwargs.pop('category_name')
        category = crud.get_category_by_name(db, list_id=list_id, name=category_name)
        if not category:
            return f"Error: Category '{category_name}' not found in the current list. Cannot update item."
        update_payload['category_id'] = category.id
    elif 'category_id' in kwargs: # If ID provided directly
        cat_id = kwargs['category_id']
        category = crud.get_category(db, category_id=cat_id)
        if not category or category.list_id != list_id:
            return f"Error: Category ID {cat_id} not found or does not belong to the current list."
        update_payload['category_id'] = cat_id


    # Add remaining valid kwargs to payload
    valid_keys = schemas.ItemUpdate.model_fields.keys()
    for k, v in kwargs.items():
        if k in valid_keys and v is not None:
            update_payload[k] = v

    if not update_payload:
        return f"No valid updates specified for item ID {id}."

    try:
        # Create the Pydantic schema for validation
        item_update_schema = schemas.ItemUpdate(**update_payload)

        updated_item = crud.update_item(
            db=db,
            db_item=db_item,
            item_update=item_update_schema,
            user_id=current_user.id
        )
        return f"Successfully updated item: '{updated_item.name}' (ID: {id}) in the current list."
    except ValueError as ve: # Catches CRUD validation errors
         db.rollback()
         return f"Error updating item ID {id}: {str(ve)}"
    except Exception as e:
        db.rollback()
        # Log the full error for debugging
        print(f"Unexpected error updating item {id}: {e}")
        import traceback
        traceback.print_exc()
        return f"Unexpected error updating item ID {id}: {str(e)}"


def _tick_or_untick_item_impl(db: Session, current_user: models.User, list_id: int, name: str, tick_status: bool):
    # Find item by name within the specific list
    db_item = crud.find_item_by_name_in_list(db, list_id=list_id, item_name=name)

    if not db_item:
        return f"Error: Item '{name}' not found in this list."

    if db_item.is_ticked == tick_status:
        action = "ticked" if tick_status else "unticked"
        return f"Item '{db_item.name}' (ID: {db_item.id}) is already {action}."

    try:
        item_update_schema = schemas.ItemUpdate(is_ticked=tick_status)
        updated_item = crud.update_item(
            db=db,
            db_item=db_item,
            item_update=item_update_schema,
            user_id=current_user.id
        )
        action = "ticked" if tick_status else "unticked"
        return f"Successfully marked item '{updated_item.name}' (ID: {updated_item.id}) as {action}."
    except Exception as e:
        db.rollback()
        return f"Error updating ticked status for item '{name}': {str(e)}"

def _tick_item_impl(db: Session, current_user: models.User, list_id: int, name: str):
    return _tick_or_untick_item_impl(db, current_user, list_id, name, tick_status=True)

def _untick_item_impl(db: Session, current_user: models.User, list_id: int, name: str):
    return _tick_or_untick_item_impl(db, current_user, list_id, name, tick_status=False)

def _list_categories_impl(db: Session, list_id: int):
    categories = crud.get_categories_for_list(db, list_id=list_id)
    if not categories:
        return "No categories found in this list."
    return "Available categories in this list:\n" + "\n".join([f"- {cat.name} (ID: {cat.id})" for cat in categories])

def _add_category_impl(db: Session, current_user: models.User, list_id: int, name: str):
    existing_category = crud.get_category_by_name(db, list_id=list_id, name=name)
    if existing_category:
        return f"Category '{name}' already exists in this list."
    try:
        category_create_schema = schemas.CategoryCreate(name=name)
        category = crud.create_category(db, category_data=category_create_schema, list_id=list_id, user_id=current_user.id)
        return f"Successfully added category: '{category.name}' (ID: {category.id}) to the current list."
    except ValueError as e: # Duplicate name constraint
        db.rollback()
        return f"Error adding category '{name}': {str(e)}"
    except Exception as e:
        db.rollback()
        return f"Error adding category '{name}': {str(e)}"


def _delete_category_impl(db: Session, list_id: int, name: str):
    category = crud.get_category_by_name(db, list_id=list_id, name=name)
    if not category:
        return f"Error: Category '{name}' not found in this list."

    # Check for items (using lazy dynamic count)
    if category.items.count() > 0:
        item_count = category.items.count() # Get count again if needed for message
        return f"Cannot delete category '{name}' - it still contains {item_count} item(s)."

    category_id_deleted = category.id
    category_name_deleted = category.name
    try:
        crud.delete_category(db, db_category=category) # Pass the object
        return f"Successfully deleted category: '{category_name_deleted}' (ID: {category_id_deleted}) from the current list."
    except ValueError as e: # Should be caught by item check, but safety
        db.rollback()
        return f"Error deleting category '{category_name_deleted}': {str(e)}"
    except Exception as e:
        db.rollback()
        return f"Error deleting category '{category_name_deleted}': {str(e)}"

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

# Updated executor function
async def execute_function_call(tool_call, db: Session, current_user: models.User, list_id: int | None):
    function_name = tool_call.function.name
    function_to_call = available_functions.get(function_name)
    if not function_to_call:
        return f"Error: Function {function_name} not found."

    # Check if list_id context is required but missing
    sig = inspect.signature(function_to_call)
    requires_list_id = 'list_id' in sig.parameters
    if requires_list_id and list_id is None:
        return f"Error: Action '{function_name}' requires you to specify which list you are working with first."

    try:
        arguments_str = tool_call.function.arguments or "{}"
        function_args = json.loads(arguments_str)
    except json.JSONDecodeError as e:
        return f"Error: Invalid arguments format for function {function_name}. Expected JSON. Error: {e}"

    print(f"Executing function: {function_name} with args: {function_args} in list context: {list_id}")

    try:
        # Inject context arguments
        function_args['db'] = db
        if 'current_user' in sig.parameters: # Pass user if function expects it
             function_args['current_user'] = current_user
        if requires_list_id: # Pass list_id if function expects it
            function_args['list_id'] = list_id

        # Validate required arguments before calling (basic check)
        required_params = [p.name for p in sig.parameters.values() if p.default is p.empty and p.name not in ['db', 'current_user', 'list_id']]
        missing_args = [rp for rp in required_params if rp not in function_args]
        if missing_args:
            return f"Error calling {function_name}: Missing required arguments: {', '.join(missing_args)}"

        # Call the implementation function
        result = function_to_call(**function_args)
        return result

    except TypeError as te:
         # More detailed error for argument mismatch
         print(f"Argument mismatch error executing function {function_name}: {te}")
         expected_args = list(sig.parameters.keys())
         provided_args = list(function_args.keys())
         return f"Error calling {function_name}: Argument mismatch. Expected arguments like: {expected_args}. Provided: {provided_args}. Error details: {str(te)}"
    except Exception as e:
        # Catch-all for other errors during function execution
        print(f"Error executing function {function_name}: {e}")
        import traceback
        traceback.print_exc() # Print full stack trace to server logs
        # Return a user-friendly error message
        return f"An unexpected error occurred while trying to execute '{function_name}': {str(e)}"
