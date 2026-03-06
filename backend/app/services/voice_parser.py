"""Voice Parser — convert natural language text into structured order items.

Uses rapidfuzz for high-performance fuzzy matching and regex for quantity extraction.
Supports English, Hindi, and Hinglish inputs.

Pipeline:
  Speech Recognition → Intent Detection → Order Parsing → POS Generation
"""

from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Optional

from app.utils.text_utils import word_to_number
from app.utils.fuzzy_match import best_match, best_match_with_score


# ---------------------------------------------------------------------------
# Speech Recognition — audio to text interface
# ---------------------------------------------------------------------------

def transcribe_audio(audio_source: str | Path | bytes) -> str:
    """Convert audio input into transcription text.

    Accepts:
      - ``str`` / ``Path``: path to a .wav / .mp3 file
      - ``bytes``: raw audio bytes

    Tries Google SpeechRecognition if available; otherwise returns a
    placeholder indicating the audio was received but cannot be processed
    without the speech_recognition library.
    """
    try:
        import speech_recognition as sr  # optional dependency
    except ImportError:
        raise RuntimeError(
            "speech_recognition package is required for audio transcription. "
            "Install it with: pip install SpeechRecognition"
        )

    recognizer = sr.Recognizer()

    if isinstance(audio_source, bytes):
        audio_file = io.BytesIO(audio_source)
        with sr.AudioFile(audio_file) as source:
            audio_data = recognizer.record(source)
    else:
        audio_path = str(audio_source)
        if not Path(audio_path).exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        with sr.AudioFile(audio_path) as source:
            audio_data = recognizer.record(source)

    text: str = recognizer.recognize_google(audio_data)
    return text.lower().strip()


# ---------------------------------------------------------------------------
# Intent Detection — rule-based
# ---------------------------------------------------------------------------

_REMOVE_PATTERNS = re.compile(
    r"\b(remove|cancel|delete|hata|hatao|nahi|nahi chahiye|minus)\b",
    re.IGNORECASE,
)
_CONFIRM_PATTERNS = re.compile(
    r"\b(confirm|done|finalize|place order|order confirm|ho gaya|bas|theek hai|okay done)\b",
    re.IGNORECASE,
)


def detect_intent(text: str) -> str:
    """Detect user intent from transcription text.

    Returns one of:
      - ``ORDER_ITEM``   — user wants to add items
      - ``REMOVE_ITEM``  — user wants to remove items
      - ``CONFIRM_ORDER`` — user wants to finalize the order
    """
    text_lower = text.lower().strip()
    if _CONFIRM_PATTERNS.search(text_lower):
        return "CONFIRM_ORDER"
    if _REMOVE_PATTERNS.search(text_lower):
        return "REMOVE_ITEM"
    return "ORDER_ITEM"

# ---------------------------------------------------------------------------
# Lazy-loaded reference menu items
# ---------------------------------------------------------------------------
_MENU_ITEMS: list[str] | None = None


def _get_menu_items() -> list[str]:
    global _MENU_ITEMS
    if _MENU_ITEMS is None:
        from app.dependencies import get_dataframes

        dfs = get_dataframes()
        _MENU_ITEMS = dfs["menu"]["item_name"].tolist()
    return _MENU_ITEMS


# ---------------------------------------------------------------------------
# Filler / noise words stripped before fuzzy matching
# ---------------------------------------------------------------------------
_FILLER_WORDS = {
    # English
    "please", "give", "me", "i", "want", "can", "get", "add", "some",
    "would", "like", "need", "order", "have",
    # Hindi / Hinglish
    "mujhe", "chahiye", "dena", "de", "do", "bhai", "yaar", "zara",
    "ek", "bhi", "kuch",
}

# Leading-only fillers: purely noise tokens that appear at the START of a
# segment and should be stripped BEFORE quantity extraction so that a qty
# word like "teen" is not left stranded in the item text.
# NOTE: quantity words (ek, do, teen …) are intentionally excluded so they
# are still captured by _extract_qty_and_item.
_LEADING_FILLERS = {
    "please", "give", "me", "i", "want", "can", "get", "add", "some",
    "would", "like", "need", "order", "have",
    "mujhe", "dena", "de", "bhai", "yaar", "zara", "bhi", "kuch",
}


def _strip_leading_fillers(text: str) -> str:
    """Remove leading noise tokens that are NOT quantity words."""
    tokens = text.split()
    while tokens and tokens[0] in _LEADING_FILLERS:
        tokens = tokens[1:]
    return " ".join(tokens) if tokens else text


def _clean_item_text(text: str) -> str:
    """Remove common filler/command words, keeping only food-relevant tokens."""
    tokens = text.split()
    cleaned = [t for t in tokens if t not in _FILLER_WORDS]
    return " ".join(cleaned) if cleaned else text


# ---------------------------------------------------------------------------
# Segment splitting — supports English, Hindi, Hinglish delimiters
# ---------------------------------------------------------------------------
_SPLIT_PATTERN = re.compile(
    r"""
    \b(?:and|aur)\b   # conjunctions
    | [,;]             # punctuation
    """,
    re.VERBOSE | re.IGNORECASE,
)


def _split_segments(text: str) -> list[str]:
    """Split transcription into individual item segments."""
    # Strip common sentence wrappers before splitting
    # e.g. "mujhe ... chahiye" → inner content
    text = re.sub(r"^(mujhe|i want|i need|can i get|please give me|add)\s+", "", text)
    text = re.sub(r"\s+(chahiye|please|dena|de do)$", "", text)

    return [seg.strip() for seg in _SPLIT_PATTERN.split(text) if seg and seg.strip()]


# ---------------------------------------------------------------------------
# Quantity extraction
# ---------------------------------------------------------------------------
def _extract_qty_and_item(segment: str) -> tuple[int, str]:
    """Split a segment into quantity (int) and remaining item text.

    Handles:
      - Numeric prefix:  "3 garlic bread" → (3, "garlic bread")
      - Word prefix:     "one paneer pizza" → (1, "paneer pizza")
      - Hindi prefix:    "ek butter naan" → (1, "butter naan")
      - No quantity:     "coke" → (1, "coke")
    """
    tokens = segment.split()
    if not tokens:
        return 1, segment

    first = tokens[0]

    # Numeric prefix
    if first.isdigit():
        return int(first), " ".join(tokens[1:])

    # Word-form number (English + Hindi/Hinglish via text_utils)
    num = word_to_number(first)
    if num is not None:
        return num, " ".join(tokens[1:])

    return 1, segment


# ---------------------------------------------------------------------------
# Generic food aliases → default menu item mapping
# When users say "pizza" or "pizzas" without specifying which one, map to the
# most popular / default variant.
# ---------------------------------------------------------------------------
_GENERIC_ALIASES: dict[str, str] = {
    "pizza": "margherita pizza",
    "pizzas": "margherita pizza",
    "burger": "classic veg burger",
    "burgers": "classic veg burger",
    "naan": "butter naan",
    "roti": "butter roti",
    "dosa": "masala dosa",
    "biryani": "veg biryani",
    "pasta": "penne arrabiata",
    "momos": "veg momos",
    "momo": "veg momos",
    "thali": "veg thali",
    "wrap": "paneer wrap",
    "sandwich": "veg sandwich",
    "rice": "jeera rice",
    "dal": "dal tadka",
    "paratha": "aloo paratha",
    "chai": "masala chai",
    "tea": "masala chai",
    "coffee": "cold coffee",
    "lassi": "sweet lassi",
    "juice": "fresh lime soda",
    "fries": "french fries",
    "nachos": "loaded nachos",
    "soup": "tomato soup",
    "salad": "garden salad",
    "ice cream": "vanilla ice cream",
    "milkshake": "chocolate milkshake",
    "shake": "chocolate milkshake",
    "paneer": "paneer tikka pizza",
    "manchurian": "veg manchurian",
    "noodles": "hakka noodles",
    "chowmein": "hakka noodles",
    "spring roll": "veg spring roll",
    "rolls": "veg spring roll",
}


def _expand_generic(item_text: str) -> str:
    """If the item text is a generic food word, expand it to the default menu item."""
    key = item_text.lower().strip()
    return _GENERIC_ALIASES.get(key, item_text)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_voice_text(
    text: str,
    menu_items: list[str] | None = None,
    include_confidence: bool = False,
) -> list[dict]:
    """Parse a natural-language order string into a list of item dicts.

    Args:
        text: Raw transcription text (English / Hindi / Hinglish).
        menu_items: Optional explicit menu list; uses loaded data if *None*.
        include_confidence: When *True*, add ``confidence`` and ``original_text``
            keys to every result dict.

    Returns:
        List of dicts, each containing at minimum ``item`` (matched menu name)
        and ``qty`` (int).  Optionally ``confidence`` (float 0-100) and
        ``original_text`` (str).

    Examples::

        >>> parse_voice_text("one paneer pizza and two coke", menu_items=[...])
        [{"item": "Paneer Tikka Pizza", "qty": 1},
         {"item": "Coke", "qty": 2}]
    """
    text = text.lower().strip()
    if not text:
        return []

    segments = _split_segments(text)
    items = menu_items or _get_menu_items()
    results: list[dict] = []

    for seg in segments:
        seg = _strip_leading_fillers(seg)   # remove leading noise (e.g. "bhai")
        if not seg:
            continue
        qty, raw_item_text = _extract_qty_and_item(seg)
        item_text = _clean_item_text(raw_item_text)
        if not item_text:
            continue
        item_text = _expand_generic(item_text)  # "pizzas" → "margherita pizza"

        if include_confidence:
            matched, score = best_match_with_score(item_text, items)
            if matched:
                results.append({
                    "item": matched,
                    "qty": qty,
                    "confidence": round(score, 1),
                    "original_text": raw_item_text,
                })
        else:
            matched = best_match(item_text, items)
            if matched:
                results.append({"item": matched, "qty": qty})

    return results


def detect_language(text: str) -> str:
    """Detect input language: ``'hi'`` for Hindi, ``'hinglish'`` for mixed, ``'en'`` for English.

    Uses simple keyword heuristics — no external models required.
    """
    hindi_markers = {
        "aur", "ek", "do", "teen", "char", "paanch",
        "mujhe", "chahiye", "bhi", "dena", "de",
    }
    english_markers = {
        "and", "want", "please", "give", "can", "get", "add", "order", "i",
        # English number words — presence alongside Hindi tokens = Hinglish
        "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    }

    tokens = set(text.lower().split())
    has_hindi = bool(tokens & hindi_markers)
    has_english = bool(tokens & english_markers)

    if has_hindi and has_english:
        return "hinglish"
    if has_hindi:
        return "hi"
    return "en"
