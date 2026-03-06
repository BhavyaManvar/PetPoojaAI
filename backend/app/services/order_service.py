"""Order Service — build, validate, confirm, and store PoS orders.

Handles two flows:
1. **Voice flow** — resolved item names → item IDs → PoS payload.
2. **Direct flow** — caller already provides item IDs.

Orders are stored in-memory so they can be listed via GET /orders.
"""

from __future__ import annotations

import threading
import random
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd

from app.utils.fuzzy_match import best_match

_lock = threading.Lock()
_order_counter: int = 1000

# ── In-memory order store ───────────────────────────────────────────────────────
_orders: list[dict] = []


def get_all_orders(limit: int = 100) -> list[dict]:
    """Return stored orders (newest first)."""
    with _lock:
        return list(reversed(_orders[-limit:]))


def get_order_by_id(order_id: int) -> dict | None:
    """Find a single order by ID."""
    with _lock:
        for o in _orders:
            if o["order_id"] == order_id:
                return o
    return None


def _store_order(order: dict) -> None:
    """Append an order to the in-memory store."""
    with _lock:
        _orders.append(order)


def get_order_count() -> int:
    with _lock:
        return len(_orders)


def clear_orders() -> None:
    """Clear all stored orders (used by seed)."""
    with _lock:
        _orders.clear()


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

def create_order(
    items: list[dict],
    menu_df: pd.DataFrame,
    order_source: str = "manual",
    created_at: datetime | None = None,
) -> dict:
    """Create an order from parsed line items and store it.

    Args:
        items: list of ``{"item_id": int, "qty": int}``
        menu_df: Menu_Items DataFrame
        order_source: "voice" | "manual" | "online"
        created_at: override timestamp (used by seed)

    Returns:
        Order confirmation dict.
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
        category = str(row.iloc[0].get("category", ""))
        line_total = unit_price * line["qty"]
        total_price += line_total
        line_items.append({
            "item_id": int(line["item_id"]),
            "item_name": item_name,
            "category": category,
            "qty": line["qty"],
            "unit_price": unit_price,
            "line_total": round(line_total, 2),
        })

    with _lock:
        _order_counter += 1
        order_id = _order_counter

    order = {
        "order_id": order_id,
        "status": "confirmed",
        "total_price": round(total_price, 2),
        "order_source": order_source,
        "created_at": (created_at or datetime.utcnow()).isoformat(),
        "items": line_items,
    }

    _store_order(order)
    return order


# ---------------------------------------------------------------------------
# Seed realistic orders for demo / testing
# ---------------------------------------------------------------------------

def seed_demo_orders(menu_df: pd.DataFrame, count: int = 25) -> list[dict]:
    """Generate *count* realistic demo orders with varied items, qtys, and timestamps."""
    clear_orders()

    if menu_df.empty:
        return []

    ids = menu_df["item_id"].tolist()
    sources = ["voice", "manual", "online"]
    now = datetime.utcnow()

    seeded: list[dict] = []
    for i in range(count):
        n_items = random.randint(1, 4)
        chosen_ids = random.sample(ids, min(n_items, len(ids)))
        items = [{"item_id": int(cid), "qty": random.randint(1, 3)} for cid in chosen_ids]
        offset_hours = random.randint(0, 7 * 24)
        ts = now - timedelta(hours=offset_hours)
        source = random.choice(sources)

        order = create_order(items, menu_df, order_source=source, created_at=ts)
        if random.random() < 0.15:
            order["status"] = "preparing"
        elif random.random() < 0.10:
            order["status"] = "pending"
        elif random.random() < 0.6:
            order["status"] = "completed"
        seeded.append(order)

    return seeded
