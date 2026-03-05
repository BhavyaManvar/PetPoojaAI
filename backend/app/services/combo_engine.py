"""Combo Engine — market basket analysis using mlxtend association rules.

Falls back to a lightweight manual apriori if mlxtend is unavailable.

Key concepts:
    Basket       — the set of items in a single order
    Support      — fraction of orders containing the item-pair
    Confidence   — P(consequent | antecedent)
    Lift         — confidence / expected_confidence (>1 means positive correlation)
"""

from __future__ import annotations

from itertools import combinations
from typing import Any

import pandas as pd

from app.config import settings

try:
    from mlxtend.frequent_patterns import apriori, association_rules
    from mlxtend.preprocessing import TransactionEncoder

    _HAS_MLXTEND = True
except ImportError:
    _HAS_MLXTEND = False


# ── TASK 1: Build Order Baskets ─────────────────────────────────────────────────

def build_order_baskets(order_items_df: pd.DataFrame) -> dict[Any, list[str]]:
    """Build order baskets: {order_id: [item_name, ...]}

    Example output::

        {101: ["Burger", "Fries", "Coke"],
         102: ["Pizza", "Coke"]}
    """
    if order_items_df.empty:
        return {}
    return (
        order_items_df.groupby("order_id")["item_name"]
        .apply(list)
        .to_dict()
    )


def get_basket_stats(order_items_df: pd.DataFrame) -> dict:
    """Return high-level basket statistics useful for dashboards."""
    baskets = build_order_baskets(order_items_df)
    if not baskets:
        return {"total_baskets": 0, "avg_basket_size": 0, "max_basket_size": 0, "min_basket_size": 0}
    sizes = [len(v) for v in baskets.values()]
    return {
        "total_baskets": len(sizes),
        "avg_basket_size": round(sum(sizes) / len(sizes), 2),
        "max_basket_size": max(sizes),
        "min_basket_size": min(sizes),
    }


# ── TASK 2: Combo Recommendation (Market Basket Analysis) ───────────────────────

def get_top_combos(
    order_items_df: pd.DataFrame,
    min_support: float | None = None,
    min_confidence: float | None = None,
    top_n: int = 10,
) -> list[dict]:
    """Return the top item-pair combos ranked by confidence.

    Each dict contains:
        combo        — "Burger + Fries"
        antecedent   — "Burger"
        consequent   — "Fries"
        support      — float
        confidence   — float
        lift         — float
    """
    if order_items_df.empty:
        return []

    min_support = min_support or settings.MIN_SUPPORT
    min_confidence = min_confidence or settings.MIN_CONFIDENCE

    if _HAS_MLXTEND:
        return _mlxtend_combos(order_items_df, min_support, min_confidence, top_n)
    return _manual_combos(order_items_df, min_support, min_confidence, top_n)


def get_combos_by_category(
    order_items_df: pd.DataFrame,
    menu_df: pd.DataFrame,
    category: str | None = None,
    min_support: float | None = None,
    min_confidence: float | None = None,
    top_n: int = 10,
) -> list[dict]:
    """Filter combos so at least one item belongs to the given category."""
    combos = get_top_combos(order_items_df, min_support, min_confidence, top_n=50)
    if not category:
        return combos[:top_n]

    # Build item→category lookup from menu
    cat_map: dict[str, str] = {}
    if not menu_df.empty and "item_name" in menu_df.columns and "category" in menu_df.columns:
        cat_map = dict(zip(menu_df["item_name"], menu_df["category"]))

    filtered = []
    cat_lower = category.lower()
    for c in combos:
        a_cat = cat_map.get(c["antecedent"], "").lower()
        b_cat = cat_map.get(c["consequent"], "").lower()
        if cat_lower in (a_cat, b_cat):
            filtered.append(c)
    return filtered[:top_n]


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

    rules["antecedent"] = rules["antecedents"].apply(lambda x: list(x)[0])
    rules["consequent"] = rules["consequents"].apply(lambda x: list(x)[0])
    rules["combo"] = rules.apply(
        lambda r: f"{r['antecedent']} + {r['consequent']}", axis=1
    )
    rules = rules.sort_values("confidence", ascending=False).head(top_n)

    return (
        rules[["combo", "antecedent", "consequent", "support", "confidence", "lift"]]
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

        # Generate both direction rules (A→B and B→A)
        for ant, cons in [(a, b), (b, a)]:
            conf = count / item_counts[ant] if item_counts.get(ant) else 0
            if conf < min_confidence:
                continue
            expected = (item_counts.get(ant, 0) / total) * (item_counts.get(cons, 0) / total)
            lift = (support / expected) if expected > 0 else 0

            rules.append({
                "combo": f"{ant} + {cons}",
                "antecedent": ant,
                "consequent": cons,
                "support": round(support, 4),
                "confidence": round(conf, 4),
                "lift": round(lift, 4),
            })

    rules.sort(key=lambda r: r["confidence"], reverse=True)
    return rules[:top_n]
