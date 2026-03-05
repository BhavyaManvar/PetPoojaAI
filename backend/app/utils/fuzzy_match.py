"""Fuzzy string matching for menu item lookup.

Uses rapidfuzz for high-performance matching; falls back to difflib.
"""

from __future__ import annotations

from app.config import settings

try:
    from rapidfuzz import fuzz, process as rf_process

    _HAS_RAPIDFUZZ = True
except ImportError:
    from difflib import SequenceMatcher

    _HAS_RAPIDFUZZ = False


# ---------------------------------------------------------------------------
# Combined scorer: smart blend of WRatio + token_sort_ratio
#
# WRatio handles abbreviations ("french fry" → "French Fries") and token
# reordering ("paneer pizza" → "Paneer Tikka Pizza").  However, its internal
# partial-matching can over-score when a short query is a coincidental
# substring of a longer, unrelated candidate (e.g. "lassi" inside "cLASSIc
# Lemonade").  We detect that case via a length-ratio + token-overlap check
# and fall back to token_sort_ratio which does not inflate partial matches.
# ---------------------------------------------------------------------------

def _combined_scorer(s1: str, s2: str, **kwargs) -> float:
    if not _HAS_RAPIDFUZZ:
        return 0.0
    tsr = fuzz.token_sort_ratio(s1, s2)
    wr = fuzz.WRatio(s1, s2)
    # When strings differ greatly in length and WRatio is much higher than
    # token_sort_ratio, WRatio may be inflated by partial substring matching.
    # Check token overlap: if no query token actually appears in the candidate
    # tokens, the WRatio boost is from coincidental character overlap.
    if s1 and s2:
        len_ratio = min(len(s1), len(s2)) / max(len(s1), len(s2))
        if len_ratio < 0.5 and wr > tsr + 15:
            s1_tokens = set(s1.lower().split())
            s2_tokens = set(s2.lower().split())
            if not (s1_tokens & s2_tokens):
                return tsr
    return max(tsr, wr)


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def best_match(query: str, candidates: list[str], threshold: int | None = None) -> str | None:
    """Return the best fuzzy match from *candidates* for *query*, or *None*."""
    threshold = threshold or settings.FUZZY_MATCH_THRESHOLD
    if not query or not candidates:
        return None

    if _HAS_RAPIDFUZZ:
        result = rf_process.extractOne(
            query, candidates, scorer=_combined_scorer, score_cutoff=threshold
        )
        return result[0] if result else None

    # stdlib fallback
    return _stdlib_best(query, candidates, threshold)


def best_match_with_score(
    query: str,
    candidates: list[str],
    threshold: int | None = None,
) -> tuple[str | None, float]:
    """Return ``(matched_name, score)`` — score in 0-100 range.

    If no candidate exceeds the *threshold*, returns ``(None, 0.0)``.
    """
    threshold = threshold or settings.FUZZY_MATCH_THRESHOLD
    if not query or not candidates:
        return None, 0.0

    if _HAS_RAPIDFUZZ:
        result = rf_process.extractOne(
            query, candidates, scorer=_combined_scorer, score_cutoff=threshold
        )
        if result:
            return result[0], result[1]
        return None, 0.0

    # stdlib fallback
    name, score = _stdlib_best_with_score(query, candidates)
    if score >= threshold:
        return name, score
    return None, 0.0


def top_matches(
    query: str,
    candidates: list[str],
    limit: int = 5,
    threshold: int | None = None,
) -> list[dict]:
    """Return the top *limit* fuzzy matches as ``[{"item": str, "score": float}]``."""
    threshold = threshold or settings.FUZZY_MATCH_THRESHOLD
    if not query or not candidates:
        return []

    if _HAS_RAPIDFUZZ:
        results = rf_process.extract(
            query, candidates, scorer=_combined_scorer, limit=limit, score_cutoff=threshold
        )
        return [{"item": name, "score": round(score, 1)} for name, score, _ in results]

    # stdlib fallback — compute all, sort, slice
    scored = []
    query_lower = query.lower().strip()
    for candidate in candidates:
        score = SequenceMatcher(None, query_lower, candidate.lower()).ratio() * 100
        if score >= threshold:
            scored.append({"item": candidate, "score": round(score, 1)})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


# ---------------------------------------------------------------------------
# stdlib fallback internals
# ---------------------------------------------------------------------------

def _stdlib_best(query: str, candidates: list[str], threshold: float) -> str | None:
    name, score = _stdlib_best_with_score(query, candidates)
    return name if score >= threshold else None


def _stdlib_best_with_score(query: str, candidates: list[str]) -> tuple[str | None, float]:
    query_lower = query.lower().strip()
    best_name: str | None = None
    best_score = 0.0
    for candidate in candidates:
        score = SequenceMatcher(None, query_lower, candidate.lower()).ratio() * 100
        if score > best_score:
            best_score = score
            best_name = candidate
    return best_name, best_score
