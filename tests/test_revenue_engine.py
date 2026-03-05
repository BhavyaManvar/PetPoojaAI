"""Comprehensive tests for the Revenue Intelligence engine.

Covers:
    - contribution_margin() calculation
    - item_profit() calculation
    - sales_velocity() calculation
    - classify_menu_items() BCG quadrant logic
    - find_hidden_stars() filtering
    - get_risk_items() filtering
    - compute_kpis() aggregation
    - Edge cases (empty data, zero values, single item)
"""

import pandas as pd
import pytest

from app.services.revenue_engine import (
    classify_menu_items,
    compute_kpis,
    contribution_margin,
    find_hidden_stars,
    get_risk_items,
    item_profit,
    sales_velocity,
)


# ── Fixtures ────────────────────────────────────────────────────────────────────

@pytest.fixture()
def menu_df():
    """4 menu items covering different margin/cost profiles."""
    return pd.DataFrame({
        "item_id": [1, 2, 3, 4],
        "item_name": [
            "Paneer Tikka Pizza",  # high price, high margin
            "Garlic Bread",        # low price, high margin %
            "Veg Burger",          # moderate
            "Masala Dosa",         # low margin
        ],
        "category": ["Pizza", "Sides", "Burger", "South Indian"],
        "price": [350.0, 120.0, 180.0, 150.0],
        "cost": [150.0, 36.0, 100.0, 80.0],
    })


@pytest.fixture()
def order_items_df():
    """8 order line items creating diverse sales volumes."""
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


@pytest.fixture()
def orders_df():
    """5 orders for KPI testing across 2 cities."""
    return pd.DataFrame({
        "order_id": [1, 2, 3, 4, 5],
        "order_date": pd.to_datetime([
            "2025-01-01", "2025-01-15", "2025-02-01", "2025-03-01", "2025-03-15",
        ]),
        "city": ["Mumbai", "Delhi", "Mumbai", "Mumbai", "Delhi"],
        "order_type": ["Dine-in", "Delivery", "Dine-in", "Takeaway", "Delivery"],
        "total_amount": [590.0, 530.0, 270.0, 700.0, 180.0],
    })


# ── Unit-level formula tests ────────────────────────────────────────────────────

class TestContributionMargin:
    def test_basic(self):
        assert contribution_margin(350, 150) == 200

    def test_zero_cost(self):
        assert contribution_margin(100, 0) == 100

    def test_zero_price(self):
        assert contribution_margin(0, 50) == -50

    def test_equal_price_cost(self):
        assert contribution_margin(100, 100) == 0

    def test_float_precision(self):
        result = contribution_margin(199.99, 89.50)
        assert abs(result - 110.49) < 0.01


class TestItemProfit:
    def test_basic(self):
        assert item_profit(200, 10) == 2000

    def test_zero_qty(self):
        assert item_profit(200, 0) == 0

    def test_negative_margin(self):
        assert item_profit(-50, 5) == -250

    def test_single_unit(self):
        assert item_profit(84, 1) == 84


class TestSalesVelocity:
    def test_basic(self):
        assert sales_velocity(180, 90) == 2.0

    def test_zero_days(self):
        assert sales_velocity(100, 0) == 0.0

    def test_negative_days(self):
        assert sales_velocity(100, -5) == 0.0

    def test_fractional(self):
        assert sales_velocity(10, 3) == pytest.approx(3.33, abs=0.01)

    def test_zero_sales(self):
        assert sales_velocity(0, 30) == 0.0


# ── classify_menu_items tests ───────────────────────────────────────────────────

class TestClassifyMenuItems:
    def test_returns_all_items(self, menu_df, order_items_df):
        result = classify_menu_items(menu_df, order_items_df)
        assert len(result) == 4

    def test_all_items_named(self, menu_df, order_items_df):
        result = classify_menu_items(menu_df, order_items_df)
        names = {r["item_name"] for r in result}
        assert names == {"Paneer Tikka Pizza", "Garlic Bread", "Veg Burger", "Masala Dosa"}

    def test_valid_quadrants_only(self, menu_df, order_items_df):
        result = classify_menu_items(menu_df, order_items_df)
        valid = {"Star", "Puzzle", "Plow Horse", "Dog"}
        for item in result:
            assert item["menu_class"] in valid

    def test_has_required_fields(self, menu_df, order_items_df):
        result = classify_menu_items(menu_df, order_items_df)
        required = {
            "item_id", "item_name", "category", "total_qty_sold",
            "total_revenue", "contribution_margin", "margin_pct",
            "menu_class",
        }
        for item in result:
            assert required.issubset(item.keys())

    def test_contribution_margin_values(self, menu_df, order_items_df):
        """Verify margin = revenue - (cost * qty)."""
        result = classify_menu_items(menu_df, order_items_df)
        for item in result:
            expected_cost = menu_df.loc[
                menu_df["item_id"] == item["item_id"], "cost"
            ].iloc[0] * item["total_qty_sold"]
            expected_margin = item["total_revenue"] - expected_cost
            assert item["contribution_margin"] == pytest.approx(expected_margin, abs=0.01)

    def test_sales_velocity_present(self, menu_df, order_items_df):
        result = classify_menu_items(menu_df, order_items_df)
        for item in result:
            assert "sales_velocity" in item
            assert item["sales_velocity"] >= 0

    def test_item_profit_present(self, menu_df, order_items_df):
        result = classify_menu_items(menu_df, order_items_df)
        for item in result:
            assert "item_profit" in item

    def test_empty_dataframes(self):
        empty_menu = pd.DataFrame(
            columns=["item_id", "item_name", "category", "price", "cost"],
        )
        empty_oi = pd.DataFrame(
            columns=["order_id", "item_id", "item_name", "quantity", "unit_price", "line_total"],
        )
        assert classify_menu_items(empty_menu, empty_oi) == []

    def test_single_item(self):
        """A single item should be classified (median = itself)."""
        menu = pd.DataFrame({
            "item_id": [1],
            "item_name": ["Solo Item"],
            "category": ["Test"],
            "price": [200.0],
            "cost": [80.0],
        })
        oi = pd.DataFrame({
            "order_id": [1],
            "item_id": [1],
            "item_name": ["Solo Item"],
            "quantity": [5],
            "unit_price": [200.0],
            "line_total": [1000.0],
        })
        result = classify_menu_items(menu, oi)
        assert len(result) == 1
        assert result[0]["menu_class"] in {"Star", "Puzzle", "Plow Horse", "Dog"}

    def test_with_precomputed_sales_analytics(self, menu_df, order_items_df):
        """When sales_df is provided, it should be used instead of computing."""
        sales_df = pd.DataFrame({
            "item_id": [1, 2],
            "item_name": ["Paneer Tikka Pizza", "Garlic Bread"],
            "category": ["Pizza", "Sides"],
            "price": [350.0, 120.0],
            "cost": [150.0, 36.0],
            "total_qty_sold": [100, 50],
            "total_revenue": [35000.0, 6000.0],
            "contribution_margin": [20000.0, 4200.0],
            "margin_pct": [57.1, 70.0],
            "avg_daily_sales": [0.56, 0.28],
        })
        result = classify_menu_items(menu_df, order_items_df, sales_df)
        assert len(result) == 2


# ── Hidden Stars tests ──────────────────────────────────────────────────────────

class TestHiddenStars:
    def test_returns_puzzles_only(self, menu_df, order_items_df):
        stars = find_hidden_stars(menu_df, order_items_df)
        for s in stars:
            assert s["category"] == "Puzzle"

    def test_has_required_keys(self, menu_df, order_items_df):
        stars = find_hidden_stars(menu_df, order_items_df)
        for s in stars:
            assert "item" in s
            assert "margin" in s
            assert "reason" in s
            assert "sales" in s

    def test_reason_text(self, menu_df, order_items_df):
        stars = find_hidden_stars(menu_df, order_items_df)
        for s in stars:
            assert "promote" in s["reason"].lower()

    def test_empty_returns_empty(self):
        empty_menu = pd.DataFrame(
            columns=["item_id", "item_name", "category", "price", "cost"],
        )
        empty_oi = pd.DataFrame(
            columns=["order_id", "item_id", "item_name", "quantity", "unit_price", "line_total"],
        )
        assert find_hidden_stars(empty_menu, empty_oi) == []


# ── Risk Items tests ────────────────────────────────────────────────────────────

class TestRiskItems:
    def test_returns_dogs_only(self, menu_df, order_items_df):
        risks = get_risk_items(menu_df, order_items_df)
        for r in risks:
            assert r["category"] == "Dog"

    def test_has_required_keys(self, menu_df, order_items_df):
        risks = get_risk_items(menu_df, order_items_df)
        for r in risks:
            assert "item" in r
            assert "margin" in r
            assert "reason" in r
            assert "sales" in r

    def test_reason_text(self, menu_df, order_items_df):
        risks = get_risk_items(menu_df, order_items_df)
        for r in risks:
            assert "removing" in r["reason"].lower() or "remove" in r["reason"].lower()


# ── KPI tests ───────────────────────────────────────────────────────────────────

class TestComputeKPIs:
    def test_total_orders(self, orders_df, order_items_df):
        kpis = compute_kpis(orders_df, order_items_df)
        assert kpis["total_orders"] == 5

    def test_total_revenue(self, orders_df, order_items_df):
        kpis = compute_kpis(orders_df, order_items_df)
        expected = 590.0 + 530.0 + 270.0 + 700.0 + 180.0
        assert kpis["total_revenue"] == pytest.approx(expected)

    def test_avg_order_value(self, orders_df, order_items_df):
        kpis = compute_kpis(orders_df, order_items_df)
        expected = (590.0 + 530.0 + 270.0 + 700.0 + 180.0) / 5
        assert kpis["avg_order_value"] == pytest.approx(expected, abs=0.01)

    def test_top_city(self, orders_df, order_items_df):
        kpis = compute_kpis(orders_df, order_items_df)
        assert kpis["top_city"] == "Mumbai"  # 3 orders vs 2

    def test_revenue_by_city(self, orders_df, order_items_df):
        kpis = compute_kpis(orders_df, order_items_df)
        assert "Mumbai" in kpis["revenue_by_city"]
        assert "Delhi" in kpis["revenue_by_city"]

    def test_revenue_by_order_type(self, orders_df, order_items_df):
        kpis = compute_kpis(orders_df, order_items_df)
        assert "Dine-in" in kpis["revenue_by_order_type"]
        assert "Delivery" in kpis["revenue_by_order_type"]

    def test_top_items(self, orders_df, order_items_df):
        kpis = compute_kpis(orders_df, order_items_df)
        assert isinstance(kpis["top_items"], list)
        assert len(kpis["top_items"]) <= 5
        for item in kpis["top_items"]:
            assert "item_name" in item
            assert "total_qty" in item

    def test_unique_items_sold(self, orders_df, order_items_df):
        kpis = compute_kpis(orders_df, order_items_df)
        assert kpis["unique_items_sold"] == order_items_df["item_id"].nunique()

    def test_empty_orders(self):
        empty_orders = pd.DataFrame(
            columns=["order_id", "total_amount", "city", "order_type"],
        )
        empty_oi = pd.DataFrame(
            columns=["order_id", "item_id", "item_name", "quantity", "unit_price", "line_total"],
        )
        kpis = compute_kpis(empty_orders, empty_oi)
        assert kpis["total_orders"] == 0
        assert kpis["total_revenue"] == 0.0
        assert kpis["avg_order_value"] == 0.0
        assert kpis["top_items"] == []
