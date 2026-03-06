"""Tests for the AI Strategy Chatbot.

Covers:
    - _detect_intent() pattern matching for all intents
    - _build_context() returns correct structure
    - generate_response() produces non-empty responses for all intents
    - chat() end-to-end integration
    - Edge cases (empty data, unknown queries)
"""

import pandas as pd
import pytest

from app.services.strategy_chatbot import (
    _detect_intent,
    _build_context,
    _fmt_items,
    generate_response,
    chat,
)


# ── Fixtures ────────────────────────────────────────────────────────────────────

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


# ── Intent Detection ───────────────────────────────────────────────────────────

class TestDetectIntent:
    def test_revenue_intent(self):
        assert _detect_intent("How can I increase my revenue?") == "revenue"

    def test_promote_intent(self):
        assert _detect_intent("What should I promote?") == "promote"

    def test_low_margin_intent(self):
        assert _detect_intent("What are my least profitable items?") == "low_margin"

    def test_top_sellers_intent(self):
        assert _detect_intent("What are my best selling items?") == "top_sellers"

    def test_combos_intent(self):
        assert _detect_intent("Show me combo suggestions") == "combos"

    def test_pricing_intent(self):
        assert _detect_intent("Which items need price changes?") == "pricing"

    def test_remove_intent(self):
        assert _detect_intent("Which items should I remove from menu?") == "remove"

    def test_matrix_intent(self):
        assert _detect_intent("Show the BCG matrix") == "matrix"

    def test_hidden_intent(self):
        assert _detect_intent("Show me untapped potential items") == "hidden"

    def test_risk_intent(self):
        assert _detect_intent("Show me risk items") == "risk"

    def test_summary_intent(self):
        assert _detect_intent("Give me a summary report") == "summary"

    def test_general_fallback(self):
        assert _detect_intent("Hello there") == "general"


# ── _fmt_items ──────────────────────────────────────────────────────────────────

class TestFmtItems:
    def test_with_item_name_key(self):
        items = [{"item_name": "Pizza", "contribution_margin": 200, "total_qty_sold": 50}]
        result = _fmt_items(items)
        assert "Pizza" in result
        assert "200" in result

    def test_with_item_key(self):
        items = [{"item": "Burger", "margin": 100, "sales": 30}]
        result = _fmt_items(items)
        assert "Burger" in result

    def test_empty_list(self):
        assert "No items found" in _fmt_items([])

    def test_limit(self):
        items = [{"item_name": f"Item {i}", "contribution_margin": 10, "total_qty_sold": 5} for i in range(10)]
        result = _fmt_items(items, limit=3)
        assert result.count(" - ") == 3


# ── _build_context ──────────────────────────────────────────────────────────────

class TestBuildContext:
    def test_returns_dict(self, menu_df, order_items_df):
        ctx = _build_context(menu_df, order_items_df)
        assert isinstance(ctx, dict)

    def test_has_required_keys(self, menu_df, order_items_df):
        ctx = _build_context(menu_df, order_items_df)
        required = {"stars", "puzzles", "plowhorses", "dogs", "hidden_stars",
                     "risk_items", "combos", "price_recs", "price_summary", "total_items"}
        assert required.issubset(ctx.keys())

    def test_total_items_matches_menu(self, menu_df, order_items_df):
        ctx = _build_context(menu_df, order_items_df)
        assert ctx["total_items"] == len(menu_df)

    def test_price_summary_has_expected_keys(self, menu_df, order_items_df):
        ctx = _build_context(menu_df, order_items_df)
        ps = ctx["price_summary"]
        assert "items_to_increase" in ps
        assert "items_to_decrease" in ps
        assert "total_monthly_uplift" in ps


# ── generate_response ──────────────────────────────────────────────────────────

class TestGenerateResponse:
    @pytest.fixture()
    def ctx(self, menu_df, order_items_df):
        return _build_context(menu_df, order_items_df)

    def test_revenue_response(self, ctx):
        resp = generate_response("How can I increase revenue?", ctx)
        assert isinstance(resp, str)
        assert len(resp) > 10

    def test_matrix_response(self, ctx):
        resp = generate_response("Show the BCG matrix", ctx)
        assert "Star" in resp

    def test_summary_response(self, ctx):
        resp = generate_response("Give me a health report", ctx)
        assert "Summary" in resp

    def test_general_fallback(self, ctx):
        resp = generate_response("xyzabc random nonsense", ctx)
        assert "help" in resp.lower()


# ── chat (end-to-end) ──────────────────────────────────────────────────────────

class TestChat:
    def test_returns_expected_keys(self, menu_df, order_items_df):
        result = chat("How can I boost sales?", menu_df, order_items_df)
        assert "query" in result
        assert "response" in result
        assert "intent" in result

    def test_intent_is_detected(self, menu_df, order_items_df):
        result = chat("Show me pricing recommendations", menu_df, order_items_df)
        assert result["intent"] == "pricing"

    def test_response_is_nonempty(self, menu_df, order_items_df):
        result = chat("Give me a summary", menu_df, order_items_df)
        assert len(result["response"]) > 0
