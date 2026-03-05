"""Tests for the Revenue / Menu Intelligence engine."""

import pandas as pd
import pytest

from app.services.revenue_engine import classify_menu_items, find_hidden_stars, get_risk_items


@pytest.fixture()
def menu_df():
    return pd.DataFrame({
        "item_id": [1, 2, 3, 4],
        "item_name": ["Paneer Tikka Pizza", "Garlic Bread", "Veg Burger", "Masala Dosa"],
        "category": ["Pizza", "Sides", "Burger", "South Indian"],
        "price": [350.0, 120.0, 180.0, 150.0],
        "cost": [150.0, 36.0, 100.0, 80.0],
    })


@pytest.fixture()
def order_items_df():
    return pd.DataFrame({
        "order_id": [1, 1, 2, 2, 3, 3, 4, 5],
        "item_id": [1, 2, 1, 3, 2, 4, 1, 3],
        "item_name": [
            "Paneer Tikka Pizza", "Garlic Bread",
            "Paneer Tikka Pizza", "Veg Burger",
            "Garlic Bread", "Masala Dosa",
            "Paneer Tikka Pizza", "Veg Burger",
        ],
        "quantity": [1, 2, 1, 1, 1, 1, 2, 1],
        "unit_price": [350.0, 120.0, 350.0, 180.0, 120.0, 150.0, 350.0, 180.0],
        "line_total": [350.0, 240.0, 350.0, 180.0, 120.0, 150.0, 700.0, 180.0],
    })


def test_classify_returns_all_items(menu_df, order_items_df):
    result = classify_menu_items(menu_df, order_items_df)
    assert len(result) == 4
    names = {r["item_name"] for r in result}
    assert "Paneer Tikka Pizza" in names


def test_classify_assigns_valid_quadrants(menu_df, order_items_df):
    result = classify_menu_items(menu_df, order_items_df)
    valid = {"Star", "Puzzle", "Plow Horse", "Dog"}
    for item in result:
        assert item["quadrant"] in valid


def test_hidden_stars_have_reason(menu_df, order_items_df):
    stars = find_hidden_stars(menu_df, order_items_df)
    for s in stars:
        assert "reason" in s


def test_risk_items_are_dogs(menu_df, order_items_df):
    risks = get_risk_items(menu_df, order_items_df)
    for r in risks:
        assert "reason" in r


def test_empty_dataframes():
    empty_menu = pd.DataFrame(columns=["item_id", "item_name", "category", "price", "cost"])
    empty_oi = pd.DataFrame(columns=["order_id", "item_id", "item_name", "quantity", "unit_price", "line_total"])
    assert classify_menu_items(empty_menu, empty_oi) == []
    assert find_hidden_stars(empty_menu, empty_oi) == []
