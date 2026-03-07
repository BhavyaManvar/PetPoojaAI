"""Modifier configuration — sizes, spice levels, and add-ons for menu items.

Each category of items has its own set of available modifiers with price adjustments.
"""

from __future__ import annotations

# ── Size options by category ─────────────────────────────────────────────────
# (label, price_multiplier) — multiplier applied to base price
SIZE_OPTIONS: dict[str, list[dict]] = {
    "Pizza": [
        {"name": "Regular", "price_add": 0},
        {"name": "Medium", "price_add": 50},
        {"name": "Large", "price_add": 100},
    ],
    "Burgers": [
        {"name": "Regular", "price_add": 0},
        {"name": "Double", "price_add": 60},
    ],
    "Beverages": [
        {"name": "Small", "price_add": 0},
        {"name": "Medium", "price_add": 20},
        {"name": "Large", "price_add": 40},
    ],
    "Shakes & Smoothies": [
        {"name": "Regular", "price_add": 0},
        {"name": "Large", "price_add": 30},
    ],
    "Coffee & Tea": [
        {"name": "Regular", "price_add": 0},
        {"name": "Large", "price_add": 25},
    ],
}

# ── Spice levels ──────────────────────────────────────────────────────────────
# Categories that support spice customization
SPICE_CATEGORIES = {
    "Pizza", "Burgers", "Indian Main Course", "Chinese", "Starters",
    "Biryani & Rice", "Street Food", "Wraps & Rolls", "Pasta",
    "South Indian", "Tandoor",
}

SPICE_LEVELS = [
    {"name": "Mild", "price_add": 0},
    {"name": "Medium", "price_add": 0},
    {"name": "Spicy", "price_add": 0},
    {"name": "Extra Spicy", "price_add": 10},
]

# ── Add-ons ───────────────────────────────────────────────────────────────────
# Category → list of available add-ons with flat price
ADDON_OPTIONS: dict[str, list[dict]] = {
    "Pizza": [
        {"name": "Extra Cheese", "price_add": 40},
        {"name": "Mushrooms", "price_add": 30},
        {"name": "Olives", "price_add": 25},
        {"name": "Jalapenos", "price_add": 20},
        {"name": "Onions", "price_add": 15},
        {"name": "Capsicum", "price_add": 15},
    ],
    "Burgers": [
        {"name": "Extra Cheese", "price_add": 30},
        {"name": "Extra Patty", "price_add": 60},
        {"name": "Bacon", "price_add": 50},
        {"name": "Jalapenos", "price_add": 20},
    ],
    "Pasta": [
        {"name": "Extra Cheese", "price_add": 35},
        {"name": "Mushrooms", "price_add": 30},
        {"name": "Olives", "price_add": 25},
        {"name": "Garlic Bread Side", "price_add": 60},
    ],
    "Indian Main Course": [
        {"name": "Extra Gravy", "price_add": 30},
        {"name": "Extra Paneer", "price_add": 50},
        {"name": "Butter Topping", "price_add": 20},
    ],
    "Biryani & Rice": [
        {"name": "Extra Raita", "price_add": 25},
        {"name": "Extra Salan", "price_add": 20},
        {"name": "Boiled Egg", "price_add": 15},
    ],
    "Beverages": [
        {"name": "Ice", "price_add": 0},
        {"name": "Lemon", "price_add": 5},
    ],
    "Shakes & Smoothies": [
        {"name": "Whipped Cream", "price_add": 20},
        {"name": "Chocolate Drizzle", "price_add": 15},
        {"name": "Extra Scoop", "price_add": 40},
    ],
}


# ── Helper functions ──────────────────────────────────────────────────────────

def get_modifiers_for_category(category: str) -> dict:
    """Return all available modifiers for a given menu item category."""
    result: dict = {}

    if category in SIZE_OPTIONS:
        result["sizes"] = SIZE_OPTIONS[category]

    if category in SPICE_CATEGORIES:
        result["spice_levels"] = SPICE_LEVELS

    if category in ADDON_OPTIONS:
        result["addons"] = ADDON_OPTIONS[category]

    return result


def calculate_modifier_price(category: str, modifiers: dict) -> float:
    """Calculate extra price from selected modifiers.

    Args:
        category: Menu item category
        modifiers: {"size": "Large", "spice": "Spicy", "addons": ["Extra Cheese", "Mushrooms"]}

    Returns:
        Total extra price from modifiers.
    """
    extra = 0.0

    # Size
    size = modifiers.get("size", "")
    if size and category in SIZE_OPTIONS:
        for opt in SIZE_OPTIONS[category]:
            if opt["name"].lower() == size.lower():
                extra += opt["price_add"]
                break

    # Spice
    spice = modifiers.get("spice", "")
    if spice and category in SPICE_CATEGORIES:
        for opt in SPICE_LEVELS:
            if opt["name"].lower() == spice.lower():
                extra += opt["price_add"]
                break

    # Add-ons
    addons = modifiers.get("addons", [])
    if addons and category in ADDON_OPTIONS:
        addon_map = {a["name"].lower(): a["price_add"] for a in ADDON_OPTIONS[category]}
        for addon in addons:
            extra += addon_map.get(addon.lower(), 0)

    return extra


def format_modifier_text(modifiers: dict) -> str:
    """Human-readable modifier description."""
    parts = []
    if modifiers.get("size"):
        parts.append(modifiers["size"])
    if modifiers.get("spice"):
        parts.append(modifiers["spice"])
    for addon in modifiers.get("addons", []):
        parts.append(f"+{addon}")
    return ", ".join(parts) if parts else ""
