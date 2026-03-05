"""Combo Engine endpoints — market basket analysis."""

from fastapi import APIRouter, Depends, Query
import pandas as pd

from app.dependencies import get_dataframes
from app.services.combo_engine import build_baskets, get_pair_frequencies, get_top_combos

router = APIRouter()


@router.get("/top")
async def top_combos(
    min_support: float = Query(None, ge=0.0, le=1.0, description="Minimum support threshold"),
    min_confidence: float = Query(None, ge=0.0, le=1.0, description="Minimum confidence threshold"),
    top_n: int = Query(10, ge=1, le=100, description="Number of combos to return"),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Return the top recommended item-pair combos (Apriori / market-basket analysis)."""
    combos = get_top_combos(
        dfs["order_items"],
        min_support=min_support,
        min_confidence=min_confidence,
        top_n=top_n,
    )
    return {"combos": combos, "count": len(combos)}


@router.get("/baskets")
async def order_baskets(
    limit: int = Query(50, ge=1, le=500, description="Max baskets to return"),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Return order baskets (items grouped by order)."""
    baskets = build_baskets(dfs["order_items"])
    return {"baskets": baskets[:limit], "total_orders": len(baskets)}


@router.get("/pair-frequencies")
async def pair_frequencies(
    top_n: int = Query(20, ge=1, le=100),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Return raw item-pair co-occurrence frequencies."""
    pairs = get_pair_frequencies(dfs["order_items"], top_n=top_n)
    return {"pairs": pairs, "count": len(pairs)}
