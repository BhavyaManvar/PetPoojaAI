"""KOT (Kitchen Order Ticket) Service — automatic ticket generation post-order.

Generates KOT tickets when orders are confirmed, assigns kitchen stations,
and tracks preparation status through the kitchen workflow.
"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.services.modifier_config import format_modifier_text

_lock = threading.Lock()

# ── Persistent JSON KOT store ───────────────────────────────────────────────
_KOT_FILE = Path(__file__).resolve().parent.parent.parent.parent / "data" / "kots.json"
_kots: list[dict] = []

# Station assignment by category
STATION_MAP: dict[str, str] = {
    "Pizza": "Pizza Oven",
    "Burgers": "Grill Station",
    "Pasta": "Pasta Station",
    "Indian Main Course": "Main Kitchen",
    "Biryani & Rice": "Main Kitchen",
    "Chinese": "Wok Station",
    "Starters": "Fry Station",
    "Street Food": "Fry Station",
    "Tandoor": "Tandoor Station",
    "South Indian": "South Indian Counter",
    "Wraps & Rolls": "Grill Station",
    "Salads": "Cold Kitchen",
    "Desserts": "Dessert Station",
    "Ice Cream": "Dessert Station",
    "Beverages": "Beverage Counter",
    "Shakes & Smoothies": "Beverage Counter",
    "Coffee & Tea": "Beverage Counter",
}

DEFAULT_STATION = "Main Kitchen"

# Estimated prep time in minutes per category
PREP_TIME_MAP: dict[str, int] = {
    "Pizza": 15,
    "Burgers": 10,
    "Pasta": 12,
    "Indian Main Course": 18,
    "Biryani & Rice": 20,
    "Chinese": 12,
    "Starters": 8,
    "Street Food": 8,
    "Tandoor": 15,
    "South Indian": 10,
    "Wraps & Rolls": 8,
    "Salads": 5,
    "Desserts": 10,
    "Ice Cream": 3,
    "Beverages": 3,
    "Shakes & Smoothies": 5,
    "Coffee & Tea": 4,
}

DEFAULT_PREP_TIME = 12


def _load_kots() -> None:
    """Load KOTs from JSON file on startup."""
    if _KOT_FILE.exists():
        try:
            with open(_KOT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                _kots.clear()
                _kots.extend(data)
        except (json.JSONDecodeError, OSError):
            pass


def _save_kots() -> None:
    """Persist KOTs to JSON file."""
    try:
        _KOT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(_KOT_FILE, "w", encoding="utf-8") as f:
            json.dump(_kots, f, indent=2, ensure_ascii=False, default=str)
    except OSError:
        pass


# Load on import
_load_kots()


def generate_kot(order: dict) -> dict:
    """Generate a KOT from a confirmed order.

    Args:
        order: Full order dict with order_id, items, etc.

    Returns:
        KOT dict with ticket info and station assignments.
    """
    kot_id = f"KOT-{order['order_id']}-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc).isoformat()

    # Build KOT items with station assignments
    kot_items: list[dict] = []
    stations_involved: set[str] = set()
    max_prep_time = 0

    for item in order.get("items", []):
        category = item.get("category", "")
        station = STATION_MAP.get(category, DEFAULT_STATION)
        prep_time = PREP_TIME_MAP.get(category, DEFAULT_PREP_TIME)
        stations_involved.add(station)
        max_prep_time = max(max_prep_time, prep_time)

        modifier_text = ""
        if item.get("modifiers"):
            mods = item["modifiers"]
            if isinstance(mods, dict):
                modifier_text = format_modifier_text(mods)

        kot_items.append({
            "item_name": item["item_name"],
            "qty": item["qty"],
            "station": station,
            "modifiers": modifier_text,
            "item_status": "pending",
            "prep_time_min": prep_time,
        })

    kot = {
        "kot_id": kot_id,
        "order_id": order["order_id"],
        "status": "received",
        "priority": "normal" if len(order.get("items", [])) <= 4 else "high",
        "created_at": now,
        "updated_at": now,
        "stations": sorted(stations_involved),
        "estimated_prep_min": max_prep_time,
        "order_source": order.get("order_source", "manual"),
        "delivery_address": order.get("delivery_address", ""),
        "items": kot_items,
    }

    with _lock:
        _kots.append(kot)
        _save_kots()

    return kot


def get_all_kots(limit: int = 100) -> list[dict]:
    """Return KOTs newest first."""
    with _lock:
        return list(reversed(_kots[-limit:]))


def get_active_kots() -> list[dict]:
    """Return only non-completed KOTs."""
    with _lock:
        return [
            k for k in reversed(_kots)
            if k["status"] in ("received", "preparing")
        ]


def get_kot_by_id(kot_id: str) -> dict | None:
    """Find a single KOT by ID."""
    with _lock:
        for k in _kots:
            if k["kot_id"] == kot_id:
                return k
    return None


def get_kot_by_order_id(order_id: int) -> dict | None:
    """Find KOT for a specific order."""
    with _lock:
        for k in reversed(_kots):
            if k["order_id"] == order_id:
                return k
    return None


def update_kot_status(kot_id: str, new_status: str) -> dict | None:
    """Update KOT status: received → preparing → ready → served.

    Returns updated KOT or None if not found.
    """
    valid_statuses = {"received", "preparing", "ready", "served"}
    if new_status not in valid_statuses:
        return None

    with _lock:
        for k in _kots:
            if k["kot_id"] == kot_id:
                k["status"] = new_status
                k["updated_at"] = datetime.now(timezone.utc).isoformat()
                # Auto-update item statuses
                if new_status == "preparing":
                    for item in k["items"]:
                        if item["item_status"] == "pending":
                            item["item_status"] = "preparing"
                elif new_status == "ready":
                    for item in k["items"]:
                        item["item_status"] = "ready"
                elif new_status == "served":
                    for item in k["items"]:
                        item["item_status"] = "served"
                _save_kots()
                return k
    return None


def update_kot_item_status(kot_id: str, item_name: str, new_status: str) -> dict | None:
    """Update individual item status within a KOT."""
    with _lock:
        for k in _kots:
            if k["kot_id"] == kot_id:
                for item in k["items"]:
                    if item["item_name"] == item_name:
                        item["item_status"] = new_status
                # Auto-update KOT status based on items
                statuses = {item["item_status"] for item in k["items"]}
                if statuses == {"ready"}:
                    k["status"] = "ready"
                elif "preparing" in statuses:
                    k["status"] = "preparing"
                k["updated_at"] = datetime.now(timezone.utc).isoformat()
                _save_kots()
                return k
    return None


def get_kot_stats() -> dict:
    """Summary statistics for the kitchen dashboard."""
    with _lock:
        total = len(_kots)
        received = sum(1 for k in _kots if k["status"] == "received")
        preparing = sum(1 for k in _kots if k["status"] == "preparing")
        ready = sum(1 for k in _kots if k["status"] == "ready")
        served = sum(1 for k in _kots if k["status"] == "served")

        # Average prep time for completed KOTs
        avg_prep = 0
        completed_kots = [k for k in _kots if k["status"] in ("ready", "served")]
        if completed_kots:
            avg_prep = round(
                sum(k.get("estimated_prep_min", 0) for k in completed_kots) / len(completed_kots), 1
            )

        return {
            "total": total,
            "received": received,
            "preparing": preparing,
            "ready": ready,
            "served": served,
            "avg_prep_time_min": avg_prep,
        }
