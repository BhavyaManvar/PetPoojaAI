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

    # Type coercion
    menu = dfs["menu"]
    for col in ("price", "cost"):
        if col in menu.columns:
            menu[col] = pd.to_numeric(menu[col], errors="coerce").fillna(0)

    oi = dfs["order_items"]
    for col in ("quantity", "unit_price", "line_total"):
        if col in oi.columns:
            oi[col] = pd.to_numeric(oi[col], errors="coerce").fillna(0)

    return dfs
