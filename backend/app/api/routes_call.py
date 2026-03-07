"""Vapi AI Call Agent — handles phone call orders via Vapi.ai webhooks.

Integrations:
  - Sarvam AI: transliterate Hindi/Gujarati food names to English for accurate
    fuzzy matching (e.g. पनीर टिक्का -> Paneer Tikka). Detect customer language
    for analytics. Responses stay in English (ElevenLabs TTS is English-only).
  - n8n: rich event pipeline with language analytics, order tracking, timestamps
  - Upsell Engine: smart combo suggestions after each item added

Full flow:
  1. Customer dials phone or clicks browser call -> Vapi greets in English
  2. Vapi transcribes speech, calls our tools with extracted parameters
  3. Sarvam transliterates Indic text -> English for accurate fuzzy matching
  4. We detect customer language and log it for n8n analytics
  5. Response is ALWAYS in English (ElevenLabs speaks English only)
  6. On confirmation, order saved + n8n notified with full analytics
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
from app.services.order_service import create_order, update_order
from app.services.upsell_engine import recommend_addon
from app.services.kot_service import generate_kot
from app.services.modifier_config import (
    get_modifiers_for_category,
    calculate_modifier_price,
    format_modifier_text,
)
from app.services.sarvam_service import (
    detect_language,
    has_indic_script,
    transliterate_to_english,
    LANG_ENGLISH,
    LANG_HINDI,
    LANG_GUJARATI,
)

logger = logging.getLogger(__name__)

# ── Hardcoded Combo Recommendations (item → list of combo partners) ───────────
# When a customer orders the key item, suggest the first available combo partner.
# Prices are looked up dynamically from the menu DataFrame at runtime.
COMBO_MAP: dict[str, list[str]] = {
    # Pizza combos
    "Paneer Tikka Pizza": ["Cheesy Fries", "Coke", "Chocolate Brownie"],
    "Margherita Pizza": ["Garlic Bread", "Mango Shake", "Gulab Jamun"],
    "Cheese Burst Pizza": ["Peri Peri Fries", "Cold Coffee", "Pizza Combo Meal"],
    "Farmhouse Pizza": ["Loaded Nachos", "Virgin Mojito", "Choco Lava Cake"],
    "Veggie Delight Pizza": ["Potato Wedges", "Lemon Soda", "Kulfi"],
    "Corn Cheese Pizza": ["Cheese Nachos", "Cappuccino", "Cheesecake"],
    "Mexican Green Wave Pizza": ["French Fries", "Oreo Shake", "Tiramisu"],
    # Burger combos
    "Veg Burger": ["French Fries", "Coke"],
    "Aloo Tikki Burger": ["Cheesy Fries", "Masala Chai"],
    "Paneer Burger": ["Potato Wedges", "Mango Shake", "Burger Combo Meal"],
    "Cheese Veg Burger": ["Peri Peri Fries", "Lemon Soda"],
    "Spicy Veg Burger": ["Garlic Bread", "Cold Coffee"],
    "Corn Spinach Burger": ["Loaded Nachos"],
    "Double Patty Burger": ["Energy Drink", "Snack Combo"],
    # Main Course combos
    "Paneer Butter Masala": ["Butter Naan"],
    "Dal Makhani": ["Jeera Rice"],
    "Kadai Paneer": ["Garlic Naan"],
    "Veg Kolhapuri": ["Tandoori Roti"],
    "Malai Kofta": ["Veg Pulao"],
    "Shahi Paneer": ["Lassi"],
    "Palak Paneer": ["Plain Naan"],
    "Chole Masala": ["Veg Biryani"],
    "Rajma Masala": ["Missi Roti"],
    "Aloo Gobi": ["Jeera Rice"],
    "Baingan Bharta": ["Stuffed Kulcha"],
    "Mixed Veg Curry": ["Peas Pulao"],
    "Kofta Curry": ["Cheese Naan"],
    "Kaju Curry": ["Gulab Jamun"],
    "Paneer Lababdar": ["Butter Naan"],
    "Methi Malai Paneer": ["Tandoori Roti"],
    "Navratan Korma": ["Veg Fried Rice"],
    "Veg Handi": ["Garlic Naan"],
    "Tawa Veg": ["Schezwan Fried Rice"],
    "Paneer Bhurji": ["Plain Naan"],
    "Aloo Jeera": ["Rasgulla"],
    "Bhindi Masala": ["Masala Chai"],
    "Mushroom Masala": ["Paneer Pulao"],
    # South Indian combos
    "Masala Dosa": ["Coconut Water"],
    "Idli Sambar": ["Masala Chai"],
    "Plain Dosa": ["Coke"],
    "Mysore Masala Dosa": ["Raita"],
    "Rava Dosa": ["Green Tea"],
    "Onion Uttapam": ["Buttermilk"],
    "Medu Vada": ["Lassi"],
    # Street Food combos
    "Pav Bhaji": ["Lassi"],
    "Vada Pav": ["Masala Chai"],
    "Dabeli": ["Coke"],
    "Sev Puri": ["Lemon Soda"],
    "Bhel Puri": ["Green Tea"],
    "Pani Puri": ["Mango Shake"],
    "Ragda Pattice": ["Gulab Jamun"],
    "Aloo Chaat": ["Buttermilk"],
    "Samosa": ["Masala Chai"],
    "Kachori": ["Chocolate Brownie"],
    # Sandwich combos
    "Veg Sandwich": ["French Fries"],
    "Grilled Sandwich": ["Mango Shake"],
    "Cheese Sandwich": ["Potato Wedges"],
    "Paneer Sandwich": ["Cold Coffee"],
    "Club Sandwich": ["Cheese Nachos"],
    # Wraps combos
    "Veg Wrap": ["Peri Peri Fries"],
    "Paneer Wrap": ["Lassi"],
    "Falafel Wrap": ["Green Salad"],
    "Mexican Wrap": ["Coke"],
    "Cheese Wrap": ["Garlic Bread"],
    # Italian combos
    "Veg Pasta": ["Cappuccino"],
    "White Sauce Pasta": ["Tiramisu"],
    "Red Sauce Pasta": ["Garlic Bread"],
    "Penne Alfredo": ["Cheesecake"],
    "Arrabbiata Pasta": ["Lemon Iced Tea"],
    "Veg Lasagna": ["Chocolate Brownie"],
    "Garlic Spaghetti": ["Green Salad"],
}

router = APIRouter()

N8N_CALL_WEBHOOK = os.getenv(
    "N8N_CALL_WEBHOOK",
    "https://deep1024.app.n8n.cloud/webhook/voice-order",
)

# In-memory call sessions
_call_sessions: dict[str, dict] = {}


def _rupees(amount: float) -> str:
    """Format price as spoken text — NEVER use ₹ symbol."""
    return f"{amount:.0f} rupees"


def _get_session(call_id: str) -> dict:
    """Get or create a call session with language tracking."""
    return _call_sessions.setdefault(call_id, {
        "items": [],
        "total": 0.0,
        "suggestions_given": set(),
        "language": LANG_ENGLISH,
        "language_detected": False,
        "delivery_address": "",
        "started_at": datetime.now(timezone.utc).isoformat(),
    })


# ── Menu helpers ──────────────────────────────────────────────────────────────

async def _search_menu(query: str, menu_df: pd.DataFrame, call_id: str, top_n: int = 5) -> list[dict]:
    """Search menu with Sarvam transliteration for Hindi/Gujarati queries."""
    if menu_df.empty:
        return []

    # Transliterate Indic script to English for better fuzzy matching
    search_query = query
    if has_indic_script(query):
        search_query = await transliterate_to_english(query)
        logger.info("Sarvam transliterated: '%s' → '%s'", query, search_query)

    names = menu_df["item_name"].tolist()
    matches = fuzz_process.extract(search_query, names, scorer=fuzz.WRatio, limit=top_n, score_cutoff=40)

    # If transliteration didn't help, also try original query
    if not matches and search_query != query:
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


def _get_combo_suggestion(item_name: str, menu_df: pd.DataFrame, session: dict) -> str | None:
    """Get a combo suggestion using the hardcoded COMBO_MAP.

    Looks up the ordered item in COMBO_MAP, finds the first combo partner
    that is NOT already in the cart, resolves its price from menu_df,
    and returns a friendly spoken suggestion.
    """
    combo_partners = COMBO_MAP.get(item_name)
    if not combo_partners:
        return None

    # Items already in the cart
    cart_names = {i["item_name"] for i in session.get("items", [])}

    for partner_name in combo_partners:
        if partner_name in cart_names:
            continue  # already ordered, try next partner

        # Look up price from menu
        match = menu_df[menu_df["item_name"].str.lower() == partner_name.lower()]
        if match.empty:
            continue

        partner_price = float(match.iloc[0]["price"])
        return (
            f"Nice choice! I think you should also try {partner_name} "
            f"for just {_rupees(partner_price)}. "
            f"It pairs perfectly with {item_name}. Would you like to add it?"
        )
    return None


def _get_combo_deals_for_item(item_name: str, menu_df: pd.DataFrame, session: dict) -> str:
    """Return all combo partners for an item with prices (for get_combo_deals tool)."""
    combo_partners = COMBO_MAP.get(item_name)
    if not combo_partners:
        return f"Sorry, we don't have specific combo deals for {item_name} right now."

    cart_names = {i["item_name"] for i in session.get("items", [])}
    deals = []
    for partner_name in combo_partners:
        match = menu_df[menu_df["item_name"].str.lower() == partner_name.lower()]
        if match.empty:
            continue
        price = float(match.iloc[0]["price"])
        already = " (already in your order)" if partner_name in cart_names else ""
        deals.append(f"{partner_name} for {_rupees(price)}{already}")

    if not deals:
        return f"Sorry, combo items for {item_name} are not available right now."

    return (
        f"Great combo options with {item_name}: "
        + ", ".join(deals)
        + ". Would you like to add any of these?"
    )


# ── Session helpers ───────────────────────────────────────────────────────────

async def _add_to_order(call_id: str, item_name: str, quantity: int, menu_df: pd.DataFrame, modifiers: dict | None = None) -> dict:
    session = _get_session(call_id)

    # Detect customer language from item_name text
    detected = detect_language(item_name)
    if detected != LANG_ENGLISH and not session["language_detected"]:
        session["language"] = detected
        session["language_detected"] = True
        logger.info("Language detected for call %s: %s", call_id, detected)

    # Transliterate Indic text for better matching
    search_name = item_name
    if has_indic_script(item_name):
        search_name = await transliterate_to_english(item_name)
        logger.info("Sarvam transliterated item: '%s' → '%s'", item_name, search_name)

    names = menu_df["item_name"].tolist()
    match = fuzz_process.extractOne(search_name, names, scorer=fuzz.WRatio, score_cutoff=40)

    # Fallback: try original name if transliteration didn't match
    if not match and search_name != item_name:
        match = fuzz_process.extractOne(item_name, names, scorer=fuzz.WRatio, score_cutoff=40)

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
    category = str(row.get("category", ""))

    # Calculate modifier price
    mod_price = 0.0
    if modifiers:
        mod_price = calculate_modifier_price(category, modifiers)

    effective_price = price + mod_price

    existing = next((i for i in session["items"] if i["item_id"] == item_id and i.get("modifiers") == modifiers), None)
    if existing:
        existing["qty"] += quantity
        existing["line_total"] = round(existing["effective_price"] * existing["qty"], 2)
    else:
        session["items"].append({
            "item_id": item_id,
            "item_name": matched_name,
            "category": category,
            "qty": quantity,
            "unit_price": price,
            "modifier_price": mod_price,
            "effective_price": effective_price,
            "modifiers": modifiers,
            "line_total": round(effective_price * quantity, 2),
        })

    session["total"] = round(sum(i["line_total"] for i in session["items"]), 2)

    # Build response message
    mod_text = format_modifier_text(modifiers) if modifiers else ""
    item_desc = f"{matched_name} ({mod_text})" if mod_text else matched_name
    price_text = f"{_rupees(effective_price)}" if mod_price > 0 else f"{_rupees(price)}"

    msg = (
        f"Added {quantity} {item_desc} at {price_text} each to your order. "
        f"Your current total is {_rupees(session['total'])}."
    )

    # Combo suggestion from hardcoded COMBO_MAP
    if matched_name not in session.get("suggestions_given", set()):
        combo_msg = _get_combo_suggestion(matched_name, menu_df, session)
        if combo_msg:
            msg += f" {combo_msg}"
            session.setdefault("suggestions_given", set()).add(matched_name)

    return {"success": True, "message": msg}


async def _remove_from_order(call_id: str, item_name: str, menu_df: pd.DataFrame) -> dict:
    session = _call_sessions.get(call_id)
    if not session or not session["items"]:
        return {"success": False, "message": "Your order is empty, nothing to remove."}

    # Transliterate if needed
    search_name = item_name
    if has_indic_script(item_name):
        search_name = await transliterate_to_english(item_name)

    order_names = [i["item_name"] for i in session["items"]]
    match = fuzz_process.extractOne(search_name, order_names, scorer=fuzz.WRatio, score_cutoff=50)
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


def _get_order_summary(call_id: str, menu_df: pd.DataFrame | None = None) -> dict:
    session = _call_sessions.get(call_id, {"items": [], "total": 0.0})
    if not session["items"]:
        return {"message": "Your order is currently empty. What would you like to order?"}
    lines = []
    for i in session["items"]:
        lines.append(f"{i['qty']} {i['item_name']} at {_rupees(i['line_total'])}")
    items_text = ", ".join(lines)

    # Check for missing combo partners and suggest them
    combo_hint = ""
    if menu_df is not None and not menu_df.empty:
        cart_names = {i["item_name"] for i in session["items"]}
        missing = []
        for cart_item in cart_names:
            partners = COMBO_MAP.get(cart_item, [])
            for p in partners:
                if p not in cart_names:
                    row = menu_df[menu_df["item_name"].str.lower() == p.lower()]
                    if not row.empty:
                        missing.append(f"{p} for {_rupees(float(row.iloc[0]['price']))}")
                    break  # only first missing partner per item
        if missing:
            combo_hint = (
                f" By the way, you might also enjoy adding "
                + " or ".join(missing[:2])
                + ". Want me to add any of those?"
            )

    return {
        "message": (
            f"Here is your order: {items_text}. "
            f"Your total comes to {_rupees(session['total'])}."
            f"{combo_hint} "
            f"Would you like to confirm this order, or make any changes?"
        ),
    }


def _confirm_order(call_id: str, menu_df: pd.DataFrame) -> dict:
    session = _call_sessions.get(call_id)
    if not session or not session["items"]:
        return {"success": False, "message": "There are no items in your order yet. Please add some items first."}

    # Check if address has been collected
    if not session.get("delivery_address"):
        return {
            "success": False,
            "message": (
                "Before I confirm your order, I need your delivery address. "
                "Where should we deliver your order?"
            ),
        }

    items_for_order = [
        {
            "item_id": i["item_id"],
            "qty": i["qty"],
            "modifiers": i.get("modifiers"),
        }
        for i in session["items"]
    ]
    order = create_order(items_for_order, menu_df, order_source="phone_call")
    order_id = order["order_id"]
    total = order["total_price"]
    num_items = sum(i["qty"] for i in session["items"])
    address = session["delivery_address"]

    # Save address to the persisted order
    update_order(order_id, {"delivery_address": address})

    # Auto-generate KOT (Kitchen Order Ticket)
    kot = generate_kot(order)
    kot_id = kot["kot_id"]
    logger.info("KOT %s generated for order %s", kot_id, order_id)

    # Build items text with modifiers
    items_parts = []
    for i in session["items"]:
        mod_text = format_modifier_text(i.get("modifiers") or {})
        desc = f"{i['qty']} {i['item_name']}"
        if mod_text:
            desc += f" ({mod_text})"
        items_parts.append(desc)
    items_text = ", ".join(items_parts)

    # Estimate delivery time based on order size
    est_minutes = max(kot.get("estimated_prep_min", 15), 15) + (num_items * 2)

    _call_sessions.pop(call_id, None)

    return {
        "success": True,
        "order_id": order_id,
        "kot_id": kot_id,
        "message": (
            f"Your order number {order_id} is confirmed! "
            f"Kitchen ticket {kot_id} has been sent to the kitchen. "
            f"You ordered {items_text} for a total of {_rupees(total)}. "
            f"We will deliver it to {address}. "
            f"Estimated delivery time is {est_minutes} minutes. "
            f"You can track your order with order number {order_id}. "
            f"Thank you for choosing PetPooja! Enjoy your meal! "
            f"Now ending call. Goodbye!"
        ),
    }


# ── n8n notification (enhanced) ───────────────────────────────────────────────

async def _notify_n8n(call_id: str, action: str, details: dict):
    session = _call_sessions.get(call_id, {})
    payload = {
        "source": "phone_call_ai_agent",
        "call_id": call_id,
        "action": action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "customer_language": session.get("language", LANG_ENGLISH),
        "sarvam_integration": True,
        **details,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(N8N_CALL_WEBHOOK, json=payload)
        logger.info("n8n notified: action=%s call=%s lang=%s", action, call_id, session.get("language", "?"))
    except Exception as e:
        logger.warning("n8n notification failed: %s", e)


# ── Function router (async — Sarvam for INPUT only) ──────────────────────────

async def _handle_function(
    func_name: str, params: dict, call_id: str, menu_df: pd.DataFrame,
) -> str:
    """Route tool calls. Sarvam transliterates Indic input only.

    Responses ALWAYS in English — ElevenLabs TTS cannot speak Hindi/Gujarati.
    Customer language is detected and logged for n8n analytics.
    """
    session = _get_session(call_id)

    # Detect language from text parameters for analytics only
    for val in params.values():
        if isinstance(val, str) and len(val) > 1:
            detected = detect_language(val)
            if detected != LANG_ENGLISH and not session.get("language_detected"):
                session["language"] = detected
                session["language_detected"] = True
                logger.info("Language detected for call %s: %s", call_id, detected)
                break

    # Process — response is always English (no translation)
    return await _dispatch_function(func_name, params, call_id, menu_df)


async def _dispatch_function(
    func_name: str, params: dict, call_id: str, menu_df: pd.DataFrame,
) -> str:
    """Execute the actual tool logic. All responses in English."""
    if func_name == "search_menu":
        query = params.get("query", "")
        results = await _search_menu(query, menu_df, call_id)
        if results:
            lines = [f"{r['item_name']} for {_rupees(r['price'])} in {r['category']}" for r in results]
            return "Here are the matching items: " + ". ".join(lines) + ". What would you like to add?"
        return "I couldn't find any matching items. Could you try a different name or ask for our menu categories?"

    if func_name == "add_to_order":
        # Extract modifiers from params
        modifiers = {}
        size = params.get("size", "")
        spice = params.get("spice", "")
        addons_raw = params.get("addons", "")
        if size:
            modifiers["size"] = size
        if spice:
            modifiers["spice"] = spice
        if addons_raw:
            if isinstance(addons_raw, list):
                modifiers["addons"] = addons_raw
            elif isinstance(addons_raw, str):
                modifiers["addons"] = [a.strip() for a in addons_raw.split(",") if a.strip()]
        r = await _add_to_order(call_id, params.get("item_name", ""), int(params.get("quantity", 1)), menu_df, modifiers or None)
        return r["message"]

    if func_name == "remove_from_order":
        r = await _remove_from_order(call_id, params.get("item_name", ""), menu_df)
        return r["message"]

    if func_name == "get_order_summary":
        return _get_order_summary(call_id, menu_df)["message"]

    if func_name == "get_combo_deals":
        item = params.get("item_name", "")
        # Fuzzy match the item name against menu
        session = _get_session(call_id)
        names = menu_df["item_name"].tolist()
        match = fuzz_process.extractOne(item, names, scorer=fuzz.WRatio, score_cutoff=40)
        matched = match[0] if match else item
        return _get_combo_deals_for_item(matched, menu_df, session)

    if func_name == "confirm_order":
        r = _confirm_order(call_id, menu_df)
        return r["message"]

    if func_name == "collect_address":
        address = params.get("address", "").strip()
        if not address:
            return "I didn't catch your address. Could you please tell me where we should deliver your order?"
        session = _get_session(call_id)
        session["delivery_address"] = address
        return (
            f"Got it! Your delivery address is {address}. "
            f"Now let me confirm your order."
        )

    if func_name == "get_menu_categories":
        cats = _get_menu_categories(menu_df)
        if cats:
            return "Our menu categories are: " + ", ".join(cats) + ". Which category interests you?"
        return "Sorry, I could not load our menu categories right now."

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
    body = await request.json()
    message = body.get("message", {})
    msg_type = message.get("type", "")
    call = message.get("call", {})
    call_id = call.get("id", "unknown")
    menu_df = dfs.get("menu", pd.DataFrame())

    logger.info("Vapi webhook: type=%s call=%s", msg_type, call_id)

    # ── function-call (single) ────────────────────────────────────────────
    if msg_type == "function-call":
        fc = message.get("functionCall", {})
        func_name = fc.get("name", "")
        params = _parse_params(fc.get("parameters", {}))
        result = await _handle_function(func_name, params, call_id, menu_df)

        session = _call_sessions.get(call_id, {"items": [], "total": 0.0})
        await _notify_n8n(call_id, func_name, {
            "function": func_name,
            "params": params,
            "items": [i for i in session.get("items", []) if isinstance(i, dict)],
            "total": session.get("total", 0),
            "result_preview": result[:200],
        })

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
            result_text = await _handle_function(func_name, params, call_id, menu_df)
            results.append({"toolCallId": tc_id, "result": result_text})

        session = _call_sessions.get(call_id, {"items": [], "total": 0.0})
        func_names = [tc.get("function", {}).get("name", "") for tc in tool_calls]
        await _notify_n8n(call_id, "tool-calls", {
            "functions": func_names,
            "items": [i for i in session.get("items", []) if isinstance(i, dict)],
            "total": session.get("total", 0),
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
