"""Inventory-linked performance signals engine.

Generates realistic stock levels from sales data and links them
to BCG menu classification to produce actionable inventory alerts.
"""

from __future__ import annotations

import hashlib
import random
from typing import Any

import pandas as pd

from app.services.revenue_engine import classify_menu_items


def _deterministic_seed(item_id: int) -> int:
    """Return a stable random seed per item so stock levels are consistent."""
    return int(hashlib.md5(str(item_id).encode()).hexdigest()[:8], 16)


def get_inventory(
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
) -> list[dict[str, Any]]:
    """Build inventory data with stock levels and performance signals.

    Stock is simulated deterministically from sales velocity so results
    are consistent across requests yet realistic.
    """
    if menu_df.empty or order_items_df.empty:
        return []

    classified = classify_menu_items(menu_df, order_items_df)

    results: list[dict[str, Any]] = []
    for item in classified:
        item_id = item["item_id"]
        rng = random.Random(_deterministic_seed(item_id))

        daily_sales = item.get("avg_daily_sales", 0) or 0
        total_sold = item.get("total_qty_sold", 0) or 0
        menu_class = item.get("menu_class", "Dog")

        # Weekly sales rate is more meaningful for stock planning
        weekly_sales = daily_sales * 7

        # Simulate current stock: random between 0 and ~4 weeks of supply
        # Dogs/Puzzles sometimes have excess (over-ordered); Stars rarely out of stock
        if weekly_sales > 0:
            if menu_class == "Dog":
                weeks_of_stock = rng.uniform(0.5, 8.0)
            elif menu_class == "Puzzle":
                weeks_of_stock = rng.uniform(0.3, 6.0)
            elif menu_class == "Star":
                weeks_of_stock = rng.uniform(0.0, 3.5)
            else:  # Plow Horse
                weeks_of_stock = rng.uniform(0.0, 4.0)
            current_stock = max(0, round(weekly_sales * weeks_of_stock))
        else:
            current_stock = rng.randint(0, 15)

        # Reorder point = ~1 week of sales
        reorder_point = max(2, round(weekly_sales * 1))
        # Par level = ~2 weeks of sales
        par_level = max(4, round(weekly_sales * 2))

        # Determine stock status
        if current_stock == 0:
            stock_status = "out_of_stock"
        elif current_stock <= reorder_point:
            stock_status = "low"
        elif current_stock > par_level:
            stock_status = "overstock"
        else:
            stock_status = "adequate"

        # Days until stockout estimate
        days_until_stockout = round(current_stock / daily_sales, 1) if daily_sales > 0 else None

        # Performance signal: combine BCG class with stock status
        signal = _compute_signal(menu_class, stock_status, item)

        results.append({
            "item_id": item_id,
            "item_name": item.get("item_name", ""),
            "category": item.get("category", ""),
            "menu_class": menu_class,
            "price": item.get("price", 0),
            "cost": item.get("cost", 0),
            "unit_margin": item.get("unit_margin", 0),
            "total_qty_sold": item.get("total_qty_sold", 0),
            "avg_daily_sales": round(daily_sales, 1),
            "current_stock": current_stock,
            "reorder_point": reorder_point,
            "par_level": par_level,
            "stock_status": stock_status,
            "days_until_stockout": days_until_stockout,
            "signal": signal["type"],
            "signal_severity": signal["severity"],
            "signal_message": signal["message"],
            "action": signal["action"],
        })

    # Sort: critical signals first, then by severity
    severity_order = {"critical": 0, "warning": 1, "info": 2, "ok": 3}
    results.sort(key=lambda r: (severity_order.get(r["signal_severity"], 9), r["item_name"]))
    return results


def _compute_signal(
    menu_class: str,
    stock_status: str,
    item: dict,
) -> dict[str, str]:
    """Generate an inventory-performance signal based on BCG class + stock."""
    name = item.get("item_name", "Item")
    margin = item.get("unit_margin", 0)

    # Critical: Star item running out
    if menu_class == "Star" and stock_status in ("low", "out_of_stock"):
        return {
            "type": "star_stockout_risk",
            "severity": "critical",
            "message": f"{name} is a Star (high margin + high sales) but stock is {stock_status.replace('_', ' ')}. Restock immediately to avoid revenue loss.",
            "action": "Restock urgently",
        }

    # Critical: Out of stock for any item with sales
    if stock_status == "out_of_stock" and item.get("total_qty_sold", 0) > 0:
        return {
            "type": "out_of_stock",
            "severity": "critical",
            "message": f"{name} is out of stock with average {item.get('avg_daily_sales', 0):.1f} daily sales. Lost revenue opportunity.",
            "action": "Restock immediately",
        }

    # Warning: Plowhorse low stock — high volume item
    if menu_class == "Plow Horse" and stock_status == "low":
        return {
            "type": "plowhorse_low",
            "severity": "warning",
            "message": f"{name} is a high-volume Plowhorse with low stock. Stockout will impact order fulfillment.",
            "action": "Reorder soon",
        }

    # Warning: Dog with overstock — dead capital
    if menu_class == "Dog" and stock_status == "overstock":
        return {
            "type": "dog_overstock",
            "severity": "warning",
            "message": f"{name} is a Dog (low margin + low sales) with excess inventory. ₹{margin * item.get('current_stock', 0):,.0f} tied up in dead stock.",
            "action": "Run clearance / reduce order quantity",
        }

    # Warning: Puzzle overstock — high margin but nobody's buying
    if menu_class == "Puzzle" and stock_status == "overstock":
        return {
            "type": "puzzle_overstock",
            "severity": "warning",
            "message": f"{name} is a high-margin Puzzle with excess stock. Promote it via combos or specials to move inventory.",
            "action": "Promote to increase sales",
        }

    # Info: Low stock general
    if stock_status == "low":
        return {
            "type": "low_stock",
            "severity": "info",
            "message": f"{name} stock is below reorder point.",
            "action": "Plan reorder",
        }

    # Info: Overstock general
    if stock_status == "overstock":
        return {
            "type": "overstock",
            "severity": "info",
            "message": f"{name} has surplus inventory. Consider reducing next order.",
            "action": "Reduce order quantity",
        }

    # OK
    return {
        "type": "healthy",
        "severity": "ok",
        "message": f"{name} stock levels are adequate.",
        "action": "No action needed",
    }


def get_inventory_summary(
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
) -> dict[str, Any]:
    """High-level inventory health summary."""
    inventory = get_inventory(menu_df, order_items_df)
    total = len(inventory)

    out_of_stock = sum(1 for i in inventory if i["stock_status"] == "out_of_stock")
    low_stock = sum(1 for i in inventory if i["stock_status"] == "low")
    overstock = sum(1 for i in inventory if i["stock_status"] == "overstock")
    adequate = sum(1 for i in inventory if i["stock_status"] == "adequate")

    critical_alerts = [i for i in inventory if i["signal_severity"] == "critical"]
    warning_alerts = [i for i in inventory if i["signal_severity"] == "warning"]

    # Estimate dead stock value (Dog + overstock items)
    dead_stock_value = sum(
        i["cost"] * i["current_stock"]
        for i in inventory
        if i["menu_class"] == "Dog" and i["stock_status"] == "overstock"
    )

    # Estimate at-risk revenue (Star/Plowhorse items low/out of stock)
    at_risk_revenue = sum(
        i["price"] * i["avg_daily_sales"] * 7  # 7-day projected loss
        for i in inventory
        if i["menu_class"] in ("Star", "Plow Horse")
        and i["stock_status"] in ("low", "out_of_stock")
    )

    return {
        "total_items": total,
        "out_of_stock": out_of_stock,
        "low_stock": low_stock,
        "adequate": adequate,
        "overstock": overstock,
        "critical_alerts": len(critical_alerts),
        "warning_alerts": len(warning_alerts),
        "dead_stock_value": round(dead_stock_value, 0),
        "at_risk_revenue_7d": round(at_risk_revenue, 0),
    }


def get_inventory_for_chatbot(
    menu_df: pd.DataFrame,
    order_items_df: pd.DataFrame,
) -> str:
    """Format inventory signals as a text block for AI chatbot context."""
    summary = get_inventory_summary(menu_df, order_items_df)
    inventory = get_inventory(menu_df, order_items_df)

    critical = [i for i in inventory if i["signal_severity"] == "critical"]
    warnings = [i for i in inventory if i["signal_severity"] == "warning"]

    lines = [
        "=== Inventory Health ===",
        f"Total items tracked: {summary['total_items']}",
        f"Out of stock: {summary['out_of_stock']} | Low stock: {summary['low_stock']} | Adequate: {summary['adequate']} | Overstock: {summary['overstock']}",
        f"Dead stock value (Dog overstock): ₹{summary['dead_stock_value']:,.0f}",
        f"At-risk revenue (7-day, Star/Plowhorse low stock): ₹{summary['at_risk_revenue_7d']:,.0f}",
    ]

    if critical:
        lines.append("\n🚨 Critical Alerts:")
        for c in critical[:5]:
            lines.append(f"  - {c['item_name']}: {c['signal_message']}")

    if warnings:
        lines.append("\n⚠️ Warnings:")
        for w in warnings[:5]:
            lines.append(f"  - {w['item_name']}: {w['signal_message']}")

    return "\n".join(lines)
