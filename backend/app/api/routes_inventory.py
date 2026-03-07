"""Inventory performance signal endpoints."""

from fastapi import APIRouter

from app.dependencies import get_dataframes
from app.services.inventory_engine import get_inventory, get_inventory_summary

router = APIRouter()


@router.get("/items")
async def inventory_items(category: str | None = None, stock_status: str | None = None, severity: str | None = None):
    """Return inventory data with performance signals for every menu item."""
    dfs = get_dataframes()
    items = get_inventory(dfs["menu"], dfs["order_items"])

    if category:
        items = [i for i in items if i["category"].lower() == category.lower()]
    if stock_status:
        items = [i for i in items if i["stock_status"] == stock_status]
    if severity:
        items = [i for i in items if i["signal_severity"] == severity]

    return {"items": items, "total": len(items)}


@router.get("/summary")
async def inventory_summary():
    """High-level inventory health summary with alert counts."""
    dfs = get_dataframes()
    return get_inventory_summary(dfs["menu"], dfs["order_items"])


@router.get("/alerts")
async def inventory_alerts():
    """Return only items with critical or warning signals."""
    dfs = get_dataframes()
    items = get_inventory(dfs["menu"], dfs["order_items"])
    alerts = [i for i in items if i["signal_severity"] in ("critical", "warning")]
    return {"alerts": alerts, "total": len(alerts)}
