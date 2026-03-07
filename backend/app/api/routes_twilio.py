"""Twilio AI Call Agent — handles inbound phone call orders.

Flow:
  1. Twilio calls our webhook when a customer dials in
  2. We greet the customer and start listening (Gather)
  3. Twilio sends recorded speech to our /twilio/gather endpoint
  4. We send audio to Sarvam STT → get transcript
  5. Translate if non-English → parse items via voice_parser
  6. Forward to n8n for logging/processing
  7. Respond with Sarvam TTS audio via TwiML <Play>
  8. Loop until customer confirms order
"""

from __future__ import annotations

import base64
import logging
import os
import uuid
from urllib.parse import urljoin

import httpx
from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import Response
import pandas as pd

from app.dependencies import get_dataframes
from app.services.voice_parser import parse_voice_text, detect_intent, detect_language
from app.services.order_service import resolve_items, build_pos_payload

logger = logging.getLogger(__name__)

router = APIRouter()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "sk_vvxwxlra_BWCQOKDK2olYZ9J1nKONvHWp")
N8N_CALL_WEBHOOK = os.getenv("N8N_CALL_WEBHOOK", "https://deep1024.app.n8n.cloud/webhook/voice-order")

# In-memory session store for active phone call orders
# Maps CallSid → { items: [...], total: float, language: str }
_call_sessions: dict[str, dict] = {}


def _twiml(body: str) -> Response:
    """Return a TwiML XML response."""
    xml = f'<?xml version="1.0" encoding="UTF-8"?><Response>{body}</Response>'
    return Response(content=xml, media_type="application/xml")


async def _sarvam_tts(text: str, lang: str = "en-IN") -> str | None:
    """Call Sarvam TTS and return base64 audio, or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                "https://api.sarvam.ai/text-to-speech",
                headers={
                    "Content-Type": "application/json",
                    "api-subscription-key": SARVAM_API_KEY,
                },
                json={
                    "target_language_code": lang,
                    "speaker": "priya",
                    "model": "bulbul:v3",
                    "text": text,
                },
            )
            if res.status_code == 200:
                data = res.json()
                if data.get("audios"):
                    return data["audios"][0]
    except Exception as e:
        logger.error("Sarvam TTS error: %s", e)
    return None


async def _sarvam_translate(text: str, src: str = "auto", tgt: str = "en-IN") -> str:
    """Translate text via Sarvam API. Returns original on failure."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                "https://api.sarvam.ai/translate",
                headers={
                    "Content-Type": "application/json",
                    "api-subscription-key": SARVAM_API_KEY,
                },
                json={
                    "input": text,
                    "source_language_code": src,
                    "target_language_code": tgt,
                    "model": "mayura:v1",
                },
            )
            if res.status_code == 200:
                return res.json().get("translated_text", text)
    except Exception as e:
        logger.error("Sarvam translate error: %s", e)
    return text


def _is_non_latin(text: str) -> bool:
    """Check if text contains non-Latin characters (Hindi, Gujarati, etc.)."""
    return any(ord(c) > 127 for c in text)


async def _notify_n8n(call_sid: str, transcript: str, items: list, action: str, total: float):
    """Send call order data to n8n webhook for processing/logging."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                N8N_CALL_WEBHOOK,
                json={
                    "source": "phone_call",
                    "call_sid": call_sid,
                    "transcript": transcript,
                    "items": items,
                    "action": action,
                    "total": total,
                    "session_id": call_sid,
                },
            )
    except Exception as e:
        logger.warning("n8n notification failed: %s", e)


@router.post("/incoming")
async def twilio_incoming(request: Request):
    """Handle incoming Twilio call — greet and start gathering speech.

    Twilio sends POST with CallSid, From, To, etc.
    We respond with TwiML that greets the user and starts listening.
    """
    form = await request.form()
    call_sid = form.get("CallSid", str(uuid.uuid4()))

    # Initialize session
    _call_sessions[call_sid] = {"items": [], "total": 0.0, "language": "en"}

    logger.info("Incoming call: %s from %s", call_sid, form.get("From", "unknown"))

    # Get the base URL for callbacks
    base_url = str(request.base_url).rstrip("/")

    # Greet with Sarvam TTS
    greeting = "Welcome to RestroAI! You can order in Hindi, English, or any language you prefer. Please tell me what you would like to order."
    audio_b64 = await _sarvam_tts(greeting)

    if audio_b64:
        # Play Sarvam greeting, then gather speech
        twiml = f"""
            <Play>data:audio/wav;base64,{audio_b64}</Play>
            <Gather input="speech" timeout="5" speechTimeout="2"
                    action="{base_url}/twilio/gather" method="POST"
                    language="hi-IN" speechModel="phone_call">
                <Say voice="Polly.Aditi" language="hi-IN">Please speak your order now.</Say>
            </Gather>
            <Say voice="Polly.Aditi">I didn't hear anything. Goodbye!</Say>
        """
    else:
        # Fallback: Twilio's built-in TTS
        twiml = f"""
            <Gather input="speech" timeout="5" speechTimeout="2"
                    action="{base_url}/twilio/gather" method="POST"
                    language="hi-IN" speechModel="phone_call">
                <Say voice="Polly.Aditi" language="hi-IN">
                    Welcome to RestroAI! Please tell me what you would like to order. 
                    You can speak in Hindi, English, or any language.
                </Say>
            </Gather>
            <Say voice="Polly.Aditi">I didn't hear anything. Goodbye!</Say>
        """

    return _twiml(twiml)


@router.post("/gather")
async def twilio_gather(
    request: Request,
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Process gathered speech from Twilio.

    Twilio sends SpeechResult with the transcribed text.
    We parse it, update the session, and respond.
    """
    form = await request.form()
    call_sid = form.get("CallSid", "")
    speech_result = form.get("SpeechResult", "")
    base_url = str(request.base_url).rstrip("/")

    logger.info("Call %s speech: '%s'", call_sid, speech_result)

    session = _call_sessions.get(call_sid, {"items": [], "total": 0.0, "language": "en"})

    if not speech_result.strip():
        # No speech detected — ask again
        twiml = f"""
            <Gather input="speech" timeout="5" speechTimeout="2"
                    action="{base_url}/twilio/gather" method="POST"
                    language="hi-IN" speechModel="phone_call">
                <Say voice="Polly.Aditi">Sorry, I didn't catch that. Please tell me what you'd like to order.</Say>
            </Gather>
            <Say voice="Polly.Aditi">Goodbye!</Say>
        """
        return _twiml(twiml)

    transcript = speech_result.strip()

    # Translate if non-English
    if _is_non_latin(transcript):
        english_text = await _sarvam_translate(transcript)
    else:
        english_text = transcript

    # Detect intent
    intent = detect_intent(english_text)
    language = detect_language(english_text)
    session["language"] = language

    if intent == "CONFIRM_ORDER":
        # Place the order
        if session["items"]:
            items_for_pos = [{"item_id": i["item_id"], "qty": i["qty"]} for i in session["items"]]
            menu_df = dfs["menu"]
            order = build_pos_payload(
                [{"item_id": i["item_id"], "item_name": i["item_name"], "qty": i["qty"]} for i in session["items"]],
                menu_df,
            )
            total = order.get("total_price", session["total"])

            # Notify n8n
            await _notify_n8n(call_sid, transcript, session["items"], "confirm", total)

            summary = ", ".join(f"{i['qty']}x {i['item_name']}" for i in session["items"])
            response_text = f"Your order has been confirmed! You ordered {summary}. Total is {total:.0f} rupees. Thank you for ordering with RestroAI. Goodbye!"

            # Clean up session
            _call_sessions.pop(call_sid, None)

            audio_b64 = await _sarvam_tts(response_text)
            if audio_b64:
                return _twiml(f'<Play>data:audio/wav;base64,{audio_b64}</Play><Hangup/>')
            return _twiml(f'<Say voice="Polly.Aditi">{response_text}</Say><Hangup/>')
        else:
            response_text = "You don't have any items in your order yet. Please tell me what you'd like to order."
    elif intent == "REMOVE_ITEM":
        response_text = "Which item would you like to remove from your order?"
    else:
        # ORDER_ITEM — parse and add to session
        parsed = parse_voice_text(english_text, include_confidence=True)
        resolved = resolve_items(parsed, dfs["menu"])

        menu_df = dfs["menu"]
        new_items = []
        for r in resolved:
            row = menu_df.loc[menu_df["item_id"] == r["item_id"]]
            price = float(row.iloc[0]["price"]) if not row.empty else 0.0
            new_items.append({
                "item_id": r["item_id"],
                "item_name": r["item_name"],
                "qty": r["qty"],
                "unit_price": price,
                "line_total": round(price * r["qty"], 2),
            })

        # Merge into session
        for ni in new_items:
            existing = next((e for e in session["items"] if e["item_id"] == ni["item_id"]), None)
            if existing:
                existing["qty"] += ni["qty"]
                existing["line_total"] = existing["unit_price"] * existing["qty"]
            else:
                session["items"].append(ni)

        session["total"] = sum(i["line_total"] for i in session["items"])
        _call_sessions[call_sid] = session

        # Notify n8n
        await _notify_n8n(call_sid, transcript, session["items"], "add_item", session["total"])

        if new_items:
            added = ", ".join(f"{i['qty']} {i['item_name']}" for i in new_items)
            response_text = f"Added {added} to your order. Your current total is {session['total']:.0f} rupees. Would you like to add anything else, or should I confirm the order?"
        else:
            response_text = "Sorry, I couldn't find that on our menu. Could you please repeat your order?"

    # Respond and continue gathering
    audio_b64 = await _sarvam_tts(response_text)
    if audio_b64:
        twiml = f"""
            <Play>data:audio/wav;base64,{audio_b64}</Play>
            <Gather input="speech" timeout="5" speechTimeout="2"
                    action="{base_url}/twilio/gather" method="POST"
                    language="hi-IN" speechModel="phone_call">
                <Say voice="Polly.Aditi">Please continue.</Say>
            </Gather>
            <Say voice="Polly.Aditi">Thank you for calling. Goodbye!</Say>
        """
    else:
        twiml = f"""
            <Gather input="speech" timeout="5" speechTimeout="2"
                    action="{base_url}/twilio/gather" method="POST"
                    language="hi-IN" speechModel="phone_call">
                <Say voice="Polly.Aditi">{response_text}</Say>
            </Gather>
            <Say voice="Polly.Aditi">Thank you for calling. Goodbye!</Say>
        """

    return _twiml(twiml)


@router.post("/status")
async def twilio_status(request: Request):
    """Handle Twilio call status callbacks (optional — for logging)."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    status = form.get("CallStatus", "")
    logger.info("Call %s status: %s", call_sid, status)

    if status in ("completed", "failed", "busy", "no-answer"):
        _call_sessions.pop(call_sid, None)

    return _twiml("")
