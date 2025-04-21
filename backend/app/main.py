from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import init_db
from app.api.endpoints import items, categories, chat, login, shopping_lists, users

# TODO: Alembic migration
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for managing shared/private grocery lists with AI chat integration.",
    version=settings.PROJECT_VERSION,
)

# CORS Middleware
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Routers ---
api_prefix = "/api/v1"

app.include_router(
    login.router, 
    prefix=f"{api_prefix}/login", 
    tags=["Login"]
    )

app.include_router(
    users.router, 
    prefix=f"{api_prefix}/users", 
    tags=["Users"]
    )

app.include_router(
    shopping_lists.router, 
    prefix=f"{api_prefix}/lists", 
    tags=["Shopping Lists"]
    )

app.include_router(
    categories.router,
    prefix=f"{api_prefix}/lists/{{list_id}}/categories",
    tags=["Categories"]
    )

app.include_router(
    items.router,
    prefix=f"{api_prefix}/items",
    tags=["Items"]
    )


app.include_router(
    chat.router,
    prefix=f"{api_prefix}/chat",
    tags=["AI Chat"]
    )

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME}!"}
