"""Upsell Engine — recommend add-ons for a given menu item.

Strategies:
  1. Combo-based: items frequently ordered together (from association rules)
  2. Hidden-star promotion: high-margin items that need sales lift
"""

import pandas as pd

from app.services.combo_engine import get_top_combos
from app.services.revenue_engine import find_hidden_stars


def recommend_addon(
    item_id: int,
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
    sales_df: pd.DataFrame | None = None,
) -> dict:
    """Return the best upsell recommendation for *item_id*."""
    row = menu_df.loc[menu_df["item_id"] == item_id]
    if row.empty:
        return {"item": "Unknown", "recommended_addon": None, "strategy": None}

    item_name: str = row.iloc[0]["item_name"]

    # Strategy 1 — combo-based upsell
    combos = get_top_combos(order_items_df, top_n=50)
    for combo in combos:
        parts = [p.strip() for p in combo["combo"].split("+")]
        if item_name in parts:
            addon = [p for p in parts if p != item_name]
            if addon:
                return {
                    "item": item_name,
                    "recommended_addon": addon[0],
                    "strategy": "combo",
                    "confidence": combo.get("confidence"),
                }

    # Strategy 2 — hidden star promotion
    stars = find_hidden_stars(menu_df, order_items_df, sales_df)
    if stars:
        top_star = stars[0]
        if top_star["item"] != item_name:
            return {
                "item": item_name,
                "recommended_addon": top_star["item"],
                "strategy": "hidden_star_promotion",
                "margin": top_star["margin"],
            }

    return {"item": item_name, "recommended_addon": None, "strategy": None}
