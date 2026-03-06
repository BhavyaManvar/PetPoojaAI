"""Shared dependencies injected into route handlers."""

from functools import lru_cache
import logging

import pandas as pd

from app.config import settings
from app.services.data_loader import load_data

logger = logging.getLogger(__name__)

_cached_dfs: dict[str, pd.DataFrame] | None = None


def get_dataframes() -> dict[str, pd.DataFrame]:
    """Load and cache the Excel workbook as a dict of DataFrames.

    Unlike @lru_cache, this does not permanently cache exceptions.
    """
    global _cached_dfs
    if _cached_dfs is not None:
        return _cached_dfs
    filepath = settings.DATA_DIR / settings.DATA_FILE
    logger.info("Loading data from %s", filepath)
    _cached_dfs = load_data(filepath)
    return _cached_dfs


def clear_dataframes_cache() -> None:
    """Clear the cached DataFrames (useful for testing or data reload)."""
    global _cached_dfs
    _cached_dfs = None
