"""Pydantic models for voice copilot endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class VoiceInput(BaseModel):
    """Raw voice transcription input."""
    text: str = Field(..., min_length=1, examples=["one paneer pizza and two coke"])


# ---------------------------------------------------------------------------
# Response items
# ---------------------------------------------------------------------------

class ParsedItem(BaseModel):
    """A single parsed order line from voice input."""
    item: str
    qty: int
    confidence: float | None = Field(None, ge=0, le=100, description="Fuzzy match confidence 0-100")
    original_text: str | None = Field(None, description="Original text segment before matching")


class ResolvedItem(BaseModel):
    """Parsed item with menu item_id resolved."""
    item_id: int
    item_name: str
    qty: int
    unit_price: float = 0.0
    line_total: float = 0.0


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

class VoiceParsedResponse(BaseModel):
    """Response from /voice/parse."""
    items: list[ParsedItem]
    language: str = Field("en", description="Detected language: en | hi | hinglish")


class VoiceOrderResponse(BaseModel):
    """Response from /voice/order — full voice-to-PoS flow."""
    order_id: int
    status: str
    total_price: float
    items: list[ResolvedItem]
    language: str = Field("en")


# ---------------------------------------------------------------------------
# Full pipeline response (parse + POS in one call)
# ---------------------------------------------------------------------------

class PosItem(BaseModel):
    """Single line-item in a POS payload."""
    item_id: int
    qty: int


class PosPayload(BaseModel):
    """POS-format order payload."""
    order_id: int
    items: list[PosItem]


class VoicePipelineResponse(BaseModel):
    """Combined response from /voice/pipeline — full voice ordering engine."""
    intent: str = Field(..., description="Detected intent: ORDER_ITEM | REMOVE_ITEM | CONFIRM_ORDER")
    items: list[ParsedItem]
    pos_payload: PosPayload
    language: str = Field("en")


class VoiceChatItem(BaseModel):
    """A matched item with price info for the chat flow."""
    item_id: int
    item_name: str
    qty: int
    unit_price: float
    line_total: float
    confidence: float = 0.0


class VoiceChatUpsell(BaseModel):
    """An upsell suggestion returned alongside the chat response."""
    item_name: str = Field(..., description="The item this upsell is for")
    recommended_addon: str | None = None
    addon_id: int | None = None
    addon_price: float | None = None
    strategy: str | None = None
    recommended_category: str | None = None
    reason: str = ""


class VoiceChatResponse(BaseModel):
    """Response from /voice/chat — parse + price lookup without creating an order."""
    intent: str = Field("ORDER_ITEM", description="Detected intent")
    items: list[VoiceChatItem] = []
    upsells: list[VoiceChatUpsell] = Field(default_factory=list, description="AI upsell suggestions")
    message: str = ""
    language: str = Field("en")
