"""Revenue / Menu Intelligence engine.

Classifies menu items into BCG-style quadrants:
    Star        — high margin, high volume
    Plow Horse  — low margin, high volume
    Puzzle      — high margin, low volume
    Dog         — low margin, low volume

Also detects hidden stars (high margin but under-promoted items).
"""

import pandas as pd


def classify_menu_items(
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
    sales_df: pd.DataFrame | None = None,
) -> list[dict]:
    """Return a list of item insights with BCG category classification."""
    if menu_df.empty or order_items_df.empty:
        return []

    # Use pre-aggregated Sales_Analytics if available, otherwise compute
    if sales_df is not None and not sales_df.empty:
        merged = sales_df.copy()
    else:
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
            agg, on="item_id", how="left"
        )
        merged["total_qty_sold"] = merged["total_qty_sold"].fillna(0).astype(int)
        merged["total_revenue"] = merged["total_revenue"].fillna(0)
        merged["total_cost"] = merged["total_qty_sold"] * merged["cost"]
        merged["contribution_margin"] = merged["total_revenue"] - merged["total_cost"]
        merged["margin_pct"] = (
            (merged["contribution_margin"] / merged["total_revenue"].replace(0, 1) * 100)
            .round(1)
        )
        merged["avg_daily_sales"] = (merged["total_qty_sold"] / 180).round(1)

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
        "item_id", "item_name", "category", "total_qty_sold", "total_revenue",
        "contribution_margin", "margin_pct", "avg_daily_sales", "menu_class",
    ]
    return merged[[c for c in cols if c in merged.columns]].to_dict(orient="records")


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
            "reason": "Low margin and low sales — consider removing",
        }
        for i in insights
        if i["menu_class"] == "Dog"
    ]
