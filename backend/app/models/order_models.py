"""Pydantic models for order endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ModifierSelection(BaseModel):
    """A single modifier choice (size, spice, or add-on)."""

    size: str = ""
    spice: str = ""
    addons: list[str] = []


class OrderLineItem(BaseModel):
    item_id: int
    qty: int
    modifiers: ModifierSelection | None = None


class OrderRequest(BaseModel):
    items: list[OrderLineItem]
    order_source: str = Field("manual", description="voice | manual | online")


class OrderResponseItem(BaseModel):
    item_id: int
    item_name: str
    category: str = ""
    qty: int
    unit_price: float
    modifier_price: float = 0.0
    modifiers: ModifierSelection | None = None
    line_total: float


class OrderResponse(BaseModel):
    order_id: int
    status: str
    total_price: float
    order_source: str = "manual"
    created_at: str = ""
    delivery_address: str = ""
    items: list[OrderResponseItem] = []
    kot_id: str = ""


class OrderListResponse(BaseModel):
    orders: list[OrderResponse]
    total: int


class SeedRequest(BaseModel):
    count: int = Field(25, ge=1, le=200, description="Number of demo orders to generate")


class SeedResponse(BaseModel):
    seeded: int
    message: str
