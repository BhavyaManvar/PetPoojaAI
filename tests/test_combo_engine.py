"""Tests for the Combo Engine — market basket analysis and upsell engine."""

import pandas as pd
import pytest

from app.services.combo_engine import build_baskets, get_pair_frequencies, get_top_combos
from app.services.upsell_engine import recommend_addon, recommend_addons_batch


# ── Fixtures ────────────────────────────────────────────────────────────────────


@pytest.fixture()
def order_items_df():
    """Five orders with clear co-occurrence patterns.

    Baskets:
        1 → {Burger, Fries}
        2 → {Burger, Fries}
        3 → {Burger, Coke}
        4 → {Fries, Coke}
        5 → {Burger, Fries}
    Burger+Fries appears in 3/5 = 60 %
    """
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


@pytest.fixture()
def menu_df():
    """Minimal menu for upsell tests."""
    return pd.DataFrame({
        "item_id": [1, 2, 3],
        "item_name": ["Burger", "Fries", "Coke"],
        "category": ["Burger", "Sides", "Beverages"],
        "price": [180.0, 130.0, 60.0],
        "cost": [100.0, 45.0, 20.0],
    })


# ── build_baskets ───────────────────────────────────────────────────────────────


class TestBuildBaskets:
    def test_returns_list_of_lists(self, order_items_df):
        baskets = build_baskets(order_items_df)
        assert isinstance(baskets, list)
        assert all(isinstance(b, list) for b in baskets)

    def test_correct_number_of_baskets(self, order_items_df):
        baskets = build_baskets(order_items_df)
        assert len(baskets) == 5  # 5 unique order_ids

    def test_baskets_are_sorted(self, order_items_df):
        baskets = build_baskets(order_items_df)
        for basket in baskets:
            assert basket == sorted(basket)

    def test_baskets_deduplicate(self):
        """Duplicate item names within an order collapse to one entry."""
        df = pd.DataFrame({
            "order_id": [1, 1],
            "item_id": [1, 1],
            "item_name": ["Burger", "Burger"],
            "quantity": [1, 2],
            "unit_price": [150.0, 150.0],
            "line_total": [150.0, 300.0],
        })
        baskets = build_baskets(df)
        assert baskets == [["Burger"]]

    def test_empty_df(self):
        empty = pd.DataFrame(columns=["order_id", "item_id", "item_name", "quantity", "unit_price", "line_total"])
        assert build_baskets(empty) == []


# ── get_top_combos ──────────────────────────────────────────────────────────────


class TestGetTopCombos:
    def test_returns_list(self, order_items_df):
        combos = get_top_combos(order_items_df)
        assert isinstance(combos, list)

    def test_combos_have_required_keys(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        for c in combos:
            assert "antecedent" in c
            assert "consequent" in c
            assert "combo" in c
            assert "support" in c
            assert "confidence" in c
            assert "lift" in c

    def test_burger_fries_is_top_combo(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        pairs = [(c["antecedent"], c["consequent"]) for c in combos]
        assert any(
            ("Burger" in a and "Fries" in b) or ("Fries" in a and "Burger" in b)
            for a, b in pairs
        )

    def test_support_values_in_range(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        for c in combos:
            assert 0.0 <= c["support"] <= 1.0

    def test_confidence_values_in_range(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        for c in combos:
            assert 0.0 <= c["confidence"] <= 1.0

    def test_lift_positive(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        for c in combos:
            assert c["lift"] > 0

    def test_top_n_limits_results(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01, top_n=2)
        assert len(combos) <= 2

    def test_high_min_support_filters_out(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.99, min_confidence=0.01)
        assert combos == []

    def test_high_min_confidence_filters_out(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.99)
        assert combos == []

    def test_combo_string_format(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        for c in combos:
            assert " + " in c["combo"]
            assert c["combo"] == f"{c['antecedent']} + {c['consequent']}"

    def test_empty_orders(self):
        empty = pd.DataFrame(columns=["order_id", "item_id", "item_name", "quantity", "unit_price", "line_total"])
        assert get_top_combos(empty) == []


# ── get_pair_frequencies ────────────────────────────────────────────────────────


class TestGetPairFrequencies:
    def test_returns_list(self, order_items_df):
        pairs = get_pair_frequencies(order_items_df)
        assert isinstance(pairs, list)

    def test_pair_keys(self, order_items_df):
        pairs = get_pair_frequencies(order_items_df)
        for p in pairs:
            assert "item_a" in p
            assert "item_b" in p
            assert "co_occurrence" in p
            assert "frequency" in p

    def test_burger_fries_most_frequent(self, order_items_df):
        pairs = get_pair_frequencies(order_items_df, top_n=1)
        assert len(pairs) == 1
        top = pairs[0]
        assert {top["item_a"], top["item_b"]} == {"Burger", "Fries"}

    def test_empty(self):
        empty = pd.DataFrame(columns=["order_id", "item_id", "item_name", "quantity", "unit_price", "line_total"])
        assert get_pair_frequencies(empty) == []


# ── recommend_addon (upsell) ────────────────────────────────────────────────────


class TestRecommendAddon:
    def test_returns_dict(self, menu_df, order_items_df):
        result = recommend_addon(1, menu_df, order_items_df)
        assert isinstance(result, dict)

    def test_burger_gets_fries_recommendation(self, menu_df, order_items_df):
        result = recommend_addon(1, menu_df, order_items_df)
        assert result["item"] == "Burger"
        assert result["recommended_addon"] is not None
        # Fries is the most common companion for Burger
        assert result["recommended_addon"] == "Fries"

    def test_unknown_item(self, menu_df, order_items_df):
        result = recommend_addon(999, menu_df, order_items_df)
        assert result["item"] == "Unknown"
        assert result["recommended_addon"] is None

    def test_response_has_strategy(self, menu_df, order_items_df):
        result = recommend_addon(1, menu_df, order_items_df)
        assert result["strategy"] in {"combo", "category_complement", "hidden_star_promotion", None}


# ── recommend_addons_batch ──────────────────────────────────────────────────────


class TestRecommendAddonsBatch:
    def test_batch_returns_list(self, menu_df, order_items_df):
        results = recommend_addons_batch([1, 2, 3], menu_df, order_items_df)
        assert isinstance(results, list)
        assert len(results) == 3

    def test_batch_unknown(self, menu_df, order_items_df):
        results = recommend_addons_batch([999], menu_df, order_items_df)
        assert results[0]["recommended_addon"] is None
