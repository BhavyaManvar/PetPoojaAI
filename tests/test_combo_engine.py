"""Tests for the Combo Engine — market basket analysis."""

import pandas as pd
import pytest

from app.services.combo_engine import get_top_combos


@pytest.fixture()
def order_items_df():
    """Five orders with clear co-occurrence patterns."""
    return pd.DataFrame({
        "order_id": [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
        "item_id": [1, 2, 1, 2, 1, 3, 2, 3, 1, 2],
        "item_name": [
            "Burger", "Fries",
            "Burger", "Fries",
            "Burger", "Coke",
            "Fries", "Coke",
            "Burger", "Fries",
        ],
        "quantity": [1] * 10,
        "unit_price": [150.0] * 10,
        "line_total": [150.0] * 10,
    })


def test_top_combos_returns_list(order_items_df):
    combos = get_top_combos(order_items_df)
    assert isinstance(combos, list)


def test_combos_have_required_keys(order_items_df):
    combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
    for c in combos:
        assert "antecedent" in c
        assert "consequent" in c
        assert "support" in c
        assert "confidence" in c


def test_burger_fries_is_top_combo(order_items_df):
    combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
    pairs = [(c["antecedent"], c["consequent"]) for c in combos]
    assert any(
        ("Burger" in a and "Fries" in b) or ("Fries" in a and "Burger" in b)
        for a, b in pairs
    )


def test_empty_orders():
    empty = pd.DataFrame(columns=["order_id", "item_id", "item_name", "quantity", "unit_price", "line_total"])
    assert get_top_combos(empty) == []
