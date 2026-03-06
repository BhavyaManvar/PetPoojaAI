"""Voice Copilot endpoints — natural language order parsing."""

from fastapi import APIRouter, Depends
import pandas as pd

from app.dependencies import get_dataframes
from app.models.voice_models import (
    VoiceInput,
    VoiceParsedResponse,
    VoiceOrderResponse,
    VoicePipelineResponse,
    VoiceChatResponse,
    VoiceChatItem,
    VoiceChatUpsell,
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
from app.services.upsell_engine import recommend_addons_batch

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


@router.post("/chat", response_model=VoiceChatResponse)
async def voice_chat(
    payload: VoiceInput,
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Parse voice text, match items, and return with prices — without creating an order.

    This endpoint powers the interactive chat-based ordering flow.
    """
    intent = detect_intent(payload.text)
    language = detect_language(payload.text)

    if intent == "CONFIRM_ORDER":
        return VoiceChatResponse(
            intent=intent,
            items=[],
            message="Order confirmed! Processing now.",
            language=language,
        )

    if intent == "REMOVE_ITEM":
        return VoiceChatResponse(
            intent=intent,
            items=[],
            message="Which item would you like to remove?",
            language=language,
        )

    parsed = parse_voice_text(payload.text, include_confidence=True)
    resolved = resolve_items(parsed, dfs["menu"])

    menu_df = dfs["menu"]
    chat_items: list[VoiceChatItem] = []
    for r in resolved:
        row = menu_df.loc[menu_df["item_id"] == r["item_id"]]
        unit_price = float(row.iloc[0]["price"]) if not row.empty else 0.0
        confidence = 0.0
        for p in parsed:
            if p.get("item") == r["item_name"]:
                confidence = p.get("confidence", 0.0)
                break
        chat_items.append(VoiceChatItem(
            item_id=r["item_id"],
            item_name=r["item_name"],
            qty=r["qty"],
            unit_price=unit_price,
            line_total=round(unit_price * r["qty"], 2),
            confidence=confidence,
        ))

    if chat_items:
        summary = ", ".join(f"{i.qty}x {i.item_name} (₹{i.line_total:.0f})" for i in chat_items)
        message = f"Added {summary} to your order."

        # ── Upsell suggestions ───────────────────────────────────────────
        item_ids = [i.item_id for i in chat_items]
        menu_df = dfs["menu"]
        upsell_recs = recommend_addons_batch(
            item_ids, menu_df, dfs["order_items"], dfs.get("sales_analytics"),
        )

        upsells: list[VoiceChatUpsell] = []
        seen_addons: set[str] = set()
        ordered_names = {i.item_name for i in chat_items}

        for rec in upsell_recs:
            addon = rec.get("recommended_addon")
            if not addon or addon in seen_addons or addon in ordered_names:
                continue
            seen_addons.add(addon)

            # Look up addon price
            addon_row = menu_df.loc[menu_df["item_name"] == addon]
            addon_price = float(addon_row.iloc[0]["price"]) if not addon_row.empty else None

            strategy = rec.get("strategy", "")
            reason_map = {
                "cross_category_combo": f"Frequently ordered with {rec.get('item', 'your items')}",
                "same_category_combo": f"Popular combo with {rec.get('item', 'your items')}",
                "hidden_star_promotion": "Chef's recommendation — great value!",
                "popular_addon": "Our most popular add-on",
            }
            upsells.append(VoiceChatUpsell(
                item_name=rec.get("item", ""),
                recommended_addon=addon,
                addon_id=rec.get("addon_id"),
                addon_price=addon_price,
                strategy=strategy,
                reason=reason_map.get(strategy, "You might enjoy this!"),
            ))

        if upsells:
            addon_suggestions = " | ".join(
                f"{u.recommended_addon} (₹{u.addon_price:.0f})" if u.addon_price else u.recommended_addon or ""
                for u in upsells[:2]
            )
            message += f" Would you also like {addon_suggestions}?"
        else:
            message += " Anything else?"
    else:
        upsells = []
        message = "Sorry, I couldn't find that on the menu. Could you try again?"

    return VoiceChatResponse(
        intent=intent,
        items=chat_items,
        upsells=upsells,
        message=message,
        language=language,
    )
