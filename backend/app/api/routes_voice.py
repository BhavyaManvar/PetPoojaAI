"""Voice Copilot endpoints — natural language order parsing."""

from fastapi import APIRouter, Depends
import pandas as pd

from app.dependencies import get_dataframes
from app.models.voice_models import (
    VoiceInput,
    VoiceParsedResponse,
    VoiceOrderResponse,
    VoicePipelineResponse,
    ResolvedItem,
    PosPayload,
    PosItem,
)
from app.services.voice_parser import (
    parse_voice_text,
    detect_language,
    detect_intent,
)
from app.services.order_service import resolve_items, build_pos_payload

router = APIRouter()


@router.post("/parse", response_model=VoiceParsedResponse)
async def parse_voice(payload: VoiceInput):
    """Parse raw voice text into structured items with fuzzy matching."""
    items = parse_voice_text(payload.text, include_confidence=True)
    language = detect_language(payload.text)
    return VoiceParsedResponse(items=items, language=language)


@router.post("/order", response_model=VoiceOrderResponse)
async def voice_order(
    payload: VoiceInput,
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """End-to-end voice → PoS order: parse, resolve IDs, create order."""
    parsed = parse_voice_text(payload.text)
    language = detect_language(payload.text)
    resolved = resolve_items(parsed, dfs["menu"])
    order = build_pos_payload(resolved, dfs["menu"])

    return VoiceOrderResponse(
        order_id=order["order_id"],
        status=order["status"],
        total_price=order["total_price"],
        items=[ResolvedItem(**r) for r in resolved],
        language=language,
    )


@router.post("/pipeline", response_model=VoicePipelineResponse)
async def voice_pipeline(
    payload: VoiceInput,
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Full voice ordering pipeline: intent → parse → POS generation.

    Returns parsed items *and* POS payload in a single response.
    """
    intent = detect_intent(payload.text)
    language = detect_language(payload.text)
    parsed = parse_voice_text(payload.text, include_confidence=True)
    resolved = resolve_items(parsed, dfs["menu"])
    order = build_pos_payload(resolved, dfs["menu"])

    return VoicePipelineResponse(
        intent=intent,
        items=parsed,
        pos_payload=PosPayload(
            order_id=order["order_id"],
            items=[PosItem(item_id=r["item_id"], qty=r["qty"]) for r in resolved],
        ),
        language=language,
    )
