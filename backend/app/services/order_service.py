"""Order Service — build, validate, and confirm PoS orders."""

import threading

import pandas as pd


_lock = threading.Lock()
_order_counter: int = 1000


def create_order(items: list[dict], menu_df: pd.DataFrame) -> dict:
    """Create an order from parsed line items.

    Args:
        items: list of {"item_id": int, "qty": int}
        menu_df: Menu_Items DataFrame

    Returns:
        order confirmation dict
    """
    global _order_counter

    line_items = []
    total_price = 0.0

    for line in items:
        row = menu_df.loc[menu_df["item_id"] == line["item_id"]]
        if row.empty:
            continue
        unit_price = float(row.iloc[0]["price"])
        item_name = row.iloc[0]["item_name"]
        line_total = unit_price * line["qty"]
        total_price += line_total
        line_items.append({
            "item_id": line["item_id"],
            "item_name": item_name,
            "qty": line["qty"],
            "unit_price": unit_price,
            "line_total": line_total,
        })

    with _lock:
        _order_counter += 1
        order_id = _order_counter

    return {
        "order_id": order_id,
        "status": "confirmed",
        "total_price": round(total_price, 2),
        "items": line_items,
    }
