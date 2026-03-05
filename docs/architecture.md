# Architecture — PetPooja AI Revenue Copilot

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js 15 Frontend                 │
│   React 19 · TypeScript · TailwindCSS · ShadCN UI      │
│                                                         │
│  ┌───────────┐ ┌────────────┐ ┌──────────┐ ┌────────┐  │
│  │ Dashboard │ │ Menu Intel │ │ Combos & │ │ Voice  │  │
│  │           │ │            │ │ Upsell   │ │Copilot │  │
│  └─────┬─────┘ └─────┬──────┘ └────┬─────┘ └───┬────┘  │
│        └──────────────┴─────────────┴───────────┘       │
│                         │  React Query v5               │
│                    /api proxy (Next.js rewrites)        │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/JSON
┌────────────────────────┴────────────────────────────────┐
│                   FastAPI Backend                        │
│                                                         │
│  ┌─────────────────── API Layer ──────────────────────┐ │
│  │ /kpis  /menu  /combos  /upsell  /voice  /order    │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │                                 │
│  ┌──────────────── Services ─────────────────────────┐  │
│  │ revenue_engine  combo_engine  upsell_engine       │  │
│  │ voice_parser    order_service  data_loader         │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │                                 │
│  ┌─────────────── Utilities ─────────────────────────┐  │
│  │ fuzzy_match (RapidFuzz)  text_utils  logging      │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│              5-Sheet Excel Dataset                       │
│  Menu_Items · Orders · Order_Items                      │
│  Sales_Analytics · Voice_Orders                         │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Startup:** `data_loader.load_dataframes()` reads the Excel workbook, normalizes sheet names, coerces types, and caches via `@lru_cache`.
2. **API Request:** Each route receives dataframes via FastAPI dependency injection (`get_dataframes()`).
3. **Service Processing:** Routes delegate to service modules (engines) for business logic.
4. **Frontend Fetch:** Next.js pages use React Query hooks that call the API client. The Next.js config proxies `/api/*` to the backend at `localhost:8000`.

## Key Libraries

| Layer | Library | Purpose |
|-------|---------|---------|
| Backend | FastAPI | HTTP framework with OpenAPI docs |
| Backend | pandas + openpyxl | DataFrame operations + Excel I/O |
| Backend | RapidFuzz | Fuzzy string matching for voice/menu |
| Backend | mlxtend | Apriori association rule mining |
| Frontend | Next.js 15 | App Router SSR/CSR framework |
| Frontend | React Query v5 | Server state management |
| Frontend | Recharts | Data visualization charts |
| Frontend | TailwindCSS | Utility-first styling |
| Frontend | Radix UI | Accessible UI primitives |

## Directory Structure

```
PetPoojaAI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry + CORS + routers
│   │   ├── config.py            # Environment config
│   │   ├── dependencies.py      # DI container (get_dataframes)
│   │   ├── api/                 # Route handlers
│   │   │   ├── routes_kpi.py
│   │   │   ├── routes_menu.py
│   │   │   ├── routes_combo.py
│   │   │   ├── routes_voice.py
│   │   │   └── routes_order.py
│   │   ├── models/              # Pydantic v2 schemas
│   │   │   ├── menu_models.py
│   │   │   ├── voice_models.py
│   │   │   └── order_models.py
│   │   ├── services/            # Business logic engines
│   │   │   ├── data_loader.py
│   │   │   ├── revenue_engine.py
│   │   │   ├── combo_engine.py
│   │   │   ├── upsell_engine.py
│   │   │   ├── voice_parser.py
│   │   │   └── order_service.py
│   │   └── utils/               # Shared utilities
│   │       ├── fuzzy_match.py
│   │       ├── text_utils.py
│   │       └── logging.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── dashboard/
│   │   │   ├── menu-intelligence/
│   │   │   ├── combos/
│   │   │   └── voice-copilot/
│   │   ├── components/          # Reusable UI components
│   │   ├── hooks/               # React Query hooks
│   │   ├── services/            # API client
│   │   ├── types/               # TypeScript interfaces
│   │   ├── utils/               # Client utilities
│   │   └── styles/              # Global CSS
│   ├── package.json
│   ├── Dockerfile
│   └── tsconfig.json
├── data/
│   └── generate_dataset.py
├── tests/
├── docs/
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/kpis` | Dashboard KPIs + revenue breakdowns |
| GET | `/menu/insights` | BCG quadrant classification |
| GET | `/menu/hidden-stars` | High-margin low-sales items |
| GET | `/menu/risk-items` | Dog-classified items |
| GET | `/combos/top` | Top association rules |
| GET | `/upsell/recommend?item_id=` | Upsell recommendations |
| POST | `/voice/parse` | Parse natural language order |
| POST | `/order/push` | Create order with line items |
