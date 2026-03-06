"""Price Optimization endpoints — data-driven pricing recommendations."""

from fastapi import APIRouter, Depends, Query
import pandas as pd

from app.dependencies import get_dataframes
from app.models.menu_models import (
    PriceRecommendationsResponse,
    PriceSummaryResponse,
)
from app.services.price_engine import get_price_recommendations, get_price_summary

router = APIRouter()


@router.get("/recommendations", response_model=PriceRecommendationsResponse)
async def price_recommendations(
    category: str | None = Query(None, description="Filter by menu category"),
    action: str | None = Query(None, description="Filter by action: increase, decrease, keep"),
    priority: str | None = Query(None, description="Filter by priority: high, medium, low"),
    target_margin: float = Query(0.60, ge=0.1, le=0.95, description="Target margin %"),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Get price optimization recommendations for all menu items."""
    recs = get_price_recommendations(dfs["menu"], dfs["order_items"], target_margin)

    if category:
        recs = [r for r in recs if r["category"].lower() == category.lower()]
    if action:
        recs = [r for r in recs if r["action"] == action.lower()]
    if priority:
        recs = [r for r in recs if r["priority"] == priority.lower()]

    return {"recommendations": recs}


@router.get("/summary", response_model=PriceSummaryResponse)
async def price_summary(
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """High-level pricing health summary."""
    summary = get_price_summary(dfs["menu"], dfs["order_items"])
    return summary
