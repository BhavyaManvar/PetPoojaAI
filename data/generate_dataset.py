"""Menu data and recommendation engine for PetPooja AI Revenue Copilot."""

import random

# ── Category Compatibility for Recommendations ─────────────────────────────────
# Maps a source category to compatible upsell target categories.
COMPATIBILITY = {
    "Pizza": ["Sides", "Beverages", "Desserts", "Combo"],
    "Burger": ["Sides", "Beverages", "Combo"],
    "Main Course": ["Breads", "Rice", "Beverages", "Desserts"],
    "South Indian": ["Beverages", "Sides"],
    "Street Food": ["Beverages", "Desserts"],
    "Sandwich": ["Sides", "Beverages"],
    "Wraps": ["Sides", "Beverages"],
    "Italian": ["Beverages", "Desserts", "Sides"],
}

# Scoring weights — high profit + low sales
WEIGHT_PROFIT = 0.60
WEIGHT_LOW_SALES = 0.40

# Anti-repeat penalty for previously suggested items
REPEAT_PENALTY = 0.50

# ── Menu Items ──────────────────────────────────────────────────────────────────
# (id, name, category, price, cost, profit, sales, available)
ITEMS = [
    # Pizza
    (1, "Paneer Tikka Pizza", "Pizza", 350, 150, 200, 1454, True),
    (2, "Margherita Pizza", "Pizza", 280, 110, 170, 1819, True),
    (3, "Cheese Burst Pizza", "Pizza", 420, 180, 240, 1515, True),
    (4, "Farmhouse Pizza", "Pizza", 390, 170, 220, 1545, True),
    (5, "Veggie Delight Pizza", "Pizza", 360, 160, 200, 1421, True),
    (6, "Corn Cheese Pizza", "Pizza", 340, 150, 190, 1606, True),
    (7, "Mexican Green Wave Pizza", "Pizza", 380, 170, 210, 1477, True),

    # Sides
    (8, "Garlic Bread", "Sides", 120, 36, 84, 2589, True),
    (9, "Cheesy Fries", "Sides", 150, 50, 100, 1767, True),
    (10, "French Fries", "Sides", 130, 45, 85, 2256, True),
    (11, "Raita", "Sides", 60, 15, 45, 2027, True),
    (12, "Green Salad", "Sides", 80, 20, 60, 1731, True),
    (13, "Cheese Garlic Bread", "Sides", 150, 50, 100, 2591, True),
    (14, "Peri Peri Fries", "Sides", 170, 60, 110, 1957, True),
    (15, "Loaded Nachos", "Sides", 210, 80, 130, 1995, True),
    (16, "Cheese Nachos", "Sides", 200, 75, 125, 2236, True),
    (17, "Potato Wedges", "Sides", 160, 55, 105, 2071, True),

    # Burger
    (18, "Veg Burger", "Burger", 180, 100, 80, 1302, True),
    (19, "Aloo Tikki Burger", "Burger", 150, 70, 80, 1330, True),
    (20, "Paneer Burger", "Burger", 220, 110, 110, 1494, True),
    (21, "Cheese Veg Burger", "Burger", 210, 105, 105, 1445, True),
    (22, "Spicy Veg Burger", "Burger", 200, 100, 100, 1386, True),
    (23, "Corn Spinach Burger", "Burger", 230, 115, 115, 1284, True),
    (24, "Double Patty Burger", "Burger", 260, 130, 130, 1308, True),

    # South Indian
    (25, "Masala Dosa", "South Indian", 150, 80, 70, 1808, True),
    (26, "Idli Sambar", "South Indian", 100, 40, 60, 2101, True),
    (27, "Plain Dosa", "South Indian", 120, 50, 70, 2135, True),
    (28, "Mysore Masala Dosa", "South Indian", 170, 80, 90, 1783, True),
    (29, "Rava Dosa", "South Indian", 160, 75, 85, 1717, True),
    (30, "Onion Uttapam", "South Indian", 150, 70, 80, 1768, True),
    (31, "Medu Vada", "South Indian", 120, 50, 70, 2050, True),

    # Breads
    (32, "Butter Naan", "Breads", 60, 20, 40, 3141, True),
    (33, "Tandoori Roti", "Breads", 40, 12, 28, 3756, True),
    (34, "Plain Naan", "Breads", 50, 15, 35, 3180, True),
    (35, "Garlic Naan", "Breads", 70, 22, 48, 3250, True),
    (36, "Cheese Naan", "Breads", 110, 35, 75, 2465, True),
    (37, "Stuffed Kulcha", "Breads", 120, 40, 80, 2496, True),
    (38, "Missi Roti", "Breads", 70, 25, 45, 2964, True),

    # Beverages
    (39, "Coke", "Beverages", 60, 20, 40, 3182, True),
    (40, "Lassi", "Beverages", 80, 30, 50, 2765, True),
    (41, "Mango Shake", "Beverages", 120, 40, 80, 2614, True),
    (42, "Cold Coffee", "Beverages", 140, 45, 95, 2915, True),
    (43, "Masala Chai", "Beverages", 40, 12, 28, 3408, True),
    (44, "Green Tea", "Beverages", 50, 15, 35, 2246, True),
    (45, "Black Coffee", "Beverages", 70, 25, 45, 2347, True),
    (46, "Cappuccino", "Beverages", 120, 40, 80, 2618, True),
    (47, "Latte", "Beverages", 130, 45, 85, 2666, True),
    (48, "Mocha", "Beverages", 140, 50, 90, 2714, True),
    (49, "Iced Latte", "Beverages", 150, 55, 95, 2762, True),
    (50, "Strawberry Shake", "Beverages", 130, 45, 85, 2520, True),
    (51, "Banana Shake", "Beverages", 120, 40, 80, 2472, True),
    (52, "Oreo Shake", "Beverages", 150, 55, 95, 2810, True),
    (53, "Blue Lagoon", "Beverages", 160, 60, 100, 2058, True),
    (54, "Virgin Mojito", "Beverages", 150, 55, 95, 2868, True),
    (55, "Lemon Soda", "Beverages", 60, 20, 40, 3110, True),
    (56, "Orange Juice", "Beverages", 90, 30, 60, 2592, True),
    (57, "Watermelon Juice", "Beverages", 100, 35, 65, 2640, True),
    (58, "Badam Milk", "Beverages", 140, 50, 90, 2690, True),
    (59, "Rose Milk", "Beverages", 120, 45, 75, 2405, True),
    (60, "Saffron Milk", "Beverages", 150, 55, 95, 2186, True),
    (61, "Energy Drink", "Beverages", 160, 60, 100, 2189, True),
    (62, "Sparkling Water", "Beverages", 80, 25, 55, 2091, True),
    (63, "Mineral Water", "Beverages", 30, 10, 20, 3419, True),
    (64, "Buttermilk", "Beverages", 50, 15, 35, 3349, True),
    (65, "Masala Buttermilk", "Beverages", 60, 20, 40, 3204, True),
    (66, "Coconut Water", "Beverages", 70, 25, 45, 2808, True),
    (67, "Lemon Iced Tea", "Beverages", 120, 45, 75, 2522, True),
    (68, "Peach Iced Tea", "Beverages", 130, 50, 80, 2571, True),
    (69, "Classic Lemonade", "Beverages", 110, 40, 70, 2621, True),

    # Main Course
    (70, "Paneer Butter Masala", "Main Course", 280, 120, 160, 1044, True),
    (71, "Dal Makhani", "Main Course", 220, 90, 130, 1015, True),
    (72, "Kadai Paneer", "Main Course", 260, 110, 150, 1026, True),
    (73, "Veg Kolhapuri", "Main Course", 250, 110, 140, 957, True),
    (74, "Malai Kofta", "Main Course", 280, 120, 160, 976, True),
    (75, "Shahi Paneer", "Main Course", 270, 115, 155, 985, True),
    (76, "Palak Paneer", "Main Course", 260, 110, 150, 994, True),
    (77, "Chole Masala", "Main Course", 220, 95, 125, 1033, True),
    (78, "Rajma Masala", "Main Course", 210, 90, 120, 1024, True),
    (79, "Aloo Gobi", "Main Course", 200, 85, 115, 1055, True),
    (80, "Baingan Bharta", "Main Course", 210, 90, 120, 975, True),
    (81, "Mixed Veg Curry", "Main Course", 230, 100, 130, 985, True),
    (82, "Kofta Curry", "Main Course", 240, 105, 135, 995, True),
    (83, "Kaju Curry", "Main Course", 300, 140, 160, 787, True),
    (84, "Paneer Lababdar", "Main Course", 280, 120, 160, 958, True),
    (85, "Methi Malai Paneer", "Main Course", 290, 125, 165, 966, True),
    (86, "Navratan Korma", "Main Course", 270, 115, 155, 977, True),
    (87, "Veg Handi", "Main Course", 260, 110, 150, 987, True),
    (88, "Tawa Veg", "Main Course", 250, 105, 145, 997, True),
    (89, "Paneer Bhurji", "Main Course", 240, 100, 140, 1069, True),
    (90, "Aloo Jeera", "Main Course", 200, 85, 115, 1010, True),
    (91, "Bhindi Masala", "Main Course", 210, 90, 120, 1022, True),
    (92, "Mushroom Masala", "Main Course", 240, 100, 140, 1034, True),

    # Rice
    (93, "Veg Biryani", "Rice", 240, 100, 140, 1147, True),
    (94, "Jeera Rice", "Rice", 120, 40, 80, 1326, True),
    (95, "Veg Pulao", "Rice", 200, 80, 120, 1091, True),
    (96, "Peas Pulao", "Rice", 190, 75, 115, 1101, True),
    (97, "Paneer Pulao", "Rice", 230, 95, 135, 1111, True),
    (98, "Hyderabadi Veg Biryani", "Rice", 260, 110, 150, 1122, True),
    (99, "Schezwan Fried Rice", "Rice", 220, 90, 130, 1061, True),
    (100, "Veg Fried Rice", "Rice", 200, 85, 115, 1071, True),
    (101, "Paneer Fried Rice", "Rice", 230, 95, 135, 1081, True),
    (102, "Mushroom Fried Rice", "Rice", 220, 90, 130, 1091, True),
    (103, "Burnt Garlic Rice", "Rice", 210, 88, 122, 1101, True),
    (104, "Egg Fried Rice", "Rice", 240, 100, 140, 1111, True),

    # Desserts
    (105, "Chocolate Brownie", "Desserts", 160, 50, 110, 1608, True),
    (106, "Gulab Jamun", "Desserts", 100, 30, 70, 1707, True),
    (107, "Rasgulla", "Desserts", 90, 28, 62, 1694, True),
    (108, "Choco Lava Cake", "Desserts", 180, 55, 125, 1611, True),
    (109, "Ice Cream Vanilla", "Desserts", 90, 30, 60, 1680, True),
    (110, "Ice Cream Chocolate", "Desserts", 100, 35, 65, 1694, True),
    (111, "Ice Cream Strawberry", "Desserts", 100, 35, 65, 1707, True),
    (112, "Kulfi", "Desserts", 110, 40, 70, 1521, True),
    (113, "Falooda", "Desserts", 150, 55, 95, 1610, True),
    (114, "Fruit Salad", "Desserts", 140, 50, 90, 1308, True),
    (115, "Chocolate Mousse", "Desserts", 160, 60, 100, 1494, True),
    (116, "Tiramisu", "Desserts", 220, 90, 130, 1161, True),
    (117, "Cheesecake", "Desserts", 200, 85, 115, 1298, True),
    (118, "Chocolate Pastry", "Desserts", 120, 45, 75, 1594, True),
    (119, "Sweet Platter", "Desserts", 220, 90, 130, 1216, True),
    (120, "Dry Fruit Halwa", "Desserts", 200, 85, 115, 1261, True),
    (121, "Moong Dal Halwa", "Desserts", 210, 90, 120, 1273, True),
    (122, "Carrot Halwa", "Desserts", 180, 75, 105, 1526, True),
    (123, "Rabri", "Desserts", 170, 70, 100, 1460, True),

    # Street Food
    (151, "Pav Bhaji", "Street Food", 180, 70, 110, 2216, True),
    (152, "Vada Pav", "Street Food", 60, 20, 40, 2930, True),
    (153, "Dabeli", "Street Food", 70, 25, 45, 2990, True),
    (154, "Sev Puri", "Street Food", 80, 25, 55, 2793, True),
    (155, "Bhel Puri", "Street Food", 90, 30, 60, 2590, True),
    (156, "Pani Puri", "Street Food", 70, 20, 50, 2876, True),
    (157, "Ragda Pattice", "Street Food", 120, 45, 75, 2028, True),
    (158, "Aloo Chaat", "Street Food", 110, 40, 70, 2050, True),
    (159, "Samosa", "Street Food", 40, 12, 28, 3018, True),
    (160, "Kachori", "Street Food", 50, 15, 35, 2937, True),

    # Sandwich
    (161, "Veg Sandwich", "Sandwich", 120, 40, 80, 1318, True),
    (162, "Grilled Sandwich", "Sandwich", 150, 55, 95, 1188, True),
    (163, "Cheese Sandwich", "Sandwich", 160, 60, 100, 1320, True),
    (164, "Paneer Sandwich", "Sandwich", 180, 70, 110, 1332, True),
    (165, "Club Sandwich", "Sandwich", 200, 80, 120, 1200, True),

    # Wraps
    (166, "Veg Wrap", "Wraps", 180, 70, 110, 982, True),
    (167, "Paneer Wrap", "Wraps", 200, 80, 120, 990, True),
    (168, "Falafel Wrap", "Wraps", 210, 85, 125, 999, True),
    (169, "Mexican Wrap", "Wraps", 220, 90, 130, 1008, True),
    (170, "Cheese Wrap", "Wraps", 200, 80, 120, 1017, True),

    # Italian
    (171, "Veg Pasta", "Italian", 220, 90, 130, 710, True),
    (172, "White Sauce Pasta", "Italian", 240, 100, 140, 717, True),
    (173, "Red Sauce Pasta", "Italian", 230, 95, 135, 724, True),
    (174, "Penne Alfredo", "Italian", 260, 110, 150, 732, True),
    (175, "Arrabbiata Pasta", "Italian", 250, 105, 145, 739, True),
    (176, "Veg Lasagna", "Italian", 300, 130, 170, 620, True),
    (177, "Garlic Spaghetti", "Italian", 240, 100, 140, 716, True),
    (178, "Cheese Ravioli", "Italian", 280, 120, 160, 659, True),
    (179, "Pesto Pasta", "Italian", 260, 110, 150, 729, True),
    (180, "Mushroom Pasta", "Italian", 250, 105, 145, 735, True),

    # Combo
    (188, "Veg Thali", "Combo", 350, 150, 200, 728, True),
    (189, "Paneer Thali", "Combo", 420, 180, 240, 743, True),
    (190, "Mini Meal Combo", "Combo", 250, 100, 150, 750, True),
    (191, "Family Combo", "Combo", 800, 350, 450, 742, True),
    (192, "Couple Combo", "Combo", 550, 240, 310, 757, True),
    (193, "Breakfast Combo", "Combo", 220, 90, 130, 758, True),
    (194, "Lunch Combo", "Combo", 300, 130, 170, 711, True),
    (195, "Dinner Combo", "Combo", 350, 150, 200, 724, True),
    (196, "Burger Combo Meal", "Combo", 280, 120, 160, 802, True),
    (197, "Pizza Combo Meal", "Combo", 420, 190, 230, 834, True),
    (198, "Tea Time Combo", "Combo", 180, 70, 110, 698, True),
    (199, "Snack Combo", "Combo", 200, 80, 120, 712, True),
    (200, "Dessert Combo", "Combo", 250, 100, 150, 728, True),
]

# Quick lookup by item id
item_lookup = {i[0]: i for i in ITEMS}

# All categories present in dataset
ALL_CATEGORIES = sorted({i[2] for i in ITEMS})

# Categories that can trigger recommendations (source categories)
RECOMMENDABLE_CATEGORIES = set(COMPATIBILITY.keys())


# ── Recommendation / Upsell Engine ─────────────────────────────────────────────

def get_compatible_categories(selected_category: str) -> list[str]:
    """Return compatible upsell categories for a given source category."""
    return COMPATIBILITY.get(selected_category, [])


def filter_candidate_items(selected_item: tuple, items: list[tuple]) -> list[tuple]:
    """Return available items from compatible categories, excluding the selected item."""
    compatible = get_compatible_categories(selected_item[2])
    if not compatible:
        return []
    return [
        item for item in items
        if item[2] in compatible
        and item[7]  # available
        and item[0] != selected_item[0]
    ]


def normalize_scores(values: list[float]) -> list[float]:
    """Min-max normalize values to [0, 1]. Returns 0.5 for constant lists."""
    if not values:
        return []
    min_v = min(values)
    max_v = max(values)
    if max_v == min_v:
        return [0.5] * len(values)
    return [(v - min_v) / (max_v - min_v) for v in values]


def _batch_score_candidates(
    selected_item: tuple,
    candidates: list[tuple],
    history: dict[int, list[int]] | None = None,
) -> list[tuple[tuple, float]]:
    """Score candidates by high profit (index 5) + low sales (index 6)."""
    if not candidates:
        return []

    norm_profits = normalize_scores([c[5] for c in candidates])
    norm_sales = normalize_scores([c[6] for c in candidates])

    recent: list[int] = history.get(selected_item[0], []) if history else []
    scored: list[tuple[tuple, float]] = []
    for idx, candidate in enumerate(candidates):
        score = (
            WEIGHT_PROFIT * norm_profits[idx]
            + WEIGHT_LOW_SALES * (1.0 - norm_sales[idx])
        )
        if candidate[0] in recent:
            score *= (1.0 - REPEAT_PENALTY)
        scored.append((candidate, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


def weighted_pick_top_candidates(
    scored_candidates: list[tuple[tuple, float]],
    top_k: int = 3,
) -> tuple[tuple, float]:
    """Pick one item from the top-k candidates using weighted random selection."""
    pool = scored_candidates[:min(top_k, len(scored_candidates))]
    weights = [max(s, 0.01) for _, s in pool]
    return random.choices(pool, weights=weights, k=1)[0]


def update_history(
    history: dict[int, list[int]],
    selected_id: int,
    recommended_id: int,
    max_history: int = 5,
) -> None:
    """Record a recommendation and evict entries older than max_history cycles."""
    rec_list = history.setdefault(selected_id, [])
    rec_list.append(recommended_id)
    # Keep only the last `max_history` entries
    if len(rec_list) > max_history:
        history[selected_id] = rec_list[-max_history:]


def get_recommendation(
    selected_item: tuple,
    items: list[tuple],
    history: dict[int, list[int]] | None = None,
) -> dict | None:
    """Get a single upsell recommendation for a selected item.

    Returns a structured dict or None if no recommendation is possible.
    Uses per-item history, weighted scoring with anti-repeat penalty,
    and top-3 weighted random selection for variety.
    """
    if history is None:
        history = {}

    # Validate input
    if not selected_item or len(selected_item) < 8:
        return None
    if not items:
        return None

    candidates = filter_candidate_items(selected_item, items)
    if not candidates:
        return None

    # Score all candidates in one batch (history-aware, normalized once)
    scored = _batch_score_candidates(selected_item, candidates, history)

    # Weighted random pick from top 3
    chosen, chosen_score = weighted_pick_top_candidates(scored, top_k=3)

    # Record in per-item history
    update_history(history, selected_item[0], chosen[0])

    return {
        "selected_item": selected_item[1],
        "recommended_item": chosen[1],
        "selected_category": selected_item[2],
        "recommended_category": chosen[2],
        "price": chosen[3],
        "profit": chosen[5],
        "sales": chosen[6],
        "score": round(chosen_score, 4),
        "message": format_recommendation_message(selected_item, chosen),
    }


# Category-aware message templates
_MESSAGES = {
    "Beverages": [
        "Add {rec} for just ₹{price} — a refreshing match with your {sel_lower}.",
        "Pair your {sel} with {rec} for just ₹{price}.",
        "Complete your meal — add {rec} for ₹{price}.",
    ],
    "Sides": [
        "Try {rec} as a side — a great add-on with your order for ₹{price}.",
        "Add {rec} for ₹{price} — pairs perfectly with {sel_lower}.",
        "Make it a combo — grab {rec} for just ₹{price}.",
    ],
    "Desserts": [
        "End on a sweet note — add {rec} for just ₹{price}.",
        "Treat yourself! Add {rec} for ₹{price} with your {sel_lower}.",
        "Top off your meal with {rec} — only ₹{price}.",
    ],
    "Breads": [
        "Add {rec} for just ₹{price} — goes great with your {sel_lower}.",
        "No curry is complete without bread — try {rec} for ₹{price}.",
    ],
    "Rice": [
        "Complete your meal with {rec} for ₹{price}.",
        "Add {rec} alongside your {sel_lower} — only ₹{price}.",
    ],
    "Combo": [
        "Upgrade to {rec} for ₹{price} — great value with your order.",
        "Try the {rec} for ₹{price} — a satisfying combo deal.",
    ],
}
_DEFAULT_MESSAGES = [
    "Add {rec} for just ₹{price} — a great match with your {sel_lower}.",
    "Try {rec} for ₹{price} — perfect with your current order.",
]


def format_recommendation_message(selected_item: tuple, recommended_item: tuple) -> str:
    """Generate a natural, sales-friendly upsell message."""
    rec_category = recommended_item[2]
    templates = _MESSAGES.get(rec_category, _DEFAULT_MESSAGES)
    template = random.choice(templates)
    return template.format(
        rec=recommended_item[1],
        price=recommended_item[3],
        sel=selected_item[1],
        sel_lower=selected_item[1].lower(),
    )


