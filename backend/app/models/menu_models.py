"""Pydantic models for menu intelligence & KPI endpoints."""

from __future__ import annotations

from pydantic import BaseModel


# ── Menu Intelligence ────────────────────────────────────────────────

class MenuItemInsight(BaseModel):
    item_id: int
    item_name: str
    category: str
    price: float = 0
    cost: float = 0
    total_qty_sold: int = 0
    total_revenue: float = 0
    unit_margin: float = 0
    contribution_margin: float = 0
    item_profit: float = 0
    margin_pct: float = 0
    sales_velocity: float = 0
    avg_daily_sales: float = 0
    menu_class: str  # Star, Puzzle, Plow Horse, Dog


class MenuInsightsResponse(BaseModel):
    items: list[MenuItemInsight]


class HiddenStar(BaseModel):
    item_id: int | None = None
    item: str
    margin: float
    margin_pct: float | None = None
    sales: int = 0
    category: str = ""
    reason: str


class HiddenStarsResponse(BaseModel):
    hidden_stars: list[HiddenStar]


class RiskItem(BaseModel):
    item_id: int | None = None
    item: str
    margin: float
    sales: int = 0
    category: str = ""
    reason: str


class RiskItemsResponse(BaseModel):
    risk_items: list[RiskItem]


# ── KPI ──────────────────────────────────────────────────────────────

class TopItem(BaseModel):
    item_name: str
    total_qty: int


class KPIResponse(BaseModel):
    total_orders: int
    total_revenue: float
    avg_order_value: float
    unique_items_sold: int = 0
    top_city: str
    revenue_by_city: dict[str, float]
    revenue_by_order_type: dict[str, float]
    top_items: list[TopItem]
