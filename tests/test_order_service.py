"""Tests for the Order Service.

Covers:
    - create_order() — basic order creation, line items, total price
    - resolve_items() — name-to-ID resolution via fuzzy match
    - build_pos_payload() — end-to-end voice flow
    - Input validation — empty orders, invalid quantities
    - get_all_orders() / get_order_by_id() — in-memory store
    - seed_demo_orders() — generates realistic demo data
"""

import pandas as pd
import pytest

from app.services.order_service import (
    create_order,
    resolve_items,
    build_pos_payload,
    get_all_orders,
    get_order_by_id,
    get_order_count,
    clear_orders,
    seed_demo_orders,
)


# ── Fixtures ────────────────────────────────────────────────────────────────────

@pytest.fixture()
def menu_df():
    return pd.DataFrame({
        "item_id": [1, 2, 3, 4, 5],
        "item_name": ["Paneer Tikka Pizza", "Garlic Bread", "Veg Burger", "Masala Dosa", "Cold Coffee"],
        "category": ["Pizza", "Sides", "Burger", "South Indian", "Beverages"],
        "price": [350.0, 120.0, 180.0, 150.0, 120.0],
        "cost": [150.0, 36.0, 100.0, 80.0, 40.0],
    })


@pytest.fixture(autouse=True)
def _clean_orders():
    """Clear order store before each test."""
    clear_orders()
    yield
    clear_orders()


# ── create_order ────────────────────────────────────────────────────────────────

class TestCreateOrder:
    def test_basic_order(self, menu_df):
        items = [{"item_id": 1, "qty": 2}, {"item_id": 3, "qty": 1}]
        order = create_order(items, menu_df)
        assert order["status"] == "confirmed"
        assert order["total_price"] == 350.0 * 2 + 180.0
        assert len(order["items"]) == 2

    def test_order_has_required_fields(self, menu_df):
        order = create_order([{"item_id": 1, "qty": 1}], menu_df)
        assert "order_id" in order
        assert "created_at" in order
        assert "order_source" in order

    def test_custom_source(self, menu_df):
        order = create_order([{"item_id": 1, "qty": 1}], menu_df, order_source="voice")
        assert order["order_source"] == "voice"

    def test_unknown_item_skipped(self, menu_df):
        items = [{"item_id": 999, "qty": 1}, {"item_id": 1, "qty": 1}]
        order = create_order(items, menu_df)
        assert len(order["items"]) == 1

    def test_empty_items_raises(self, menu_df):
        with pytest.raises(ValueError, match="at least one item"):
            create_order([], menu_df)

    def test_invalid_quantity_raises(self, menu_df):
        with pytest.raises(ValueError, match="Invalid quantity"):
            create_order([{"item_id": 1, "qty": -1}], menu_df)

    def test_excessive_quantity_raises(self, menu_df):
        with pytest.raises(ValueError, match="Invalid quantity"):
            create_order([{"item_id": 1, "qty": 101}], menu_df)

    def test_sequential_ids(self, menu_df):
        o1 = create_order([{"item_id": 1, "qty": 1}], menu_df)
        o2 = create_order([{"item_id": 2, "qty": 1}], menu_df)
        assert o2["order_id"] == o1["order_id"] + 1


# ── resolve_items ───────────────────────────────────────────────────────────────

class TestResolveItems:
    def test_exact_match(self, menu_df):
        parsed = [{"item": "Paneer Tikka Pizza", "qty": 1}]
        resolved = resolve_items(parsed, menu_df)
        assert len(resolved) == 1
        assert resolved[0]["item_id"] == 1

    def test_fuzzy_match(self, menu_df):
        parsed = [{"item": "paneer pizza", "qty": 2}]
        resolved = resolve_items(parsed, menu_df)
        assert len(resolved) == 1
        assert resolved[0]["item_name"] == "Paneer Tikka Pizza"
        assert resolved[0]["qty"] == 2

    def test_unresolvable_dropped(self, menu_df):
        parsed = [{"item": "xyzabc nonexistent", "qty": 1}]
        resolved = resolve_items(parsed, menu_df)
        assert len(resolved) == 0


# ── build_pos_payload ───────────────────────────────────────────────────────────

class TestBuildPosPayload:
    def test_end_to_end(self, menu_df):
        resolved = [{"item_id": 1, "item_name": "Paneer Tikka Pizza", "qty": 1}]
        payload = build_pos_payload(resolved, menu_df)
        assert payload["status"] == "confirmed"
        assert payload["total_price"] == 350.0


# ── Store operations ────────────────────────────────────────────────────────────

class TestOrderStore:
    def test_get_all_orders(self, menu_df):
        create_order([{"item_id": 1, "qty": 1}], menu_df)
        create_order([{"item_id": 2, "qty": 1}], menu_df)
        orders = get_all_orders()
        assert len(orders) == 2

    def test_get_order_by_id(self, menu_df):
        order = create_order([{"item_id": 1, "qty": 1}], menu_df)
        found = get_order_by_id(order["order_id"])
        assert found is not None
        assert found["order_id"] == order["order_id"]

    def test_get_order_not_found(self):
        assert get_order_by_id(99999) is None

    def test_get_order_count(self, menu_df):
        create_order([{"item_id": 1, "qty": 1}], menu_df)
        assert get_order_count() == 1


# ── seed_demo_orders ────────────────────────────────────────────────────────────

class TestSeedDemoOrders:
    def test_creates_orders(self, menu_df):
        orders = seed_demo_orders(menu_df, count=10)
        assert len(orders) == 10

    def test_empty_menu(self):
        orders = seed_demo_orders(pd.DataFrame(), count=5)
        assert len(orders) == 0

    def test_orders_have_items(self, menu_df):
        orders = seed_demo_orders(menu_df, count=5)
        for order in orders:
            assert len(order["items"]) >= 1
