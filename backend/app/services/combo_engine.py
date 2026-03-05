"""Combo Engine — market basket analysis using mlxtend association rules.

Falls back to a lightweight manual apriori if mlxtend is unavailable.
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


def get_top_combos(
    order_items_df: pd.DataFrame,
    min_support: float | None = None,
    min_confidence: float | None = None,
    top_n: int = 10,
) -> list[dict]:
    """Return the top item-pair combos ranked by confidence."""
    if order_items_df.empty:
        return []

    min_support = min_support or settings.MIN_SUPPORT
    min_confidence = min_confidence or settings.MIN_CONFIDENCE

    if _HAS_MLXTEND:
        return _mlxtend_combos(order_items_df, min_support, min_confidence, top_n)
    return _manual_combos(order_items_df, min_support, min_confidence, top_n)


# ── mlxtend-based implementation ────────────────────────────────────────────────

def _mlxtend_combos(
    order_items_df: pd.DataFrame,
    min_support: float,
    min_confidence: float,
    top_n: int,
) -> list[dict]:
    baskets = order_items_df.groupby("order_id")["item_name"].apply(list).tolist()

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
        (rules["antecedents"].apply(len) == 1) & (rules["consequents"].apply(len) == 1)
    ].copy()

    rules["combo"] = rules.apply(
        lambda r: f"{list(r['antecedents'])[0]} + {list(r['consequents'])[0]}", axis=1
    )
    rules = rules.sort_values("confidence", ascending=False).head(top_n)

    return rules[["combo", "support", "confidence", "lift"]].round(4).to_dict(orient="records")


# ── Fallback manual implementation ──────────────────────────────────────────────

def _manual_combos(
    order_items_df: pd.DataFrame,
    min_support: float,
    min_confidence: float,
    top_n: int,
) -> list[dict]:
    baskets = order_items_df.groupby("order_id")["item_name"].apply(set).tolist()
    total = len(baskets)
    if total == 0:
        return []

    item_counts: dict[str, int] = {}
    pair_counts: dict[tuple[str, str], int] = {}

    for basket in baskets:
        items = sorted(basket)
        for item in items:
            item_counts[item] = item_counts.get(item, 0) + 1
        for pair in combinations(items, 2):
            pair_counts[pair] = pair_counts.get(pair, 0) + 1

    rules: list[dict] = []
    for (a, b), count in pair_counts.items():
        support = count / total
        if support < min_support:
            continue
        conf_a = count / item_counts[a] if item_counts.get(a) else 0
        conf_b = count / item_counts[b] if item_counts.get(b) else 0
        confidence = max(conf_a, conf_b)
        if confidence < min_confidence:
            continue
        lift = (support / ((item_counts[a] / total) * (item_counts[b] / total))) if item_counts.get(a) and item_counts.get(b) else 0

        rules.append({
            "combo": f"{a} + {b}",
            "support": round(support, 4),
            "confidence": round(confidence, 4),
            "lift": round(lift, 4),
        })

    rules.sort(key=lambda r: r["confidence"], reverse=True)
    return rules[:top_n]
