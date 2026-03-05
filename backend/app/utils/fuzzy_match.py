"""Fuzzy string matching for menu item lookup.

Uses rapidfuzz for high-performance matching; falls back to difflib.
"""

from app.config import settings

try:
    from rapidfuzz import fuzz, process as rf_process

    _HAS_RAPIDFUZZ = True
except ImportError:
    from difflib import SequenceMatcher

    _HAS_RAPIDFUZZ = False


def best_match(query: str, candidates: list[str], threshold: int | None = None) -> str | None:
    """Return the best fuzzy match from *candidates* for *query*."""
    threshold = threshold or settings.FUZZY_MATCH_THRESHOLD
    if not query or not candidates:
        return None

    if _HAS_RAPIDFUZZ:
        result = rf_process.extractOne(
            query, candidates, scorer=fuzz.token_sort_ratio, score_cutoff=threshold
        )
        return result[0] if result else None

    # stdlib fallback
    query_lower = query.lower().strip()
    best: str | None = None
    best_score = 0.0

    for candidate in candidates:
        score = SequenceMatcher(None, query_lower, candidate.lower()).ratio() * 100
        if score > best_score:
            best_score = score
            best = candidate

    return best if best_score >= threshold else None
