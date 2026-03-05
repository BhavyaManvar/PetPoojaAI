"""Upsell Engine — recommend add-ons for a given menu item.

Strategies (in priority order):
  1. Cross-category combo: items from a *different* category frequently ordered together
  2. Same-category combo: frequently co-purchased from the same category
  3. Hidden-star promotion: high-margin items that need sales lift
  4. Popular-addon fallback: most-ordered item not already in the basket
"""

from __future__ import annotations

import pandas as pd

from app.services.combo_engine import get_top_combos
from app.services.revenue_engine import find_hidden_stars


# ── Category Mapping Helper ─────────────────────────────────────────────────────

def _build_category_map(menu_df: pd.DataFrame) -> dict[str, str]:
    """Return {item_name: category} lookup."""
    if menu_df.empty:
        return {}
    return dict(zip(menu_df["item_name"], menu_df["category"]))


# ── Core Upsell Logic ───────────────────────────────────────────────────────────

def recommend_addon(
    item_id: int,
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
    sales_df: pd.DataFrame | None = None,
) -> dict:
    """Return the best upsell recommendation for *item_id*.

    Response keys:
        item               — source item name
        recommended_addon  — suggested add-on name (or None)
        addon_id           — item_id of the add-on (or None)
        strategy           — which strategy matched
        confidence         — association rule confidence (if combo-based)
        lift               — association rule lift (if combo-based)
        margin             — contribution margin (if hidden-star strategy)
    """
    row = menu_df.loc[menu_df["item_id"] == item_id]
    if row.empty:
        return {"item": "Unknown", "recommended_addon": None, "addon_id": None, "strategy": None}

    item_name: str = row.iloc[0]["item_name"]
    item_category: str = row.iloc[0].get("category", "")
    cat_map = _build_category_map(menu_df)
    id_map: dict[str, int] = dict(zip(menu_df["item_name"], menu_df["item_id"]))

    combos = get_top_combos(order_items_df, top_n=100)

    # Strategy 1 — Cross-category combo (e.g., pizza → coke, burger → fries)
    for combo in combos:
        ant, cons = combo["antecedent"], combo["consequent"]
        if item_name == ant:
            addon_cat = cat_map.get(cons, "")
            if addon_cat and addon_cat != item_category:
                return _combo_result(item_name, cons, id_map, combo, "cross_category_combo")
        if item_name == cons:
            addon_cat = cat_map.get(ant, "")
            if addon_cat and addon_cat != item_category:
                return _combo_result(item_name, ant, id_map, combo, "cross_category_combo")

    # Strategy 2 — Same-category combo fallback
    for combo in combos:
        ant, cons = combo["antecedent"], combo["consequent"]
        if item_name == ant:
            return _combo_result(item_name, cons, id_map, combo, "same_category_combo")
        if item_name == cons:
            return _combo_result(item_name, ant, id_map, combo, "same_category_combo")

    # Strategy 3 — Hidden star promotion
    stars = find_hidden_stars(menu_df, order_items_df, sales_df)
    if stars:
        top_star = stars[0]
        if top_star["item"] != item_name:
            return {
                "item": item_name,
                "recommended_addon": top_star["item"],
                "addon_id": top_star.get("item_id"),
                "strategy": "hidden_star_promotion",
                "margin": top_star["margin"],
            }

    # Strategy 4 — Popular addon fallback (most ordered item that isn't this one)
    if not order_items_df.empty:
        popular = (
            order_items_df[order_items_df["item_name"] != item_name]
            .groupby("item_name")["quantity"]
            .sum()
            .sort_values(ascending=False)
        )
        if not popular.empty:
            addon_name = popular.index[0]
            return {
                "item": item_name,
                "recommended_addon": addon_name,
                "addon_id": id_map.get(addon_name),
                "strategy": "popular_addon",
            }

    return {"item": item_name, "recommended_addon": None, "addon_id": None, "strategy": None}


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


# ── Private Helpers ─────────────────────────────────────────────────────────────

def _combo_result(
    item_name: str,
    addon_name: str,
    id_map: dict[str, int],
    combo: dict,
    strategy: str,
) -> dict:
    return {
        "item": item_name,
        "recommended_addon": addon_name,
        "addon_id": id_map.get(addon_name),
        "strategy": strategy,
        "confidence": combo.get("confidence"),
        "lift": combo.get("lift"),
    }
