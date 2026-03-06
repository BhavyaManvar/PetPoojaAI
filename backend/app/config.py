"""Application configuration loaded from environment variables."""

import os
from pathlib import Path
from functools import lru_cache


class Settings:
    PROJECT_NAME: str = "PetPooja AI Revenue Copilot"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

    DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(Path(__file__).resolve().parents[2] / "data")))
    DATA_FILE: str = os.getenv("DATA_FILE", "restaurant_ai_hybrid_dataset.xlsx")

    ALLOWED_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:5173").split(",") if o.strip()
    ]
    ALLOWED_METHODS: list[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    ALLOWED_HEADERS: list[str] = ["Content-Type", "Authorization", "Accept"]

    MIN_SUPPORT: float = float(os.getenv("MIN_SUPPORT", "0.01"))
    MIN_CONFIDENCE: float = float(os.getenv("MIN_CONFIDENCE", "0.2"))
    FUZZY_MATCH_THRESHOLD: int = int(os.getenv("FUZZY_MATCH_THRESHOLD", "70"))

    # Auth
    ADMIN_EMAILS: list[str] = [
        e.strip() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()
    ]
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")

    # Gemini AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Rate limiting
    RATE_LIMIT: str = os.getenv("RATE_LIMIT", "60/minute")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
