"""Application configuration loaded from environment variables."""

import os
from pathlib import Path


class Settings:
    PROJECT_NAME: str = "PetPooja AI Revenue Copilot"
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(Path(__file__).resolve().parents[2] / "data")))
    DATA_FILE: str = os.getenv("DATA_FILE", "restaurant_ai_hybrid_dataset.xlsx")
    ALLOWED_ORIGINS: list[str] = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    MIN_SUPPORT: float = float(os.getenv("MIN_SUPPORT", "0.005"))
    MIN_CONFIDENCE: float = float(os.getenv("MIN_CONFIDENCE", "0.1"))
    FUZZY_MATCH_THRESHOLD: int = int(os.getenv("FUZZY_MATCH_THRESHOLD", "70"))


settings = Settings()
