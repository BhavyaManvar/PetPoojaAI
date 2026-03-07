# 🍽️ PetPooja AI — Revenue & Voice Copilot for Restaurants

![Hackathon](https://img.shields.io/badge/HACKaMINeD-2026-orange)
![AI](https://img.shields.io/badge/AI-Restaurant%20Intelligence-blue)
![Python](https://img.shields.io/badge/Python-FastAPI-green)
![React](https://img.shields.io/badge/React-19-61dafb)
![Tests](https://img.shields.io/badge/Tests-225%2B%20Passing-brightgreen)
![License](https://img.shields.io/badge/License-MIT-green)

> An AI-powered SaaS platform that transforms raw PoS data into actionable revenue intelligence and automates customer ordering with a multilingual voice assistant — including a live phone call agent.

---

# 📑 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Admin Dashboard](#-admin-dashboard)
- [Customer Website](#-customer-website)
- [Phone Call Agent](#-phone-call-agent)
- [Voice Ordering Flow](#-voice-ordering-flow)
- [Dataset Format](#-dataset-format)
- [Installation Guide](#-installation-guide)
- [API Endpoints](#-api-endpoints)
- [Demo Workflow](#-demo-workflow)
- [Business Impact](#-business-impact)
- [Future Improvements](#-future-improvements)
- [Team](#-team)
- [License](#-license)

---

# 📌 Overview

Restaurants generate massive volumes of transactional data through **Point-of-Sale (PoS) systems**, yet most businesses fail to leverage this data effectively.

At the same time, **phone-based ordering remains manual**, error-prone, and inefficient — with zero upselling or intelligence.

**PetPooja AI** is an end-to-end AI copilot that:

- Analyzes PoS data to uncover hidden revenue opportunities using **BCG Menu Engineering**
- Optimizes menu pricing with **margin-gap elasticity analysis**
- Discovers smart combos using **Apriori market basket analysis**
- Automates voice ordering via a **live phone call agent** (Vapi.ai + Deepgram + ElevenLabs + GPT-4o-mini)
- Supports **multilingual input** — English, Hindi, Gujarati, and Hinglish
- Provides **real-time upsell recommendations** with anti-repeat intelligence
- Delivers two complete frontends — **Admin Dashboard** (Next.js) and **Customer Website** (Vite + React)

---

# ❗ Problem Statement

Restaurants face critical operational and revenue challenges:

| # | Problem | Impact |
|---|---------|--------|
| 1 | **PoS data is collected but never analyzed** | Menu decisions are based on gut feeling, not data |
| 2 | **High-margin items go unnoticed** (Hidden Stars) | 15–25% potential profit is left on the table |
| 3 | **Low-margin items dominate sales** (Plow Horses) | Revenue grows but margins shrink |
| 4 | **Pricing is arbitrary** | No data-driven elasticity or competitive analysis |
| 5 | **Phone ordering is manual and error-prone** | ~30% of phone orders contain errors |
| 6 | **Zero upselling during calls** | Average Order Value stays flat |
| 7 | **No multilingual ordering support** | India has 22+ official languages, most systems only support English |

---

# 💡 Solution

PetPooja AI uses **AI analytics + voice automation** to close the loop from data to revenue.

Three core pillars:

### 🧠 Pillar 1: Revenue Intelligence
BCG Menu Engineering, contribution margin analysis, hidden-star detection, data-driven price optimization with monthly uplift projections.

### 🎤 Pillar 2: Voice & Call Automation
Live phone call ordering via Vapi.ai, browser-based voice ordering, multilingual support (English, Hindi, Gujarati, Hinglish), fuzzy name matching with RapidFuzz.

### 📈 Pillar 3: Smart Recommendations
Market Basket Analysis (Apriori) for combo discovery, real-time upsell engine with anti-repeat intelligence, weighted scoring (60% profit + 40% sales velocity).

---

# 🚀 Key Features

## 📊 Revenue Intelligence Engine

Analyzes restaurant menu performance using the **BCG Menu Engineering Matrix**.

Capabilities:

- **Contribution margin calculation** per menu item
- **BCG classification** — Star / Puzzle / Plow Horse / Dog
- **Hidden Stars detection** — high-margin items with low sales (promotion candidates)
- **Risk Items detection** — Dog-classified items hurting profitability
- **Sales velocity tracking** and quantity analysis
- **KPI dashboard** — total revenue, orders, AOV, unique items, revenue by city/order type

| Category | Description |
|----------|-------------|
| ⭐ Star | High profit + High popularity |
| 🧩 Puzzle | High profit + Low popularity (Hidden Stars) |
| 🐎 Plow Horse | Low profit + High popularity |
| 🐶 Dog | Low profit + Low popularity (Risk Items) |

---

## 💰 Price Optimization Engine

Data-driven pricing recommendations for every menu item.

- **Margin-gap analysis** — compares item margin vs category average
- **Demand elasticity pricing** — adjusts based on sales velocity
- **Priority ranking** — High / Medium / Low action items
- **Monthly uplift projections** — estimated ₹ revenue increase per item
- **Price bounds** — max +15% increase, max -10% decrease
- **Actions** — Increase / Decrease / Keep with reasoning

---

## 🧠 Smart Combo Recommendation Engine

Uses **Market Basket Analysis (Apriori Algorithm)** via mlxtend to discover item associations.

- **Association rules** with Support, Confidence, and Lift metrics
- **Category-based combo filtering** for logical pairings
- **Basket statistics** — average basket size, min/max
- Example: `Pizza → Coke (Confidence: 72%, Lift: 2.1)`

---

## 🔄 Upsell Engine

Real-time upsell recommendations with intelligent diversity.

- **Compatible category enforcement** — only suggests logical add-ons
- **Anti-repeat history** — different suggestion each time (5-cycle rotation)
- **Weighted scoring** — 60% profit optimization + 40% low-sales boost
- **Dual strategy** — combo-based upsells + hidden-star promotions

---

## 🎤 Voice Copilot (Text-based NLU)

Parses natural language food orders from the admin dashboard.

- **Intent detection** — ORDER_ITEM, REMOVE_ITEM, CONFIRM_ORDER
- **Fuzzy name matching** — RapidFuzz WRatio + token_sort_ratio combined scorer
- **Quantity extraction** — English ("two"), Hindi ("do"), numeric ("2")
- **Sarvam AI transliteration** — पनीर टिक्का → paneer tikka
- **Language detection** — English, Hindi, Gujarati, Hinglish (Unicode script + Hinglish word detection)
- **Confidence scores** — per-item match confidence (0–100)

Example:
```
Input:  "2 butter chicken aur 1 naan dena"
Output: [
  { item: "Butter Chicken", qty: 2, confidence: 95, language: "hi" },
  { item: "Butter Naan",    qty: 1, confidence: 90, language: "hi" }
]
```

---

## 📞 Phone Call AI Agent (Vapi.ai)

A fully functional AI phone ordering agent customers can call.

- **Phone number:** +1 (862) 225-2211
- **Speech-to-Text:** Deepgram Nova-3 with 200+ food keyword boosts
- **Text-to-Speech:** ElevenLabs "sarah" voice
- **LLM Brain:** GPT-4o-mini (temperature 0.2)
- **8 callable tools:** search_menu, add_to_order, remove_from_order, get_order_summary, confirm_order, get_menu_categories, get_popular_items, get_specials
- **Sarvam AI integration** — transliterates Hindi/Gujarati input for accurate fuzzy matching
- **Smart upselling** — suggests combos after each item added
- **Session management** — in-memory cart per call
- **n8n webhook integration** — real-time event pipeline with language analytics

---

## 🤖 AI Strategy Chatbot

Conversational AI assistant for restaurant owners.

- **11 intent patterns** — revenue, promote, low_margin, pricing, combos, hidden_stars, risk_items, improve_aov, slow_items, top_items, general
- **Real-time analytics context** — pulls live data from the revenue engine
- **Markdown-formatted responses** with actionable recommendations

---

## 📦 Order Service

PoS-ready order management.

- Order creation with item resolution (voice names → menu IDs)
- Line item profit calculation
- Order history and lookup
- Demo seeding for testing

---

# 🌍 Multi-Language Support

Designed for Indian restaurants with native multilingual support.

| Language | Input Support | Example |
|----------|--------------|---------|
| English | ✅ Full | "One paneer pizza and two coke" |
| Hindi | ✅ Full | "ek paneer pizza aur do coke chahiye" |
| Gujarati | ✅ Full | "પનીર ટિક્કા" (transliterated via Sarvam AI) |
| Hinglish | ✅ Full | "2 butter chicken aur 1 naan dena" |

**Detection:** Unicode script ranges (Devanagari U+0900–U+097F, Gujarati U+0A80–U+0AFF) + Hinglish keyword matching.

**Transliteration:** Sarvam AI converts Indic script → Latin for accurate fuzzy menu matching.

---

# 🏗 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       FRONTEND LAYER                              │
│                                                                   │
│  ┌─────────────────────┐       ┌─────────────────────────┐       │
│  │  Admin Dashboard    │       │  Customer Website        │       │
│  │  Next.js 15         │       │  Vite 6 + React 19      │       │
│  │  Port 3000          │       │  Port 5173               │       │
│  │  ─────────────────  │       │  ─────────────────────   │       │
│  │  • KPI Dashboard    │       │  • Menu Browsing         │       │
│  │  • BCG Matrix       │       │  • Cart & Checkout       │       │
│  │  • Combo Explorer   │       │  • Voice Order Widget    │       │
│  │  • Price Optimizer  │       │  • Order History         │       │
│  │  • Voice Copilot    │       │  • Phone Call Agent UI   │       │
│  │  • AI Strategy Chat │       │  • Firebase Auth         │       │
│  │  • Order History    │       │                          │       │
│  └────────┬────────────┘       └────────┬────────────────┘       │
│           │ REST API                     │ REST API + Vapi SDK    │
└───────────┼──────────────────────────────┼───────────────────────┘
            │                              │
┌───────────▼──────────────────────────────▼───────────────────────┐
│                    BACKEND — FastAPI (Port 8000)                   │
│                                                                    │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐     │
│  │ Revenue  │ Price    │ Combo    │ Upsell   │ Voice        │     │
│  │ Engine   │ Engine   │ Engine   │ Engine   │ Parser       │     │
│  │ (BCG)    │ (Margin) │ (Apriori)│ (Weight) │ (RapidFuzz)  │     │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘     │
│  ┌──────────┬──────────┬──────────┬──────────────────────┐        │
│  │ Strategy │ Order    │ Sarvam   │ Call Agent            │        │
│  │ Chatbot  │ Service  │ Service  │ (Vapi Webhook)       │        │
│  │ (11 Int) │ (PoS)    │ (i18n)   │ (8 Tools)            │        │
│  └──────────┴──────────┴──────────┴──────────────────────┘        │
└──────────────┬────────────────────────────────────────────────────┘
               │
┌──────────────▼────────────────────────────────────────────────────┐
│                     EXTERNAL AI SERVICES                           │
│                                                                    │
│  Vapi.ai        │ Deepgram Nova-3  │ ElevenLabs     │ Firebase    │
│  (Phone Calls)  │ (Speech-to-Text) │ (Text-to-Speech│ (Auth)      │
│                 │                   │  voice "sarah")│             │
│  GPT-4o-mini   │ Sarvam AI        │ n8n            │ Sarvam STT  │
│  (LLM Brain)   │ (Transliterate)  │ (Webhooks)     │ (Browser)   │
└───────────────────────────────────────────────────────────────────┘
```

### Phone Call Flow

```
Customer dials +1 (862) 225-2211
    │
    ▼
Vapi.ai Cloud (Deepgram Nova-3 STT → GPT-4o-mini → ElevenLabs TTS)
    │
    ▼ POST /call/webhook
ngrok tunnel → FastAPI backend (localhost:8000)
    │
    ├── search_menu()      → Sarvam transliteration + RapidFuzz matching
    ├── add_to_order()     → Session cart + upsell suggestion
    ├── get_order_summary()→ Cart review
    ├── confirm_order()    → Save order + n8n notification
    │
    ▼ JSON result
ElevenLabs speaks response → Customer hears result
```

---

# ⚙️ Technology Stack

## Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.109+ | REST API framework |
| Uvicorn | 0.27+ | ASGI server |
| Pydantic | v2.5+ | Request/response validation |
| Pandas | 2.1+ | Data analysis & manipulation |
| mlxtend | 0.23+ | Apriori algorithm for market basket analysis |
| RapidFuzz | 3.6+ | Fuzzy string matching for voice parsing |
| httpx | 0.26+ | Async HTTP client for external APIs |
| openpyxl | 3.1+ | Excel file reading |
| google-generativeai | 0.8+ | Gemini AI integration |
| pytest + pytest-asyncio | 8+ | Testing framework |

## Admin Dashboard (frontend/)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15.1 | React framework with SSR |
| React | 19.0 | UI library |
| TypeScript | 5.7 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| Recharts | 2.15 | Charts and graphs |
| Radix UI | Latest | Accessible UI primitives |
| React Query | v5 | Server state management |
| Firebase | 11.10 | Authentication |
| Framer Motion | 11.15 | Animations |
| Lucide React | 0.468 | Icons |

## Customer Website (customer-website/)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Vite | 6.0 | Build tool and dev server |
| React | 19.0 | UI library |
| TypeScript | 5.7 | Type safety |
| React Router | 7.1 | Client-side routing |
| @vapi-ai/web | 2.5 | Browser-based phone calls |
| Firebase | 11.10 | Authentication |
| Tailwind CSS | 3.4 | Styling |
| Framer Motion | 11.15 | Animations |
| Vitest | 2.1 | Unit testing |

## External AI Services

| Service | Purpose |
|---------|---------|
| Vapi.ai | Phone call orchestration |
| Deepgram Nova-3 | Speech-to-text (200+ keyword boosts) |
| ElevenLabs | Text-to-speech (voice "sarah") |
| GPT-4o-mini | LLM brain for call agent |
| Sarvam AI | Hindi/Gujarati transliteration + STT |
| n8n | Webhook pipeline for call analytics |
| Firebase | User authentication |

---

# 📂 Project Structure

```
PetPoojaAI/
│
├── backend/                          # FastAPI backend
│   ├── app/
│   │   ├── main.py                   # FastAPI app + middleware + routers
│   │   ├── config.py                 # Environment-based settings
│   │   ├── dependencies.py           # DataFrame injection (DI)
│   │   ├── api/
│   │   │   ├── routes_kpi.py         # GET /kpis — dashboard KPIs
│   │   │   ├── routes_menu.py        # GET /menu/* — BCG matrix, hidden stars, risk items
│   │   │   ├── routes_combo.py       # GET /combos/* — Apriori rules, upsell finder
│   │   │   ├── routes_price.py       # GET /price/* — pricing recommendations
│   │   │   ├── routes_voice.py       # POST /voice/* — NLU parsing, order pipeline
│   │   │   ├── routes_order.py       # POST /order/* — order CRUD
│   │   │   ├── routes_ai.py          # POST /ai/* — strategy chatbot
│   │   │   ├── routes_auth.py        # POST /auth/* — Firebase token verification
│   │   │   └── routes_call.py        # POST /call/webhook — Vapi phone agent
│   │   ├── services/
│   │   │   ├── revenue_engine.py     # BCG classification, margin analysis
│   │   │   ├── price_engine.py       # Margin-gap elasticity pricing
│   │   │   ├── combo_engine.py       # Apriori market basket analysis
│   │   │   ├── upsell_engine.py      # Weighted upsell recommendations
│   │   │   ├── voice_parser.py       # NLU intent + fuzzy matching
│   │   │   ├── order_service.py      # Order creation and management
│   │   │   ├── strategy_chatbot.py   # 11-intent AI assistant
│   │   │   ├── sarvam_service.py     # Sarvam AI transliteration + language detection
│   │   │   └── data_loader.py        # Excel workbook loader
│   │   ├── models/                   # Pydantic request/response models
│   │   └── utils/
│   │       ├── fuzzy_match.py        # RapidFuzz helpers
│   │       └── text_utils.py         # Text processing utilities
│   ├── setup_vapi.py                 # One-time Vapi assistant + phone number setup
│   ├── update_vapi.py                # Update Vapi assistant config
│   ├── requirements.txt              # Python dependencies
│   └── test_call_agent.py            # Call agent testing script
│
├── frontend/                         # Admin Dashboard (Next.js 15)
│   └── src/
│       └── app/
│           └── admin/
│               ├── page.tsx           # Dashboard — KPIs, charts, top items
│               ├── revenue-insights/  # BCG Matrix, hidden stars, risk items
│               ├── combo-insights/    # Apriori rules, upsell finder
│               ├── price-optimization/# Price recommendations + uplift
│               ├── voice-copilot/     # Voice order parser
│               ├── ai-assistant/      # Strategy chatbot
│               ├── order-history/     # Order management
│               ├── menu-manager/      # Menu item management
│               └── staff/             # Staff management
│
├── customer-website/                 # Customer-facing Website (Vite + React)
│   └── src/
│       └── pages/
│           ├── Menu.tsx              # Menu browsing + cart
│           ├── VoiceOrder.tsx        # Voice ordering + phone call agent
│           ├── Checkout.tsx          # Order checkout
│           ├── Orders.tsx            # Order history
│           ├── Login.tsx             # Firebase auth
│           └── Signup.tsx            # User registration
│
├── data/
│   ├── restaurant_ai_hybrid_dataset.xlsx  # Sample dataset (5 sheets)
│   └── generate_dataset.py                # Dataset generation script
│
├── tests/                            # 225+ automated tests
│   ├── conftest.py                   # Shared fixtures
│   ├── test_revenue_engine.py        # BCG classification tests
│   ├── test_price_engine.py          # Pricing logic tests
│   ├── test_combo_engine.py          # Apriori tests
│   ├── test_voice_parser.py          # Multilingual parsing tests
│   ├── test_strategy_chatbot.py      # Intent detection tests
│   ├── test_order_service.py         # Order CRUD tests
│   └── test_api_integration.py       # API endpoint tests
│
└── docs/                             # Documentation
    ├── architecture.md
    ├── dataset_specification.md
    ├── demo_script.md
    └── DELIVERY_REPORT.md
```

---

# 📊 Admin Dashboard

The Next.js admin dashboard at `http://localhost:3000` provides restaurant owners with **actionable business insights**.

### Pages:

| Page | Features |
|------|----------|
| **Dashboard** | KPI cards (Revenue, Orders, AOV, Unique Items), Revenue by City bar chart, Revenue by Order Type pie chart, Top 5 Items table |
| **Menu Intelligence** | BCG Matrix with Star/Puzzle/Plow Horse/Dog badges, Hidden Stars tab, Risk Items tab, contribution margin and quantity columns |
| **Combos & Upsell** | Association rules table (antecedent → consequent, confidence, lift, support), Upsell Finder — type any item name to get recommendations |
| **Price Optimization** | Per-item pricing recommendations, action (Increase/Decrease/Keep), monthly uplift ₹ projection, priority ranking |
| **Voice Copilot** | Text input → parsed order with matched items, quantities, fuzzy match scores, language badge |
| **AI Assistant** | Strategy chatbot — ask "How can I increase revenue?" and get actionable recommendations |
| **Order History** | View all orders with items, totals, timestamps |

---

# 🛒 Customer Website

The Vite customer website at `http://localhost:5173` is the customer-facing ordering app.

### Pages:

| Page | Features |
|------|----------|
| **Menu** | Grid layout with item cards, category filters, cart sidebar, add-to-cart functionality |
| **Voice Order** | Sarvam AI speech-to-text (saarika:v2.5), browser-based Vapi call widget, phone call option (+1 862-225-2211) |
| **Checkout** | Order summary, customer details, order placement |
| **Orders** | Past order history |
| **Login / Signup** | Firebase email/password authentication |

---

# 📞 Phone Call Agent

Customers can order by calling **+1 (862) 225-2211** or using the browser call widget.

### Configuration:

| Component | Setting |
|-----------|---------|
| **STT** | Deepgram Nova-3, language: en, smartFormat: true, 200+ keyword boosts, endpointing: 300ms |
| **LLM** | GPT-4o-mini, temperature: 0.2 |
| **TTS** | ElevenLabs "sarah", stability: 0.5, similarityBoost: 0.75 |
| **Timeout** | Silence: 45s, Max call: 300s |
| **Webhook** | POST to ngrok → localhost:8000/call/webhook |

### Available Tools (8):

| Tool | Description |
|------|-------------|
| `search_menu` | Fuzzy search menu items (with Sarvam transliteration for Hindi/Gujarati) |
| `add_to_order` | Add item to cart with quantity (triggers upsell suggestion) |
| `remove_from_order` | Remove item from cart |
| `get_order_summary` | Review full cart before confirming |
| `confirm_order` | Finalize order → save + n8n notification |
| `get_menu_categories` | List available food categories |
| `get_popular_items` | Suggest popular items from each category |
| `get_specials` | Today's special offers and deals |

### Prerequisites:
- Backend running on port 8000
- **ngrok running** — `ngrok http 8000` (required for Vapi webhooks to reach your local backend)

---

# 🎤 Voice Ordering Flow

### Phone Call Flow:
```
Customer dials +1 (862) 225-2211
    ↓
Deepgram Nova-3 STT (200+ keyword boosts)
    ↓
GPT-4o-mini decides tool call (search_menu / add_to_order / etc.)
    ↓
Vapi POST webhook → ngrok → FastAPI backend
    ↓
Backend: Sarvam transliteration (if Hindi/Gujarati) → RapidFuzz matching → response
    ↓
ElevenLabs "sarah" TTS → speaks response to customer
```

### Browser Voice Flow:
```
Customer clicks mic button on customer-website
    ↓
MediaRecorder captures audio → converted to WAV (16kHz mono)
    ↓
Sarvam AI STT (saarika:v2.5, language: unknown/auto)
    ↓
Transcript → Sarvam translate (if non-Latin) → English text
    ↓
POST to backend /voice/parse → fuzzy matching → parsed items
    ↓
Items added to cart
```

---

# 🧪 Dataset Format

The dataset is an Excel workbook (`data/restaurant_ai_hybrid_dataset.xlsx`) with 5 sheets:

| Sheet | Rows | Columns | Purpose |
|-------|------|---------|---------|
| **Menu_Items** | 30 | item_id, item_name, category, price, cost | Menu catalog with prices and food costs |
| **Orders** | 1000 | order_id, order_date, city, payment_mode, total_amount | Order records |
| **Order_Items** | ~2500 | order_id, item_id, quantity, unit_price, line_total | Line items per order |
| **Sales_Analytics** | 30 | item_id, item_name, qty_sold, revenue, margin_pct | Pre-aggregated metrics |
| **Voice_Orders** | 200 | raw_text, language, expected_items | Multilingual voice parsing samples |

### Key Formulas:
```
Contribution Margin = Selling Price - Food Cost
Margin % = (Contribution Margin / Selling Price) × 100
Menu Class = BCG Matrix based on margin vs popularity
Monthly Uplift = Recommended Price Change × Avg Monthly Quantity
```

---

# 🖥 Installation Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- ngrok (for phone call agent)

## 1. Clone Repository

```bash
git clone <your-repo-url>
cd PetPoojaAI
```

## 2. Backend Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend/requirements.txt

# Start backend server
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at `http://localhost:8000` (Swagger docs at `/docs` when DEBUG=true).

## 3. Admin Dashboard Setup

```bash
cd frontend
npm install
npm run dev
```

Admin dashboard runs at `http://localhost:3000`.

## 4. Customer Website Setup

```bash
cd customer-website
npm install
npm run dev
```

Customer website runs at `http://localhost:5173`.

## 5. Phone Call Agent Setup (Optional)

```bash
# Start ngrok tunnel to backend
ngrok http 8000

# Update Vapi assistant with your ngrok URL (one-time)
cd backend
python setup_vapi.py --server-url https://YOUR-NGROK-URL.ngrok-free.app/call/webhook
```

## 6. Environment Variables

### backend/.env
```env
DEBUG=true
SARVAM_API_KEY=your_sarvam_api_key
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
N8N_CALL_WEBHOOK=your_n8n_webhook_url
```

### customer-website/.env
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=/api
VITE_SARVAM_API_KEY=your_sarvam_api_key
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
VITE_VAPI_ASSISTANT_ID=your_vapi_assistant_id
VITE_PHONE_NUMBER=+1XXXXXXXXXX
```

---

# 📡 API Endpoints

### KPIs & Dashboard
```
GET  /kpis                    — Dashboard KPIs (revenue, orders, AOV, top items)
GET  /health                  — Health check
```

### Menu Intelligence
```
GET  /menu/items              — All menu items with margins
GET  /menu/insights           — BCG classification for all items
GET  /menu/hidden-stars       — High-margin underperforming items
GET  /menu/risk-items         — Dog-classified items
```

### Combos & Upsell
```
GET  /combos/top              — Top association rules (Apriori)
GET  /combos/basket-stats     — Basket size statistics
GET  /combos/upsell/for-item  — Upsell suggestions for a specific item
POST /combos/upsell/batch     — Batch upsell recommendations
POST /combos/upsell/clear-history — Reset upsell history
```

### Price Optimization
```
GET  /price/recommendations   — Per-item pricing recommendations with uplift
GET  /price/summary           — Pricing summary statistics
```

### Voice Copilot
```
POST /voice/parse             — Parse natural language to order items
POST /voice/order             — Submit parsed voice order
POST /voice/pipeline          — Full pipeline: parse → match → respond
POST /voice/chat              — Voice chat interaction
```

### Orders
```
POST /order/push              — Create a new order
GET  /order/list              — List all orders
GET  /order/{order_id}        — Get specific order details
POST /order/seed              — Seed demo orders
```

### AI Strategy
```
POST /ai/chat                 — Strategy chatbot (11 intent patterns)
GET  /ai/insights             — Auto-generated insights
GET  /ai/dashboard-summary    — AI-powered dashboard summary
```

### Authentication
```
POST /auth/verify             — Verify Firebase token
```

### Phone Call Agent
```
POST /call/webhook            — Vapi webhook handler (function-call + tool-calls)
GET  /call/sessions           — Debug: list active call sessions
```

---

# 🎬 Demo Workflow

**Total demo time: ~4 minutes**

| Step | Action | Time | Talking Point |
|------|--------|------|---------------|
| 1 | **Dashboard** — KPI cards, revenue charts, top items | 30s | "One glance tells the owner how the business is doing" |
| 2 | **Menu Intelligence** — BCG Matrix, Hidden Stars, Risk Items | 60s | "These high-margin items aren't selling — perfect for promotion" |
| 3 | **Combos & Upsell** — Association rules, type "Butter Chicken" → upsells | 60s | "Apriori discovers combos automatically from order history" |
| 4 | **Voice Copilot** — Type "2 butter chicken aur 1 naan dena" → parse | 60s | "Hindi, English, Hinglish — fuzzy matching handles it all" |
| 5 | **Customer Website** — Browse menu, add to cart, voice widget | 30s | "Customer-facing app with Vapi voice integration" |

---

# 📈 Business Impact

| Metric | Before PetPooja AI | After PetPooja AI |
|--------|-------------------|-------------------|
| Menu Decisions | Gut feeling | Data-driven BCG analysis |
| Combo Suggestions | None / manual | Auto-generated via Apriori |
| Upselling | Zero during calls | Real-time AI upsells |
| Phone Order Errors | ~30% error rate | <5% (AI-parsed, confirmed) |
| Hidden Star Revenue | Untapped | Identified & promoted |
| Price Optimization | Flat pricing | Margin-gap elasticity |
| Ordering Speed | 3–5 min/call | <2 min AI call |

### Revenue Potential:
- **Per restaurant:** ₹30K–50K/month additional revenue
- **100 restaurants:** ₹30L–50L/month
- **10,000 restaurants (PetPooja scale):** ₹30Cr–50Cr/month

---

# 🔮 Future Improvements

| Phase | Feature |
|-------|---------|
| Phase 1 (1–2 months) | Live PetPooja PoS integration, PostgreSQL migration, Hindi/Gujarati TTS via Sarvam, Mobile app |
| Phase 2 (3–6 months) | AI demand forecasting, Inventory-aware combos, Customer segmentation, WhatsApp ordering bot |
| Phase 3 (6–12 months) | Multi-restaurant chain analytics, Dynamic real-time pricing, Autonomous menu optimization, Zomato/Swiggy integration |

---

# 🧪 Testing

**225+ automated tests**, all passing.

```bash
cd backend
pytest tests/ -v
```

Test coverage includes:
- Revenue engine (BCG classification, margins)
- Price engine (pricing logic, bounds, priority)
- Combo engine (Apriori, associations, basket stats)
- Voice parser (multilingual, fuzzy matching, intent detection)
- Strategy chatbot (intent detection, response generation)
- Order service (CRUD, validation)
- API integration tests (all endpoints)

---

# 👨‍💻 Team

**HACKaMINeD 2026 — Hackathon Team**

| Role | Responsibility |
|------|---------------|
| Backend Developer | FastAPI APIs, data processing, service layer |
| ML Engineer | Revenue intelligence, Apriori, price engine |
| Frontend Developer | Next.js dashboard, Vite customer app, UI/UX |
| AI/Voice Engineer | Vapi integration, Sarvam AI, call agent |

---

# 🏆 Vision

Our goal is to build an **AI Copilot for Restaurants** that converts **raw PoS data into actionable revenue intelligence** while automating customer ordering experiences through voice and phone.

PetPooja AI bridges **data science, voice automation, and restaurant operations** — from BCG matrix analysis to a live phone call you can make right now.

---

# 📄 License

This project is licensed under the **MIT License**.

---

# ⭐ Support

If you like this project, please give it a ⭐ on GitHub!


