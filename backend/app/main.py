from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import config
from app.core.config import settings
# Adjusted imports
from app.database import init_db
from app.api.endpoints import items, categories, chat
from app.api.endpoints import login # Import login endpoint

# Call init_db() to ensure tables are created on startup
# Consider moving this to a separate script/migration tool for production
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for managing a grocery list with AI chat integration.",
    version=settings.PROJECT_VERSION,
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    # Add any other origins needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(login.router, prefix="/api/v1/login", tags=["Login"]) # Add login router
app.include_router(categories.router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(items.router, prefix="/api/v1/items", tags=["Items"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["AI Chat"]) # Protect if needed

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME}!"}
