"""Upsell Engine endpoints — add-on recommendations."""

from fastapi import APIRouter, Depends, Query
import pandas as pd

from app.dependencies import get_dataframes
from app.services.upsell_engine import recommend_addon, recommend_addons_batch

router = APIRouter()


@router.get("/for-item")
async def upsell_for_item(
    item_id: int = Query(..., description="Menu item ID to get upsell recommendations for"),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Return the best add-on recommendation for a given menu item."""
    result = recommend_addon(
        item_id,
        dfs["menu"],
        dfs["order_items"],
        dfs.get("sales_analytics"),
    )
    return result


@router.get("/for-items")
async def upsell_for_items(
    item_ids: str = Query(..., description="Comma-separated menu item IDs"),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Return upsell recommendations for multiple menu items (batch)."""
    ids = [int(x.strip()) for x in item_ids.split(",") if x.strip().isdigit()]
    results = recommend_addons_batch(
        ids,
        dfs["menu"],
        dfs["order_items"],
        dfs.get("sales_analytics"),
    )
    return {"recommendations": results, "count": len(results)}
