"""Generate the hybrid Excel dataset for PetPooja AI Revenue Copilot.

Produces 5 sheets: Menu_Items, Orders, Order_Items, Sales_Analytics, Voice_Orders

Run once:  python data/generate_dataset.py
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

random.seed(42)

# ── Menu Items ──────────────────────────────────────────────────────────────────
ITEMS = [
    (1, "Paneer Tikka Pizza", "Pizza", 350, 150, True),
    (2, "Margherita Pizza", "Pizza", 280, 110, True),
    (3, "Garlic Bread", "Sides", 120, 36, True),
    (4, "Cheesy Fries", "Sides", 150, 50, True),
    (5, "Veg Burger", "Burger", 180, 100, True),
    (6, "Aloo Tikki Burger", "Burger", 150, 70, True),
    (7, "Masala Dosa", "South Indian", 150, 80, True),
    (8, "Idli Sambar", "South Indian", 100, 40, True),
    (9, "Butter Naan", "Breads", 60, 20, True),
    (10, "Tandoori Roti", "Breads", 40, 12, True),
    (11, "French Fries", "Sides", 130, 45, True),
    (12, "Coke", "Beverages", 60, 20, True),
    (13, "Lassi", "Beverages", 80, 30, True),
    (14, "Mango Shake", "Beverages", 120, 40, True),
    (15, "Paneer Butter Masala", "Main Course", 280, 120, True),
    (16, "Dal Makhani", "Main Course", 220, 90, True),
    (17, "Kadai Paneer", "Main Course", 260, 110, True),
    (18, "Veg Biryani", "Rice", 240, 100, True),
    (19, "Jeera Rice", "Rice", 120, 40, True),
    (20, "Chocolate Brownie", "Desserts", 160, 50, True),
    (21, "Gulab Jamun", "Desserts", 100, 30, True),
    (22, "Rasgulla", "Desserts", 90, 28, True),
    (23, "Manchurian", "Starters", 200, 70, True),
    (24, "Spring Roll", "Starters", 180, 60, True),
    (25, "Paneer Tikka", "Starters", 250, 90, True),
    (26, "Masala Papad", "Starters", 80, 20, True),
    (27, "Raita", "Sides", 60, 15, True),
    (28, "Green Salad", "Sides", 80, 20, True),
    (29, "Choco Lava Cake", "Desserts", 180, 55, True),
    (30, "Cold Coffee", "Beverages", 140, 45, True),
]

COMBO_PAIRS = [
    (1, 12), (5, 11), (15, 9), (18, 13), (7, 8),
    (23, 12), (3, 2), (20, 14), (16, 10), (25, 27),
]

CITIES = ["Ahmedabad", "Mumbai", "Delhi", "Bangalore", "Pune", "Jaipur", "Hyderabad", "Chennai"]
OUTLETS = {c: list(range(i * 2 + 1, i * 2 + 3)) for i, c in enumerate(CITIES)}
PAYMENT_MODES = ["UPI", "Cash", "Card", "Wallet"]
ORDER_TYPES = ["Dine-in", "Takeaway", "Delivery"]

menu_df = pd.DataFrame(ITEMS, columns=["item_id", "item_name", "category", "price", "cost", "is_veg"])
menu_df["is_available"] = True
item_lookup = {i[0]: i for i in ITEMS}

# ── Orders + Order_Items ────────────────────────────────────────────────────────
NUM_ORDERS = 1000
BASE_DATE = datetime(2025, 1, 1)

order_rows = []
order_item_rows = []
order_item_id = 1

for oid in range(1001, 1001 + NUM_ORDERS):
    city = random.choice(CITIES)
    outlet_id = random.choice(OUTLETS[city])
    order_date = BASE_DATE + timedelta(
        days=random.randint(0, 180),
        hours=random.randint(10, 22),
        minutes=random.randint(0, 59),
    )

    n_items = random.choices([1, 2, 3, 4], weights=[15, 40, 30, 15])[0]
    chosen_ids: set[int] = set()

    if random.random() < 0.4 and n_items >= 2:
        pair = random.choice(COMBO_PAIRS)
        chosen_ids.update(pair)

    while len(chosen_ids) < n_items:
        chosen_ids.add(random.choice(ITEMS)[0])

    total_amount = 0.0
    for item_id in chosen_ids:
        itm = item_lookup[item_id]
        qty = random.choices([1, 2, 3], weights=[60, 30, 10])[0]
        line_total = itm[3] * qty
        total_amount += line_total
        order_item_rows.append({
            "order_item_id": order_item_id,
            "order_id": oid,
            "item_id": item_id,
            "item_name": itm[1],
            "quantity": qty,
            "unit_price": itm[3],
            "line_total": line_total,
        })
        order_item_id += 1

    order_rows.append({
        "order_id": oid,
        "customer_id": random.randint(500, 999),
        "order_date": order_date.strftime("%Y-%m-%d %H:%M:%S"),
        "city": city,
        "outlet_id": outlet_id,
        "total_amount": total_amount,
        "payment_mode": random.choice(PAYMENT_MODES),
        "order_type": random.choice(ORDER_TYPES),
    })

orders_df = pd.DataFrame(order_rows)
order_items_df = pd.DataFrame(order_item_rows)

# ── Sales_Analytics ─────────────────────────────────────────────────────────────
sales_agg = (
    order_items_df
    .groupby(["item_id", "item_name"])
    .agg(total_qty_sold=("quantity", "sum"), total_revenue=("line_total", "sum"))
    .reset_index()
)
sales_agg = sales_agg.merge(menu_df[["item_id", "cost", "category"]], on="item_id", how="left")
sales_agg["total_cost"] = sales_agg["total_qty_sold"] * sales_agg["cost"]
sales_agg["contribution_margin"] = sales_agg["total_revenue"] - sales_agg["total_cost"]
sales_agg["margin_pct"] = (sales_agg["contribution_margin"] / sales_agg["total_revenue"] * 100).round(1)
sales_agg["avg_daily_sales"] = (sales_agg["total_qty_sold"] / 180).round(1)
sales_agg = sales_agg[
    ["item_id", "item_name", "total_qty_sold", "total_revenue", "total_cost",
     "contribution_margin", "margin_pct", "avg_daily_sales", "category"]
]

# ── Voice_Orders ────────────────────────────────────────────────────────────────
VOICE_TEMPLATES = [
    ("one {a} and two {b}", "en", [("{a}", 1), ("{b}", 2)]),
    ("ek {a} aur do {b}", "hi", [("{a}", 1), ("{b}", 2)]),
    ("three {a}", "en", [("{a}", 3)]),
    ("teen {a} aur ek {b}", "hi", [("{a}", 3), ("{b}", 1)]),
    ("{a} please", "en", [("{a}", 1)]),
    ("2 {a}, 1 {b} and 1 {c}", "en", [("{a}", 2), ("{b}", 1), ("{c}", 1)]),
    ("do {a} ek {b}", "hi", [("{a}", 2), ("{b}", 1)]),
    ("I want {a} and {b}", "en", [("{a}", 1), ("{b}", 1)]),
    ("mujhe {a} chahiye aur {b} bhi", "hi", [("{a}", 1), ("{b}", 1)]),
    ("can I get four {a}", "en", [("{a}", 4)]),
]

voice_rows = []
for vid in range(1, 201):
    template, lang, slots = random.choice(VOICE_TEMPLATES)
    sample_items = random.sample(ITEMS, min(len(slots), len(ITEMS)))
    raw = template
    parsed_items = []
    for i, (placeholder, qty) in enumerate(slots):
        if i < len(sample_items):
            name = sample_items[i][1]
            raw = raw.replace(placeholder, name.lower())
            parsed_items.append({"item": name, "qty": qty})
    voice_rows.append({
        "voice_id": vid,
        "raw_text": raw,
        "language": lang,
        "parsed_items": json.dumps(parsed_items),
        "is_valid": True,
        "timestamp": (BASE_DATE + timedelta(
            days=random.randint(0, 180), hours=random.randint(10, 22)
        )).strftime("%Y-%m-%d %H:%M:%S"),
    })

voice_df = pd.DataFrame(voice_rows)

# ── Write Excel ─────────────────────────────────────────────────────────────────
out = Path(__file__).resolve().parent / "restaurant_ai_hybrid_dataset.xlsx"
with pd.ExcelWriter(out, engine="openpyxl") as writer:
    menu_df.to_excel(writer, sheet_name="Menu_Items", index=False)
    orders_df.to_excel(writer, sheet_name="Orders", index=False)
    order_items_df.to_excel(writer, sheet_name="Order_Items", index=False)
    sales_agg.to_excel(writer, sheet_name="Sales_Analytics", index=False)
    voice_df.to_excel(writer, sheet_name="Voice_Orders", index=False)

print(f"Dataset written to {out}")
print(f"  Menu_Items:      {len(menu_df)} rows")
print(f"  Orders:          {len(orders_df)} rows")
print(f"  Order_Items:     {len(order_items_df)} rows")
print(f"  Sales_Analytics: {len(sales_agg)} rows")
print(f"  Voice_Orders:    {len(voice_df)} rows")
