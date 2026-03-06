"""Menu Intelligence endpoints — item profitability, hidden stars, risk items."""

from fastapi import APIRouter, Depends, Query
import pandas as pd
from urllib.parse import quote

from app.dependencies import get_dataframes
from app.models.menu_models import (
    CustomerMenuResponse,
    HiddenStarsResponse,
    MenuInsightsResponse,
    RiskItemsResponse,
)
from app.services.revenue_engine import classify_menu_items, find_hidden_stars, get_risk_items

router = APIRouter()

# ── Deterministic food image (Unsplash source — free, no API key) ────
_CATEGORY_PHOTOS: dict[str, str] = {
    "pizza": "pizza",
    "burger": "burger",
    "sides": "fries",
    "south indian": "dosa",
    "breads": "naan-bread",
    "beverages": "drinks",
    "main course": "curry",
    "rice": "fried-rice",
    "desserts": "dessert",
    "starters": "appetizer",
    "soups": "soup",
    "combo": "food-platter",
    "chinese": "noodles",
    "italian": "pasta",
    "grill": "grilled-food",
    "middle eastern": "falafel",
    "street food": "street-food",
    "sandwich": "sandwich",
    "wraps": "wrap",
}


def _image_url(item_name: str, category: str, item_id: int) -> str:
    """Generate a deterministic placeholder image URL for a menu item."""
    keyword = _CATEGORY_PHOTOS.get(category.lower(), "food")
    encoded = quote(f"{keyword} {item_name.split()[0]}")
    return f"https://source.unsplash.com/400x300/?{encoded}&sig={item_id}"


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
