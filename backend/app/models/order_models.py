"""Pydantic models for order endpoints."""

from pydantic import BaseModel, Field


class OrderLineItem(BaseModel):
    item_id: int
    qty: int


class OrderRequest(BaseModel):
    items: list[OrderLineItem]
    order_source: str = Field("manual", description="voice | manual | online")


class OrderResponseItem(BaseModel):
    item_id: int
    item_name: str
    category: str = ""
    qty: int
    unit_price: float
    line_total: float


class OrderResponse(BaseModel):
    order_id: int
    status: str
    total_price: float
    order_source: str = "manual"
    created_at: str = ""
    items: list[OrderResponseItem] = []


class OrderListResponse(BaseModel):
    orders: list[OrderResponse]
    total: int


class SeedRequest(BaseModel):
    count: int = Field(25, ge=1, le=200, description="Number of demo orders to generate")


class SeedResponse(BaseModel):
    seeded: int
    message: str
