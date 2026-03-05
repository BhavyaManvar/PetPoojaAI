"""Order Service — build, validate, and confirm PoS orders.

Handles two flows:
1. **Voice flow** — resolved item names → item IDs → PoS payload.
2. **Direct flow** — caller already provides item IDs.
"""

from __future__ import annotations

import threading
from typing import Optional

import pandas as pd

from app.utils.fuzzy_match import best_match

_lock = threading.Lock()
_order_counter: int = 1000


# ---------------------------------------------------------------------------
# Name → ID resolution (used by voice flow)
# ---------------------------------------------------------------------------

def resolve_items(
    parsed_items: list[dict],
    menu_df: pd.DataFrame,
) -> list[dict]:
    """Map voice-parsed item *names* to ``item_id`` values via fuzzy match.

    Args:
        parsed_items: ``[{"item": "Paneer Pizza", "qty": 1}, ...]``
        menu_df: Menu_Items DataFrame (must contain ``item_id``, ``item_name``).

    Returns:
        ``[{"item_id": 1, "item_name": "Paneer Tikka Pizza", "qty": 1}, ...]``
        Items that cannot be resolved are silently dropped.
    """
    menu_names: list[str] = menu_df["item_name"].tolist()
    name_to_id: dict[str, int] = dict(
        zip(menu_df["item_name"], menu_df["item_id"])
    )

    resolved: list[dict] = []
    for entry in parsed_items:
        name = entry.get("item", "")
        qty = entry.get("qty", 1)

        # Already an exact match?
        if name in name_to_id:
            resolved.append({
                "item_id": int(name_to_id[name]),
                "item_name": name,
                "qty": qty,
            })
            continue

        # Fuzzy fallback
        matched = best_match(name, menu_names)
        if matched and matched in name_to_id:
            resolved.append({
                "item_id": int(name_to_id[matched]),
                "item_name": matched,
                "qty": qty,
            })

    return resolved


# ---------------------------------------------------------------------------
# POS payload builder
# ---------------------------------------------------------------------------

def build_pos_payload(
    resolved_items: list[dict],
    menu_df: pd.DataFrame,
) -> dict:
    """Create a PoS-ready JSON payload from resolved items.

    Args:
        resolved_items: ``[{"item_id": 1, "item_name": "...", "qty": 1}, ...]``
        menu_df: Menu_Items DataFrame.

    Returns::

        {
            "order_id": 1001,
            "status": "confirmed",
            "total_price": 410.0,
            "items": [
                {
                    "item_id": 1,
                    "item_name": "Paneer Tikka Pizza",
                    "qty": 1,
                    "unit_price": 350.0,
                    "line_total": 350.0,
                },
                ...
            ],
        }
    """
    return create_order(
        [{"item_id": r["item_id"], "qty": r["qty"]} for r in resolved_items],
        menu_df,
    )


# ---------------------------------------------------------------------------
# Core order creator (works with item_id directly)
# ---------------------------------------------------------------------------

def create_order(items: list[dict], menu_df: pd.DataFrame) -> dict:
    """Create an order from parsed line items.

    Args:
        items: list of ``{"item_id": int, "qty": int}``
        menu_df: Menu_Items DataFrame

    Returns:
        Order confirmation dict with ``order_id``, ``status``,
        ``total_price``, and ``items``.
    """
    global _order_counter

    line_items: list[dict] = []
    total_price = 0.0

    for line in items:
        row = menu_df.loc[menu_df["item_id"] == line["item_id"]]
        if row.empty:
            continue
        unit_price = float(row.iloc[0]["price"])
        item_name = str(row.iloc[0]["item_name"])
        line_total = unit_price * line["qty"]
        total_price += line_total
        line_items.append({
            "item_id": int(line["item_id"]),
            "item_name": item_name,
            "qty": line["qty"],
            "unit_price": unit_price,
            "line_total": round(line_total, 2),
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
