"""Pydantic models for menu intelligence endpoints."""

from pydantic import BaseModel


class MenuItemInsight(BaseModel):
    item_name: str
    sales_volume: int
    margin: float
    category: str  # Star, Puzzle, Plow Horse, Dog


class HiddenStar(BaseModel):
    item: str
    margin: float
    reason: str
