"""Setup Vapi.ai assistant and phone number for RestroAI.

Usage:
    python setup_vapi.py --server-url <NGROK_URL>/call/webhook

Example:
    python setup_vapi.py --server-url https://abcd1234.ngrok-free.app/call/webhook

This will:
  1. Create a Vapi AI assistant configured for restaurant ordering
  2. Claim a free US phone number
  3. Link the assistant to the phone number
  4. Print env vars you need to add to your .env files
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import httpx

VAPI_PRIVATE_KEY = os.getenv("VAPI_PRIVATE_KEY", "30ca0d3b-804c-484e-9a67-1dda40c3acf7")
VAPI_BASE = "https://api.vapi.ai"

HEADERS = {
    "Authorization": f"Bearer {VAPI_PRIVATE_KEY}",
    "Content-Type": "application/json",
}

SYSTEM_PROMPT = """You are RestroAI, a friendly AI restaurant ordering agent for an Indian restaurant.
Your job is to take food orders over the phone or browser call.

RULES:
1. Be warm, friendly, and conversational. Keep responses SHORT (2-3 sentences max).
2. When a customer mentions a food item, use search_menu to find matching items on our menu.
3. After finding items, use add_to_order to add them to the order.
4. After each addition, tell the customer what was added and the running total.
5. Ask if they'd like anything else.
6. When they say they're done, use get_order_summary to review the full order.
7. Read back the summary and ask for confirmation.
8. When they confirm, use confirm_order to finalize.
9. If you can't find an item, apologize and suggest searching with a different name.
10. You understand Hindi, English, Hinglish, and other Indian languages.
11. Always mention prices in Rupees (₹).
12. Be proactive - suggest popular items if the customer seems unsure.

MODIFIER HANDLING:
- For Pizza, Burgers, Beverages, and Shakes: ASK about size preference (Regular/Medium/Large).
- For spicy items (curries, biryanis, starters, Chinese): ASK about spice level (Mild/Medium/Spicy/Extra Spicy).
- Suggest relevant add-ons (Extra Cheese for pizza +₹40, Extra Patty for burgers +₹60, etc.)
- Pass the size, spice, and addons parameters when calling add_to_order.
- If customer doesn't specify, default to Regular size and Medium spice — don't keep asking.

EXAMPLE CONVERSATION:
Customer: "I want two pizzas and a coke"
You: *search_menu("pizza")* → Found Margherita Pizza, Paneer Tikka Pizza
You: "We have Margherita Pizza for ₹299 and Paneer Tikka Pizza for ₹349. Which one would you like?"
Customer: "Margherita, large, extra spicy with extra cheese"
You: *add_to_order("Margherita Pizza", 2, "Large", "Extra Spicy", "Extra Cheese")* → Added
You: "Added 2 Large Extra Spicy Margherita Pizzas with Extra Cheese! That's ₹399 each. Your total is ₹798. I also recommend Garlic Bread for just ₹120. Want to add it?"
Customer: "Yes sure"
You: *add_to_order("Garlic Bread", 1)*
You: "Added 1 Garlic Bread! Now let me get that Coke."
You: *search_menu("coke")* → Found Coke
You: *add_to_order("Coke", 1, "Large")*
You: "Added 1 Large Coke. Your total is ₹958. Anything else?"
Customer: "No, that's it"
You: *get_order_summary()* → review
You: "Your order: 2x Large Margherita Pizza (Extra Spicy, +Extra Cheese), 1x Garlic Bread, and 1x Large Coke. Total ₹958. Shall I confirm?"
Customer: "Yes"
You: *confirm_order()* → confirmed with KOT
You: "Order confirmed! Kitchen ticket sent. Your food will be ready in about 18 minutes. Thank you!"
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_menu",
            "description": "Search the restaurant menu for items matching a query. Use this when the customer mentions any food or drink item.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The food item name to search for (e.g., 'pizza', 'biryani', 'coke')",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_to_order",
            "description": "Add a food item to the customer's current order with optional modifiers (size, spice level, add-ons)",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {
                        "type": "string",
                        "description": "The exact name of the menu item to add",
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "Number of items to add (default 1)",
                    },
                    "size": {
                        "type": "string",
                        "description": "Size preference: Regular, Medium, Large, Small, Double. Leave empty for default.",
                    },
                    "spice": {
                        "type": "string",
                        "description": "Spice level: Mild, Medium, Spicy, Extra Spicy. Leave empty for default.",
                    },
                    "addons": {
                        "type": "string",
                        "description": "Comma-separated add-ons e.g. 'Extra Cheese, Mushrooms'. Leave empty for none.",
                    },
                },
                "required": ["item_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_order_summary",
            "description": "Get the current order summary with all items and total price. Use before confirming.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "confirm_order",
            "description": "Confirm and place the final order. Use only after customer confirms.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_combo_deals",
            "description": "Get combo item suggestions that pair well with a specific menu item. Use when customer asks what goes well with an item, asks about combos, or wants pairing recommendations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {
                        "type": "string",
                        "description": "The menu item name to get combo suggestions for",
                    },
                },
                "required": ["item_name"],
            },
        },
    },
]


def create_assistant(server_url: str) -> dict:
    """Create the RestroAI ordering assistant via Vapi API."""
    payload = {
        "name": "RestroAI Order Agent",
        "firstMessage": (
            "Welcome to RestroAI! I'm your AI ordering assistant. "
            "What would you like to order today? You can speak in English, Hindi, or any language you prefer."
        ),
        "model": {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}],
            "tools": TOOLS,
        },
        "voice": {
            "provider": "11labs",
            "voiceId": "sarah",
        },
        "transcriber": {
            "provider": "deepgram",
            "model": "nova-2",
            "language": "multi",
        },
        "serverUrl": server_url,
        "endCallMessage": "Thank you for ordering with RestroAI! Your food will be ready soon. Goodbye!",
        "endCallFunctionEnabled": False,
        "silenceTimeoutSeconds": 30,
        "maxDurationSeconds": 300,
    }

    with httpx.Client(timeout=30) as client:
        res = client.post(f"{VAPI_BASE}/assistant", headers=HEADERS, json=payload)

    if res.status_code not in (200, 201):
        print(f"ERROR creating assistant: {res.status_code}")
        print(res.text)
        sys.exit(1)

    return res.json()


def create_phone_number(assistant_id: str) -> dict:
    """Claim a free Vapi US phone number and link to assistant."""
    payload = {
        "provider": "vapi",
        "assistantId": assistant_id,
        "name": "RestroAI Ordering Line",
    }

    with httpx.Client(timeout=30) as client:
        res = client.post(f"{VAPI_BASE}/phone-number", headers=HEADERS, json=payload)

    if res.status_code not in (200, 201):
        print(f"ERROR creating phone number: {res.status_code}")
        print(res.text)
        # Try with area code
        payload["numberDesiredAreaCode"] = "346"
        with httpx.Client(timeout=30) as client:
            res = client.post(f"{VAPI_BASE}/phone-number", headers=HEADERS, json=payload)
        if res.status_code not in (200, 201):
            print(f"ERROR with area code: {res.status_code}")
            print(res.text)
            print("\nYou can create the phone number manually in the Vapi dashboard.")
            return {}

    return res.json()


def main():
    parser = argparse.ArgumentParser(description="Setup Vapi.ai for RestroAI")
    parser.add_argument(
        "--server-url",
        required=True,
        help="Public webhook URL, e.g. https://abcd.ngrok-free.app/call/webhook",
    )
    args = parser.parse_args()

    server_url = args.server_url.rstrip("/")
    if not server_url.endswith("/call/webhook"):
        server_url += "/call/webhook"

    print("=" * 60)
    print("  RestroAI — Vapi.ai Setup")
    print("=" * 60)
    print(f"\nServer URL: {server_url}")

    # Step 1: Create assistant
    print("\n[1/2] Creating Vapi assistant...")
    assistant = create_assistant(server_url)
    assistant_id = assistant.get("id", "")
    print(f"  ✓ Assistant created: {assistant_id}")
    print(f"  Name: {assistant.get('name', '')}")

    # Step 2: Create phone number
    print("\n[2/2] Claiming free US phone number...")
    phone = create_phone_number(assistant_id)
    phone_number = phone.get("number", "")
    phone_id = phone.get("id", "")

    if phone_number:
        print(f"  ✓ Phone number: {phone_number}")
        # Format for display
        if phone_number.startswith("+1") and len(phone_number) == 12:
            display_number = f"+1 ({phone_number[2:5]}) {phone_number[5:8]}-{phone_number[8:]}"
        else:
            display_number = phone_number
        print(f"  Display: {display_number}")
    else:
        print("  ⚠ Phone number not created. Create manually in Vapi dashboard.")
        display_number = "+1 (XXX) XXX-XXXX"

    # Output
    print("\n" + "=" * 60)
    print("  Add these to customer-website/.env:")
    print("=" * 60)
    print(f"VITE_VAPI_ASSISTANT_ID={assistant_id}")
    print(f"VITE_PHONE_NUMBER={phone_number or 'YOUR_VAPI_PHONE_NUMBER'}")
    print()
    print("  Also add your Vapi PUBLIC KEY from dashboard → Settings:")
    print("VITE_VAPI_PUBLIC_KEY=your-public-key-here")
    print()
    print("=" * 60)
    print("  DONE! Now:")
    print("  1. Add the env vars above to customer-website/.env")
    print("  2. Keep ngrok running")
    print("  3. Restart the frontend: npm run dev")
    print(f"  4. Call {display_number} or use browser call at localhost:5173/voice")
    print("=" * 60)


if __name__ == "__main__":
    main()
