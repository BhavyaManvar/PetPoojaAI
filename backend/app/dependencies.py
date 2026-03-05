"""Shared dependencies injected into route handlers."""

from functools import lru_cache

import pandas as pd

from app.config import settings
from app.services.data_loader import load_data


@lru_cache(maxsize=1)
def get_dataframes() -> dict[str, pd.DataFrame]:
    """Load and cache the Excel workbook as a dict of DataFrames."""
    return load_data(settings.DATA_DIR / settings.DATA_FILE)
