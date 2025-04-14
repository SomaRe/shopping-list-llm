from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, init_db
from app.api.endpoints import items, categories, chat

init_db()

app = FastAPI(
    title="Grocery List API",
    description="API for managing a grocery list with AI chat integration.",
    version="0.1.0",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(items.router, prefix="/api/v1/items", tags=["Items"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["AI Chat"])

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Grocery List API!"}
