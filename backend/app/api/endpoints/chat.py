import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from openai import AsyncOpenAI

from app import schemas, models
from app.api import deps
from app.core.config import settings
from .chat_tools import tools, execute_function_call

router = APIRouter()

client = AsyncOpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url=settings.OPENROUTER_BASE_URL,
) if settings.OPENROUTER_API_KEY else None

@router.post("/", response_model=schemas.ChatResponse)
async def handle_chat(
    request: schemas.ChatRequest,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat service is not configured."
        )

    messages = [msg.model_dump() for msg in request.messages]
    messages.insert(0, {
        "role": "system",
        "content": f"You are a helpful grocery list assistant for {current_user.username}."
    })

    try:
        # Initial API call
        response = await client.chat.completions.create(
            model=settings.CHAT_MODEL,
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        # Handle potential multiple rounds of function calls
        while tool_calls:
            messages.append(response_message.model_dump(exclude_unset=True))
            
            # Execute all tool calls in parallel
            function_responses = await asyncio.gather(
                *[execute_function_call(tool_call, db, current_user) for tool_call in tool_calls]
            )
            
            # Append all function responses
            for tool_call, function_response in zip(tool_calls, function_responses):
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": tool_call.function.name,
                    "content": str(function_response),
                })

            # Get next response from AI
            response = await client.chat.completions.create(
                model=settings.CHAT_MODEL,
                messages=messages,
                tools=tools,
            )
            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

        return schemas.ChatResponse(
            message=schemas.ChatMessageOutput(
                role="assistant",
                content=response_message.content or "[No content]"
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat error: {str(e)}"
        )
