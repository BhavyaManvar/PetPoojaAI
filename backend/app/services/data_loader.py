"""Load and normalise the restaurant dataset from Excel.

Expected sheets: Menu_Items, Orders, Order_Items, Sales_Analytics, Voice_Orders
"""

from pathlib import Path

import pandas as pd


# Canonical internal sheet names
_SHEET_MAP = {
    "menu_items": "menu",
    "orders": "orders",
    "order_items": "order_items",
    "sales_analytics": "sales_analytics",
    "voice_orders": "voice_orders",
}


def load_data(filepath: Path) -> dict[str, pd.DataFrame]:
    """Read the hybrid Excel workbook and return a dict of DataFrames."""
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"Data file not found: {filepath}")

    raw_sheets = pd.read_excel(filepath, sheet_name=None, engine="openpyxl")

    # Normalise sheet names → internal keys
    dfs: dict[str, pd.DataFrame] = {}
    for raw_name, df in raw_sheets.items():
        key = raw_name.lower().strip().replace(" ", "_")
        internal = _SHEET_MAP.get(key, key)
        df.columns = [c.lower().strip().replace(" ", "_") for c in df.columns]
        dfs[internal] = df

    for required in ("menu", "orders", "order_items"):
        if required not in dfs:
            raise KeyError(f"Missing required sheet: '{required}'")

    # ── Type coercion: Menu ─────────────────────────────────────────────
    menu = dfs["menu"]
    for col in ("price", "cost"):
        if col in menu.columns:
            menu[col] = pd.to_numeric(menu[col], errors="coerce").fillna(0)

    # Pre-compute contribution margin per unit on the menu
    if "price" in menu.columns and "cost" in menu.columns:
        menu["unit_margin"] = menu["price"] - menu["cost"]

    # ── Type coercion: Order Items ──────────────────────────────────────
    oi = dfs["order_items"]
    for col in ("quantity", "unit_price", "line_total"):
        if col in oi.columns:
            oi[col] = pd.to_numeric(oi[col], errors="coerce").fillna(0)

    # ── Type coercion: Orders (dates) ──────────────────────────────────
    orders = dfs["orders"]
    if "order_date" in orders.columns:
        orders["order_date"] = pd.to_datetime(
            orders["order_date"], errors="coerce",
        )
    for col in ("total_amount",):
        if col in orders.columns:
            orders[col] = pd.to_numeric(orders[col], errors="coerce").fillna(0)

    # ── Build joined table: Menu + Order_Items + Orders ────────────────
    dfs["joined"] = _build_joined(menu, oi, orders)

    return dfs


def _build_joined(
    menu: pd.DataFrame,
    order_items: pd.DataFrame,
    orders: pd.DataFrame,
) -> pd.DataFrame:
    """Create a denormalised table joining Menu_Items ↔ Order_Items ↔ Orders."""
    merged = order_items.merge(
        menu[["item_id", "item_name", "category", "price", "cost"]],
        on="item_id",
        how="left",
        suffixes=("", "_menu"),
    )
    # Use menu-level item_name if order_items already has one
    if "item_name_menu" in merged.columns:
        merged["item_name"] = merged["item_name_menu"].fillna(merged["item_name"])
        merged.drop(columns=["item_name_menu"], inplace=True)

    if "order_id" in orders.columns:
        merged = merged.merge(
            orders[["order_id", "order_date", "city", "order_type", "total_amount"]].rename(
                columns={"total_amount": "order_total"},
            ),
            on="order_id",
            how="left",
        )

    # Compute per-line item cost and profit
    if "cost" in merged.columns and "quantity" in merged.columns:
        merged["line_cost"] = merged["cost"] * merged["quantity"]
        merged["line_profit"] = merged["line_total"] - merged["line_cost"]

    return merged
