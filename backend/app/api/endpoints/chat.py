from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import schemas, crud
from app.api import deps

router = APIRouter()

@router.post("/", response_model=schemas.ChatResponse)
async def handle_chat(
    request: schemas.ChatRequest,
    db: Session = Depends(deps.get_db)
):
    last_user_message = next((msg.content for msg in reversed(request.messages) if msg.role == "user"), "No message found")
    print(f"Received chat request. Last user message: {last_user_message}")

    dummy_response_content = f"Acknowledged: '{last_user_message}'. AI processing logic goes here. (Function calling not implemented yet)"

    return schemas.ChatResponse(
        message=schemas.ChatMessageOutput(
            role="assistant",
            content=dummy_response_content
        )
    )
