"""Sarvam AI Service — multilingual translation, transliteration, and language detection.

Provides:
  - translate(text, src, tgt) → translated text
  - transliterate_to_english(text) → romanized text for fuzzy matching
  - detect_language(text) → language code (en-IN, hi-IN, gu-IN, etc.)
  - translate_response(text, target_lang) → response in customer's language

Used by the call webhook to:
  1. Transliterate Hindi/Gujarati menu queries → English for accurate fuzzy matching
  2. Detect customer language per session
  3. Translate backend responses into the customer's spoken language
"""

from __future__ import annotations

import logging
import os
import re
from functools import lru_cache

import httpx

logger = logging.getLogger(__name__)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "sk_vvxwxlra_BWCQOKDK2olYZ9J1nKONvHWp")
SARVAM_HEADERS = {
    "Content-Type": "application/json",
    "api-subscription-key": SARVAM_API_KEY,
}

# Language codes used by Sarvam
LANG_ENGLISH = "en-IN"
LANG_HINDI = "hi-IN"
LANG_GUJARATI = "gu-IN"


# ── Language Detection ────────────────────────────────────────────────────────

def detect_language(text: str) -> str:
    """Detect language from text using Unicode script ranges.

    Returns Sarvam-compatible language code.
    """
    if not text or not text.strip():
        return LANG_ENGLISH

    # Count characters in each script
    hindi_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    gujarati_chars = sum(1 for c in text if '\u0A80' <= c <= '\u0AFF')
    latin_chars = sum(1 for c in text if c.isascii() and c.isalpha())
    total_alpha = hindi_chars + gujarati_chars + latin_chars

    if total_alpha == 0:
        return LANG_ENGLISH

    # If more than 20% of characters are in a specific script, use that language
    if gujarati_chars / total_alpha > 0.2:
        return LANG_GUJARATI
    if hindi_chars / total_alpha > 0.2:
        return LANG_HINDI

    # Check for Hindi words written in Latin script (Hinglish)
    hinglish_words = {
        "ek", "do", "teen", "chaar", "paanch", "chhe", "saat", "aath", "nau", "das",
        "chahiye", "mujhe", "dedo", "lao", "bas", "aur", "bhai", "yaar",
        "haan", "nahi", "kitna", "kya", "kaise", "accha", "theek",
        "khana", "peena", "dena", "lena", "roti", "sabzi",
        "joiye", "aapo", "bhai", "su", "che", "nathi",  # Gujarati in Latin
    }
    words = set(re.findall(r'[a-zA-Z]+', text.lower()))
    hinglish_count = len(words & hinglish_words)
    if hinglish_count >= 2:
        return LANG_HINDI  # Hinglish → treat as Hindi

    return LANG_ENGLISH


def has_indic_script(text: str) -> bool:
    """Check if text contains Devanagari, Gujarati, or other Indic characters."""
    return bool(re.search(r'[\u0900-\u097F\u0A80-\u0AFF\u0B00-\u0B7F]', text))


# ── Translation ──────────────────────────────────────────────────────────────

async def translate(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text using Sarvam Mayura model. Returns original on failure."""
    if not text.strip() or source_lang == target_lang:
        return text
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            res = await client.post(
                "https://api.sarvam.ai/translate",
                headers=SARVAM_HEADERS,
                json={
                    "input": text,
                    "source_language_code": source_lang,
                    "target_language_code": target_lang,
                    "model": "mayura:v1",
                },
            )
            if res.status_code == 200:
                translated = res.json().get("translated_text", text)
                logger.info("Sarvam translate: '%s' [%s→%s] = '%s'", text[:60], source_lang, target_lang, translated[:60])
                return translated
            logger.warning("Sarvam translate HTTP %s: %s", res.status_code, res.text[:200])
    except Exception as e:
        logger.warning("Sarvam translate error: %s", e)
    return text


async def transliterate_to_english(text: str) -> str:
    """Transliterate Indic script text to English/Latin script for fuzzy matching.

    E.g., "पनीर टिक्का" → "paneer tikka"
    """
    if not has_indic_script(text):
        return text  # Already in Latin script

    # Detect source language
    src_lang = detect_language(text)
    if src_lang == LANG_ENGLISH:
        return text

    # Translate to English (Sarvam handles transliteration as part of translation)
    translated = await translate(text, src_lang, LANG_ENGLISH)
    return translated


async def translate_response(text: str, target_lang: str) -> str:
    """Translate an English response to the customer's language."""
    if target_lang == LANG_ENGLISH:
        return text
    return await translate(text, LANG_ENGLISH, target_lang)
