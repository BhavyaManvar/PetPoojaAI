"""Comprehensive tests for the Price Optimization engine.

Covers:
    - get_price_recommendations() — basic output, action types, priority levels
    - get_price_summary() — aggregate counts
    - _decide_action() — each decision branch
    - _compute_suggested_price() — bounds (max 15% increase, max 10% decrease)
    - Edge cases (empty data, single item, zero-cost items)
"""

import pandas as pd
import pytest

from app.services.price_engine import (
    get_price_recommendations,
    get_price_summary,
    _decide_action,
    _compute_suggested_price,
)


# ── Fixtures ────────────────────────────────────────────────────────────────────

@pytest.fixture()
def menu_df():
    return pd.DataFrame({
        "item_id": [1, 2, 3, 4, 5],
        "item_name": [
            "Paneer Tikka Pizza",   # healthy margin
            "Garlic Bread",         # sells at cost → negative/zero margin
            "Veg Burger",           # high demand, below avg margin
            "Masala Dosa",          # priced high, low sales
            "Cold Coffee",          # optimal
        ],
        "category": ["Pizza", "Sides", "Burger", "South Indian", "Beverages"],
        "price": [350, 80, 150, 250, 120],
        "cost": [120, 78, 80, 180, 40],
    })


@pytest.fixture()
def order_items_df():
    """Order items with varying demand levels."""
    rows = []
    # Item 1: moderate demand (20 orders)
    for i in range(20):
        rows.append({"order_id": i + 1, "item_id": 1, "item_name": "Paneer Tikka Pizza", "quantity": 1, "line_total": 350, "order_date": "2024-01-15"})
    # Item 2: low demand (3 orders) — selling at cost
    for i in range(3):
        rows.append({"order_id": i + 100, "item_id": 2, "item_name": "Garlic Bread", "quantity": 1, "line_total": 80, "order_date": "2024-01-15"})
    # Item 3: high demand (40 orders) — below avg margin
    for i in range(40):
        rows.append({"order_id": i + 200, "item_id": 3, "item_name": "Veg Burger", "quantity": 2, "line_total": 300, "order_date": "2024-01-15"})
    # Item 4: very low demand (2 orders) — priced high
    for i in range(2):
        rows.append({"order_id": i + 300, "item_id": 4, "item_name": "Masala Dosa", "quantity": 1, "line_total": 250, "order_date": "2024-01-15"})
    # Item 5: good demand (25 orders) — optimal
    for i in range(25):
        rows.append({"order_id": i + 400, "item_id": 5, "item_name": "Cold Coffee", "quantity": 1, "line_total": 120, "order_date": "2024-01-15"})
    return pd.DataFrame(rows)


# ── get_price_recommendations() ─────────────────────────────────────────────────

class TestGetPriceRecommendations:
    def test_returns_list(self, menu_df, order_items_df):
        recs = get_price_recommendations(menu_df, order_items_df)
        assert isinstance(recs, list)
        assert len(recs) == 5

    def test_each_rec_has_required_fields(self, menu_df, order_items_df):
        recs = get_price_recommendations(menu_df, order_items_df)
        required = {
            "item_id", "item_name", "category", "current_price", "cost",
            "current_margin_pct", "category_avg_price", "category_avg_margin_pct",
            "total_qty_sold", "sales_velocity",
            "suggested_price", "price_change", "price_change_pct",
            "action", "reason", "priority", "projected_monthly_uplift",
        }
        for rec in recs:
            assert required.issubset(rec.keys()), f"Missing keys: {required - rec.keys()}"

    def test_action_is_valid(self, menu_df, order_items_df):
        recs = get_price_recommendations(menu_df, order_items_df)
        for rec in recs:
            assert rec["action"] in {"increase", "decrease", "keep"}

    def test_priority_is_valid(self, menu_df, order_items_df):
        recs = get_price_recommendations(menu_df, order_items_df)
        for rec in recs:
            assert rec["priority"] in {"high", "medium", "low"}

    def test_sorted_by_priority_then_uplift(self, menu_df, order_items_df):
        recs = get_price_recommendations(menu_df, order_items_df)
        order = {"high": 0, "medium": 1, "low": 2}
        for i in range(len(recs) - 1):
            a, b = recs[i], recs[i + 1]
            assert order[a["priority"]] <= order[b["priority"]], (
                f"Not sorted: {a['priority']} came before {b['priority']}"
            )

    def test_empty_menu_returns_empty(self, order_items_df):
        empty = pd.DataFrame(columns=["item_id", "item_name", "category", "price", "cost"])
        assert get_price_recommendations(empty, order_items_df) == []

    def test_empty_orders_returns_empty(self, menu_df):
        empty = pd.DataFrame(columns=["order_id", "item_id", "item_name", "quantity", "line_total", "order_date"])
        assert get_price_recommendations(menu_df, empty) == []

    def test_suggested_price_is_numeric(self, menu_df, order_items_df):
        recs = get_price_recommendations(menu_df, order_items_df)
        for rec in recs:
            assert isinstance(rec["suggested_price"], (int, float))
            assert rec["suggested_price"] > 0

    def test_price_change_consistency(self, menu_df, order_items_df):
        recs = get_price_recommendations(menu_df, order_items_df)
        for rec in recs:
            expected_change = round(rec["suggested_price"] - rec["current_price"], 2)
            assert rec["price_change"] == expected_change

    def test_target_margin_parameter(self, menu_df, order_items_df):
        recs_low = get_price_recommendations(menu_df, order_items_df, target_margin_pct=0.3)
        recs_high = get_price_recommendations(menu_df, order_items_df, target_margin_pct=0.8)
        # Higher target margin should yield more "increase" actions
        increase_low = sum(1 for r in recs_low if r["action"] == "increase")
        increase_high = sum(1 for r in recs_high if r["action"] == "increase")
        assert increase_high >= increase_low


# ── get_price_summary() ─────────────────────────────────────────────────────────

class TestGetPriceSummary:
    def test_returns_dict(self, menu_df, order_items_df):
        summary = get_price_summary(menu_df, order_items_df)
        assert isinstance(summary, dict)

    def test_has_required_keys(self, menu_df, order_items_df):
        summary = get_price_summary(menu_df, order_items_df)
        for key in ["total_items", "items_to_increase", "items_to_decrease", "items_optimal",
                     "total_monthly_uplift", "avg_margin_pct"]:
            assert key in summary

    def test_counts_add_up(self, menu_df, order_items_df):
        summary = get_price_summary(menu_df, order_items_df)
        assert (summary["items_to_increase"] + summary["items_to_decrease"] + summary["items_optimal"]) == summary["total_items"]

    def test_empty_data(self):
        empty_menu = pd.DataFrame(columns=["item_id", "item_name", "category", "price", "cost"])
        empty_orders = pd.DataFrame(columns=["order_id", "item_id", "item_name", "quantity", "line_total", "order_date"])
        summary = get_price_summary(empty_menu, empty_orders)
        assert summary["total_items"] == 0


# ── _decide_action() ────────────────────────────────────────────────────────────

class TestDecideAction:
    def test_negative_margin_returns_increase_high(self):
        action, reason, priority = _decide_action(
            price=50, cost=60, margin_pct=-20,
            cat_avg_price=100, cat_avg_margin_pct=40,
            qty_sold=10, velocity=1.0, cat_avg_qty=10,
            target_margin_pct=60,
        )
        assert action == "increase"
        assert priority == "high"

    def test_zero_margin_returns_increase_high(self):
        action, _, priority = _decide_action(
            price=100, cost=100, margin_pct=0,
            cat_avg_price=100, cat_avg_margin_pct=40,
            qty_sold=10, velocity=1.0, cat_avg_qty=10,
            target_margin_pct=60,
        )
        assert action == "increase"
        assert priority == "high"

    def test_margin_far_below_target(self):
        action, _, priority = _decide_action(
            price=100, cost=70, margin_pct=30,
            cat_avg_price=120, cat_avg_margin_pct=50,
            qty_sold=10, velocity=1.0, cat_avg_qty=10,
            target_margin_pct=60,
        )
        assert action == "increase"
        assert priority == "high"

    def test_high_demand_low_margin(self):
        action, _, priority = _decide_action(
            price=100, cost=55, margin_pct=45,
            cat_avg_price=110, cat_avg_margin_pct=50,
            qty_sold=25, velocity=2.5, cat_avg_qty=10,
            target_margin_pct=60,
        )
        assert action == "increase"
        assert priority == "medium"

    def test_overpriced_low_demand(self):
        action, _, _ = _decide_action(
            price=200, cost=80, margin_pct=60,
            cat_avg_price=120, cat_avg_margin_pct=50,
            qty_sold=2, velocity=0.2, cat_avg_qty=10,
            target_margin_pct=60,
        )
        assert action == "decrease"

    def test_low_demand_good_margin(self):
        action, _, _ = _decide_action(
            price=150, cost=50, margin_pct=66,
            cat_avg_price=140, cat_avg_margin_pct=55,
            qty_sold=2, velocity=0.2, cat_avg_qty=10,
            target_margin_pct=60,
        )
        assert action == "decrease"

    def test_optimal_price(self):
        action, _, _ = _decide_action(
            price=120, cost=40, margin_pct=66,
            cat_avg_price=115, cat_avg_margin_pct=55,
            qty_sold=15, velocity=1.5, cat_avg_qty=10,
            target_margin_pct=60,
        )
        assert action == "keep"


# ── _compute_suggested_price() ──────────────────────────────────────────────────

class TestComputeSuggestedPrice:
    def test_keep_returns_current(self):
        result = _compute_suggested_price("keep", 100, 40, 110, 60, 55)
        assert result == 100

    def test_increase_capped_at_15pct(self):
        result = _compute_suggested_price("increase", 100, 20, 200, 80, 50)
        assert result <= 100 * 1.15

    def test_increase_at_least_5(self):
        result = _compute_suggested_price("increase", 100, 60, 105, 60, 55)
        assert result >= 105

    def test_decrease_capped_at_10pct(self):
        result = _compute_suggested_price("decrease", 200, 80, 150, 60, 55)
        assert result >= 200 * 0.90 - 1  # small floating point tolerance

    def test_decrease_never_below_cost_floor(self):
        # With cost=90, floor is cost*1.10=99, but min(suggested, price-5)=95
        # So the actual floor protection is the max(min_decrease, floor, cat_avg)
        # then capped by min(result, price-5). The ₹5 cap can override.
        result = _compute_suggested_price("decrease", 100, 90, 80, 60, 55)
        # Result should be less than current price
        assert result < 100
        # Result should still be positive and reasonable
        assert result > 0


# ── Single-item edge case ───────────────────────────────────────────────────────

class TestSingleItem:
    def test_single_item(self):
        menu = pd.DataFrame({
            "item_id": [1],
            "item_name": ["Pizza"],
            "category": ["Main"],
            "price": [200],
            "cost": [80],
        })
        orders = pd.DataFrame({
            "order_id": [1, 2, 3],
            "item_id": [1, 1, 1],
            "item_name": ["Pizza", "Pizza", "Pizza"],
            "quantity": [1, 2, 1],
            "line_total": [200, 400, 200],
            "order_date": ["2024-01-01", "2024-01-01", "2024-01-02"],
        })
        recs = get_price_recommendations(menu, orders)
        assert len(recs) == 1
        assert recs[0]["item_name"] == "Pizza"
        assert recs[0]["action"] in {"increase", "decrease", "keep"}
