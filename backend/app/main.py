import pathlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.database import init_db
from app.api.endpoints import items, categories, chat, login, shopping_lists, users

# --------------------------
# Frontend Configuration
# --------------------------
APP_DIR = pathlib.Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent.parent
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"
INDEX_HTML_PATH = FRONTEND_DIST_DIR / "index.html"

# --------------------------
# Application Configuration
# --------------------------
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for managing shared/private grocery lists with AI chat integration.",
    version=settings.PROJECT_VERSION,
)

# --------------------------
# Database Initialization
# --------------------------
# TODO: Alembic migration
init_db()

# --------------------------
# Middleware Configuration
# --------------------------
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

# --------------------------
# API Routes Configuration
# --------------------------
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

# --------------------------
# Static Files Configuration
# --------------------------
# Serve React frontend build files
app.mount("/", StaticFiles(directory=FRONTEND_DIST_DIR, html=True), name="static")

# Catch-all route for client-side routing
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    try:
        return FileResponse(INDEX_HTML_PATH)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    

# --------------------------
# Root Endpoint
# --------------------------
@app.get("/", tags=["Root"])
async def read_root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME}!"}
