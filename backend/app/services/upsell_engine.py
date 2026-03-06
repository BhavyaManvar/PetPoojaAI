"""Upsell Engine — intelligent recommendation engine for menu items.

Hard rules:
  1. Candidate must NOT be from the same category as selected item.
  2. Candidate must be from a COMPATIBLE category only.
  3. Candidate must be available.
  4. Prioritise: high profit (index 5) + low sales (index 6).
  5. Every call returns a different recommendation until cooldown expires.
"""

from __future__ import annotations

import random
from pathlib import Path
from typing import Any

import pandas as pd

# ── Import ITEMS and recommendation logic from data layer ───────────────────────
import sys

_DATA_DIR = Path(__file__).resolve().parents[3] / "data"
if str(_DATA_DIR) not in sys.path:
    sys.path.insert(0, str(_DATA_DIR))

from generate_dataset import (  # noqa: E402
    ITEMS,
    COMPATIBILITY,
    item_lookup,
    get_compatible_categories,
    filter_candidate_items,
    normalize_scores,
    _batch_score_candidates,
    weighted_pick_top_candidates,
    update_history,
    format_recommendation_message,
    WEIGHT_PROFIT,
    WEIGHT_LOW_SALES,
    WEIGHT_AFFORDABILITY,
    REPEAT_PENALTY,
    PRICE_FIT_LOW,
    PRICE_FIT_HIGH,
)

# ── Per-session in-memory history (resets on server restart) ────────────────────
# Maps selected_item_id → list of recently recommended item_ids
_recommendation_history: dict[int, list[int]] = {}


def _find_item_tuple(item_id: int, menu_df: pd.DataFrame | None = None) -> tuple | None:
    """Find the item tuple from ITEMS by item_id."""
    return item_lookup.get(item_id)


def recommend_addon(
    item_id: int,
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
    sales_df: pd.DataFrame | None = None,
) -> dict:
    """Return the best upsell recommendation for *item_id*.

    Uses the scoring engine from generate_dataset.py which enforces:
    - compatible category only (COMPATIBILITY map)
    - different category from selected
    - high profit + low sales priority
    - anti-repeat: different recommendation each time until cooldown
    - weighted random pick from top-5 candidates for variety
    """
    selected = _find_item_tuple(item_id)
    if not selected:
        return {
            "item": "Unknown",
            "recommended_addon": None,
            "addon_id": None,
            "strategy": None,
            "score": None,
            "recommended_category": None,
            "price": None,
            "profit": None,
            "sales": None,
            "message": None,
        }

    candidates = filter_candidate_items(selected, ITEMS)
    if not candidates:
        return {
            "item": selected[1],
            "recommended_addon": None,
            "addon_id": None,
            "strategy": "no_compatible_items",
            "score": None,
            "recommended_category": None,
            "price": None,
            "profit": None,
            "sales": None,
            "message": None,
        }

    # Score all candidates with anti-repeat history
    scored = _batch_score_candidates(selected, candidates, _recommendation_history)

    # Weighted random pick from top 5
    chosen_tuple, chosen_score = weighted_pick_top_candidates(scored, top_k=5)

    # Record in history (auto-evicts after 5 cycles)
    update_history(_recommendation_history, selected[0], chosen_tuple[0])

    message = format_recommendation_message(selected, chosen_tuple)

    return {
        "item": selected[1],
        "recommended_addon": chosen_tuple[1],
        "addon_id": chosen_tuple[0],
        "strategy": "smart_upsell",
        "confidence": None,
        "lift": None,
        "margin": chosen_tuple[5],
        "score": round(chosen_score, 4),
        "recommended_category": chosen_tuple[2],
        "price": chosen_tuple[3],
        "profit": chosen_tuple[5],
        "sales": chosen_tuple[6],
        "message": message,
    }


def recommend_addons_batch(
    item_ids: list[int],
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
    sales_df: pd.DataFrame | None = None,
) -> list[dict]:
    """Batch upsell: return recommendations for multiple items at once."""
    return [
        recommend_addon(iid, menu_df, order_items_df, sales_df)
        for iid in item_ids
    ]


def clear_history(item_id: int | None = None) -> None:
    """Clear recommendation history. If item_id given, clear only that item."""
    if item_id is not None:
        _recommendation_history.pop(item_id, None)
    else:
        _recommendation_history.clear()
