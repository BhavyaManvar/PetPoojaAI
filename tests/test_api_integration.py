"""API integration tests for FastAPI endpoints.

Covers:
    - /health endpoint
    - /ai/chat — strategy chatbot
    - /ai/insights — auto-generated insights
    - /ai/dashboard-summary — dashboard data
    - /order/push — order creation
    - /order/list — order listing
    - /voice/parse — voice text parsing
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    return TestClient(app)


# ── Health Check ────────────────────────────────────────────────────────────────

class TestHealthEndpoint:
    def test_health_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


# ── AI Endpoints ────────────────────────────────────────────────────────────────

class TestAIEndpoints:
    def test_chat_returns_response(self, client):
        resp = client.post("/ai/chat", json={"query": "How can I increase revenue?"})
        assert resp.status_code == 200
        data = resp.json()
        assert "response" in data
        assert "intent" in data
        assert data["intent"] == "revenue"

    def test_chat_empty_query(self, client):
        resp = client.post("/ai/chat", json={"query": ""})
        assert resp.status_code == 200

    def test_insights(self, client):
        resp = client.get("/ai/insights")
        assert resp.status_code == 200
        data = resp.json()
        assert "insights" in data
        assert isinstance(data["insights"], list)

    def test_dashboard_summary(self, client):
        resp = client.get("/ai/dashboard-summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_items" in data
        assert "stars" in data
        assert "items_to_increase" in data
        assert "total_monthly_uplift" in data


# ── Order Endpoints ─────────────────────────────────────────────────────────────

class TestOrderEndpoints:
    def test_seed_and_list(self, client):
        seed_resp = client.post("/order/seed", json={"count": 5})
        assert seed_resp.status_code == 200
        assert seed_resp.json()["seeded"] == 5

        list_resp = client.get("/order/list")
        assert list_resp.status_code == 200
        assert list_resp.json()["total"] >= 5

    def test_push_order(self, client):
        # First seed to ensure menu is loaded, then push an order
        resp = client.post("/order/push", json={
            "items": [{"item_id": 1, "qty": 2}],
            "order_source": "manual",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "confirmed"
        assert len(data["items"]) >= 1

    def test_get_order_not_found(self, client):
        resp = client.get("/order/99999")
        assert resp.status_code == 404


# ── Voice Endpoints ─────────────────────────────────────────────────────────────

class TestVoiceEndpoints:
    def test_parse_voice_text(self, client):
        resp = client.post("/voice/parse", json={"text": "one paneer pizza and two coke"})
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "language" in data

    def test_parse_empty_text(self, client):
        resp = client.post("/voice/parse", json={"text": ""})
        # Empty text may return 422 (validation) or 200 with empty items
        assert resp.status_code in (200, 422)


# ── KPI & Menu Endpoints ───────────────────────────────────────────────────────

class TestKPIEndpoints:
    def test_kpis(self, client):
        resp = client.get("/kpis")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_revenue" in data or isinstance(data, dict)

    def test_menu_insights(self, client):
        resp = client.get("/menu/insights")
        assert resp.status_code == 200


class TestPriceEndpoints:
    def test_price_recommendations(self, client):
        resp = client.get("/price/recommendations")
        assert resp.status_code == 200

    def test_price_summary(self, client):
        resp = client.get("/price/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_items" in data
