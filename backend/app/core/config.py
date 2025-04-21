import os
from dotenv import load_dotenv
from pathlib import Path

CONFIG_DIR = Path(__file__).resolve().parent
APP_DIR = CONFIG_DIR.parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

env_path = BACKEND_DIR / '.env'
load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME: str = "Grocery List API"
    PROJECT_VERSION: str = "0.1.0"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./grocery_app.db")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "default_secret_key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    # Token expires in 30 minutes
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

    # --- OpenRouter Settings ---
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    CHAT_MODEL: str = os.getenv("CHAT_MODEL", "google/gemini-2.0-flash-001")

    # Check if secret key is set, raise error if not for production environments
    if not JWT_SECRET_KEY or JWT_SECRET_KEY == "default_secret_key":
        print("WARNING: JWT_SECRET_KEY is not set or using default. Please set a strong secret key in .env")
        # raise ValueError("JWT_SECRET_KEY must be set in the environment variables")

    if not OPENROUTER_API_KEY:
        print("WARNING: OPENROUTER_API_KEY is not set in .env. Chat functionality will not work.")


settings = Settings()
