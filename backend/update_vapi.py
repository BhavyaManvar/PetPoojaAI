"""Update Vapi assistant with improved tools, prompt, and transcription settings."""
import httpx
import json

HEADERS = {
    "Authorization": "Bearer 30ca0d3b-804c-484e-9a67-1dda40c3acf7",
    "Content-Type": "application/json",
}

SYSTEM_PROMPT = """You are PetPooja AI, the smart voice ordering assistant for PetPooja restaurant.
Powered by Sarvam AI for multilingual understanding and n8n for workflow automation.

LANGUAGE RULE (CRITICAL — READ CAREFULLY):
- You ALWAYS respond in ENGLISH. Every single response must be in English only.
- You can UNDERSTAND Hindi, Gujarati, Hinglish, and other Indian languages.
- But you must NEVER speak or respond in Hindi, Gujarati, Spanish, or any non-English language.
- This is because your voice (ElevenLabs) can only speak English clearly.
- If customer speaks Hindi, you understand them but reply in English.
- Example: Customer says "ek pizza chahiye" → You say "Sure! Let me find pizza for you."
- NEVER output Hindi words, Devanagari script, or any non-English text in your response.

PERSONALITY:
- Warm, friendly, professional — like a real restaurant staff
- SHORT: 1-2 sentences max per response. No rambling.
- Enthusiastic about food.

ORDER FLOW:
1. Greet and ask what they'd like to order.
2. When customer names a food item, call search_menu, then add_to_order.
3. After adding, read what was added and the running total. If the tool response has a combo suggestion, say it naturally. Ask "Would you like anything else?"
4. When customer says done/that's all/bas/nothing else → call get_order_summary.
5. Read the summary clearly, ask "Shall I confirm this order?"
6. On yes → call confirm_order. After getting the confirmation response, end the call using endCall.
7. If customer asks what's available → call get_menu_categories.
8. If they want suggestions → call get_popular_items.
9. If they ask about deals/offers → call get_specials.
10. To remove an item → call remove_from_order.

CRITICAL RULES:
- ALL prices are in Indian Rupees. Say "rupees" — example: "350 rupees". NEVER say dollars or $.
- You MUST use the tools. NEVER make up prices or menu items.
- Do NOT say filler words like "Action", "Processing", "One moment", "Let me check" — just silently call the tool and speak the result directly.
- If you cannot understand what the customer said, say "Sorry, could you please repeat that?"
- NEVER say "it looks like your message got cut off" or "I didn't receive anything".
- After order confirmation, ALWAYS call endCall to hang up gracefully.
- If you hear any food-related word (even partial), try search_menu with your best guess.

UNDERSTANDING HINDI/GUJARATI INPUT:
- ek=1, do=2, teen=3, chaar=4, paanch=5
- bas/ho gaya = that's all/done
- haan/ha = yes, nahi/na = no
- chahiye/joiye = I want, aur = more, kitna = how much
- The backend uses Sarvam AI to transliterate Hindi/Gujarati food names to English automatically, so matching is accurate.
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_menu",
            "description": "Search the restaurant menu for items matching a query. Use when the customer asks about any food or drink.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The food item name to search for (e.g., pizza, biryani, coke, naan)",
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
            "description": "Add a food item to the customer's current order. Call this after finding the item via search_menu.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {
                        "type": "string",
                        "description": "The exact menu item name to add",
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "How many to add. Default 1.",
                    },
                },
                "required": ["item_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remove_from_order",
            "description": "Remove an item from the customer's current order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {
                        "type": "string",
                        "description": "The item name to remove from the order",
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
            "description": "Get the current order summary with all items and total. Call this before confirming the order.",
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
            "description": "Confirm and place the final order. Only call after the customer explicitly says yes to confirming.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_menu_categories",
            "description": "Get the list of food categories available on the menu. Use when customer asks what is available.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_popular_items",
            "description": "Get a list of popular/recommended items from the menu. Use when customer asks for suggestions or what is popular.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_specials",
            "description": "Get today's special offers and deals. Use when customer asks about offers, deals, specials, or discounts.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
]

payload = {
    "transcriber": {
        "provider": "deepgram",
        "model": "nova-3",
        "language": "en",
        "smartFormat": True,
        "keywords": [
            # ── Food item keywords (high boost :5) ──
            "paneer:5", "tikka:5", "pizza:5", "margherita:5", "cheese:5",
            "burst:5", "farmhouse:5", "veggie:5", "delight:5", "corn:5",
            "mexican:5", "butter:5", "masala:5", "dal:5", "makhani:5",
            "palak:5", "kadai:5", "shahi:5", "malai:5", "kofta:5",
            "chole:5", "aloo:5", "gobi:5", "mushroom:5", "methi:5",
            "baingan:5", "bharta:5", "navratan:5", "korma:5", "rajma:5",
            "bhindi:5", "jeera:5", "kaju:5", "tawa:5", "kolhapuri:5",
            "handi:5", "bhurji:5", "lababdar:5",
            "biryani:5", "hyderabadi:5", "pulao:5", "fried:5", "rice:5",
            "schezwan:5", "burnt:5", "garlic:5", "peas:5",
            "naan:5", "roti:5", "tandoori:5", "missi:5", "kulcha:5",
            "stuffed:5", "plain:5",
            "dosa:5", "masala:5", "rava:5", "mysore:5", "idli:5",
            "sambar:5", "medu:5", "vada:5", "uttapam:5", "onion:5",
            "samosa:5", "pav:5", "bhaji:5", "pani:5", "puri:5",
            "bhel:5", "sev:5", "chaat:5", "dabeli:5", "ragda:5",
            "pattice:5", "kachori:5",
            "burger:5", "spicy:5", "veg:5", "spinach:5", "double:5",
            "patty:5", "sandwich:5", "grilled:5", "club:5",
            "wrap:5", "falafel:5", "paneer:5",
            "penne:5", "alfredo:5", "pasta:5", "arrabbiata:5", "pesto:5",
            "spaghetti:5", "ravioli:5", "lasagna:5", "white:5", "red:5",
            "fries:5", "cheesy:5", "peri:5", "wedges:5", "nachos:5",
            "loaded:5", "bread:5", "salad:5", "raita:5", "green:5",
            "gulab:5", "jamun:5", "rasgulla:5", "kulfi:5", "falooda:5",
            "rabri:5", "carrot:5", "halwa:5", "moong:5", "dry:5",
            "fruit:5", "cheesecake:5", "tiramisu:5", "choco:5", "lava:5",
            "cake:5", "brownie:5", "mousse:5", "pastry:5", "chocolate:5",
            "platter:5", "ice:5", "cream:5", "vanilla:5", "strawberry:5",
            "chai:5", "lassi:5", "coke:5", "coffee:5", "cold:5",
            "mango:5", "shake:5", "banana:5", "oreo:5", "buttermilk:5",
            "latte:5", "cappuccino:5", "mocha:5", "iced:5", "black:5",
            "tea:5", "badam:5", "milk:5", "rose:5", "saffron:5",
            "orange:5", "juice:5", "watermelon:5", "lemonade:5", "lemon:5",
            "soda:5", "virgin:5", "mojito:5", "lagoon:5", "peach:5",
            "coconut:5", "water:5", "sparkling:5", "mineral:5", "energy:5",
            "drink:5", "thali:5", "combo:5", "meal:5", "family:5",
            "couple:5", "breakfast:5", "lunch:5", "dinner:5", "snack:5",
            "dessert:5", "mini:5", "sweet:5",
            # ── Hindi number words & phrases ──
            "ek:3", "do:3", "teen:3", "chaar:3", "paanch:3",
            "bas:3", "haan:3", "nahi:3", "aur:3", "chahiye:3",
            "mujhe:3", "rupees:3", "order:3", "cancel:3", "remove:3",
            "joiye:3", "aapo:3", "bhai:3", "kitna:3",
        ],
        "endpointing": 300,
    },
    "voice": {
        "provider": "11labs",
        "voiceId": "sarah",
        "stability": 0.5,
        "similarityBoost": 0.75,
    },
    "silenceTimeoutSeconds": 45,
    "responseDelaySeconds": 0.8,
    "endCallFunctionEnabled": True,
    "model": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}],
        "tools": TOOLS,
        "temperature": 0.2,
    },
    "firstMessage": "Hello! Welcome to PetPooja restaurant. I am your AI ordering assistant. What would you like to order today?",
}

res = httpx.patch(
    "https://api.vapi.ai/assistant/739f0689-d795-4332-9ea4-1759e7410723",
    headers=HEADERS,
    json=payload,
    timeout=30,
)
print("Status:", res.status_code)
data = res.json()
if res.status_code == 200:
    print("Transcriber:", json.dumps(data.get("transcriber", {}), indent=2))
    print("Voice:", json.dumps(data.get("voice", {}), indent=2))
    print("First message:", data.get("firstMessage", ""))
    print("Tools count:", len(data.get("model", {}).get("tools", [])))
    print("\nAssistant updated successfully!")
else:
    print(json.dumps(data, indent=2))
