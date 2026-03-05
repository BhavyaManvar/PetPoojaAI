"""Combo Engine & Upsell endpoints — market basket analysis and upselling."""

from fastapi import APIRouter, Depends, Query
import pandas as pd

from app.dependencies import get_dataframes
from app.models.combo_models import (
    TopCombosResponse,
    BasketStatsResponse,
    UpsellResult,
    UpsellBatchRequest,
    UpsellBatchResponse,
)
from app.services.combo_engine import get_top_combos, get_basket_stats, get_combos_by_category
from app.services.upsell_engine import recommend_addon, recommend_addons_batch

router = APIRouter()


# ── Combo endpoints ─────────────────────────────────────────────────────────────

@router.get("/top", response_model=TopCombosResponse)
async def top_combos(
    top_n: int = Query(10, ge=1, le=50, description="Number of combos to return"),
    min_support: float = Query(None, ge=0, le=1, description="Override minimum support"),
    min_confidence: float = Query(None, ge=0, le=1, description="Override minimum confidence"),
    category: str = Query(None, description="Filter combos by menu category"),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Return top item-pair combos discovered via Market Basket Analysis (Apriori)."""
    if category:
        combos = get_combos_by_category(
            dfs["order_items"], dfs["menu"], category, min_support, min_confidence, top_n,
        )
    else:
        combos = get_top_combos(dfs["order_items"], min_support, min_confidence, top_n)

    stats = get_basket_stats(dfs["order_items"])
    return {"combos": combos, "basket_stats": stats}


@router.get("/basket-stats", response_model=BasketStatsResponse)
async def basket_stats(
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Return order basket statistics (avg size, total baskets, etc.)."""
    return get_basket_stats(dfs["order_items"])


# ── Upsell endpoints ───────────────────────────────────────────────────────────

@router.get("/upsell/for-item", response_model=UpsellResult)
async def upsell_for_item(
    item_id: int = Query(..., description="Menu item ID"),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Return the best upsell add-on recommendation for a given menu item."""
    result = recommend_addon(
        item_id, dfs["menu"], dfs["order_items"], dfs.get("sales_analytics"),
    )
    return result


@router.post("/upsell/batch", response_model=UpsellBatchResponse)
async def upsell_batch(
    body: UpsellBatchRequest,
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Return upsell recommendations for multiple items at once."""
    results = recommend_addons_batch(
        body.item_ids, dfs["menu"], dfs["order_items"], dfs.get("sales_analytics"),
    )
    return {"results": results}
