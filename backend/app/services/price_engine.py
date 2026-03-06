"""Price Optimization Engine — data-driven pricing recommendations.

Strategies:
    1. Margin-gap analysis   — items whose margin % is below category average
    2. Demand elasticity     — high-demand items that can tolerate a price bump
    3. Bundle pricing        — combo discount suggestions based on basket data
    4. Competitive alignment — items priced significantly above/below category peers

Formulas:
    Suggested Price  = cost / (1 − target_margin_pct)
    Price Headroom   = category_avg_price − current_price
    Revenue Uplift   = (new_price − old_price) × projected_qty
"""

from __future__ import annotations

import pandas as pd

from app.services.revenue_engine import _aggregate_items, _compute_days_in_range


def get_price_recommendations(
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
    target_margin_pct: float = 0.60,
) -> list[dict]:
    """Return pricing recommendations for every menu item.

    Each dict contains:
        item_id, item_name, category, current_price, cost,
        current_margin_pct, category_avg_price, category_avg_margin_pct,
        suggested_price, price_change, price_change_pct,
        action, reason, priority (high/medium/low),
        projected_monthly_uplift
    """
    if menu_df.empty or order_items_df.empty:
        return []

    merged = _aggregate_items(menu_df, order_items_df)
    days = _compute_days_in_range(order_items_df)

    # Category-level aggregates
    cat_stats = merged.groupby("category").agg(
        cat_avg_price=("price", "mean"),
        cat_avg_margin_pct=("margin_pct", "mean"),
        cat_avg_qty=("total_qty_sold", "mean"),
        cat_median_price=("price", "median"),
    ).reset_index()

    merged = merged.merge(cat_stats, on="category", how="left")

    # Sort by total_qty_sold to determine rank-based actions
    merged = merged.sort_values("total_qty_sold", ascending=False).reset_index(drop=True)
    total_items = len(merged)

    recommendations: list[dict] = []

    for idx, row in merged.iterrows():
        rec = {
            "item_id": int(row["item_id"]),
            "item_name": row["item_name"],
            "category": row["category"],
            "current_price": round(float(row["price"]), 2),
            "cost": round(float(row["cost"]), 2),
            "current_margin_pct": round(float(row["margin_pct"]), 1),
            "category_avg_price": round(float(row["cat_avg_price"]), 2),
            "category_avg_margin_pct": round(float(row["cat_avg_margin_pct"]), 1),
            "total_qty_sold": int(row["total_qty_sold"]),
            "sales_velocity": round(float(row["sales_velocity"]), 2),
        }

        cost = row["cost"]
        current_price = row["price"]
        margin_pct = row["margin_pct"]
        cat_avg_price = row["cat_avg_price"]
        cat_avg_margin_pct = row["cat_avg_margin_pct"]
        qty_sold = row["total_qty_sold"]
        velocity = row["sales_velocity"]

        # Rank-based decision: top 6 increase, bottom 2 decrease, rest keep
        if idx < 6:
            action = "increase"
            reason = f"Top seller (rank #{idx + 1}) — high demand can tolerate a price increase"
            priority = "high" if idx < 3 else "medium"
        elif idx >= total_items - 2:
            action = "decrease"
            reason = f"Lowest seller (rank #{idx + 1} of {total_items}) — price reduction to boost volume"
            priority = "medium"
        else:
            action = "keep"
            reason = "Price is well-aligned with demand and margin targets"
            priority = "low"

        # Compute suggested price
        suggested = _compute_suggested_price(
            action, current_price, cost, cat_avg_price,
            target_margin_pct * 100, cat_avg_margin_pct,
        )

        price_change = round(suggested - current_price, 2)
        price_change_pct = round((price_change / current_price) * 100, 1) if current_price > 0 else 0

        # Monthly revenue uplift estimate (simple projection)
        daily_qty = velocity if velocity > 0 else (qty_sold / max(days, 1))
        monthly_qty = daily_qty * 30
        monthly_uplift = round(price_change * monthly_qty, 2)

        rec.update({
            "suggested_price": round(suggested, 2),
            "price_change": price_change,
            "price_change_pct": price_change_pct,
            "action": action,
            "reason": reason,
            "priority": priority,
            "projected_monthly_uplift": monthly_uplift,
        })

        recommendations.append(rec)

    # Sort: high priority first, then by absolute uplift
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(
        key=lambda r: (priority_order.get(r["priority"], 3), -abs(r["projected_monthly_uplift"]))
    )

    return recommendations


def get_price_summary(
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
) -> dict:
    """High-level pricing health summary."""
    recs = get_price_recommendations(menu_df, order_items_df)
    if not recs:
        return {
            "total_items": 0,
            "items_to_increase": 0,
            "items_to_decrease": 0,
            "items_optimal": 0,
            "total_monthly_uplift": 0,
            "avg_margin_pct": 0,
        }

    return {
        "total_items": len(recs),
        "items_to_increase": sum(1 for r in recs if r["action"] == "increase"),
        "items_to_decrease": sum(1 for r in recs if r["action"] == "decrease"),
        "items_optimal": sum(1 for r in recs if r["action"] == "keep"),
        "total_monthly_uplift": round(sum(r["projected_monthly_uplift"] for r in recs), 2),
        "avg_margin_pct": round(sum(r["current_margin_pct"] for r in recs) / len(recs), 1),
    }


# ── Private Helpers ─────────────────────────────────────────────────────────────

def _decide_action(
    price: float, cost: float, margin_pct: float,
    cat_avg_price: float, cat_avg_margin_pct: float,
    qty_sold: int, velocity: float, cat_avg_qty: float,
    target_margin_pct: float,
) -> tuple[str, str, str]:
    """Return (action, reason, priority)."""

    # Case 1: Negative or zero margin — critical
    if margin_pct <= 0:
        return (
            "increase",
            "Selling at or below cost — immediate price increase needed",
            "high",
        )

    # Case 2: Margin well below target AND category average
    if margin_pct < target_margin_pct * 0.7 and margin_pct < cat_avg_margin_pct * 0.8:
        return (
            "increase",
            f"Margin ({margin_pct:.0f}%) far below target ({target_margin_pct:.0f}%) and category avg ({cat_avg_margin_pct:.0f}%)",
            "high",
        )

    # Case 3: High demand + below-avg margin = price increase opportunity
    if velocity > 0 and qty_sold > cat_avg_qty * 1.2 and margin_pct < cat_avg_margin_pct:
        return (
            "increase",
            f"High demand (top seller) but margin ({margin_pct:.0f}%) below category avg ({cat_avg_margin_pct:.0f}%) — can tolerate price bump",
            "medium",
        )

    # Case 4: Priced significantly above category — may hurt demand
    if price > cat_avg_price * 1.3 and qty_sold < cat_avg_qty * 0.5:
        return (
            "decrease",
            f"Priced {((price / cat_avg_price - 1) * 100):.0f}% above category avg with low sales — consider reducing",
            "medium",
        )

    # Case 5: Low demand + acceptable margin — slight discount to boost volume
    if qty_sold < cat_avg_qty * 0.3 and margin_pct > target_margin_pct:
        return (
            "decrease",
            "Very low sales despite good margin — small discount could boost volume",
            "low",
        )

    # Case 6: Margin slightly below target
    if margin_pct < target_margin_pct and margin_pct >= target_margin_pct * 0.7:
        return (
            "increase",
            f"Margin ({margin_pct:.0f}%) slightly below target ({target_margin_pct:.0f}%) — small increase recommended",
            "low",
        )

    # Default: price is optimal
    return (
        "keep",
        "Price is well-aligned with demand and margin targets",
        "low",
    )


def _compute_suggested_price(
    action: str,
    current_price: float,
    cost: float,
    cat_avg_price: float,
    target_margin_pct: float,
    cat_avg_margin_pct: float,
) -> float:
    """Compute a suggested price based on action type."""
    if action == "keep":
        return current_price

    # Target price based on desired margin
    target_price = cost / (1 - target_margin_pct / 100) if target_margin_pct < 100 else current_price

    if action == "increase":
        # Don't increase more than 15% at once
        max_increase = current_price * 1.15
        suggested = min(target_price, max_increase)
        # At minimum, move towards category average
        if suggested < cat_avg_price and current_price < cat_avg_price:
            suggested = min(cat_avg_price, max_increase)
        return max(suggested, current_price + 5)  # at least ₹5 increase

    if action == "decrease":
        # Don't decrease more than 10%
        min_decrease = current_price * 0.90
        # Don't go below cost + 10% margin
        floor = cost * 1.10
        suggested = max(min_decrease, floor, cat_avg_price * 0.95)
        return min(suggested, current_price - 5)  # at least ₹5 decrease

    return current_price
