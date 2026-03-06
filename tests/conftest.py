"""Shared test fixtures for PetPooja AI tests."""

import pandas as pd
import pytest


@pytest.fixture()
def sample_menu_df():
    """Standard 5-item menu covering all BCG quadrants."""
    return pd.DataFrame({
        "item_id": [1, 2, 3, 4, 5],
        "item_name": [
            "Paneer Tikka Pizza",
            "Garlic Bread",
            "Veg Burger",
            "Masala Dosa",
            "Cold Coffee",
        ],
        "category": ["Pizza", "Sides", "Burger", "South Indian", "Beverages"],
        "price": [350.0, 120.0, 180.0, 150.0, 120.0],
        "cost": [150.0, 36.0, 100.0, 80.0, 40.0],
    })


@pytest.fixture()
def sample_order_items_df():
    """Order items with diverse sales volumes for 5 menu items."""
    rows = []
    # Item 1: high demand (30 orders)
    for i in range(30):
        rows.append({"order_id": i + 1, "item_id": 1, "item_name": "Paneer Tikka Pizza",
                      "quantity": 1, "unit_price": 350.0, "line_total": 350.0})
    # Item 2: medium demand (15 orders)
    for i in range(15):
        rows.append({"order_id": i + 100, "item_id": 2, "item_name": "Garlic Bread",
                      "quantity": 2, "unit_price": 120.0, "line_total": 240.0})
    # Item 3: medium demand (20 orders)
    for i in range(20):
        rows.append({"order_id": i + 200, "item_id": 3, "item_name": "Veg Burger",
                      "quantity": 1, "unit_price": 180.0, "line_total": 180.0})
    # Item 4: low demand (3 orders)
    for i in range(3):
        rows.append({"order_id": i + 300, "item_id": 4, "item_name": "Masala Dosa",
                      "quantity": 1, "unit_price": 150.0, "line_total": 150.0})
    # Item 5: medium demand (18 orders)
    for i in range(18):
        rows.append({"order_id": i + 400, "item_id": 5, "item_name": "Cold Coffee",
                      "quantity": 1, "unit_price": 120.0, "line_total": 120.0})
    return pd.DataFrame(rows)


@pytest.fixture()
def sample_orders_df():
    """5 orders for KPI testing."""
    return pd.DataFrame({
        "order_id": [1, 2, 3, 4, 5],
        "order_date": pd.to_datetime([
            "2025-01-01", "2025-01-15", "2025-02-01", "2025-03-01", "2025-03-15",
        ]),
        "city": ["Mumbai", "Delhi", "Mumbai", "Mumbai", "Delhi"],
        "order_type": ["Dine-in", "Delivery", "Dine-in", "Takeaway", "Delivery"],
        "total_amount": [590.0, 530.0, 270.0, 700.0, 180.0],
    })
