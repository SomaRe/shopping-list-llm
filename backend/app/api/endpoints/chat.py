import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from openai import AsyncOpenAI
from typing import Optional

from app import schemas, models
from app.api import deps
from app import crud
from app.core.config import settings
# Import tools and executor from the correct file
from .chat_tools import tools, execute_function_call

router = APIRouter()

client = AsyncOpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url=settings.OPENROUTER_BASE_URL,
) if settings.OPENROUTER_API_KEY else None

@router.post("/", response_model=schemas.ChatResponse)
async def handle_chat(
    request: schemas.ChatRequest, # Request body now includes optional list_id
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat service is not configured."
        )

    list_id_context = request.list_id
    list_name_context = "the current list"
    category_list_str = "No list specified."

    # Check access and get context if list_id is provided
    if list_id_context:
        if not crud.check_user_list_access(db, list_id=list_id_context, user_id=current_user.id):
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access the specified list for chat.")
        # Get list details for the prompt
        db_list = crud.get_list(db, list_id=list_id_context)
        if db_list:
            list_name_context = f"the list '{db_list.name}' (ID: {list_id_context})"
            categories = crud.get_categories_for_list(db, list_id=list_id_context)
            category_list_str = "\n".join([f"- {cat.name} (ID: {cat.id})" for cat in categories]) if categories else "No categories in this list yet."
        else:
             # Should not happen due to access check, but safety
             list_name_context = f"the specified list (ID: {list_id_context}, but not found)"
             category_list_str = "Specified list not found."
    else:
        # No list context - AI should probably ask which list to use
        # Or we disallow chat without a list_id context for now
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please specify a 'list_id' in the chat request to provide context."
        )


    messages = [msg.model_dump() for msg in request.messages]
    system_message = f"""You are a helpful grocery list assistant for {current_user.username}.
You are currently working with {list_name_context}.
Use the provided functions to manage items and categories within this list.
Current available categories in this list:
{category_list_str}

When adding items, if a suitable category isn't present, create it automatically unless the user specifies otherwise or the item type is ambiguous.
When updating or deleting items/categories, refer to them by name if possible, but use the ID if the name is ambiguous or if the function requires it. Always confirm the item ID before updating if there's ambiguity.
Inform the user about the success or failure of operations, mentioning item/category names and the list context.
"""

    messages.insert(0, {"role": "system", "content": system_message})

    try:
        response = await client.chat.completions.create(
            model=settings.CHAT_MODEL,
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        while tool_calls:
            messages.append(response_message.model_dump(exclude_unset=True))

            # Execute tool calls, passing the list_id context
            function_responses = await asyncio.gather(
                *[execute_function_call(tool_call, db, current_user, list_id_context) for tool_call in tool_calls]
            )

            for tool_call, function_response in zip(tool_calls, function_responses):
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": tool_call.function.name,
                    "content": str(function_response), # Ensure response is stringified
                })

            # Get next response from AI
            response = await client.chat.completions.create(
                model=settings.CHAT_MODEL,
                messages=messages,
                tools=tools, # Provide tools again
            )
            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

        # Final response from the assistant
        final_content = response_message.content
        if not final_content and response.choices[0].finish_reason == 'tool_calls':
            # If the last action was just tool calls, provide a generic confirmation
             final_content = "OK, I've updated the list based on your request."

        return schemas.ChatResponse(
            message=schemas.ChatMessageOutput(
                role="assistant",
                content=final_content or "[Action completed]" # Fallback content
            )
        )

    except Exception as e:
        print(f"Chat Processing Error: {e}") # Log the error server-side
        # Consider logging traceback: import traceback; traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during chat processing: {str(e)}"
        )
