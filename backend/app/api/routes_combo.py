"""Combo Engine endpoints — market basket analysis and upselling."""

from fastapi import APIRouter, Depends, Query
import pandas as pd

from app.dependencies import get_dataframes
from app.services.combo_engine import get_top_combos
from app.services.upsell_engine import recommend_addon

router = APIRouter()


@router.get("/top")
async def top_combos(dfs: dict[str, pd.DataFrame] = Depends(get_dataframes)):
    combos = get_top_combos(dfs["order_items"])
    return {"combos": combos}


@router.get("/upsell/for-item")
async def upsell_for_item(
    item_id: int = Query(..., description="Menu item ID"),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    result = recommend_addon(
        item_id, dfs["menu"], dfs["order_items"], dfs.get("sales_analytics"),
    )
    return result
