"""Menu Intelligence endpoints — item profitability, hidden stars, risk items."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import pandas as pd

from app.dependencies import get_dataframes
from app.models.menu_models import (
    CustomerMenuResponse,
    HiddenStarsResponse,
    MenuInsightsResponse,
    RiskItemsResponse,
)
from app.services.revenue_engine import classify_menu_items, find_hidden_stars, get_risk_items

router = APIRouter()

# ── Foodish API images — real food photos, deterministic per item ────
_FOODISH_MAP: dict[str, tuple[str, int]] = {
    # category -> (foodish_category, max_images)
    "pizza": ("pizza", 9),
    "burger": ("burger", 9),
    "south indian": ("dosa", 9),
    "breads": ("dosa", 9),
    "beverages": ("rice", 9),
    "main course": ("butter-chicken", 9),
    "rice": ("rice", 9),
    "desserts": ("dessert", 9),
    "starters": ("samosa", 9),
    "soups": ("rice", 9),
    "combo": ("biryani", 9),
    "chinese": ("pasta", 9),
    "italian": ("pasta", 9),
    "grill": ("burger", 9),
    "middle eastern": ("biryani", 9),
    "street food": ("samosa", 9),
    "sandwich": ("burger", 9),
    "wraps": ("dosa", 9),
    "sides": ("samosa", 9),
    "biryani": ("biryani", 9),
    "idli": ("idly", 9),
}


def _image_url(item_name: str, category: str, item_id: int) -> str:
    """Generate a deterministic Foodish API image URL for a menu item."""
    cat_key = category.lower()
    name_lower = item_name.lower()

    # Try to match by item name keywords first
    name_overrides = {
        "pizza": "pizza", "burger": "burger", "biryani": "biryani",
        "dosa": "dosa", "idli": "idly", "idly": "idly",
        "pasta": "pasta", "samosa": "samosa", "rice": "rice",
        "dessert": "dessert", "cake": "dessert", "ice cream": "dessert",
        "butter chicken": "butter-chicken", "chicken": "butter-chicken",
        "paneer": "butter-chicken", "naan": "dosa",
    }
    foodish_cat = None
    for keyword, fcat in name_overrides.items():
        if keyword in name_lower:
            foodish_cat = fcat
            break

    if not foodish_cat:
        entry = _FOODISH_MAP.get(cat_key, ("biryani", 9))
        foodish_cat = entry[0]

    img_num = (item_id % 9) + 1
    return f"https://foodish-api.com/images/{foodish_cat}/{foodish_cat}{img_num}.jpg"


@router.get("/items", response_model=CustomerMenuResponse)
async def menu_items(
    category: str | None = Query(None, description="Filter by category"),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Customer-facing menu: items with prices and image URLs from the dataset."""
    menu = dfs["menu"].copy()

    # Ensure boolean flags exist
    if "is_veg" not in menu.columns:
        menu["is_veg"] = True
    if "is_available" not in menu.columns:
        menu["is_available"] = True

    if category:
        menu = menu[menu["category"].str.lower() == category.lower()]

    items = []
    for _, row in menu.iterrows():
        items.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "category": str(row["category"]),
            "price": float(row.get("price", 0)),
            "is_veg": bool(row.get("is_veg", True)),
            "is_available": bool(row.get("is_available", True)),
            "image_url": _image_url(str(row["item_name"]), str(row["category"]), int(row["item_id"])),
        })

    categories = sorted(dfs["menu"]["category"].dropna().unique().tolist())
    return {"items": items, "categories": categories}


@router.get("/insights", response_model=MenuInsightsResponse)
async def menu_insights(dfs: dict[str, pd.DataFrame] = Depends(get_dataframes)):
    items = classify_menu_items(
        dfs["menu"], dfs["order_items"], dfs.get("sales_analytics"),
    )
    return {"items": items}


@router.get("/hidden-stars", response_model=HiddenStarsResponse)
async def hidden_stars(dfs: dict[str, pd.DataFrame] = Depends(get_dataframes)):
    stars = find_hidden_stars(
        dfs["menu"], dfs["order_items"], dfs.get("sales_analytics"),
    )
    return {"hidden_stars": stars}


@router.get("/risk-items", response_model=RiskItemsResponse)
async def risk_items(dfs: dict[str, pd.DataFrame] = Depends(get_dataframes)):
    risks = get_risk_items(
        dfs["menu"], dfs["order_items"], dfs.get("sales_analytics"),
    )
    return {"risk_items": risks}


# ── Admin: full menu list with cost data ─────────────────────────────────────

@router.get("/admin/list")
async def admin_menu_list(
    category: str | None = Query(None),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Full menu list for admin with cost, profit, sales data."""
    menu = dfs["menu"].copy()
    if category:
        menu = menu[menu["category"].str.lower() == category.lower()]

    items = []
    for _, row in menu.iterrows():
        price = float(row.get("price", 0))
        cost = float(row.get("cost", 0))
        margin = price - cost
        margin_pct = (margin / price * 100) if price > 0 else 0
        items.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "category": str(row.get("category", "")),
            "price": price,
            "cost": cost,
            "margin": round(margin, 2),
            "margin_pct": round(margin_pct, 1),
            "monthly_sales": int(row.get("monthly_sales", row.get("total_qty_sold", 0))),
            "is_available": bool(row.get("is_available", True)),
        })

    categories = sorted(dfs["menu"]["category"].dropna().unique().tolist())
    return {"items": items, "categories": categories, "total": len(items)}


# ── Admin: update item price ─────────────────────────────────────────────────

class PriceUpdate(BaseModel):
    price: float = Field(..., gt=0, description="New price in rupees")


@router.patch("/admin/{item_id}/price")
async def update_item_price(
    item_id: int,
    body: PriceUpdate,
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Update a menu item's price (in-memory, reflected immediately)."""
    menu = dfs["menu"]
    mask = menu["item_id"] == item_id
    if not mask.any():
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")

    old_price = float(menu.loc[mask, "price"].iloc[0])
    menu.loc[mask, "price"] = body.price

    row = menu.loc[mask].iloc[0]
    cost = float(row.get("cost", 0))
    margin = body.price - cost
    margin_pct = (margin / body.price * 100) if body.price > 0 else 0

    return {
        "item_id": item_id,
        "item_name": str(row["item_name"]),
        "old_price": old_price,
        "new_price": body.price,
        "margin": round(margin, 2),
        "margin_pct": round(margin_pct, 1),
    }
