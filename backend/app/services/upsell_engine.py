"""Upsell Engine — recommend add-ons for a given menu item.

Strategies (in priority order):
  1. **Combo-based** — items most frequently ordered together (from association rules).
  2. **Category-based** — popular items from complementary categories.
  3. **Hidden-star promotion** — high-margin items that need sales lift.
"""

from __future__ import annotations

import pandas as pd

from app.services.combo_engine import get_top_combos
from app.services.revenue_engine import find_hidden_stars

# Complementary category map — if a customer orders from category X
# suggest items from the mapped categories.
_COMPLEMENT_MAP: dict[str, list[str]] = {
    "Pizza": ["Beverages", "Sides", "Desserts"],
    "Burger": ["Sides", "Beverages"],
    "Main Course": ["Breads", "Rice", "Beverages"],
    "South Indian": ["Beverages", "Sides"],
    "Rice": ["Main Course", "Breads"],
    "Breads": ["Main Course", "Rice"],
    "Sides": ["Beverages", "Pizza", "Burger"],
    "Starters": ["Main Course", "Beverages"],
    "Beverages": ["Desserts", "Sides"],
    "Desserts": ["Beverages"],
}


def recommend_addon(
    item_id: int,
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
    sales_df: pd.DataFrame | None = None,
    top_n: int = 3,
) -> dict:
    """Return the best upsell recommendation(s) for *item_id*.

    Response shape::

        {
            "item": "Paneer Tikka Pizza",
            "recommended_addon": "Coke",
            "strategy": "combo",
            "confidence": 0.71,
            "alternatives": [...]
        }
    """
    row = menu_df.loc[menu_df["item_id"] == item_id]
    if row.empty:
        return {"item": "Unknown", "recommended_addon": None, "strategy": None}

    item_name: str = row.iloc[0]["item_name"]
    item_category: str = row.iloc[0].get("category", "")

    candidates: list[dict] = []

    # ── Strategy 1 — combo-based upsell ─────────────────────────────────────
    combos = get_top_combos(order_items_df, top_n=50)
    for combo in combos:
        antecedent = combo.get("antecedent", "")
        consequent = combo.get("consequent", "")
        if antecedent == item_name:
            candidates.append({
                "addon": consequent,
                "strategy": "combo",
                "confidence": combo.get("confidence"),
                "support": combo.get("support"),
            })
        elif consequent == item_name:
            candidates.append({
                "addon": antecedent,
                "strategy": "combo",
                "confidence": combo.get("confidence"),
                "support": combo.get("support"),
            })

    # ── Strategy 2 — category complement ────────────────────────────────────
    complement_cats = _COMPLEMENT_MAP.get(item_category, [])
    if complement_cats:
        # Rank items in complementary categories by total order volume
        pop = (
            order_items_df
            .groupby("item_name")["quantity"]
            .sum()
            .reset_index()
            .rename(columns={"quantity": "total_qty"})
        )
        comp_items = menu_df.loc[
            (menu_df["category"].isin(complement_cats))
            & (menu_df["item_name"] != item_name)
        ][["item_id", "item_name"]].merge(pop, on="item_name", how="left")
        comp_items["total_qty"] = comp_items["total_qty"].fillna(0)
        comp_items = comp_items.sort_values("total_qty", ascending=False)
        for _, cr in comp_items.head(3).iterrows():
            candidates.append({
                "addon": cr["item_name"],
                "strategy": "category_complement",
                "confidence": None,
                "support": None,
            })

    # ── Strategy 3 — hidden star promotion ──────────────────────────────────
    stars = find_hidden_stars(menu_df, order_items_df, sales_df)
    for star in stars:
        if star["item"] != item_name:
            candidates.append({
                "addon": star["item"],
                "strategy": "hidden_star_promotion",
                "confidence": None,
                "support": None,
                "margin": star.get("margin"),
            })

    # De-duplicate by addon name, keep first (highest-priority strategy)
    seen: set[str] = set()
    unique: list[dict] = []
    for c in candidates:
        if c["addon"] not in seen:
            seen.add(c["addon"])
            unique.append(c)

    if not unique:
        return {"item": item_name, "recommended_addon": None, "strategy": None}

    best = unique[0]
    return {
        "item": item_name,
        "recommended_addon": best["addon"],
        "strategy": best["strategy"],
        "confidence": best.get("confidence"),
        "alternatives": [
            {"addon": u["addon"], "strategy": u["strategy"]}
            for u in unique[1: top_n]
        ],
    }


def recommend_addons_batch(
    item_ids: list[int],
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
    sales_df: pd.DataFrame | None = None,
) -> list[dict]:
    """Batch upsell recommendations for multiple items at once."""
    return [
        recommend_addon(iid, menu_df, order_items_df, sales_df)
        for iid in item_ids
    ]
