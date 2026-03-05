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
    (31,"Veg Manchow Soup","Soups",140,50,True),
    (32,"Sweet Corn Soup","Soups",130,45,True),
    (33,"Hot and Sour Soup","Soups",150,55,True),
    (34,"Tomato Soup","Soups",120,40,True),
    (35,"Lemon Coriander Soup","Soups",135,48,True),
    (36,"Paneer Chilli","Starters",240,90,True),
    (37,"Veg Chilli","Starters",200,70,True),
    (38,"Baby Corn Chilli","Starters",210,75,True),
    (39,"Crispy Corn","Starters",190,65,True),
    (40,"Veg Crispy","Starters",200,70,True),
    (41,"Cheese Burst Pizza","Pizza",420,180,True),
    (42,"Farmhouse Pizza","Pizza",390,170,True),
    (43,"Veggie Delight Pizza","Pizza",360,160,True),
    (44,"Corn Cheese Pizza","Pizza",340,150,True),
    (45,"Mexican Green Wave Pizza","Pizza",380,170,True),
    (46,"Cheese Garlic Bread","Sides",150,50,True),
    (47,"Peri Peri Fries","Sides",170,60,True),
    (48,"Loaded Nachos","Sides",210,80,True),
    (49,"Cheese Nachos","Sides",200,75,True),
    (50,"Potato Wedges","Sides",160,55,True),
    (51,"Paneer Burger","Burger",220,110,True),
    (52,"Cheese Veg Burger","Burger",210,105,True),
    (53,"Spicy Veg Burger","Burger",200,100,True),
    (54,"Corn Spinach Burger","Burger",230,115,True),
    (55,"Double Patty Burger","Burger",260,130,True),
    (56,"Plain Dosa","South Indian",120,50,True),
    (57,"Mysore Masala Dosa","South Indian",170,80,True),
    (58,"Rava Dosa","South Indian",160,75,True),
    (59,"Onion Uttapam","South Indian",150,70,True),
    (60,"Medu Vada","South Indian",120,50,True),
    (61,"Plain Naan","Breads",50,15,True),
    (62,"Garlic Naan","Breads",70,22,True),
    (63,"Cheese Naan","Breads",110,35,True),
    (64,"Stuffed Kulcha","Breads",120,40,True),
    (65,"Missi Roti","Breads",70,25,True),
    (66,"Veg Kolhapuri","Main Course",250,110,True),
    (67,"Malai Kofta","Main Course",280,120,True),
    (68,"Shahi Paneer","Main Course",270,115,True),
    (69,"Palak Paneer","Main Course",260,110,True),
    (70,"Chole Masala","Main Course",220,95,True),
    (71,"Rajma Masala","Main Course",210,90,True),
    (72,"Aloo Gobi","Main Course",200,85,True),
    (73,"Baingan Bharta","Main Course",210,90,True),
    (74,"Mixed Veg Curry","Main Course",230,100,True),
    (75,"Kofta Curry","Main Course",240,105,True),
    (76,"Veg Pulao","Rice",200,80,True),
    (77,"Peas Pulao","Rice",190,75,True),
    (78,"Paneer Pulao","Rice",230,95,True),
    (79,"Hyderabadi Veg Biryani","Rice",260,110,True),
    (80,"Schezwan Fried Rice","Rice",220,90,True),
    (81,"Veg Fried Rice","Rice",200,85,True),
    (82,"Paneer Fried Rice","Rice",230,95,True),
    (83,"Mushroom Fried Rice","Rice",220,90,True),
    (84,"Burnt Garlic Rice","Rice",210,88,True),
    (85,"Egg Fried Rice","Rice",240,100,True),
    (86,"Veg Noodles","Chinese",200,85,True),
    (87,"Hakka Noodles","Chinese",210,90,True),
    (88,"Schezwan Noodles","Chinese",220,95,True),
    (89,"Paneer Noodles","Chinese",240,105,True),
    (90,"Singapore Noodles","Chinese",230,100,True),
    (91,"Ice Cream Vanilla","Desserts",90,30,True),
    (92,"Ice Cream Chocolate","Desserts",100,35,True),
    (93,"Ice Cream Strawberry","Desserts",100,35,True),
    (94,"Kulfi","Desserts",110,40,True),
    (95,"Falooda","Desserts",150,55,True),
    (96,"Fruit Salad","Desserts",140,50,True),
    (97,"Chocolate Mousse","Desserts",160,60,True),
    (98,"Tiramisu","Desserts",220,90,True),
    (99,"Cheesecake","Desserts",200,85,True),
    (100,"Chocolate Pastry","Desserts",120,45,True),
    (101,"Masala Chai","Beverages",40,12,True),
    (102,"Green Tea","Beverages",50,15,True),
    (103,"Black Coffee","Beverages",70,25,True),
    (104,"Cappuccino","Beverages",120,40,True),
    (105,"Latte","Beverages",130,45,True),
    (106,"Mocha","Beverages",140,50,True),
    (107,"Iced Latte","Beverages",150,55,True),
    (108,"Strawberry Shake","Beverages",130,45,True),
    (109,"Banana Shake","Beverages",120,40,True),
    (110,"Oreo Shake","Beverages",150,55,True),
    (111,"Blue Lagoon","Beverages",160,60,True),
    (112,"Virgin Mojito","Beverages",150,55,True),
    (113,"Lemon Soda","Beverages",60,20,True),
    (114,"Orange Juice","Beverages",90,30,True),
    (115,"Watermelon Juice","Beverages",100,35,True),
    (116,"Pav Bhaji","Street Food",180,70,True),
    (117,"Vada Pav","Street Food",60,20,True),
    (118,"Dabeli","Street Food",70,25,True),
    (119,"Sev Puri","Street Food",80,25,True),
    (120,"Bhel Puri","Street Food",90,30,True),
    (121,"Pani Puri","Street Food",70,20,True),
    (122,"Ragda Pattice","Street Food",120,45,True),
    (123,"Aloo Chaat","Street Food",110,40,True),
    (124,"Samosa","Street Food",40,12,True),
    (125,"Kachori","Street Food",50,15,True),
    (126,"Veg Sandwich","Sandwich",120,40,True),
    (127,"Grilled Sandwich","Sandwich",150,55,True),
    (128,"Cheese Sandwich","Sandwich",160,60,True),
    (129,"Paneer Sandwich","Sandwich",180,70,True),
    (130,"Club Sandwich","Sandwich",200,80,True),
    (131,"Veg Wrap","Wraps",180,70,True),
    (132,"Paneer Wrap","Wraps",200,80,True),
    (133,"Falafel Wrap","Wraps",210,85,True),
    (134,"Mexican Wrap","Wraps",220,90,True),
    (135,"Cheese Wrap","Wraps",200,80,True),
    (136,"Veg Pasta","Italian",220,90,True),
    (137,"White Sauce Pasta","Italian",240,100,True),
    (138,"Red Sauce Pasta","Italian",230,95,True),
    (139,"Penne Alfredo","Italian",260,110,True),
    (140,"Arrabbiata Pasta","Italian",250,105,True),
    (141,"Veg Lasagna","Italian",300,130,True),
    (142,"Garlic Spaghetti","Italian",240,100,True),
    (143,"Cheese Ravioli","Italian",280,120,True),
    (144,"Pesto Pasta","Italian",260,110,True),
    (145,"Mushroom Pasta","Italian",250,105,True),
    (146,"Paneer Shawarma","Middle Eastern",220,90,True),
    (147,"Falafel Plate","Middle Eastern",230,95,True),
    (148,"Hummus with Pita","Middle Eastern",210,85,True),
    (149,"Grilled Veg Platter","Grill",260,110,True),
    (150,"Paneer Grill","Grill",270,120,True),
    (151,"BBQ Veg Skewers","Grill",250,110,True),
    (152,"Stuffed Mushroom","Grill",240,105,True),
    (153,"Cheese Corn Balls","Starters",200,80,True),
    (154,"Veg Cutlet","Starters",150,60,True),
    (155,"Paneer Pakora","Starters",220,90,True),
    (156,"Onion Pakora","Starters",140,50,True),
    (157,"Aloo Pakora","Starters",130,45,True),
    (158,"Corn Pakora","Starters",150,55,True),
    (159,"Spinach Pakora","Starters",140,50,True),
    (160,"Bread Pakora","Starters",120,40,True),
    (161,"Kaju Curry","Main Course",300,140,True),
    (162,"Paneer Lababdar","Main Course",280,120,True),
    (163,"Methi Malai Paneer","Main Course",290,125,True),
    (164,"Navratan Korma","Main Course",270,115,True),
    (165,"Veg Handi","Main Course",260,110,True),
    (166,"Tawa Veg","Main Course",250,105,True),
    (167,"Paneer Bhurji","Main Course",240,100,True),
    (168,"Aloo Jeera","Main Course",200,85,True),
    (169,"Bhindi Masala","Main Course",210,90,True),
    (170,"Mushroom Masala","Main Course",240,100,True),
    (171,"Veg Thali","Combo",350,150,True),
    (172,"Paneer Thali","Combo",420,180,True),
    (173,"Mini Meal Combo","Combo",250,100,True),
    (174,"Family Combo","Combo",800,350,True),
    (175,"Couple Combo","Combo",550,240,True),
    (176,"Breakfast Combo","Combo",220,90,True),
    (177,"Lunch Combo","Combo",300,130,True),
    (178,"Dinner Combo","Combo",350,150,True),
    (179,"Burger Combo Meal","Combo",280,120,True),
    (180,"Pizza Combo Meal","Combo",420,190,True),
    (181,"Tea Time Combo","Combo",180,70,True),
    (182,"Snack Combo","Combo",200,80,True),
    (183,"Dessert Combo","Combo",250,100,True),
    (184,"Sweet Platter","Desserts",220,90,True),
    (185,"Dry Fruit Halwa","Desserts",200,85,True),
    (186,"Moong Dal Halwa","Desserts",210,90,True),
    (187,"Carrot Halwa","Desserts",180,75,True),
    (188,"Rabri","Desserts",170,70,True),
    (189,"Badam Milk","Beverages",140,50,True),
    (190,"Rose Milk","Beverages",120,45,True),
    (191,"Saffron Milk","Beverages",150,55,True),
    (192,"Energy Drink","Beverages",160,60,True),
    (193,"Sparkling Water","Beverages",80,25,True),
    (194,"Mineral Water","Beverages",30,10,True),
    (195,"Buttermilk","Beverages",50,15,True),
    (196,"Masala Buttermilk","Beverages",60,20,True),
    (197,"Coconut Water","Beverages",70,25,True),
    (198,"Lemon Iced Tea","Beverages",120,45,True),
    (199,"Peach Iced Tea","Beverages",130,50,True),
    (200,"Classic Lemonade","Beverages",110,40,True),
        
]

COMBO_PAIRS = [
(1, 12), (1, 11), (2, 3), (2, 12), (41, 12), (43, 46), (45, 11), (5, 11),
(5, 12), (51, 47), (54, 11), (55, 12), (7, 8), (7, 27), (56, 8), (57, 27),
(58, 8), (15, 9), (15, 10), (16, 9), (17, 9), (17, 27), (66, 9), (67, 9),
(68, 61), (69, 61), (70, 61), (71, 10), (72, 61), (18, 13), (18, 27), (76, 27),
(79, 13), (80, 12), (81, 27), (86, 23), (87, 23), (88, 23), (89, 36), (90, 36),
(23, 12), (23, 27), (24, 12), (25, 12), (36, 27), (37, 27), (38, 27), (39, 27),
(40, 27), (3, 2), (3, 12), (46, 12), (48, 12), (49, 12), (50, 12), (20, 14),
(21, 12), (22, 12), (29, 30), (91, 14), (92, 30), (93, 30), (94, 14), (95, 30),
(96, 14), (97, 30), (98, 30), (99, 30), (100, 30), (101, 20), (104, 100), (106, 20),
(108, 20), (109, 21), (110, 29), (112, 30), (116, 113), (117, 113), (118, 113), (119, 113),
(120, 113), (121, 113), (122, 113), (123, 113), (124, 113), (125, 113), (126, 12), (127, 12),
(128, 12), (129, 12), (130, 30), (131, 12), (132, 12), (133, 12), (134, 12), (135, 12),
(136, 30), (137, 30), (138, 30), (139, 30), (140, 30), (141, 30), (142, 30), (143, 30),
(144, 30), (145, 30), (146, 27), (147, 27), (148, 27), (149, 27), (150, 27), (151, 27),
(152, 27), (153, 12), (154, 12), (155, 12), (156, 12), (157, 12), (158, 12), (159, 12),
(160, 12), (161, 61), (162, 61), (163, 61), (164, 61), (165, 61), (166, 61), (167, 61),
(168, 61), (169, 61), (170, 61), (171, 13), (172, 13), (173, 12), (174, 12), (175, 13),
(176, 101), (177, 12), (178, 13), (179, 12), (180, 12), (181, 101), (182, 12), (183, 30),
(184, 30), (185, 189), (186, 189), (187, 189), (188, 189), (189, 20), (190, 20), (191, 20),
(192, 20), (193, 20), (194, 113), (195, 18), (196, 18), (197, 18), (198, 20), (199, 20), (200, 20)
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
    ("one {a}", "en", [("{a}", 1)]),
    ("two {a}", "en", [("{a}", 2)]),
    ("three {a}", "en", [("{a}", 3)]),
    ("four {a}", "en", [("{a}", 4)]),
    ("five {a}", "en", [("{a}", 5)]),
    ("one {a} and one {b}", "en", [("{a}", 1), ("{b}", 1)]),
    ("one {a} and two {b}", "en", [("{a}", 1), ("{b}", 2)]),
    ("two {a} and one {b}", "en", [("{a}", 2), ("{b}", 1)]),
    ("two {a} and two {b}", "en", [("{a}", 2), ("{b}", 2)]),
    ("three {a} and one {b}", "en", [("{a}", 3), ("{b}", 1)]),
    ("one {a}, one {b} and one {c}", "en", [("{a}", 1), ("{b}", 1), ("{c}", 1)]),
    ("two {a}, one {b} and one {c}", "en", [("{a}", 2), ("{b}", 1), ("{c}", 1)]),
    ("two {a}, two {b} and one {c}", "en", [("{a}", 2), ("{b}", 2), ("{c}", 1)]),
    ("one {a}, two {b} and two {c}", "en", [("{a}", 1), ("{b}", 2), ("{c}", 2)]),
    ("one {a}, one {b}, one {c} and one {d}", "en", [("{a}", 1), ("{b}", 1), ("{c}", 1), ("{d}", 1)]),
    ("I want {a}", "en", [("{a}", 1)]),
    ("I want two {a}", "en", [("{a}", 2)]),
    ("I want three {a}", "en", [("{a}", 3)]),
    ("can I get {a}", "en", [("{a}", 1)]),
    ("can I get two {a}", "en", [("{a}", 2)]),
    ("can I get one {a} and one {b}", "en", [("{a}", 1), ("{b}", 1)]),
    ("please give me {a}", "en", [("{a}", 1)]),
    ("please give me two {a}", "en", [("{a}", 2)]),
    ("add one {a} and one {b}", "en", [("{a}", 1), ("{b}", 1)]),
    ("add two {a} and one {b}", "en", [("{a}", 2), ("{b}", 1)]),
    ("ek {a}", "hi", [("{a}", 1)]),
    ("do {a}", "hi", [("{a}", 2)]),
    ("teen {a}", "hi", [("{a}", 3)]),
    ("chaar {a}", "hi", [("{a}", 4)]),
    ("paanch {a}", "hi", [("{a}", 5)]),
    ("ek {a} aur ek {b}", "hi", [("{a}", 1), ("{b}", 1)]),
    ("ek {a} aur do {b}", "hi", [("{a}", 1), ("{b}", 2)]),
    ("do {a} aur ek {b}", "hi", [("{a}", 2), ("{b}", 1)]),
    ("do {a} aur do {b}", "hi", [("{a}", 2), ("{b}", 2)]),
    ("teen {a} aur ek {b}", "hi", [("{a}", 3), ("{b}", 1)]),
    ("ek {a}, ek {b} aur ek {c}", "hi", [("{a}", 1), ("{b}", 1), ("{c}", 1)]),
    ("do {a}, ek {b} aur ek {c}", "hi", [("{a}", 2), ("{b}", 1), ("{c}", 1)]),
    ("do {a}, do {b} aur ek {c}", "hi", [("{a}", 2), ("{b}", 2), ("{c}", 1)]),
    ("ek {a}, do {b} aur do {c}", "hi", [("{a}", 1), ("{b}", 2), ("{c}", 2)]),
    ("ek {a}, ek {b}, ek {c} aur ek {d}", "hi", [("{a}", 1), ("{b}", 1), ("{c}", 1), ("{d}", 1)]),
    ("mujhe ek {a} chahiye", "hi", [("{a}", 1)]),
    ("mujhe do {a} chahiye", "hi", [("{a}", 2)]),
    ("mujhe teen {a} chahiye", "hi", [("{a}", 3)]),
    ("mujhe ek {a} aur ek {b} chahiye", "hi", [("{a}", 1), ("{b}", 1)]),
    ("mujhe do {a} aur ek {b} chahiye", "hi", [("{a}", 2), ("{b}", 1)]),
    ("ek {a} dena", "hinglish", [("{a}", 1)]),
    ("do {a} dena", "hinglish", [("{a}", 2)]),
    ("teen {a} dena", "hinglish", [("{a}", 3)]),
    ("ek {a} aur ek {b} dena", "hinglish", [("{a}", 1), ("{b}", 1)]),
    ("do {a} aur ek {b} dena", "hinglish", [("{a}", 2), ("{b}", 1)]),
    ("bhai ek {a} de do", "hinglish", [("{a}", 1)]),
    ("bhai do {a} de do", "hinglish", [("{a}", 2)]),
    ("bhai ek {a} aur ek {b} de do", "hinglish", [("{a}", 1), ("{b}", 1)]),
    ("bhai do {a} aur ek {b} de do", "hinglish", [("{a}", 2), ("{b}", 1)]),
    ("bhai teen {a} aur ek {b} de do", "hinglish", [("{a}", 3), ("{b}", 1)]),
    ("mujhe ek {a} aur do {b} chahiye", "hinglish", [("{a}", 1), ("{b}", 2)]),
    ("mujhe do {a} aur do {b} chahiye", "hinglish", [("{a}", 2), ("{b}", 2)]),
    ("mujhe ek {a}, ek {b} aur ek {c} chahiye", "hinglish", [("{a}", 1), ("{b}", 1), ("{c}", 1)]),
    ("mujhe do {a}, ek {b} aur ek {c} chahiye", "hinglish", [("{a}", 2), ("{b}", 1), ("{c}", 1)]),
    ("mujhe ek {a}, ek {b}, ek {c} aur ek {d} chahiye", "hinglish", [("{a}", 1), ("{b}", 1), ("{c}", 1), ("{d}", 1)]),
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
