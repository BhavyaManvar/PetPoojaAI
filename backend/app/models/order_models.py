"""Pydantic models for order endpoints."""

from pydantic import BaseModel


class OrderLineItem(BaseModel):
    item_id: int
    qty: int


class OrderRequest(BaseModel):
    items: list[OrderLineItem]


class OrderResponseItem(BaseModel):
    item_id: int
    item_name: str
    qty: int
    unit_price: float
    line_total: float


class OrderResponse(BaseModel):
    order_id: int
    status: str
    total_price: float
    items: list[OrderResponseItem] = []
