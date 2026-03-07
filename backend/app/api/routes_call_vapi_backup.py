"""Vapi AI Call Agent — handles phone call orders via Vapi.ai webhooks.

Full flow:
  1. Customer dials the Vapi phone number OR clicks browser call button
  2. Vapi AI greets customer warmly and asks what they'd like to order
  3. Customer orders food; Vapi calls our tools (search, add, remove, etc.)
  4. We fuzzy-match menu items, manage session, suggest combos via upsell engine
  5. Vapi speaks results including combo suggestions
  6. On confirmation, order is saved to backend and n8n is notified with SMS
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
import pandas as pd
from rapidfuzz import fuzz, process as fuzz_process

from app.dependencies import get_dataframes
from app.services.order_service import create_order, get_all_orders
from app.services.upsell_engine import recommend_addon

logger = logging.getLogger(__name__)

router = APIRouter()

N8N_CALL_WEBHOOK = os.getenv(
    "N8N_CALL_WEBHOOK",
    "https://deep1024.app.n8n.cloud/webhook/voice-order",
)

SERVER_URL_SECRET = os.getenv("VAPI_SERVER_URL_SECRET", "petpooja-vapi-secret-2024")

# In-memory call sessions: call_id → {items, total, suggestions_given, phone}
_call_sessions: dict[str, dict] = {}

# In-memory order history: phone → [order_dicts]
_order_history: dict[str, list[dict]] = {}


def _rupees(amount: float) -> str:
    """Format price as SPOKEN WORDS — prevents GPT from converting to dollars."""
    n = int(round(amount))
    if n == 0:
        return "zero rupees"
    parts = []
    if n >= 1000:
        parts.append(f"{n // 1000} thousand")
        n %= 1000
    if n >= 100:
        parts.append(f"{n // 100} hundred")
        n %= 100
    if n > 0:
        parts.append(str(n))
    return " ".join(parts) + " rupees"


# ── Menu helpers ──────────────────────────────────────────────────────────────

def _search_menu(query: str, menu_df: pd.DataFrame, top_n: int = 3) -> list[dict]:
    if menu_df.empty:
        return []
    names = menu_df["item_name"].tolist()
    matches = fuzz_process.extract(query, names, scorer=fuzz.WRatio, limit=top_n, score_cutoff=40)
    results = []
    for name, _score, idx in matches:
        row = menu_df.iloc[idx]
        results.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "price": float(row["price"]),
            "category": str(row.get("category", "")),
        })
    return results


def _get_menu_categories(menu_df: pd.DataFrame) -> list[str]:
    if menu_df.empty:
        return []
    return sorted(menu_df["category"].dropna().unique().tolist())


def _get_popular_items(menu_df: pd.DataFrame, top_n: int = 6) -> list[dict]:
    if menu_df.empty:
        return []
    # Pick items from different categories for variety
    cats = menu_df["category"].dropna().unique()
    picks = []
    for cat in cats:
        cat_items = menu_df[menu_df["category"] == cat]
        if not cat_items.empty:
            picks.append(cat_items.sample(1).iloc[0])
        if len(picks) >= top_n:
            break
    if not picks:
        picks = [row for _, row in menu_df.sample(n=min(top_n, len(menu_df))).iterrows()]
    return [
        {"item_name": str(r["item_name"]), "price": float(r["price"]), "category": str(r.get("category", ""))}
        for r in picks
    ]


def _filter_by_category(menu_df: pd.DataFrame, category: str) -> list[dict]:
    """Filter menu items by category (fuzzy matched)."""
    if menu_df.empty:
        return []
    cats = menu_df["category"].dropna().unique().tolist()
    match = fuzz_process.extractOne(category, cats, scorer=fuzz.WRatio, score_cutoff=50)
    if not match:
        return []
    matched_cat = match[0]
    filtered = menu_df[menu_df["category"] == matched_cat]
    return [
        {"item_name": str(r["item_name"]), "price": float(r["price"]), "category": matched_cat}
        for _, r in filtered.iterrows()
    ]


def _get_order_history_for_phone(phone: str) -> list[dict]:
    """Get past orders for a phone number."""
    return _order_history.get(phone, [])


def _reorder_previous(call_id: str, order_index: int, menu_df: pd.DataFrame, phone: str) -> dict:
    """Reorder items from a previous order by index (1-based)."""
    history = _order_history.get(phone, [])
    if not history:
        return {"success": False, "message": "You have no previous orders to reorder."}
    if order_index < 1 or order_index > len(history):
        return {"success": False, "message": f"Invalid order number. You have {len(history)} previous orders."}
    prev = history[order_index - 1]
    session = _call_sessions.setdefault(call_id, {"items": [], "total": 0.0, "suggestions_given": set(), "phone": phone})
    for item in prev.get("items", []):
        _add_to_order(call_id, item["item_name"], item.get("qty", 1), menu_df)
    session = _call_sessions.get(call_id, {"items": [], "total": 0.0})
    return {
        "success": True,
        "message": (
            f"I've added all items from your previous order to your cart. "
            f"Your current total is {_rupees(session['total'])}. "
            f"Would you like to make any changes or confirm?"
        ),
    }


def _modify_quantity(call_id: str, item_name: str, new_qty: int, menu_df: pd.DataFrame) -> dict:
    """Change the quantity of an item already in the order."""
    session = _call_sessions.get(call_id)
    if not session or not session["items"]:
        return {"success": False, "message": "Your order is empty. Please add items first."}
    order_names = [i["item_name"] for i in session["items"]]
    match = fuzz_process.extractOne(item_name, order_names, scorer=fuzz.WRatio, score_cutoff=50)
    if not match:
        return {"success": False, "message": f"I couldn't find '{item_name}' in your order."}
    matched_name = match[0]
    if new_qty <= 0:
        session["items"] = [i for i in session["items"] if i["item_name"] != matched_name]
        session["total"] = round(sum(i["line_total"] for i in session["items"]), 2)
        return {"success": True, "message": f"Removed {matched_name}. Total is now {_rupees(session['total'])}."}
    for i in session["items"]:
        if i["item_name"] == matched_name:
            i["qty"] = new_qty
            i["line_total"] = round(i["unit_price"] * new_qty, 2)
            break
    session["total"] = round(sum(i["line_total"] for i in session["items"]), 2)
    return {
        "success": True,
        "message": f"Updated {matched_name} to quantity {new_qty}. Total is now {_rupees(session['total'])}.",
    }


def _get_combo_suggestion(item_id: int, menu_df: pd.DataFrame, order_items_df: pd.DataFrame) -> str | None:
    """Get a combo/upsell suggestion for the given item using the upsell engine."""
    try:
        rec = recommend_addon(item_id, menu_df, order_items_df)
        if rec.get("recommended_addon"):
            addon_name = rec["recommended_addon"]
            addon_price = rec.get("price", 0)
            return (
                f"Great choice! May I also suggest adding {addon_name} "
                f"for just {_rupees(addon_price)}? "
                f"It goes perfectly with your order."
            )
    except Exception as e:
        logger.warning("Combo suggestion failed for item %s: %s", item_id, e)
    return None


# ── Session helpers ───────────────────────────────────────────────────────────

def _add_to_order(call_id: str, item_name: str, quantity: int, menu_df: pd.DataFrame) -> dict:
    session = _call_sessions.setdefault(call_id, {"items": [], "total": 0.0, "suggestions_given": set(), "phone": ""})

    names = menu_df["item_name"].tolist()
    match = fuzz_process.extractOne(item_name, names, scorer=fuzz.WRatio, score_cutoff=45)
    if not match:
        return {
            "success": False,
            "message": (
                f"Sorry, I couldn't find '{item_name}' on our menu. "
                f"Could you try a different name? You can also ask me for our menu categories or popular items."
            ),
        }

    matched_name, _score, idx = match
    row = menu_df.iloc[idx]
    item_id = int(row["item_id"])
    price = float(row["price"])

    existing = next((i for i in session["items"] if i["item_id"] == item_id), None)
    if existing:
        existing["qty"] += quantity
        existing["line_total"] = round(existing["unit_price"] * existing["qty"], 2)
    else:
        session["items"].append({
            "item_id": item_id,
            "item_name": matched_name,
            "qty": quantity,
            "unit_price": price,
            "line_total": round(price * quantity, 2),
        })

    session["total"] = round(sum(i["line_total"] for i in session["items"]), 2)

    msg = (
        f"Added {quantity} {matched_name} at {_rupees(price)} each to your order. "
        f"Your current total is {_rupees(session['total'])}."
    )

    # Combo suggestion via upsell engine
    if item_id not in session.get("suggestions_given", set()):
        order_items_df = pd.DataFrame(session["items"])
        combo_msg = _get_combo_suggestion(item_id, menu_df, order_items_df)
        if combo_msg:
            msg += f" {combo_msg}"
            session.setdefault("suggestions_given", set()).add(item_id)

    return {"success": True, "message": msg}


def _remove_from_order(call_id: str, item_name: str, menu_df: pd.DataFrame) -> dict:
    session = _call_sessions.get(call_id)
    if not session or not session["items"]:
        return {"success": False, "message": "Your order is empty, nothing to remove."}

    order_names = [i["item_name"] for i in session["items"]]
    match = fuzz_process.extractOne(item_name, order_names, scorer=fuzz.WRatio, score_cutoff=50)
    if not match:
        return {"success": False, "message": f"I couldn't find '{item_name}' in your current order."}

    matched_name, _score, _idx = match
    session["items"] = [i for i in session["items"] if i["item_name"] != matched_name]
    session["total"] = round(sum(i["line_total"] for i in session["items"]), 2)

    if session["items"]:
        return {
            "success": True,
            "message": f"Removed {matched_name} from your order. Your total is now {_rupees(session['total'])}.",
        }
    return {"success": True, "message": f"Removed {matched_name}. Your order is now empty."}


def _get_order_summary(call_id: str) -> dict:
    session = _call_sessions.get(call_id, {"items": [], "total": 0.0})
    if not session["items"]:
        return {"message": "Your order is currently empty. What would you like to order?"}
    lines = []
    for i in session["items"]:
        lines.append(f"{i['qty']} {i['item_name']} at {_rupees(i['line_total'])}")
    items_text = ", ".join(lines)
    return {
        "message": (
            f"Here is your order: {items_text}. "
            f"Your total comes to {_rupees(session['total'])}. "
            f"Would you like to confirm this order, or make any changes?"
        ),
    }


def _confirm_order(call_id: str, menu_df: pd.DataFrame) -> dict:
    session = _call_sessions.get(call_id)
    if not session or not session["items"]:
        return {"success": False, "message": "There are no items in your order yet. Please add some items first."}

    items_for_order = [{"item_id": i["item_id"], "qty": i["qty"]} for i in session["items"]]
    order = create_order(items_for_order, menu_df, order_source="phone_call")
    order_id = order["order_id"]
    total = order["total_price"]
    num_items = sum(i["qty"] for i in session["items"])
    items_text = ", ".join(f"{i['qty']} {i['item_name']}" for i in session["items"])

    # Estimate delivery time based on order size
    est_minutes = 15 + (num_items * 3)

    # Store order history by phone
    phone = session.get("phone", "")
    if phone:
        order_record = {
            "order_id": order_id,
            "items": [{"item_name": i["item_name"], "qty": i["qty"], "unit_price": i["unit_price"]} for i in session["items"]],
            "total": total,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        _order_history.setdefault(phone, []).append(order_record)

    _call_sessions.pop(call_id, None)

    return {
        "success": True,
        "order_id": order_id,
        "phone": phone,
        "total": total,
        "items_text": items_text,
        "est_minutes": est_minutes,
        "send_sms": True,
        "message": (
            f"Your order number {order_id} is confirmed! "
            f"You ordered {items_text} for a total of {_rupees(total)}. "
            f"Estimated preparation time is {est_minutes} minutes. "
            f"You will receive an SMS confirmation shortly. "
            f"Thank you for choosing PetPooja! Enjoy your meal! "
            f"Now ending call. Goodbye!"
        ),
    }


# ── n8n notification ─────────────────────────────────────────────────────────

async def _notify_n8n(call_id: str, action: str, details: dict):
    payload = {
        "source": "phone_call",
        "call_id": call_id,
        "action": action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **details,
    }
    # If this is order confirmation, include SMS trigger data
    if action == "confirm_order" and details.get("send_sms"):
        payload["send_sms"] = True
        payload["sms_phone"] = details.get("phone", "")
        payload["sms_message"] = (
            f"PetPooja Order #{details.get('order_id', '')} confirmed! "
            f"Items: {details.get('items_text', '')}. "
            f"Total: Rs.{details.get('total', 0)}. "
            f"Ready in ~{details.get('est_minutes', 20)} min. "
            f"Thank you!"
        )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(N8N_CALL_WEBHOOK, json=payload)
        logger.info("n8n notified: action=%s call=%s", action, call_id)
    except Exception as e:
        logger.warning("n8n notification failed: %s", e)


# ── Function router ──────────────────────────────────────────────────────────

def _handle_function(
    func_name: str, params: dict, call_id: str, menu_df: pd.DataFrame, phone: str = "",
) -> str:
    # Store phone in session if available
    session = _call_sessions.get(call_id)
    if session and phone and not session.get("phone"):
        session["phone"] = phone

    if func_name == "search_menu":
        query = params.get("query", "")
        results = _search_menu(query, menu_df)
        if not results:
            return "I couldn't find that item. Could you say the item name again clearly?"
        # Auto-add the best match to reduce round trips
        best = results[0]
        add_result = _add_to_order(call_id, best["item_name"], 1, menu_df)
        return add_result["message"]

    if func_name == "add_to_order":
        r = _add_to_order(call_id, params.get("item_name", ""), int(params.get("quantity", 1)), menu_df)
        return r["message"]

    if func_name == "remove_from_order":
        r = _remove_from_order(call_id, params.get("item_name", ""), menu_df)
        return r["message"]

    if func_name == "modify_quantity":
        r = _modify_quantity(
            call_id, params.get("item_name", ""), int(params.get("quantity", 1)), menu_df,
        )
        return r["message"]

    if func_name == "get_order_summary":
        return _get_order_summary(call_id)["message"]

    if func_name == "confirm_order":
        r = _confirm_order(call_id, menu_df)
        return r["message"]

    if func_name == "get_menu_categories":
        cats = _get_menu_categories(menu_df)
        if cats:
            return "Our menu categories are: " + ", ".join(cats) + ". Which category interests you?"
        return "Sorry, I could not load our menu categories right now."

    if func_name == "filter_by_category":
        category = params.get("category", "")
        items = _filter_by_category(menu_df, category)
        if items:
            lines = [f"{it['item_name']} for {_rupees(it['price'])}" for it in items]
            return f"Here are our {items[0]['category']} items: " + ". ".join(lines) + ". What would you like?"
        return f"Sorry, I couldn't find a category matching '{category}'. Try asking for our menu categories."

    if func_name == "get_popular_items":
        items = _get_popular_items(menu_df)
        if items:
            lines = [f"{it['item_name']} for {_rupees(it['price'])}" for it in items]
            return "Our popular items: " + ". ".join(lines) + ". Would you like to add any of these?"
        return "Sorry, I could not load popular items right now."

    if func_name == "get_specials":
        return (
            "Today's specials: Order any 2 main course items and get 10 percent off! "
            "Also try our new Paneer Tikka Pizza, a customer favourite. "
            "Would you like to hear more or start ordering?"
        )

    if func_name == "check_order_history":
        history = _get_order_history_for_phone(phone)
        if not history:
            return "This is your first time ordering with us! Would you like to see our popular items or menu categories?"
        lines = []
        for idx, h in enumerate(history[-3:], 1):
            items_str = ", ".join(f"{i['qty']} {i['item_name']}" for i in h["items"])
            lines.append(f"Order {idx}: {items_str} for {_rupees(h['total'])}")
        return (
            f"Welcome back! You have {len(history)} previous orders. "
            f"Recent orders: {'. '.join(lines)}. "
            f"Would you like to reorder any of these, or order something new?"
        )

    if func_name == "reorder_previous":
        order_num = int(params.get("order_number", 1))
        r = _reorder_previous(call_id, order_num, menu_df, phone)
        return r["message"]

    return f"Unknown function: {func_name}"


def _parse_params(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            pass
    return {}


# ── Main webhook ─────────────────────────────────────────────────────────────

@router.post("/webhook")
async def vapi_webhook(
    request: Request,
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Handle Vapi server URL webhook events."""
    # Verify server URL secret
    secret_header = request.headers.get("x-vapi-secret", "")
    if SERVER_URL_SECRET and secret_header != SERVER_URL_SECRET:
        logger.warning("Invalid or missing Vapi secret header")
        # Still process — Vapi may not send it on all event types

    body = await request.json()
    message = body.get("message", {})
    msg_type = message.get("type", "")
    call = message.get("call", {})
    call_id = call.get("id", "unknown")
    menu_df = dfs.get("menu", pd.DataFrame())

    # Extract caller phone number from Vapi call metadata
    customer = call.get("customer", {})
    phone = customer.get("number", "")

    logger.info("Vapi webhook: type=%s call=%s phone=%s", msg_type, call_id, phone)

    # ── assistant-request (dynamic assistant config) ──────────────────────
    if msg_type == "assistant-request":
        # Return dynamic greeting for returning customers
        history = _get_order_history_for_phone(phone) if phone else []
        if history:
            greeting = (
                f"Welcome back to PetPooja! "
                f"I see you've ordered with us before. "
                f"Would you like to reorder from your last order, or try something new?"
            )
        else:
            greeting = "Welcome to PetPooja! What would you like to order today?"
        return JSONResponse({"firstMessage": greeting})

    # ── function-call (single) ────────────────────────────────────────────
    if msg_type == "function-call":
        fc = message.get("functionCall", {})
        func_name = fc.get("name", "")
        params = _parse_params(fc.get("parameters", {}))
        result = _handle_function(func_name, params, call_id, menu_df, phone)

        session = _call_sessions.get(call_id, {"items": [], "total": 0.0})

        # For confirm_order, pass full confirmation details to n8n for SMS
        notify_details: dict = {
            "function": func_name,
            "params": params,
            "items": session.get("items", []),
            "total": session.get("total", 0),
            "result_preview": result[:200],
        }
        if func_name == "confirm_order":
            confirm_result = _call_sessions.get(call_id)  # already popped by _confirm_order
            # Get data from the result text — use the stored confirmation data
            for order in get_all_orders(1):
                notify_details.update({
                    "send_sms": True,
                    "phone": phone,
                    "order_id": order.get("order_id"),
                    "items_text": ", ".join(f"{i['qty']} {i['item_name']}" for i in order.get("items", [])),
                    "total": order.get("total_price", 0),
                    "est_minutes": 15 + sum(i.get("qty", 1) for i in order.get("items", [])) * 3,
                })
                break

        await _notify_n8n(call_id, func_name, notify_details)

        return JSONResponse({"result": result})

    # ── tool-calls (batch, newer Vapi format) ─────────────────────────────
    if msg_type == "tool-calls":
        tool_calls = message.get("toolCallList", message.get("toolCalls", []))
        results = []
        for tc in tool_calls:
            tc_id = tc.get("id", "")
            func = tc.get("function", {})
            func_name = func.get("name", "")
            params = _parse_params(func.get("arguments", {}))
            result_text = _handle_function(func_name, params, call_id, menu_df, phone)
            results.append({"toolCallId": tc_id, "result": result_text})

        session = _call_sessions.get(call_id, {"items": [], "total": 0.0})
        func_names = [tc.get("function", {}).get("name", "") for tc in tool_calls]
        await _notify_n8n(call_id, "tool-calls", {
            "functions": func_names,
            "items": session.get("items", []),
            "total": session.get("total", 0),
            "phone": phone,
        })

        return JSONResponse({"results": results})

    # ── end-of-call-report ────────────────────────────────────────────────
    if msg_type == "end-of-call-report":
        reason = message.get("endedReason", "")
        summary = message.get("summary", "")
        duration = message.get("durationSeconds", 0)
        logger.info("Call %s ended: reason=%s duration=%ss", call_id, reason, duration)
        await _notify_n8n(call_id, "call_ended", {
            "reason": reason,
            "summary": summary[:500],
            "duration_seconds": duration,
        })
        _call_sessions.pop(call_id, None)
        return JSONResponse({"ok": True})

    # ── Default: acknowledge ──────────────────────────────────────────────
    return JSONResponse({"ok": True})


@router.get("/sessions")
async def get_active_sessions():
    """Debug: list active call sessions."""
    return JSONResponse({
        "active_calls": len(_call_sessions),
        "sessions": {
            cid: {"items": s["items"], "total": s["total"]}
            for cid, s in _call_sessions.items()
        },
    })
