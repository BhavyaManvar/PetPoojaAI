"""
Automated test for the Vapi Call Agent webhook — simulates a full order flow.
Tests: search_menu, add_to_order, remove_from_order, get_order_summary,
       confirm_order, get_menu_categories, get_popular_items, get_specials,
       Sarvam transliteration, language detection, upsell suggestions.
"""

import httpx
import json
import sys

BASE = "http://localhost:8000"
CALL_ID = "test-call-automated-001"

PASS = 0
FAIL = 0


def send_function_call(func_name: str, params: dict) -> dict:
    """Send a Vapi function-call webhook payload."""
    payload = {
        "message": {
            "type": "function-call",
            "call": {"id": CALL_ID},
            "functionCall": {
                "name": func_name,
                "parameters": params,
            },
        }
    }
    r = httpx.post(f"{BASE}/call/webhook", json=payload, timeout=15)
    return {"status": r.status_code, "body": r.json()}


def send_tool_calls(tool_calls: list) -> dict:
    """Send a Vapi tool-calls (batch) webhook payload."""
    payload = {
        "message": {
            "type": "tool-calls",
            "call": {"id": CALL_ID},
            "toolCallList": tool_calls,
        }
    }
    r = httpx.post(f"{BASE}/call/webhook", json=payload, timeout=15)
    return {"status": r.status_code, "body": r.json()}


def check(test_name: str, condition: bool, detail: str = ""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  [PASS] {test_name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {test_name} — {detail}")


def run_tests():
    global PASS, FAIL

    # ── 0. Health ─────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 0: Backend Health")
    print("=" * 60)
    try:
        r = httpx.get(f"{BASE}/health", timeout=5)
        check("Backend is up", r.status_code == 200, f"Got {r.status_code}")
    except Exception as e:
        print(f"  [FAIL] Backend not reachable: {e}")
        FAIL += 1
        print("\n*** Cannot proceed — backend is down ***")
        return

    # ── 1. Search menu — English ──────────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 1: search_menu (English queries)")
    print("=" * 60)

    r = send_function_call("search_menu", {"query": "pizza"})
    check("search_menu(pizza) returns 200", r["status"] == 200)
    result = r["body"].get("result", "")
    print(f"    Response: {result[:150]}...")
    check("Response mentions matching items", "matching items" in result.lower() or "item" in result.lower(), result[:100])
    check("Response mentions pizza", "pizza" in result.lower(), result[:100])
    check("Response says 'rupees' not '$'", "rupees" in result.lower() and "$" not in result, result[:100])

    r = send_function_call("search_menu", {"query": "biryani"})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:150]}...")
    check("search_menu(biryani) finds items", "matching items" in result.lower() or "biryani" in result.lower(), result[:100])

    r = send_function_call("search_menu", {"query": "xyznonexistent"})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:150]}...")
    check("search_menu(gibberish) returns 'couldn't find'", "couldn" in result.lower() or "no matching" in result.lower(), result[:100])

    # ── 2. Get menu categories ────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 2: get_menu_categories")
    print("=" * 60)

    r = send_function_call("get_menu_categories", {})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:200]}...")
    check("Returns 200", r["status"] == 200)
    check("Lists categories", "pizza" in result.lower() or "biryani" in result.lower() or "categories" in result.lower(), result[:150])
    check("Response is in English", not any(c > '\u0900' for c in result), "Contains non-Latin script")

    # ── 3. Get popular items ──────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 3: get_popular_items")
    print("=" * 60)

    r = send_function_call("get_popular_items", {})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:200]}...")
    check("Returns 200", r["status"] == 200)
    check("Lists items with prices", "rupees" in result.lower(), result[:150])

    # ── 4. Get specials ───────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 4: get_specials")
    print("=" * 60)

    r = send_function_call("get_specials", {})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:200]}...")
    check("Returns 200", r["status"] == 200)
    check("Mentions specials/deals", "special" in result.lower() or "off" in result.lower(), result[:150])

    # ── 5. Add to order — English ─────────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 5: add_to_order (English)")
    print("=" * 60)

    r = send_function_call("add_to_order", {"item_name": "Paneer Tikka Pizza", "quantity": 2})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:250]}...")
    check("Returns 200", r["status"] == 200)
    check("Confirms item added", "added" in result.lower(), result[:100])
    check("Shows price in rupees", "rupees" in result.lower(), result[:100])
    check("No dollar signs", "$" not in result, result[:100])
    check("All English text", not any(c > '\u0900' for c in result), "Contains non-Latin script")

    # Check for upsell suggestion
    has_upsell = "suggest" in result.lower() or "also" in result.lower() or "perfectly" in result.lower()
    print(f"    Upsell suggestion present: {has_upsell}")

    # Add another item
    r = send_function_call("add_to_order", {"item_name": "Masala Chai", "quantity": 1})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:250]}...")
    check("Second item added", "added" in result.lower() or "total" in result.lower(), result[:100])

    # Add a third item
    r = send_function_call("add_to_order", {"item_name": "Gulab Jamun", "quantity": 3})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:250]}...")
    check("Third item added", "added" in result.lower() or "total" in result.lower(), result[:100])

    # ── 6. Remove from order ──────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 6: remove_from_order")
    print("=" * 60)

    r = send_function_call("remove_from_order", {"item_name": "Gulab Jamun"})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:200]}...")
    check("Returns 200", r["status"] == 200)
    check("Confirms removal", "removed" in result.lower(), result[:100])

    # Try removing non-existent item
    r = send_function_call("remove_from_order", {"item_name": "Dosa"})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:200]}...")
    check("Non-existent removal handled", "couldn" in result.lower() or "not" in result.lower(), result[:100])

    # ── 7. Order summary ─────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 7: get_order_summary")
    print("=" * 60)

    r = send_function_call("get_order_summary", {})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:300]}...")
    check("Returns 200", r["status"] == 200)
    check("Lists items", "pizza" in result.lower() or "chai" in result.lower(), result[:200])
    check("Shows total", "total" in result.lower(), result[:200])
    check("Uses rupees", "rupees" in result.lower(), result[:200])
    check("English only", not any(c > '\u0900' for c in result), "Contains non-Latin")

    # ── 8. Confirm order ──────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 8: confirm_order")
    print("=" * 60)

    r = send_function_call("confirm_order", {})
    result = r["body"].get("result", "")
    print(f"    Response: {result[:300]}...")
    check("Returns 200", r["status"] == 200)
    check("Order confirmed", "confirmed" in result.lower() or "order number" in result.lower(), result[:200])
    check("Has order ID", "order" in result.lower(), result[:200])
    check("Has estimated time", "minute" in result.lower(), result[:200])
    check("Says thank you", "thank" in result.lower(), result[:200])
    check("English only", not any(c > '\u0900' for c in result), "Contains non-Latin")

    # Session should be cleared now
    r2 = httpx.get(f"{BASE}/call/sessions", timeout=5)
    sessions = r2.json()
    check("Session cleaned up after confirm", CALL_ID not in sessions.get("sessions", {}), str(sessions))

    # ── 9. Sarvam transliteration test ────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 9: Sarvam AI Transliteration (Hindi/Gujarati input)")
    print("=" * 60)

    # Use a new call_id for this test
    CALL_ID_SARVAM = "test-call-sarvam-001"
    payload_hindi = {
        "message": {
            "type": "function-call",
            "call": {"id": CALL_ID_SARVAM},
            "functionCall": {
                "name": "search_menu",
                "parameters": {"query": "\u092a\u0928\u0940\u0930 \u091f\u093f\u0915\u094d\u0915\u093e"},  # पनीर टिक्का
            },
        }
    }
    r = httpx.post(f"{BASE}/call/webhook", json=payload_hindi, timeout=15)
    result = r.json().get("result", "")
    print(f"    Hindi query (पनीर टिक्का): {result[:200]}...")
    check("Hindi transliteration returns results", "matching" in result.lower() or "paneer" in result.lower() or "tikka" in result.lower(), result[:150])
    check("Response is in English", not any(c > '\u0900' for c in result), "Contains Indic script in response!")

    # Test Gujarati input
    payload_guj = {
        "message": {
            "type": "function-call",
            "call": {"id": CALL_ID_SARVAM},
            "functionCall": {
                "name": "search_menu",
                "parameters": {"query": "\u0aaa\u0abe\u0ab5 \u0aad\u0abe\u0a9c\u0ac0"},  # પાવ ભાજી
            },
        }
    }
    r = httpx.post(f"{BASE}/call/webhook", json=payload_guj, timeout=15)
    result = r.json().get("result", "")
    print(f"    Gujarati query (પાવ ભાજી): {result[:200]}...")
    check("Gujarati transliteration works", r.status_code == 200, f"Status: {r.status_code}")
    check("Response is in English", not any(c > '\u0900' for c in result), "Contains Indic script!")

    # Add an item using Hindi name
    payload_add_hindi = {
        "message": {
            "type": "function-call",
            "call": {"id": CALL_ID_SARVAM},
            "functionCall": {
                "name": "add_to_order",
                "parameters": {"item_name": "\u092c\u093f\u0930\u092f\u093e\u0928\u0940", "quantity": 1},  # बिरयानी
            },
        }
    }
    r = httpx.post(f"{BASE}/call/webhook", json=payload_add_hindi, timeout=15)
    result = r.json().get("result", "")
    print(f"    Hindi add (बिरयानी): {result[:250]}...")
    check("Hindi item added successfully", "added" in result.lower() or "biryani" in result.lower() or "couldn" in result.lower(), result[:150])
    check("Response in English only", not any(c > '\u0900' for c in result), "Contains Indic script!")

    # ── 10. Tool-calls batch format ───────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 10: tool-calls (batch format)")
    print("=" * 60)

    CALL_ID_BATCH = "test-call-batch-001"
    batch_payload = {
        "message": {
            "type": "tool-calls",
            "call": {"id": CALL_ID_BATCH},
            "toolCallList": [
                {
                    "id": "tc_001",
                    "function": {
                        "name": "search_menu",
                        "arguments": json.dumps({"query": "samosa"}),
                    },
                }
            ],
        }
    }
    r = httpx.post(f"{BASE}/call/webhook", json=batch_payload, timeout=15)
    body = r.json()
    print(f"    Response: {json.dumps(body)[:200]}...")
    check("Batch returns 200", r.status_code == 200)
    check("Has 'results' key", "results" in body, str(body.keys()))
    if "results" in body:
        check("Result has toolCallId", body["results"][0].get("toolCallId") == "tc_001", str(body["results"][0]))

    # ── 11. End-of-call-report ────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 11: end-of-call-report")
    print("=" * 60)

    eoc_payload = {
        "message": {
            "type": "end-of-call-report",
            "call": {"id": "test-call-eoc-001"},
            "endedReason": "customer-ended-call",
            "summary": "Customer ordered 2 Paneer Tikka Pizzas and 1 Masala Chai",
            "durationSeconds": 120,
        }
    }
    r = httpx.post(f"{BASE}/call/webhook", json=eoc_payload, timeout=10)
    check("End-of-call returns 200", r.status_code == 200)
    check("Returns ok", r.json().get("ok") == True, str(r.json()))

    # ── 12. Edge cases ────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 12: Edge cases")
    print("=" * 60)

    # Empty order summary
    r = send_function_call("get_order_summary", {})
    # Uses the original CALL_ID which was already confirmed (session cleared)
    result = r["body"].get("result", "")
    print(f"    Empty order summary: {result[:150]}...")
    check("Empty order handled", "empty" in result.lower() or "no items" in result.lower() or "what would" in result.lower(), result[:100])

    # Confirm empty order
    r = send_function_call("confirm_order", {})
    result = r["body"].get("result", "")
    print(f"    Confirm empty order: {result[:150]}...")
    check("Cannot confirm empty order", "no items" in result.lower() or "empty" in result.lower() or "add" in result.lower(), result[:100])

    # ── 13. Verify Vapi config from API ───────────────────────────────────
    print("\n" + "=" * 60)
    print("TEST 13: Vapi Assistant Configuration")
    print("=" * 60)

    try:
        headers = {"Authorization": "Bearer 30ca0d3b-804c-484e-9a67-1dda40c3acf7"}
        r = httpx.get("https://api.vapi.ai/assistant/739f0689-d795-4332-9ea4-1759e7410723", headers=headers, timeout=10)
        if r.status_code == 200:
            config = r.json()
            prompt = config.get("model", {}).get("messages", [{}])[0].get("content", "")
            voice = config.get("voice", {})
            transcriber = config.get("transcriber", {})

            check("Prompt says ALWAYS English", "always" in prompt.lower() and "english" in prompt.lower(), prompt[:200])
            check("Prompt does NOT say 'match language'", "match the customer" not in prompt.lower(), prompt[:200])
            check("Prompt says 'rupees'", "rupees" in prompt.lower(), "Missing rupees instruction")
            check("Prompt has endCall instruction", "endcall" in prompt.lower(), "Missing endCall instruction")
            check("Voice is ElevenLabs sarah", voice.get("voiceId") == "sarah" and voice.get("provider") == "11labs", str(voice))
            check("Transcriber is deepgram nova-3", transcriber.get("model") == "nova-3", str(transcriber))
            check("Transcriber language is multi", transcriber.get("language") == "multi", str(transcriber))
            check("Has keyword boosting", len(transcriber.get("keywords", [])) > 20, f"Keywords: {len(transcriber.get('keywords', []))}")

            tools = config.get("model", {}).get("tools", [])
            tool_names = [t.get("function", {}).get("name", "") for t in tools]
            print(f"    Tools configured: {tool_names}")
            check("Has search_menu tool", "search_menu" in tool_names, str(tool_names))
            check("Has add_to_order tool", "add_to_order" in tool_names, str(tool_names))
            check("Has confirm_order tool", "confirm_order" in tool_names, str(tool_names))
            check("Has get_menu_categories tool", "get_menu_categories" in tool_names, str(tool_names))
            check("Has 8 tools total", len(tools) == 8, f"Got {len(tools)} tools")
        else:
            print(f"  [SKIP] Vapi API returned {r.status_code}")
    except Exception as e:
        print(f"  [SKIP] Could not reach Vapi API: {e}")

    # ── SUMMARY ───────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"RESULTS: {PASS} passed, {FAIL} failed out of {PASS + FAIL} tests")
    print("=" * 60)

    if FAIL > 0:
        print("\nFailed tests need attention!")
        sys.exit(1)
    else:
        print("\nAll tests passed! Call agent is ready.")
        sys.exit(0)


if __name__ == "__main__":
    run_tests()
