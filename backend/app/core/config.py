import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME: str = "Grocery List API"
    PROJECT_VERSION: str = "0.1.0"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./grocery_app.db")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "default_secret_key") # Provide a default only for initial setup if needed
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    # Token expires in 30 minutes
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

    # Check if secret key is set, raise error if not for production environments
    if not JWT_SECRET_KEY or JWT_SECRET_KEY == "default_secret_key":
        print("WARNING: JWT_SECRET_KEY is not set or using default. Please set a strong secret key in .env")
        # raise ValueError("JWT_SECRET_KEY must be set in the environment variables")


settings = Settings()
