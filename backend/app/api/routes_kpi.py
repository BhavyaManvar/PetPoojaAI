"""KPI endpoints — high-level business metrics."""

from fastapi import APIRouter, Depends
import pandas as pd

from app.dependencies import get_dataframes

router = APIRouter()


@router.get("")
async def get_kpis(dfs: dict[str, pd.DataFrame] = Depends(get_dataframes)):
    orders_df = dfs["orders"]
    order_items_df = dfs["order_items"]

    total_orders = int(orders_df["order_id"].nunique())
    total_revenue = float(orders_df["total_amount"].sum())
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders else 0

    top_city = "N/A"
    if "city" in orders_df.columns:
        top_city = str(orders_df["city"].value_counts().idxmax())

    # Revenue by city breakdown
    revenue_by_city = (
        orders_df.groupby("city")["total_amount"].sum()
        .sort_values(ascending=False)
        .round(2)
        .to_dict()
    ) if "city" in orders_df.columns else {}

    # Revenue by order type
    revenue_by_type = (
        orders_df.groupby("order_type")["total_amount"].sum()
        .round(2)
        .to_dict()
    ) if "order_type" in orders_df.columns else {}

    # Top 5 items by quantity
    top_items = []
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
        "top_city": top_city,
        "revenue_by_city": revenue_by_city,
        "revenue_by_order_type": revenue_by_type,
        "top_items": top_items,
    }
