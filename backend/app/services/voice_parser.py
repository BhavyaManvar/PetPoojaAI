"""Voice Parser — convert natural language text into structured order items.

Uses rapidfuzz for high-performance fuzzy matching and regex for quantity extraction.
Supports English, Hindi, and Hinglish inputs.
"""

import re

from app.utils.text_utils import word_to_number
from app.utils.fuzzy_match import best_match

# Reference menu items loaded lazily
_MENU_ITEMS: list[str] | None = None


def _get_menu_items() -> list[str]:
    global _MENU_ITEMS
    if _MENU_ITEMS is None:
        from app.dependencies import get_dataframes

        dfs = get_dataframes()
        _MENU_ITEMS = dfs["menu"]["item_name"].tolist()
    return _MENU_ITEMS


def parse_voice_text(text: str, menu_items: list[str] | None = None) -> list[dict]:
    """Parse a natural-language order string into a list of {item, qty} dicts.

    Supports patterns like:
        "one paneer pizza and two coke"
        "3 garlic bread, 1 masala dosa"
        "ek butter naan aur do lassi"   (Hindi-English mix)
    """
    text = text.lower().strip()
    if not text:
        return []

    # Split on common delimiters (English/Hindi)
    segments = re.split(r"\band\b|\baur\b|,|;", text)

    items = menu_items or _get_menu_items()
    results: list[dict] = []

    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue

        qty, item_text = _extract_qty_and_item(seg)
        matched = best_match(item_text, items)
        if matched:
            results.append({"item": matched, "qty": qty})

    return results


def _extract_qty_and_item(segment: str) -> tuple[int, str]:
    """Split a segment into quantity (int) and remaining item text."""
    tokens = segment.split()
    if not tokens:
        return 1, segment

    first = tokens[0]

    # Numeric prefix
    if first.isdigit():
        return int(first), " ".join(tokens[1:])

    # Word-form number
    num = word_to_number(first)
    if num is not None:
        return num, " ".join(tokens[1:])

    return 1, segment


def detect_language(text: str) -> str:
    """Simple language detection: 'hi' if Hindi tokens present, else 'en'."""
    hindi_markers = {"aur", "ek", "do", "teen", "char", "paanch", "mujhe", "chahiye", "bhi", "dena"}
    tokens = set(text.lower().split())
    if tokens & hindi_markers:
        return "hi"
    return "en"
