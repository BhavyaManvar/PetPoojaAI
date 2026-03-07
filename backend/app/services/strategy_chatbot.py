"""AI Strategy Chatbot — Groq-powered advisor for restaurant owners.

Uses dataset-derived analytics as context for Groq API prompts.
Falls back to rule-based responses when API key is not configured.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any

import pandas as pd

from app.services.revenue_engine import classify_menu_items, find_hidden_stars, get_risk_items
from app.services.combo_engine import get_top_combos
from app.services.price_engine import get_price_recommendations, get_price_summary
from app.services.inventory_engine import get_inventory_summary, get_inventory_for_chatbot, get_inventory


def _build_context(menu_df: pd.DataFrame, order_items_df: pd.DataFrame) -> dict[str, Any]:
    """Pre-compute analytics context once per request."""
    classified = classify_menu_items(menu_df, order_items_df)
    hidden = find_hidden_stars(menu_df, order_items_df)
    risk = get_risk_items(menu_df, order_items_df)
    combos = get_top_combos(order_items_df)
    price_recs = get_price_recommendations(menu_df, order_items_df)
    price_summary = get_price_summary(menu_df, order_items_df)

    stars = [i for i in classified if i.get("menu_class") == "Star"]
    puzzles = [i for i in classified if i.get("menu_class") == "Puzzle"]
    plowhorses = [i for i in classified if i.get("menu_class") == "Plow Horse"]
    dogs = [i for i in classified if i.get("menu_class") == "Dog"]

    inv_summary = get_inventory_summary(menu_df, order_items_df)
    inv_text = get_inventory_for_chatbot(menu_df, order_items_df)

    return {
        "stars": stars,
        "puzzles": puzzles,
        "plowhorses": plowhorses,
        "dogs": dogs,
        "hidden_stars": hidden,
        "risk_items": risk,
        "combos": combos,
        "price_recs": price_recs,
        "price_summary": price_summary,
        "total_items": len(classified),
        "inventory_summary": inv_summary,
        "inventory_text": inv_text,
    }


_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"(increase|boost|improve|grow).*(revenue|sales|income)", re.I), "revenue"),
    (re.compile(r"(promote|marketing|advertise|push)", re.I), "promote"),
    (re.compile(r"(least|low|worst).*(profit|margin|profitable)", re.I), "low_margin"),
    (re.compile(r"(best|top|highest).*(sell|popular|demand)", re.I), "top_sellers"),
    (re.compile(r"(combo|bundle|pair|cross.?sell)", re.I), "combos"),
    (re.compile(r"(price|pricing|cost|discount|expensive|cheap)", re.I), "pricing"),
    (re.compile(r"(remove|drop|eliminate|cut).*(menu|item)", re.I), "remove"),
    (re.compile(r"(star|puzzle|plowhorse|dog|bcg|matrix|classify)", re.I), "matrix"),
    (re.compile(r"(hidden.?star|untap|potential|opportunity)", re.I), "hidden"),
    (re.compile(r"(risk|danger|warning|concern)", re.I), "risk"),
    (re.compile(r"(summary|overview|health|status|report)", re.I), "summary"),
    (re.compile(r"(inventory|stock|restock|reorder|stockout|out.?of.?stock|overstock|dead.?stock)", re.I), "inventory"),
]


def _detect_intent(query: str) -> str:
    for pattern, intent in _PATTERNS:
        if pattern.search(query):
            return intent
    return "general"


def _fmt_items(items: list[dict], limit: int = 5) -> str:
    lines = []
    for it in items[:limit]:
        name = it.get("item_name") or it.get("item") or it.get("name", "Unknown")
        margin = it.get("contribution_margin") or it.get("margin", 0)
        qty = it.get("total_qty_sold") or it.get("sales", 0)
        lines.append(f"  - {name} (margin: ₹{margin:.0f}, sold: {qty})")
    return "\n".join(lines) if lines else "  No items found."


def generate_response(query: str, ctx: dict[str, Any]) -> str:
    """Generate a strategy response based on the user query and analytics context."""
    intent = _detect_intent(query)

    if intent == "revenue":
        tips = []
        if ctx["hidden_stars"]:
            names = ", ".join(h.get("item_name", "") for h in ctx["hidden_stars"][:3])
            tips.append(f"Promote hidden-star items ({names}) — they have high margins but low sales. Bundle them in combos or feature them on your menu.")
        if ctx["combos"]:
            c = ctx["combos"][0]
            tips.append(f"Push the combo \"{c.get('item_a', '')} + {c.get('item_b', '')}\" — it has a lift of {c.get('lift', 0):.1f}x, meaning customers who buy one are very likely to buy the other.")
        ps = ctx["price_summary"]
        if ps.get("items_to_increase", 0) > 0:
            tips.append(f"Implement the {ps['items_to_increase']} recommended price increases for an estimated ₹{ps.get('total_monthly_uplift', 0):,.0f}/month uplift.")
        if ctx["dogs"]:
            names = ", ".join(d.get("item_name", "") for d in ctx["dogs"][:3])
            tips.append(f"Consider removing or reworking underperformers ({names}) to simplify your menu and reduce waste.")
        return "Here's how you can increase revenue:\n\n" + "\n\n".join(f"{i+1}. {t}" for i, t in enumerate(tips)) if tips else "Your menu looks healthy overall. Focus on marketing your Star items and testing new combos."

    if intent == "promote":
        items = ctx["stars"] + ctx["hidden_stars"]
        return f"Items worth promoting:\n\n**Stars** (high margin + high sales):\n{_fmt_items(ctx['stars'])}\n\n**Hidden Stars** (high margin, low sales — huge upside):\n{_fmt_items(ctx['hidden_stars'])}\n\nTip: Feature hidden stars in combo deals to boost their visibility."

    if intent == "low_margin":
        return f"Least profitable items (Dogs — low margin & low sales):\n{_fmt_items(ctx['dogs'])}\n\nConsider:\n- Raising prices on these items\n- Replacing them with higher-margin alternatives\n- Bundling them with popular items at a premium"

    if intent == "top_sellers":
        return f"Top performing items (Stars — high margin & high demand):\n{_fmt_items(ctx['stars'])}\n\nThese are your money-makers. Protect their placement on the menu and avoid discounting them."

    if intent == "combos":
        lines = []
        for c in ctx["combos"][:5]:
            lines.append(f"  - {c.get('item_a', '')} + {c.get('item_b', '')} (lift: {c.get('lift', 0):.1f}x, confidence: {c.get('confidence', 0):.0%})")
        combo_str = "\n".join(lines) if lines else "  No combo data available."
        return f"Top combo recommendations (from market basket analysis):\n{combo_str}\n\nTip: Bundle the top pair as a meal deal to increase average order value."

    if intent == "pricing":
        increase = [r for r in ctx["price_recs"] if r.get("action") == "increase"]
        decrease = [r for r in ctx["price_recs"] if r.get("action") == "decrease"]
        ps = ctx["price_summary"]
        resp = f"Price optimization summary:\n- {ps.get('items_to_increase', 0)} items should increase price\n- {ps.get('items_to_decrease', 0)} items should decrease price\n- {ps.get('items_optimal', 0)} items are optimally priced\n- Estimated monthly uplift: ₹{ps.get('total_monthly_uplift', 0):,.0f}"
        if increase:
            resp += f"\n\nTop items to increase:\n{_fmt_items(increase[:3])}"
        if decrease:
            resp += f"\n\nItems to consider discounting:\n{_fmt_items(decrease[:3])}"
        return resp

    if intent == "remove":
        return f"Items to consider removing (Dogs):\n{_fmt_items(ctx['dogs'])}\n\nThese items have both low margins and low demand. Removing them simplifies operations and reduces waste."

    if intent == "matrix":
        return (
            f"Menu Engineering Matrix:\n\n"
            f"⭐ Stars ({len(ctx['stars'])}): High margin, High sales — protect and promote\n"
            f"🧩 Puzzles ({len(ctx['puzzles'])}): High margin, Low sales — needs marketing\n"
            f"🐎 Plowhorses ({len(ctx['plowhorses'])}): Low margin, High sales — increase price\n"
            f"🐶 Dogs ({len(ctx['dogs'])}): Low margin, Low sales — remove or rework\n\n"
            f"Total items classified: {ctx['total_items']}"
        )

    if intent == "hidden":
        return f"Hidden Stars — high-margin items with untapped potential:\n{_fmt_items(ctx['hidden_stars'])}\n\nThese items generate good profit per sale but aren't ordered enough. Promote them via combos, menu placement, or staff recommendations."

    if intent == "risk":
        return f"Risk items — candidates for removal or rework:\n{_fmt_items(ctx['risk_items'])}\n\nThese items hurt profitability. Consider replacing them or adjusting pricing."

    if intent == "summary":
        ps = ctx["price_summary"]
        return (
            f"Restaurant Health Summary:\n\n"
            f"Menu: {ctx['total_items']} items\n"
            f"  ⭐ {len(ctx['stars'])} Stars | 🧩 {len(ctx['puzzles'])} Puzzles | 🐎 {len(ctx['plowhorses'])} Plowhorses | 🐶 {len(ctx['dogs'])} Dogs\n\n"
            f"Hidden opportunities: {len(ctx['hidden_stars'])} items\n"
            f"Risk items: {len(ctx['risk_items'])} items\n"
            f"Top combos found: {len(ctx['combos'])}\n\n"
            f"Pricing: {ps.get('items_to_increase', 0)} increases, {ps.get('items_to_decrease', 0)} decreases recommended\n"
            f"Estimated monthly uplift: ₹{ps.get('total_monthly_uplift', 0):,.0f}"
        )

    # General fallback
    return (
        "I can help you with:\n\n"
        "- **Revenue growth** — \"How can I increase revenue?\"\n"
        "- **Menu analysis** — \"Show me the menu matrix\"\n"
        "- **Promotions** — \"What should I promote?\"\n"
        "- **Pricing** — \"Which items need price changes?\"\n"
        "- **Combos** — \"What are the best combos?\"\n"
        "- **Risk items** — \"Which items are underperforming?\"\n"
        "- **Summary** — \"Give me a health report\"\n\n"
        "Ask me anything about your restaurant strategy!"
    )


def chat(query: str, menu_df: pd.DataFrame, order_items_df: pd.DataFrame) -> dict[str, str]:
    """Main entry point for the strategy chatbot.

    Tries Gemini API first (with dataset context), falls back to rule-based.
    """
    ctx = _build_context(menu_df, order_items_df)
    intent = _detect_intent(query)

    grok_key = os.getenv("GROK_API_KEY", "")
    if grok_key:
        try:
            grok_response = _ask_grok(query, ctx, grok_key)
            logging.info("Groq response received, length: %d", len(grok_response or ""))
            if grok_response:
                return {"query": query, "response": grok_response, "intent": intent}
        except Exception as exc:
            logging.warning("Groq API failed, falling back to rule-based: %s", exc)

    # Fallback to rule-based
    response = generate_response(query, ctx)
    return {"query": query, "response": response, "intent": intent}


def _format_context_for_prompt(ctx: dict[str, Any]) -> str:
    """Format analytics context into a text block for the Gemini prompt."""
    ps = ctx["price_summary"]
    lines = [
        "=== Restaurant Analytics Data ===",
        f"Total menu items: {ctx['total_items']}",
        "",
        f"⭐ Stars (high margin + high sales): {len(ctx['stars'])} items",
    ]
    for s in ctx["stars"][:5]:
        name = s.get("item_name", "")
        margin = s.get("contribution_margin", 0)
        qty = s.get("total_qty_sold", 0)
        lines.append(f"  - {name} (margin: ₹{margin:.0f}, sold: {qty})")

    lines.append(f"\n🧩 Puzzles (high margin, low sales): {len(ctx['puzzles'])} items")
    for p in ctx["puzzles"][:3]:
        lines.append(f"  - {p.get('item_name', '')} (margin: ₹{p.get('contribution_margin', 0):.0f})")

    lines.append(f"\n🐴 Plowhorses (low margin, high sales): {len(ctx['plowhorses'])} items")
    for p in ctx["plowhorses"][:3]:
        lines.append(f"  - {p.get('item_name', '')} (margin: ₹{p.get('contribution_margin', 0):.0f})")

    lines.append(f"\n🐶 Dogs (low margin, low sales): {len(ctx['dogs'])} items")
    for d in ctx["dogs"][:3]:
        lines.append(f"  - {d.get('item_name', '')} (margin: ₹{d.get('contribution_margin', 0):.0f})")

    lines.append(f"\n💎 Hidden Stars (high margin, untapped potential): {len(ctx['hidden_stars'])} items")
    for h in ctx["hidden_stars"][:3]:
        name = h.get("item_name") or h.get("item", "")
        lines.append(f"  - {name}")

    lines.append(f"\n⚠️ Risk items: {len(ctx['risk_items'])} items")

    lines.append(f"\n🔗 Top combos (from market basket analysis):")
    for c in ctx["combos"][:5]:
        lines.append(f"  - {c.get('item_a', '')} + {c.get('item_b', '')} (lift: {c.get('lift', 0):.1f}x, confidence: {c.get('confidence', 0):.0%})")

    lines.append(f"\n💰 Price optimization:")
    lines.append(f"  - Items to increase price: {ps.get('items_to_increase', 0)}")
    lines.append(f"  - Items to decrease price: {ps.get('items_to_decrease', 0)}")
    lines.append(f"  - Items optimally priced: {ps.get('items_optimal', 0)}")
    lines.append(f"  - Estimated monthly uplift: ₹{ps.get('total_monthly_uplift', 0):,.0f}")

    # Inventory signals
    if ctx.get("inventory_text"):
        lines.append(f"\n{ctx['inventory_text']}")

    return "\n".join(lines)


def _ask_grok(query: str, ctx: dict[str, Any], api_key: str) -> str | None:
    """Send a contextual prompt to Groq API and return the response."""
    import httpx

    context_text = _format_context_for_prompt(ctx)

    system_prompt = (
        "You are an AI business strategist for a restaurant owner. "
        "You have access to their real analytics data. "
        "Provide clear, actionable, data-driven recommendations. "
        "Reference specific menu items and numbers from the data. "
        "Keep the response concise but insightful. "
        "Use bullet points for action items. Do not use markdown headers."
    )

    user_prompt = f"""{context_text}

User question: {query}"""

    resp = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 1024,
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]
