"""Menu Intelligence endpoints — item profitability, hidden stars, risk items."""

from fastapi import APIRouter, Depends
import pandas as pd

from app.dependencies import get_dataframes
from app.models.menu_models import (
    HiddenStarsResponse,
    MenuInsightsResponse,
    RiskItemsResponse,
)
from app.services.revenue_engine import classify_menu_items, find_hidden_stars, get_risk_items

router = APIRouter()


@router.get("/insights", response_model=MenuInsightsResponse)
async def menu_insights(dfs: dict[str, pd.DataFrame] = Depends(get_dataframes)):
    items = classify_menu_items(
        dfs["menu"], dfs["order_items"], dfs.get("sales_analytics"),
    )
    return {"items": items}


@router.get("/hidden-stars", response_model=HiddenStarsResponse)
async def hidden_stars(dfs: dict[str, pd.DataFrame] = Depends(get_dataframes)):
    stars = find_hidden_stars(
        dfs["menu"], dfs["order_items"], dfs.get("sales_analytics"),
    )
    return {"hidden_stars": stars}


@router.get("/risk-items", response_model=RiskItemsResponse)
async def risk_items(dfs: dict[str, pd.DataFrame] = Depends(get_dataframes)):
    risks = get_risk_items(
        dfs["menu"], dfs["order_items"], dfs.get("sales_analytics"),
    )
    return {"risk_items": risks}
