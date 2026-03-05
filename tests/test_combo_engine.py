"""Comprehensive tests for the Combo Engine & Upsell Engine.

Covers:
    TASK 1 — build_order_baskets / get_basket_stats
    TASK 2 — get_top_combos (Apriori / manual), get_combos_by_category
    TASK 3 — recommend_addon, recommend_addons_batch, strategy selection
    Edge cases — empty data, single-item baskets, unknown item_id
"""

import pandas as pd
import pytest

from app.services.combo_engine import (
    build_order_baskets,
    get_basket_stats,
    get_top_combos,
    get_combos_by_category,
)
from app.services.upsell_engine import recommend_addon, recommend_addons_batch


# ── Fixtures ────────────────────────────────────────────────────────────────────

@pytest.fixture()
def order_items_df():
    """10 line items across 5 orders with clear co-occurrence patterns.

    Burger + Fries appear together in orders 1, 2, 5  → high confidence
    Burger + Coke  appear together in order 3
    Fries  + Coke  appear together in order 4
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
        "unit_price": [150.0, 80.0, 150.0, 80.0, 150.0, 60.0, 80.0, 60.0, 150.0, 80.0],
        "line_total": [150.0, 80.0, 150.0, 80.0, 150.0, 60.0, 80.0, 60.0, 150.0, 80.0],
    })


@pytest.fixture()
def menu_df():
    """Menu with 3 items across different categories."""
    return pd.DataFrame({
        "item_id": [1, 2, 3],
        "item_name": ["Burger", "Fries", "Coke"],
        "category": ["Main Course", "Sides", "Beverages"],
        "price": [150.0, 80.0, 60.0],
        "cost": [70.0, 25.0, 15.0],
    })


@pytest.fixture()
def large_order_items_df():
    """Larger dataset with 20 orders for more realistic basket analysis."""
    import random
    random.seed(42)
    items = ["Pizza", "Burger", "Fries", "Coke", "Garlic Bread", "Lassi"]
    ids = {name: i + 1 for i, name in enumerate(items)}
    rows = []
    for oid in range(1, 21):
        basket_size = random.randint(2, 4)
        chosen = random.sample(items, basket_size)
        for name in chosen:
            rows.append({
                "order_id": oid,
                "item_id": ids[name],
                "item_name": name,
                "quantity": 1,
                "unit_price": 100.0,
                "line_total": 100.0,
            })
    return pd.DataFrame(rows)


# ══════════════════════════════════════════════════════════════════════════════
# TASK 1 — BUILD ORDER BASKETS
# ══════════════════════════════════════════════════════════════════════════════

class TestBuildOrderBaskets:
    def test_returns_dict(self, order_items_df):
        baskets = build_order_baskets(order_items_df)
        assert isinstance(baskets, dict)

    def test_correct_number_of_baskets(self, order_items_df):
        baskets = build_order_baskets(order_items_df)
        assert len(baskets) == 5  # 5 unique order_ids

    def test_basket_contents(self, order_items_df):
        baskets = build_order_baskets(order_items_df)
        assert set(baskets[1]) == {"Burger", "Fries"}
        assert set(baskets[3]) == {"Burger", "Coke"}

    def test_empty_dataframe(self):
        empty = pd.DataFrame(columns=["order_id", "item_id", "item_name", "quantity", "unit_price", "line_total"])
        assert build_order_baskets(empty) == {}


class TestBasketStats:
    def test_returns_all_keys(self, order_items_df):
        stats = get_basket_stats(order_items_df)
        assert "total_baskets" in stats
        assert "avg_basket_size" in stats
        assert "max_basket_size" in stats
        assert "min_basket_size" in stats

    def test_correct_values(self, order_items_df):
        stats = get_basket_stats(order_items_df)
        assert stats["total_baskets"] == 5
        assert stats["avg_basket_size"] == 2.0  # all baskets have 2 items
        assert stats["max_basket_size"] == 2
        assert stats["min_basket_size"] == 2

    def test_empty_dataframe(self):
        empty = pd.DataFrame(columns=["order_id", "item_id", "item_name"])
        stats = get_basket_stats(empty)
        assert stats["total_baskets"] == 0


# ══════════════════════════════════════════════════════════════════════════════
# TASK 2 — COMBO RECOMMENDATION (Apriori / Market Basket Analysis)
# ══════════════════════════════════════════════════════════════════════════════

class TestTopCombos:
    def test_returns_list(self, order_items_df):
        combos = get_top_combos(order_items_df)
        assert isinstance(combos, list)

    def test_combos_have_required_keys(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        for c in combos:
            assert "antecedent" in c
            assert "consequent" in c
            assert "support" in c
            assert "confidence" in c
            assert "lift" in c
            assert "combo" in c

    def test_burger_fries_is_top_combo(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        pairs = [(c["antecedent"], c["consequent"]) for c in combos]
        assert any(
            ("Burger" in a and "Fries" in b) or ("Fries" in a and "Burger" in b)
            for a, b in pairs
        )

    def test_support_is_valid_fraction(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        for c in combos:
            assert 0 <= c["support"] <= 1

    def test_confidence_is_valid_fraction(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        for c in combos:
            assert 0 <= c["confidence"] <= 1

    def test_lift_positive(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        for c in combos:
            assert c["lift"] >= 0

    def test_top_n_limits_results(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01, top_n=2)
        assert len(combos) <= 2

    def test_high_support_threshold_reduces_results(self, order_items_df):
        many = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        few = get_top_combos(order_items_df, min_support=0.99, min_confidence=0.01)
        assert len(few) <= len(many)

    def test_empty_orders(self):
        empty = pd.DataFrame(columns=["order_id", "item_id", "item_name", "quantity", "unit_price", "line_total"])
        assert get_top_combos(empty) == []

    def test_combo_string_format(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        for c in combos:
            assert " + " in c["combo"]

    def test_sorted_by_confidence(self, order_items_df):
        combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        confs = [c["confidence"] for c in combos]
        assert confs == sorted(confs, reverse=True)

    def test_larger_dataset(self, large_order_items_df):
        combos = get_top_combos(large_order_items_df, min_support=0.05, min_confidence=0.1)
        assert isinstance(combos, list)
        for c in combos:
            assert c["support"] >= 0.05
            assert c["confidence"] >= 0.1


class TestCombosByCategory:
    def test_filter_by_category(self, order_items_df, menu_df):
        combos = get_combos_by_category(
            order_items_df, menu_df, category="Beverages",
            min_support=0.01, min_confidence=0.01,
        )
        # Every returned combo should include Coke (the only Beverages item)
        for c in combos:
            assert "Coke" in c["antecedent"] or "Coke" in c["consequent"]

    def test_no_category_returns_all(self, order_items_df, menu_df):
        all_combos = get_top_combos(order_items_df, min_support=0.01, min_confidence=0.01)
        no_filter = get_combos_by_category(
            order_items_df, menu_df, category=None,
            min_support=0.01, min_confidence=0.01, top_n=50,
        )
        assert len(no_filter) == len(all_combos)


# ══════════════════════════════════════════════════════════════════════════════
# TASK 3 — UPSELL ENGINE
# ══════════════════════════════════════════════════════════════════════════════

class TestUpsellEngine:
    def test_returns_dict(self, menu_df, order_items_df):
        result = recommend_addon(1, menu_df, order_items_df)
        assert isinstance(result, dict)

    def test_required_keys(self, menu_df, order_items_df):
        result = recommend_addon(1, menu_df, order_items_df)
        assert "item" in result
        assert "recommended_addon" in result
        assert "strategy" in result

    def test_burger_gets_recommendation(self, menu_df, order_items_df):
        result = recommend_addon(1, menu_df, order_items_df)  # Burger
        assert result["recommended_addon"] is not None
        assert result["strategy"] is not None

    def test_recommended_addon_is_different_item(self, menu_df, order_items_df):
        result = recommend_addon(1, menu_df, order_items_df)
        assert result["recommended_addon"] != result["item"]

    def test_unknown_item_id(self, menu_df, order_items_df):
        result = recommend_addon(9999, menu_df, order_items_df)
        assert result["item"] == "Unknown"
        assert result["recommended_addon"] is None

    def test_cross_category_preferred(self, menu_df, order_items_df):
        """Burger (Main Course) should ideally be upsold Fries (Sides) or Coke (Beverages)."""
        result = recommend_addon(1, menu_df, order_items_df)
        if result["strategy"] == "cross_category_combo":
            addon_cat = menu_df.loc[menu_df["item_name"] == result["recommended_addon"], "category"]
            item_cat = menu_df.loc[menu_df["item_name"] == result["item"], "category"]
            if not addon_cat.empty and not item_cat.empty:
                assert addon_cat.iloc[0] != item_cat.iloc[0]

    def test_addon_id_populated(self, menu_df, order_items_df):
        result = recommend_addon(1, menu_df, order_items_df)
        if result["recommended_addon"]:
            assert result.get("addon_id") is not None


class TestUpsellBatch:
    def test_batch_returns_list(self, menu_df, order_items_df):
        results = recommend_addons_batch([1, 2, 3], menu_df, order_items_df)
        assert isinstance(results, list)
        assert len(results) == 3

    def test_batch_each_has_item(self, menu_df, order_items_df):
        results = recommend_addons_batch([1, 2], menu_df, order_items_df)
        assert results[0]["item"] == "Burger"
        assert results[1]["item"] == "Fries"

    def test_batch_with_unknown(self, menu_df, order_items_df):
        results = recommend_addons_batch([1, 9999], menu_df, order_items_df)
        assert results[1]["item"] == "Unknown"


# ══════════════════════════════════════════════════════════════════════════════
# EDGE CASES
# ══════════════════════════════════════════════════════════════════════════════

class TestEdgeCases:
    def test_single_item_basket(self):
        """Orders with only 1 item produce no combos."""
        df = pd.DataFrame({
            "order_id": [1, 2, 3],
            "item_id": [1, 2, 3],
            "item_name": ["Burger", "Fries", "Coke"],
            "quantity": [1, 1, 1],
            "unit_price": [100, 80, 60],
            "line_total": [100, 80, 60],
        })
        combos = get_top_combos(df, min_support=0.01, min_confidence=0.01)
        assert combos == []

    def test_all_same_item(self):
        """Every order has the same single item — no pairs possible."""
        df = pd.DataFrame({
            "order_id": [1, 2, 3],
            "item_id": [1, 1, 1],
            "item_name": ["Burger", "Burger", "Burger"],
            "quantity": [1, 1, 1],
            "unit_price": [100, 100, 100],
            "line_total": [100, 100, 100],
        })
        combos = get_top_combos(df, min_support=0.01, min_confidence=0.01)
        assert combos == []

    def test_upsell_empty_orders(self):
        menu = pd.DataFrame({
            "item_id": [1], "item_name": ["Burger"], "category": ["Main"],
            "price": [100], "cost": [50],
        })
        empty_oi = pd.DataFrame(columns=["order_id", "item_id", "item_name", "quantity", "unit_price", "line_total"])
        result = recommend_addon(1, menu, empty_oi)
        # With no orders we can't compute combos, should still return a valid dict
        assert result["item"] == "Burger"
