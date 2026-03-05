"""Combo Engine — market basket analysis using mlxtend association rules.

Falls back to a lightweight manual apriori if mlxtend is unavailable.

Public API
----------
    build_baskets(order_items_df)   → list[list[str]]
    get_top_combos(...)             → list[dict]
    get_pair_frequencies(...)       → list[dict]
"""

from itertools import combinations

import pandas as pd

from app.config import settings

try:
    from mlxtend.frequent_patterns import apriori, association_rules
    from mlxtend.preprocessing import TransactionEncoder

    _HAS_MLXTEND = True
except ImportError:
    _HAS_MLXTEND = False


# ── Basket builder ──────────────────────────────────────────────────────────────

def build_baskets(order_items_df: pd.DataFrame) -> list[list[str]]:
    """Group order items into per-order baskets.

    Returns a list of baskets, each basket being a *sorted* list of item names.

    Example
    -------
    >>> build_baskets(df)
    [['Burger', 'Coke', 'Fries'], ['Burger', 'Fries'], ...]
    """
    if order_items_df.empty:
        return []
    return (
        order_items_df
        .groupby("order_id")["item_name"]
        .apply(lambda s: sorted(set(s)))
        .tolist()
    )


# ── Main entry point ────────────────────────────────────────────────────────────

def get_top_combos(
    order_items_df: pd.DataFrame,
    min_support: float | None = None,
    min_confidence: float | None = None,
    top_n: int = 10,
) -> list[dict]:
    """Return the top item-pair combos ranked by confidence.

    Each dict contains:
        antecedent, consequent, combo, support, confidence, lift
    """
    if order_items_df.empty:
        return []

    min_support = min_support or settings.MIN_SUPPORT
    min_confidence = min_confidence or settings.MIN_CONFIDENCE

    if _HAS_MLXTEND:
        return _mlxtend_combos(order_items_df, min_support, min_confidence, top_n)
    return _manual_combos(order_items_df, min_support, min_confidence, top_n)


# ── Pair frequency helper ───────────────────────────────────────────────────────

def get_pair_frequencies(order_items_df: pd.DataFrame, top_n: int = 20) -> list[dict]:
    """Return raw pair co-occurrence counts (no thresholds).

    Useful for dashboards that want to show raw frequency data.
    """
    baskets = build_baskets(order_items_df)
    total = len(baskets)
    if total == 0:
        return []

    pair_counts: dict[tuple[str, str], int] = {}
    for basket in baskets:
        for pair in combinations(basket, 2):
            pair_counts[pair] = pair_counts.get(pair, 0) + 1

    results = [
        {
            "item_a": a,
            "item_b": b,
            "co_occurrence": count,
            "frequency": round(count / total, 4),
        }
        for (a, b), count in pair_counts.items()
    ]
    results.sort(key=lambda r: r["co_occurrence"], reverse=True)
    return results[:top_n]


# ── mlxtend-based implementation ────────────────────────────────────────────────

def _mlxtend_combos(
    order_items_df: pd.DataFrame,
    min_support: float,
    min_confidence: float,
    top_n: int,
) -> list[dict]:
    baskets = build_baskets(order_items_df)

    te = TransactionEncoder()
    te_array = te.fit(baskets).transform(baskets)
    basket_df = pd.DataFrame(te_array, columns=te.columns_)

    freq = apriori(basket_df, min_support=min_support, use_colnames=True)
    if freq.empty:
        return []

    rules = association_rules(freq, metric="confidence", min_threshold=min_confidence)
    if rules.empty:
        return []

    # Only keep 1→1 rules for clean combo display
    rules = rules[
        (rules["antecedents"].apply(len) == 1)
        & (rules["consequents"].apply(len) == 1)
    ].copy()

    rules["antecedent"] = rules["antecedents"].apply(lambda s: list(s)[0])
    rules["consequent"] = rules["consequents"].apply(lambda s: list(s)[0])
    rules["combo"] = rules.apply(
        lambda r: f"{r['antecedent']} + {r['consequent']}", axis=1
    )
    rules = rules.sort_values("confidence", ascending=False).head(top_n)

    return (
        rules[["antecedent", "consequent", "combo", "support", "confidence", "lift"]]
        .round(4)
        .to_dict(orient="records")
    )


# ── Fallback manual implementation ──────────────────────────────────────────────

def _manual_combos(
    order_items_df: pd.DataFrame,
    min_support: float,
    min_confidence: float,
    top_n: int,
) -> list[dict]:
    baskets = build_baskets(order_items_df)
    total = len(baskets)
    if total == 0:
        return []

    item_counts: dict[str, int] = {}
    pair_counts: dict[tuple[str, str], int] = {}

    for basket in baskets:
        for item in basket:
            item_counts[item] = item_counts.get(item, 0) + 1
        for pair in combinations(basket, 2):
            pair_counts[pair] = pair_counts.get(pair, 0) + 1

    rules: list[dict] = []
    for (a, b), count in pair_counts.items():
        support = count / total
        if support < min_support:
            continue

        # Generate both directions (a→b and b→a) like mlxtend does
        for antecedent, consequent in [(a, b), (b, a)]:
            conf = count / item_counts[antecedent] if item_counts.get(antecedent) else 0
            if conf < min_confidence:
                continue
            lift = (
                support / ((item_counts[antecedent] / total) * (item_counts[consequent] / total))
                if item_counts.get(antecedent) and item_counts.get(consequent)
                else 0
            )
            rules.append({
                "antecedent": antecedent,
                "consequent": consequent,
                "combo": f"{antecedent} + {consequent}",
                "support": round(support, 4),
                "confidence": round(conf, 4),
                "lift": round(lift, 4),
            })

    rules.sort(key=lambda r: r["confidence"], reverse=True)
    return rules[:top_n]
