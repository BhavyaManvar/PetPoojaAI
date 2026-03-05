"""QA Validation Script — Voice Ordering Parser
Run: python tests/qa_validation.py
"""
import sys
import json
import pandas as pd

sys.path.insert(0, "backend")

from app.utils.text_utils import word_to_number
from app.utils.fuzzy_match import best_match, best_match_with_score, top_matches
from app.services.voice_parser import _extract_qty_and_item, parse_voice_text, detect_language
from app.services.order_service import resolve_items, create_order, build_pos_payload

MENU = [
    "Paneer Tikka Pizza", "Margherita Pizza", "Coke", "Garlic Bread",
    "Masala Dosa", "Veg Burger", "French Fries", "Butter Naan",
    "Lassi", "Paneer Butter Masala", "Dal Makhani", "Chicken Burger",
]

MENU_DF = pd.DataFrame({
    "item_id": [1, 2, 12, 3, 7, 5, 11, 9, 13, 15, 16, 17],
    "item_name": MENU,
    "category": [
        "Pizza", "Pizza", "Beverages", "Sides", "South Indian",
        "Burger", "Sides", "Breads", "Beverages", "Main Course",
        "Main Course", "Burger",
    ],
    "price": [350, 280, 60, 120, 150, 180, 130, 60, 80, 280, 220, 200],
    "cost":  [150, 110,  20,  36,  80, 100,  45, 20, 30, 120,  90,  85],
})

PASS = "✅ PASS"
FAIL = "❌ FAIL"

results = {}

# ─────────────────────────────────────────────────────────────
# TASK 1 — QUANTITY DETECTION
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("TASK 1 — QUANTITY DETECTION")
print("="*60)

t1_cases = [
    ("one pizza",   1, "pizza"),
    ("two coke",    2, "coke"),
    ("three garlic bread", 3, "garlic bread"),
    ("ek burger",   1, "burger"),
    ("do pizza",    2, "pizza"),
    ("teen naan",   3, "naan"),
    ("4 lassi",     4, "lassi"),
    ("paanch coke", 5, "coke"),
    ("burger",      1, "burger"),   # default qty=1
]

t1_fails = []
for seg, exp_qty, exp_text in t1_cases:
    qty, text = _extract_qty_and_item(seg)
    ok = qty == exp_qty and text == exp_text
    status = "PASS" if ok else "FAIL"
    if not ok:
        t1_fails.append(f"  Input={seg!r}: got qty={qty} text={text!r}, expected qty={exp_qty} text={exp_text!r}")
    print(f"  [{status}] {seg!r:25s}  qty={qty}  item_text={text!r}")

results["Task 1"] = PASS if not t1_fails else FAIL
if t1_fails:
    print("\n  Issues:")
    for f in t1_fails:
        print(f)

# ─────────────────────────────────────────────────────────────
# TASK 2 — ITEM MATCHING
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("TASK 2 — ITEM MATCHING (RapidFuzz WRatio)")
print("="*60)

t2_cases = [
    ("paneer pizza",    "Paneer Tikka Pizza"),
    ("burger",          "Veg Burger"),
    ("coke",            "Coke"),
    ("garlic bread",    "Garlic Bread"),
    ("masala dosa",     "Masala Dosa"),
    ("naan",            "Butter Naan"),
    ("french fry",      "French Fries"),
    ("chicken burger",  "Chicken Burger"),
    ("lassi",           "Lassi"),
    ("xyznonexistent",  None),           # should NOT match
]

t2_fails = []
for query, expected in t2_cases:
    matched, score = best_match_with_score(query, MENU)
    ok = matched == expected
    status = "PASS" if ok else "FAIL"
    if not ok:
        t2_fails.append(f"  {query!r}: got {matched!r} (score={score:.1f}), expected {expected!r}")
    print(f"  [{status}] {query!r:20s}  =>  {str(matched):25s}  score={score:.1f}")

print()
print("  Top-3 matches for 'pizza':")
for r in top_matches("pizza", MENU, limit=3):
    print(f"    {r}")

results["Task 2"] = PASS if not t2_fails else FAIL
if t2_fails:
    print("\n  Issues:")
    for f in t2_fails:
        print(f)

# ─────────────────────────────────────────────────────────────
# TASK 3 — MULTILINGUAL SUPPORT
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("TASK 3 — MULTILINGUAL SUPPORT")
print("="*60)

t3_cases = [
    # (text, expected_language, expected_item_count)
    ("one paneer pizza and two coke",        "en",        2),
    ("ek pizza aur coke",                    "hi",        2),
    ("do burger aur ek coke",                "hi",        2),
    ("ek butter naan aur do lassi",          "hi",        2),
    ("mujhe ek coke chahiye",                "hi",        1),
    ("I want one garlic bread",              "en",        1),
    ("ek paneer pizza aur two coke",         "hinglish",  2),
    ("bhai teen garlic bread de do",         "hi",        1),
]

t3_fails = []
for text, exp_lang, exp_count in t3_cases:
    lang = detect_language(text)
    items = parse_voice_text(text, menu_items=MENU)
    lang_ok  = lang == exp_lang
    count_ok = len(items) == exp_count
    ok = lang_ok and count_ok
    status = "PASS" if ok else "FAIL"
    if not ok:
        issues = []
        if not lang_ok:
            issues.append(f"lang got={lang!r} exp={exp_lang!r}")
        if not count_ok:
            issues.append(f"count got={len(items)} exp={exp_count}")
            issues.append(f"items={items}")
        t3_fails.append(f"  {text!r}: {', '.join(issues)}")
    print(f"  [{status}] lang={lang!r:10s} items={len(items)}  {text!r}")

results["Task 3"] = PASS if not t3_fails else FAIL
if t3_fails:
    print("\n  Issues:")
    for f in t3_fails:
        print(f)

# ─────────────────────────────────────────────────────────────
# TASK 4 — STRUCTURED ORDER OUTPUT
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("TASK 4 — STRUCTURED ORDER OUTPUT")
print("="*60)

t4_cases = [
    ("one paneer pizza and two coke",
     [{"item": "Paneer Tikka Pizza", "qty": 1}, {"item": "Coke", "qty": 2}]),
    ("3 garlic bread, 1 masala dosa",
     [{"item": "Garlic Bread", "qty": 3}, {"item": "Masala Dosa", "qty": 1}]),
    ("ek butter naan aur do lassi",
     [{"item": "Butter Naan", "qty": 1}, {"item": "Lassi", "qty": 2}]),
]

t4_fails = []
for text, expected_items in t4_cases:
    result = parse_voice_text(text, menu_items=MENU)
    schema_ok = all("item" in r and "qty" in r for r in result)
    count_ok  = len(result) == len(expected_items)

    item_ok = True
    if count_ok:
        for got, exp in zip(result, expected_items):
            if got["item"] != exp["item"] or got["qty"] != exp["qty"]:
                item_ok = False

    ok = schema_ok and count_ok and item_ok
    status = "PASS" if ok else "FAIL"
    if not ok:
        t4_fails.append(f"  {text!r}: got={result}, expected={expected_items}")
    print(f"  [{status}] {text!r}")
    print(f"           Output: {json.dumps(result, indent=None)}")

print()
print("  -- With confidence flag --")
r = parse_voice_text("two garlic bread and one coke", menu_items=MENU, include_confidence=True)
print(f"  {json.dumps(r, indent=2)}")
has_confidence = all("confidence" in x and "original_text" in x for x in r)
print(f"  confidence + original_text fields present: {'YES' if has_confidence else 'NO'}")

results["Task 4"] = PASS if not t4_fails else FAIL
if t4_fails:
    print("\n  Issues:")
    for f in t4_fails:
        print(f)

# ─────────────────────────────────────────────────────────────
# TASK 5 — POS ORDER GENERATOR
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("TASK 5 — POS ORDER GENERATOR")
print("="*60)

t5_cases = [
    ("one paneer pizza and two coke",
     {"Paneer Tikka Pizza": (1, 1), "Coke": (12, 2)}),   # item_id -> (id, qty)
    ("three garlic bread",
     {"Garlic Bread": (3, 3)}),
    ("do butter naan aur ek lassi",
     {"Butter Naan": (9, 2), "Lassi": (13, 1)}),
]

t5_fails = []
for text, expected_map in t5_cases:
    parsed   = parse_voice_text(text, menu_items=MENU)
    resolved = resolve_items(parsed, MENU_DF)
    payload  = build_pos_payload(resolved, MENU_DF)

    # Validate structure
    struct_ok = ("order_id" in payload and "status" in payload
                 and "total_price" in payload and "items" in payload)
    # Validate item IDs and quantities
    id_ok = True
    for item_row in payload["items"]:
        name = item_row["item_name"]
        if name in expected_map:
            exp_id, exp_qty = expected_map[name]
            if item_row["item_id"] != exp_id or item_row["qty"] != exp_qty:
                id_ok = False
                t5_fails.append(
                    f"  {name}: got id={item_row['item_id']} qty={item_row['qty']}, "
                    f"expected id={exp_id} qty={exp_qty}"
                )

    ok = struct_ok and id_ok
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {text!r}")
    print(f"           POS Payload: {json.dumps(payload)}")

results["Task 5"] = PASS if not t5_fails else FAIL
if t5_fails:
    print("\n  Issues:")
    for f in t5_fails:
        print(f)

# ─────────────────────────────────────────────────────────────
# FINAL REPORT
# ─────────────────────────────────────────────────────────────
print()
print("="*60)
print("FINAL QA REPORT")
print("="*60)
for task, status in results.items():
    print(f"  {task}: {status}")
overall = all(s == PASS for s in results.values())
print()
print("Overall:", "ALL PASS ✅" if overall else "SOME FAILURES ❌")
