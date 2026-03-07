# PetPooja AI — Complete Call Flow Report

> Generated after full source code analysis of every file involved in both calling paths.

---

## TABLE OF CONTENTS

1. [FLOW A — Phone Call (Dial the Number)](#flow-a--phone-call-dial-the-number)
2. [FLOW B — Web Calling (Browser)](#flow-b--web-calling-browser)
3. [FLOW C — Text/Voice Chat (Browser, non-phone)](#flow-c--textvoice-chat-browser-non-phone)
4. [Environment Variables & Prerequisites Checklist](#environment-variables--prerequisites-checklist)
5. [Issues, Risks & Suggestions](#issues-risks--suggestions)

---

## FLOW A — Phone Call (Dial the Number)

**Phone Number:** `+1 (862) 225-2211` (Vapi-provisioned US number)

### What You Need to Provide (Inputs)
- **Your voice** — just speak your food order in English, Hindi, Hinglish, or Gujarati.
- No app download, no login, no other input needed.

### Step-by-Step Process

```
STEP 1: Customer dials +1 (862) 225-2211
    │
    ▼
STEP 2: Vapi.ai receives the inbound call
    │   - Vapi assistant ID: 739f0689-d795-4332-9ea4-1759e7410723
    │   - Vapi uses Deepgram Nova-3 transcriber (language: en, smartFormat: true)
    │   - Vapi uses ElevenLabs voice "sarah" for TTS
    │   - Vapi connects to OpenAI GPT-4o-mini as the LLM brain
    │
    ▼
STEP 3: Vapi speaks first message (greeting)
    │   "Hello! Welcome to PetPooja restaurant. I am your AI ordering 
    │    assistant. What would you like to order today?"
    │   - Voice: ElevenLabs "sarah" (English only)
    │
    ▼
STEP 4: Customer speaks (e.g. "ek pizza aur do coke chahiye")
    │
    ▼
STEP 5: Deepgram Nova-3 STT transcribes speech → text
    │   - Has 200+ food keyword boosts (pizza:5, paneer:5, naan:5, etc.)
    │   - Also boosts Hindi number words (ek:3, do:3, teen:3, etc.)
    │   - Endpointing: 300ms (pause detection)
    │
    ▼
STEP 6: GPT-4o-mini processes the transcript
    │   - Uses system prompt with ordering rules
    │   - Decides which tool/function to call
    │   - Temperature: 0.2 (low randomness)
    │
    ▼
STEP 7: Vapi sends webhook to YOUR backend server
    │   POST → {YOUR_NGROK_URL}/call/webhook
    │   File: backend/app/api/routes_call.py → vapi_webhook()
    │   
    │   Webhook payload contains:
    │   - message.type: "function-call" or "tool-calls"
    │   - message.call.id: unique call ID
    │   - message.functionCall.name: e.g. "search_menu"
    │   - message.functionCall.parameters: e.g. {"query": "pizza"}
    │
    ▼
STEP 8: Backend routes to _handle_function() 
    │   File: backend/app/api/routes_call.py (line ~310)
    │   
    │   8a. Language Detection (analytics only):
    │       - Scans parameter text for Indic script (Devanagari, Gujarati)
    │       - Uses sarvam_service.detect_language() — Unicode range check
    │       - Logs language per session for n8n analytics
    │       - Does NOT translate the response (ElevenLabs = English only)
    │   
    │   8b. Dispatches to _dispatch_function():
    │
    ▼
STEP 9: Function execution (based on function name)
    │
    ├─── search_menu(query)
    │    │  File: routes_call.py → _search_menu()
    │    │  1. Check if query has Indic script → has_indic_script()
    │    │  2. If yes → Sarvam AI transliterate_to_english()
    │    │     (e.g., "पनीर टिक्का" → "paneer tikka")
    │    │     API: POST https://api.sarvam.ai/translate
    │    │  3. Fuzzy match against menu_df["item_name"] using rapidfuzz WRatio
    │    │     Score cutoff: 40
    │    │  4. Returns top 5 matches with name, price, category
    │    │  5. If transliteration failed, retries with original query
    │    │
    ├─── add_to_order(item_name, quantity)
    │    │  File: routes_call.py → _add_to_order()
    │    │  1. Detect language from item_name text
    │    │  2. Transliterate if Indic script detected
    │    │  3. Fuzzy match item_name → menu item (score cutoff: 40)
    │    │  4. Add to in-memory session: _call_sessions[call_id]
    │    │  5. Update running total
    │    │  6. Run upsell engine: recommend_addon() from upsell_engine.py
    │    │     - Finds compatible category items
    │    │     - Scores by: high profit + low sales + anti-repeat
    │    │  7. Returns message: "Added X at Y rupees. Total is Z rupees."
    │    │     + optional combo suggestion
    │    │
    ├─── remove_from_order(item_name)
    │    │  Fuzzy match against current order items → remove from session
    │    │
    ├─── get_order_summary()
    │    │  Returns formatted list of all items + total
    │    │
    ├─── confirm_order()
    │    │  1. Takes session items → create_order() in order_service.py
    │    │  2. Assigns sequential order_id (starts at 1000)
    │    │  3. Stores order in-memory (_orders list)
    │    │  4. Calculates estimated prep time: 15 + (num_items × 3) minutes
    │    │  5. Clears call session
    │    │  6. Returns confirmation message with order_id
    │    │
    ├─── get_menu_categories()
    │    │  Returns sorted unique categories from menu DataFrame
    │    │
    ├─── get_popular_items()
    │    │  Returns 6 items sampled from different categories
    │    │
    └─── get_specials()
         │  Returns hardcoded daily special message
         │
    ▼
STEP 10: Backend sends n8n notification (async, non-blocking)
    │   POST → https://deep1024.app.n8n.cloud/webhook/voice-order
    │   Payload: call_id, action, items, total, customer_language, timestamp
    │   File: routes_call.py → _notify_n8n()
    │
    ▼
STEP 11: Backend returns JSON response to Vapi
    │   {"result": "<text message from function>"}
    │   or for tool-calls: {"results": [{"toolCallId": "...", "result": "..."}]}
    │
    ▼
STEP 12: GPT-4o-mini crafts a natural spoken response from the tool result
    │   - Follows system prompt rules (short, friendly, English only)
    │   - May ask follow-up questions
    │
    ▼
STEP 13: ElevenLabs TTS speaks the response to the customer
    │   Voice: "sarah" (English only)
    │
    ▼
STEP 14: Loop back to STEP 4 (customer speaks again)
    │   - Until customer says "confirm" / "done" / "bas" / "theek hai"
    │   - GPT-4o-mini calls confirm_order() tool
    │   - Then calls endCall to hang up
    │
    ▼
STEP 15: Call ends
    │   - Vapi sends "end-of-call-report" webhook
    │   - Backend logs: reason, summary, duration
    │   - Notifies n8n with call_ended event
    │   - Clears session from memory
    │
    ▼
STEP 16: Order is stored in-memory on the backend
         - Accessible via GET /order/list
         - order_source: "phone_call"
```

### Data Flow Summary (Phone Call)
```
Customer Voice
  → Deepgram Nova-3 (STT)
    → GPT-4o-mini (LLM reasoning)
      → Vapi webhook → FastAPI backend
        → Sarvam AI (transliteration, if Indic text)
          → rapidfuzz (menu matching)
            → In-memory session management
              → order_service.create_order()
                → n8n webhook notification
      → GPT-4o-mini (response generation)
    → ElevenLabs "sarah" (TTS)
  → Customer hears response
```

---

## FLOW B — Web Calling (Browser Vapi Call)

**URL:** `http://localhost:5173/voice` (customer-website)
**UI Element:** "Call AI Agent" phone button in VoiceOrder.tsx

### What You Need to Provide (Inputs)
- **Microphone access** in browser
- **Your voice** — same as phone call, speak naturally
- No text input needed (voice only through Vapi)

### Step-by-Step Process

```
STEP 1: User opens http://localhost:5173/voice
    │   File: customer-website/src/pages/VoiceOrder.tsx
    │
    ▼
STEP 2: Vapi SDK initializes on page load
    │   const vapi = new Vapi(VAPI_PUBLIC_KEY)
    │   VAPI_PUBLIC_KEY = "7d42ff2f-8e2f-41e9-a15b-439196c151dc"
    │   - Registers event listeners: call-start, call-end, speech-start,
    │     speech-end, error, message
    │   - Guards against React StrictMode double-mount
    │
    ▼
STEP 3: User clicks "Call AI Agent" button
    │   → handleStartCall()
    │   - Stops any active browser mic recording (avoids conflict)
    │   - Sets callConnecting = true, callStatus = "Connecting..."
    │   - Calls: vapiRef.current.start(VAPI_ASSISTANT_ID)
    │     VAPI_ASSISTANT_ID = "739f0689-d795-4332-9ea4-1759e7410723"
    │
    ▼
STEP 4: Vapi WebRTC connection established
    │   - Browser microphone captured by Vapi SDK (WebRTC)
    │   - Event: 'call-start' fires → callActive = true
    │   - Same Vapi assistant as phone call (identical config)
    │
    ▼
STEP 5: Vapi speaks greeting through browser speakers
    │   "Hello! Welcome to PetPooja restaurant..."
    │   - ElevenLabs "sarah" voice plays via WebRTC audio
    │   - UI shows: "Connected — AI agent is speaking..."
    │
    ▼
STEP 6: Customer speaks into browser microphone
    │   - UI shows: "Listening to you..."
    │   - Vapi SDK streams audio to Deepgram
    │
    ▼
STEP 7–15: IDENTICAL TO PHONE CALL FLOW (Steps 5–15 above)
    │   - Deepgram STT → GPT-4o-mini → Webhook → Backend → Response
    │   - All processing is server-side through Vapi
    │   
    │   ADDITIONAL: Live transcript shown in UI
    │   - Vapi 'message' event (type: 'transcript', transcriptType: 'final')
    │   - Appends to callTranscript[] array
    │   - Shows as chat bubbles: "You: ..." / "AI: ..."
    │   - Auto-scrolls to latest message
    │
    ▼
STEP 16: User clicks "End Call" button
    │   → handleEndCall()
    │   - vapiRef.current.stop()
    │   - Event: 'call-end' fires
    │   - callActive = false, callStatus = "Call ended"
    │
    ▼
STEP 17: Same end-of-call-report webhook as phone call
```

### Key Difference from Phone Call
| Aspect | Phone Call | Web Call |
|--------|-----------|---------|
| Entry point | Dial +1 (862) 225-2211 | Click "Call AI Agent" button |
| Audio transport | PSTN telephone | WebRTC (browser) |
| Transcript | Not visible | Live chat bubbles in UI |
| End call | Hang up phone | Click "End Call" button |
| Backend processing | **Identical** | **Identical** |
| Vapi assistant | Same ID | Same ID |

---

## FLOW C — Text/Voice Chat (Browser, non-phone)

This is the **text input + microphone recording** mode on the same `/voice` page, separate from the Vapi phone call.

### What You Need to Provide (Inputs)
- **Text** typed in the input box, OR
- **Voice** via browser microphone (tap mic icon)
- **Login** (Firebase auth) required only for final order placement

### Step-by-Step Process

```
STEP 1: User types text or taps microphone icon
    │
    ├─── TEXT INPUT PATH:
    │    User types "Two Margherita Pizza" → clicks Send or presses Enter
    │    → handleParse()
    │
    ├─── VOICE INPUT PATH:
    │    User taps mic → handleMicToggle()
    │    1. Request browser microphone: getUserMedia({audio: true})
    │    2. Start MediaRecorder (WebM/Ogg format)
    │    3. Web Audio API: AnalyserNode monitors volume level
    │    4. Silence detection: SILENCE_THRESHOLD=8, SILENCE_DURATION=2500ms
    │    5. When silence detected after speech → auto stop recording
    │    6. Convert WebM → WAV PCM 16-bit 16kHz mono (toWavBlob function)
    │    7. Send WAV to Sarvam STT:
    │       POST https://api.sarvam.ai/speech-to-text
    │       model: saaras:v3, language_code: unknown
    │       Headers: api-subscription-key: SARVAM_API_KEY
    │    8. Get transcript text back
    │    9. Falls through to same processOrderText() as text input
    │    10. Auto-restarts recording if still in listening mode
    │
    ▼
STEP 2: processOrderText(rawText, currentCart, sessionId)
    │   File: VoiceOrder.tsx (inline function)
    │   
    │   2a. Translation check:
    │       - isNonLatin(rawText)? → any char > U+007F?
    │       - If yes → sarvamTranslate(rawText)
    │         POST https://api.sarvam.ai/translate
    │         source: auto, target: en-IN, model: mayura:v1
    │       - Result: englishText
    │   
    │   2b. Try n8n first (primary path):
    │       POST https://deep1024.app.n8n.cloud/webhook/voice-order
    │       Body: { transcript, cart (JSON string), session_id }
    │       - If n8n returns items → use those
    │       
    │   2c. Fallback to direct backend:
    │       POST /api/voice/chat  (proxied to localhost:8000/voice/chat)
    │       Body: { text: englishText }
    │       File: backend/app/api/routes_voice.py → voice_chat()
    │
    ▼
STEP 3: Backend /voice/chat processing
    │   File: backend/app/api/routes_voice.py
    │   
    │   3a. detect_intent(text) — regex-based:
    │       - "confirm|done|bas|theek hai" → CONFIRM_ORDER
    │       - "remove|cancel|hata" → REMOVE_ITEM
    │       - Otherwise → ORDER_ITEM
    │   
    │   3b. detect_language(text) — Unicode ranges + Hinglish word check
    │   
    │   3c. parse_voice_text(text) — voice_parser.py:
    │       1. Split by "and", "aur", commas, semicolons
    │       2. Strip leading filler words (please, give, mujhe, etc.)
    │       3. Extract quantity: numeric ("3") or word ("teen", "ek")
    │       4. Expand generic aliases: "pizza" → "margherita pizza"
    │       5. Clean remaining filler words
    │       6. Fuzzy match against menu items (rapidfuzz, threshold 70)
    │       Returns: [{"item": "Margherita Pizza", "qty": 2, "confidence": 85.0}]
    │   
    │   3d. resolve_items(parsed, menu_df) — order_service.py:
    │       - Maps item names → item_id via fuzzy match
    │       Returns: [{"item_id": 1, "item_name": "...", "qty": 2}]
    │   
    │   3e. Build response with prices from menu_df
    │   
    │   3f. Upsell engine: recommend_addons_by_category()
    │       - For first item in order
    │       - Compatible categories, high profit + low sales
    │       - Anti-repeat tracking
    │       - 5% discount on recommended addon
    │
    ▼
STEP 4: Response returned to frontend
    │   {
    │     intent: "ORDER_ITEM",
    │     items: [{item_id, item_name, qty, unit_price, line_total, confidence}],
    │     upsells: [{recommended_addon, addon_price, discounted_price, ...}],
    │     message: "Added 2x Margherita Pizza (₹598) to your order.",
    │     language: "en-IN"
    │   }
    │
    ▼
STEP 5: Frontend updates UI
    │   - Merges items into cart (setCartItems)
    │   - Shows upsell suggestions as cards
    │   - Speaks confirmation via Sarvam TTS:
    │     POST https://api.sarvam.ai/text-to-speech
    │     voice: "priya", model: bulbul:v3
    │   - User can accept/skip upsell suggestions
    │   - User can fetch more suggestions (fetchUpsellForItem → GET /api/combos/upsell/for-item)
    │
    ▼
STEP 6: User clicks "Place Order"
    │   → handlePlaceOrder()
    │   - Requires Firebase authentication (redirect to /login if not logged in)
    │   - POST /api/order/push
    │     Body: { items: [{item_id, qty}], order_source: "voice" }
    │   - Backend: order_service.create_order()
    │   - Returns: { order_id, total_price }
    │
    ▼
STEP 7: Order confirmation screen
         - Shows "Order Placed!" with order_id
         - "New Order" button to start over
```

---

## Environment Variables & Prerequisites Checklist

### Backend (.env required in `backend/` directory)

| Variable | Required For | Current Value / Status |
|----------|-------------|----------------------|
| `DATA_DIR` | Data loading | `../data` (default) |
| `DATA_FILE` | Menu data | `restaurant_ai_hybrid_dataset.xlsx` |
| `SARVAM_API_KEY` | Transliteration in call webhook | Hardcoded fallback in sarvam_service.py |
| `N8N_CALL_WEBHOOK` | n8n notifications | `https://deep1024.app.n8n.cloud/webhook/voice-order` |
| `GEMINI_API_KEY` | AI Strategy chatbot (not call-related) | From env |
| `ALLOWED_ORIGINS` | CORS | `localhost:3000,3001,5173` |
| `DEBUG` | Logging & docs | `false` |

### Customer Website (.env in `customer-website/`)

| Variable | Required For | Current Value |
|----------|-------------|---------------|
| `VITE_VAPI_PUBLIC_KEY` | Web calling (Vapi SDK) | `7d42ff2f-8e2f-41e9-a15b-439196c151dc` |
| `VITE_VAPI_ASSISTANT_ID` | Which assistant to call | `739f0689-d795-4332-9ea4-1759e7410723` |
| `VITE_PHONE_NUMBER` | Display phone number on UI | `+18622252211` |
| `VITE_SARVAM_API_KEY` | Browser STT/TTS/Translation | `sk_vvxwxlra_...` |
| `VITE_N8N_WEBHOOK_URL` | n8n text ordering | `https://deep1024.app.n8n.cloud/webhook/voice-order` |
| `VITE_API_URL` | Backend API proxy | `/api` |
| `VITE_FIREBASE_*` | Authentication | Configured |

### External Services Required

| Service | Used By | Purpose |
|---------|---------|---------|
| **Vapi.ai** | Phone + Web call | Call orchestration, connects STT + LLM + TTS |
| **Deepgram Nova-3** | Via Vapi | Speech-to-Text transcription |
| **OpenAI GPT-4o-mini** | Via Vapi | LLM reasoning & tool calling |
| **ElevenLabs** | Via Vapi | Text-to-Speech (voice "sarah") |
| **Sarvam AI** | Backend + Frontend | Transliteration, Translation, STT (browser), TTS (browser) |
| **n8n** | Backend + Frontend | Workflow webhook for order logging/analytics |
| **Firebase** | Frontend auth | User authentication (required for order placement) |
| **ngrok** | Backend | Expose local backend to Vapi (for webhook) |

### Infrastructure Requirements

| Component | Command | Port |
|-----------|---------|------|
| Backend (FastAPI) | `uvicorn app.main:app --reload --port 8000` | 8000 |
| Customer Website (Vite) | `npm run dev` | 5173 |
| ngrok tunnel | `ngrok http 8000` | Varies |
| Data file | Must exist: `data/restaurant_ai_hybrid_dataset.xlsx` | N/A |

---

## Issues, Risks & Suggestions

### CRITICAL ISSUES

#### 1. Twilio Routes NOT Registered in main.py
- **File:** [backend/app/main.py](backend/app/main.py)
- **Problem:** `routes_twilio.py` exists with full Twilio call handling (`/twilio/incoming`, `/twilio/gather`, `/twilio/status`) but is **never imported or registered** in `main.py`. The router is dead code.
- **Impact:** The Twilio phone call flow (`/twilio/*` endpoints) does NOT work at all. Only the Vapi flow (`/call/webhook`) is active.
- **Suggestion:** If Twilio support is needed, add to main.py:
  ```python
  from app.api.routes_twilio import router as twilio_router
  app.include_router(twilio_router, prefix="/twilio", tags=["Twilio Call Agent"])
  ```
  If not needed, the file can be removed to avoid confusion.

#### 2. ngrok Dependency — Webhook Will Fail Without It
- **Problem:** Vapi needs a **public URL** for the server_url webhook. Local `localhost:8000` is unreachable from Vapi's cloud servers.
- **Impact:** If ngrok is not running, ALL phone/web call function calls (search_menu, add_to_order, etc.) will silently fail. The AI will still talk but cannot execute any menu/order operations.
- **Suggestion:** Ensure ngrok is running (`ngrok http 8000`) and the Vapi assistant's `serverUrl` is updated to the current ngrok URL. Run `python setup_vapi.py --server-url https://YOUR-NGROK.ngrok-free.app/call/webhook` after each ngrok restart.

#### 3. API Key Hardcoded in Source Code
- **Files:** [backend/app/services/sarvam_service.py](backend/app/services/sarvam_service.py), [backend/app/api/routes_twilio.py](backend/app/api/routes_twilio.py), [backend/update_vapi.py](backend/update_vapi.py)
- **Problem:** Sarvam API key (`sk_vvxwxlra_...`) and Vapi private key (`30ca0d3b-...`) are hardcoded as fallback defaults.
- **Impact:** Security risk if repo is public. Keys could be rotated/revoked.
- **Suggestion:** Remove hardcoded keys, use `.env` exclusively. Add `.env` to `.gitignore`.

### MODERATE ISSUES

#### 4. In-Memory Order & Session Storage
- **Files:** [backend/app/api/routes_call.py](backend/app/api/routes_call.py) (`_call_sessions`), [backend/app/services/order_service.py](backend/app/services/order_service.py) (`_orders`)
- **Problem:** All call sessions and confirmed orders are stored in Python dicts/lists. Server restart = all data lost.
- **Impact:** Active calls will lose their cart on server restart. Order history is ephemeral.
- **Suggestion:** Acceptable for demo/development. For production, use Redis for sessions and a database for orders.

#### 5. Vapi Assistant serverUrl May Be Stale
- **Problem:** The Vapi assistant's `serverUrl` was set during `setup_vapi.py` with a specific ngrok URL. Ngrok URLs change on restart.
- **Impact:** If ngrok restarts with a new URL, all call function calls will 404. Calls still connect (greeting plays) but the AI cannot process orders.
- **Suggestion:** After restarting ngrok, update the assistant via `update_vapi.py` or the Vapi dashboard to use the new URL.

#### 6. No Error Response to Vapi on Backend Failure
- **Problem:** If backend crashes during webhook processing, Vapi receives a 500 error. GPT-4o-mini may say something unexpected or retry.
- **Impact:** Degraded user experience during failures.
- **Suggestion:** The global exception handler in `main.py` catches this, but the response format may not match what Vapi expects.

#### 7. ElevenLabs English-Only Voice Limitation
- **Problem:** The assistant ALWAYS responds in English because ElevenLabs "sarah" voice only speaks English clearly.
- **Impact:** Hindi/Gujarati-speaking customers hear responses in English only. Understanding is multilingual but output is monolingual.
- **Suggestion:** This is documented and intentional. If multilingual TTS is needed, switch to a provider that supports Hindi (e.g., Sarvam TTS, Azure Neural Voices).

### MINOR ISSUES / NOTES

#### 8. Silence Timeout is Very Generous (45s)
- **File:** [backend/update_vapi.py](backend/update_vapi.py) — `silenceTimeoutSeconds: 45`
- **Impact:** Calls stay alive for 45 seconds of silence before auto-hangup. Cost implication for Vapi minutes.

#### 9. Max Call Duration = 300 seconds (5 min)
- **File:** [backend/setup_vapi.py](backend/setup_vapi.py) — `maxDurationSeconds: 300`
- **Impact:** Long orders may be cut off at 5 minutes. The `update_vapi.py` does not set this, so it may have been changed.

#### 10. Fuzzy Match Score Cutoff Difference
- **Phone call (routes_call.py):** `score_cutoff=40` (very lenient)
- **Text chat (voice_parser.py via fuzzy_match.py):** `threshold=70` (stricter, from config)
- **Impact:** Phone calls may match more loosely than text chat, potentially matching wrong items.

#### 11. `_call_sessions` Memory Leak Potential
- **Problem:** If calls disconnect unexpectedly (no `end-of-call-report`), sessions remain in memory forever.
- **Impact:** Gradual memory growth over time (minor for demo).
- **Suggestion:** Add a periodic cleanup for sessions older than 30 minutes.

#### 12. n8n Webhook Failures Are Silent
- **Problem:** `_notify_n8n()` catches all exceptions and only logs a warning.
- **Impact:** Order analytics/logging may silently fail without alerting anyone.

#### 13. Sarvam API Key in Frontend .env
- **File:** `customer-website/.env` — `VITE_SARVAM_API_KEY`
- **Problem:** `VITE_` prefixed variables are embedded in the JavaScript bundle and visible to anyone inspecting the page source.
- **Impact:** API key exposure in production.
- **Suggestion:** For production, proxy Sarvam API calls through your backend.

#### 14. `get_specials()` Returns Hardcoded Data
- **File:** [backend/app/api/routes_call.py](backend/app/api/routes_call.py)
- **Impact:** "Today's specials" are always the same regardless of date or actual promotions.

#### 15. `get_popular_items()` Uses Random Sampling
- **File:** [backend/app/api/routes_call.py](backend/app/api/routes_call.py)
- **Impact:** "Popular items" are randomly sampled each call, not based on actual sales data.

---

## Quick Reference: What Happens When You Call

### Phone Call Quick Summary
```
You dial → Vapi answers → You speak → Deepgram transcribes → 
GPT-4o-mini decides action → Vapi webhooks your backend → 
Backend fuzzy-matches menu + Sarvam transliterates Hindi → 
Result sent back → GPT-4o-mini speaks via ElevenLabs → 
You hear response → Repeat until "confirm" → Order saved
```

### Web Call Quick Summary  
```
You click "Call AI Agent" → Vapi WebRTC connects → 
SAME AS PHONE CALL (same assistant, same backend, same everything) →
BONUS: Live transcript shown in browser
```

### Text/Voice Chat Quick Summary
```
You type or record voice → Sarvam STT (if voice) → 
Sarvam translate (if Hindi/Gujarati) → n8n webhook (primary) → 
Backend /voice/chat (fallback) → voice_parser parses items → 
fuzzy match → upsell suggestions → Sarvam TTS speaks response →
You click "Place Order" → Backend creates order → Done
```

---

## Files Involved (Reference Map)

| File | Role |
|------|------|
| `backend/app/main.py` | FastAPI app, route registration |
| `backend/app/config.py` | Environment settings |
| `backend/app/dependencies.py` | DataFrame loading & caching |
| `backend/app/api/routes_call.py` | **Vapi webhook handler** (phone + web call) |
| `backend/app/api/routes_twilio.py` | Twilio handler (**NOT REGISTERED — dead code**) |
| `backend/app/api/routes_voice.py` | Text/voice chat endpoints |
| `backend/app/services/sarvam_service.py` | Sarvam AI integration (translate, detect, transliterate) |
| `backend/app/services/voice_parser.py` | NLP: intent detection, item parsing, qty extraction |
| `backend/app/services/order_service.py` | Order creation, storage, POS payload |
| `backend/app/services/upsell_engine.py` | Combo/addon recommendations |
| `backend/app/utils/fuzzy_match.py` | rapidfuzz + custom scorer for menu matching |
| `backend/app/services/data_loader.py` | Excel data loading (menu, orders, etc.) |
| `backend/setup_vapi.py` | One-time Vapi assistant + phone number setup |
| `backend/update_vapi.py` | Update existing Vapi assistant config |
| `backend/test_call_agent.py` | Automated test for call webhook |
| `customer-website/src/pages/VoiceOrder.tsx` | Frontend: voice UI, Vapi SDK, Sarvam STT/TTS |
| `customer-website/src/services/voiceService.ts` | Frontend: backend API calls for voice/chat |
| `customer-website/src/lib/api.ts` | API URL constants |
| `customer-website/vite.config.ts` | Dev proxy: /api → localhost:8000 |
| `customer-website/.env` | Frontend environment variables |
| `data/restaurant_ai_hybrid_dataset.xlsx` | Menu items, orders, analytics data |
