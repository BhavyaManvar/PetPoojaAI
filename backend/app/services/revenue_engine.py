"""Revenue / Menu Intelligence engine.

Classifies menu items into BCG-style quadrants:
    Star        — high margin, high volume
    Plow Horse  — low margin, high volume
    Puzzle      — high margin, low volume
    Dog         — low margin, low volume

Core formulas:
    Contribution Margin  = price − food_cost
    Item Profit          = margin × quantity
    Sales Velocity       = total_sales / days_in_range
"""

from __future__ import annotations

import pandas as pd

# ─── Constants ──────────────────────────────────────────────────────────────────
DEFAULT_DAYS = 180  # fallback when order dates are unavailable


# ─── Low-level calculations ─────────────────────────────────────────────────────

def contribution_margin(price: float, food_cost: float) -> float:
    """Contribution Margin = price − food_cost."""
    return price - food_cost


def item_profit(margin: float, quantity: int) -> float:
    """Item Profit = margin × quantity sold."""
    return margin * quantity


def sales_velocity(total_qty_sold: int, days: int) -> float:
    """Sales Velocity = total_qty_sold / days in range."""
    if days <= 0:
        return 0.0
    return round(total_qty_sold / days, 2)


# ─── Aggregation helpers ────────────────────────────────────────────────────────

def _compute_days_in_range(order_items_df: pd.DataFrame) -> int:
    """Determine the selling-day span from order dates if available."""
    if "order_date" in order_items_df.columns:
        dates = pd.to_datetime(order_items_df["order_date"], errors="coerce").dropna()
        if not dates.empty:
            span = (dates.max() - dates.min()).days
            return max(span, 1)
    return DEFAULT_DAYS


def _aggregate_items(
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
) -> pd.DataFrame:
    """Aggregate order_items per item and merge with menu for margin calcs."""
    agg = (
        order_items_df
        .groupby("item_id")
        .agg(
            total_qty_sold=("quantity", "sum"),
            total_revenue=("line_total", "sum"),
        )
        .reset_index()
    )

    merged = menu_df[["item_id", "item_name", "category", "price", "cost"]].merge(
        agg, on="item_id", how="left",
    )
    merged["total_qty_sold"] = merged["total_qty_sold"].fillna(0).astype(int)
    merged["total_revenue"] = merged["total_revenue"].fillna(0)

    # Contribution Margin (per unit) and total
    merged["unit_margin"] = merged.apply(
        lambda r: contribution_margin(r["price"], r["cost"]), axis=1,
    )
    merged["total_cost"] = merged["cost"] * merged["total_qty_sold"]
    merged["contribution_margin"] = merged["total_revenue"] - merged["total_cost"]

    # Item Profit (margin × qty)
    merged["item_profit"] = merged.apply(
        lambda r: item_profit(r["unit_margin"], r["total_qty_sold"]), axis=1,
    )

    # Margin %
    merged["margin_pct"] = (
        (merged["contribution_margin"] / merged["total_revenue"].replace(0, 1) * 100)
        .round(1)
    )

    # Sales Velocity
    days = _compute_days_in_range(order_items_df)
    merged["sales_velocity"] = merged["total_qty_sold"].apply(
        lambda q: sales_velocity(q, days),
    )
    merged["avg_daily_sales"] = merged["sales_velocity"]  # alias

    return merged


# ─── BCG classification ─────────────────────────────────────────────────────────

def classify_menu_items(
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
    sales_df: pd.DataFrame | None = None,
) -> list[dict]:
    """Return a list of item insights with BCG quadrant classification."""
    if menu_df.empty or order_items_df.empty:
        return []

    # Use pre-aggregated Sales_Analytics if available, otherwise compute
    if sales_df is not None and not sales_df.empty:
        merged = sales_df.copy()
        # Ensure contribution_margin exists
        if "contribution_margin" not in merged.columns:
            if {"total_revenue", "cost", "total_qty_sold"}.issubset(merged.columns):
                merged["total_cost"] = merged["cost"] * merged["total_qty_sold"]
                merged["contribution_margin"] = merged["total_revenue"] - merged["total_cost"]
    else:
        merged = _aggregate_items(menu_df, order_items_df)

    median_volume = merged["total_qty_sold"].median()
    median_margin = merged["contribution_margin"].median()

    def _categorise(row: pd.Series) -> str:
        high_margin = row["contribution_margin"] >= median_margin
        high_volume = row["total_qty_sold"] >= median_volume
        if high_margin and high_volume:
            return "Star"
        if high_margin and not high_volume:
            return "Puzzle"
        if not high_margin and high_volume:
            return "Plow Horse"
        return "Dog"

    merged["menu_class"] = merged.apply(_categorise, axis=1)

    cols = [
        "item_id", "item_name", "category", "price", "cost",
        "total_qty_sold", "total_revenue", "unit_margin",
        "contribution_margin", "item_profit", "margin_pct",
        "sales_velocity", "avg_daily_sales", "menu_class",
    ]
    return merged[[c for c in cols if c in merged.columns]].to_dict(orient="records")


# ─── Hidden Stars & Risk Items ──────────────────────────────────────────────────

def find_hidden_stars(
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
    sales_df: pd.DataFrame | None = None,
) -> list[dict]:
    """Identify items with high margin but low sales — promotion candidates."""
    insights = classify_menu_items(menu_df, order_items_df, sales_df)
    return [
        {
            "item_id": i.get("item_id"),
            "item": i["item_name"],
            "margin": i["contribution_margin"],
            "margin_pct": i.get("margin_pct"),
            "sales": i.get("total_qty_sold", 0),
            "category": i["menu_class"],
            "reason": "High margin but low sales — promote this item",
        }
        for i in insights
        if i["menu_class"] == "Puzzle"
    ]


def get_risk_items(
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
    sales_df: pd.DataFrame | None = None,
) -> list[dict]:
    """Identify Dog items — low margin AND low volume."""
    insights = classify_menu_items(menu_df, order_items_df, sales_df)
    return [
        {
            "item_id": i.get("item_id"),
            "item": i["item_name"],
            "margin": i["contribution_margin"],
            "sales": i.get("total_qty_sold", 0),
            "category": i["menu_class"],
            "reason": "Low margin and low sales — consider removing",
        }
        for i in insights
        if i["menu_class"] == "Dog"
    ]


# ─── KPI Calculations ───────────────────────────────────────────────────────────

def compute_kpis(
    orders_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
) -> dict:
    """Compute high-level business KPIs from order data."""
    total_orders = int(orders_df["order_id"].nunique()) if not orders_df.empty else 0
    total_revenue = float(orders_df["total_amount"].sum()) if not orders_df.empty else 0.0
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders else 0.0

    # Unique items sold
    unique_items = int(order_items_df["item_id"].nunique()) if not order_items_df.empty else 0

    # Top city
    top_city = "N/A"
    revenue_by_city: dict = {}
    if "city" in orders_df.columns and not orders_df.empty:
        top_city = str(orders_df["city"].value_counts().idxmax())
        revenue_by_city = (
            orders_df.groupby("city")["total_amount"]
            .sum()
            .sort_values(ascending=False)
            .round(2)
            .to_dict()
        )

    # Revenue by order type
    revenue_by_order_type: dict = {}
    if "order_type" in orders_df.columns and not orders_df.empty:
        revenue_by_order_type = (
            orders_df.groupby("order_type")["total_amount"]
            .sum()
            .round(2)
            .to_dict()
        )

    # Top items by quantity
    top_items: list[dict] = []
    if not order_items_df.empty:
        top = (
            order_items_df.groupby("item_name")["quantity"]
            .sum()
            .sort_values(ascending=False)
            .head(5)
        )
        top_items = [{"item_name": k, "total_qty": int(v)} for k, v in top.items()]

    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "avg_order_value": avg_order_value,
        "unique_items_sold": unique_items,
        "top_city": top_city,
        "revenue_by_city": revenue_by_city,
        "revenue_by_order_type": revenue_by_order_type,
        "top_items": top_items,
    }
