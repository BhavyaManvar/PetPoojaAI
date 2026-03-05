"""Pydantic models for Combo Engine & Upsell endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Combo / Market Basket Analysis ──────────────────────────────────────────────

class ComboItem(BaseModel):
    combo: str = Field(..., description="Human-readable pair, e.g. 'Burger + Fries'")
    antecedent: str = Field(..., description="Left-hand item in the rule")
    consequent: str = Field(..., description="Right-hand item in the rule")
    support: float = Field(..., ge=0, le=1, description="Fraction of orders containing both items")
    confidence: float = Field(..., ge=0, le=1, description="P(consequent | antecedent)")
    lift: float = Field(..., ge=0, description="Lift value (>1 = positive correlation)")


class TopCombosResponse(BaseModel):
    combos: list[ComboItem]
    basket_stats: dict | None = None


# ── Basket Stats ────────────────────────────────────────────────────────────────

class BasketStatsResponse(BaseModel):
    total_baskets: int
    avg_basket_size: float
    max_basket_size: int
    min_basket_size: int


# ── Upsell ──────────────────────────────────────────────────────────────────────

class UpsellResult(BaseModel):
    item: str = Field(..., description="Source item name")
    recommended_addon: str | None = Field(None, description="Suggested add-on item name")
    addon_id: int | None = Field(None, description="item_id of the recommended add-on")
    strategy: str | None = Field(None, description="Which strategy produced this recommendation")
    confidence: float | None = Field(None, description="Association rule confidence (combo strategies)")
    lift: float | None = Field(None, description="Association rule lift (combo strategies)")
    margin: float | None = Field(None, description="Contribution margin (hidden_star strategy)")


class UpsellBatchRequest(BaseModel):
    item_ids: list[int] = Field(..., min_length=1, description="List of menu item IDs")


class UpsellBatchResponse(BaseModel):
    results: list[UpsellResult]
