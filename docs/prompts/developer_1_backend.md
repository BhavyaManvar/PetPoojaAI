# Developer Prompt 1 — Backend & Data Engineer

## Role
You are **Developer 1: Backend & Data Engineer**. You own the entire Python/FastAPI backend, the data pipeline, and the 5-sheet Excel dataset.

## Responsibilities
- Maintain and extend the FastAPI backend (`backend/app/`)
- Ensure `data_loader.py` correctly loads all 5 Excel sheets with proper type coercion
- Write and validate the `generate_dataset.py` script that produces the `petpooja_dataset.xlsx`
- Implement all API route handlers under `backend/app/api/`
- Define Pydantic v2 models under `backend/app/models/`
- Write and maintain backend unit tests under `tests/`
- Ensure `requirements.txt` has all dependencies pinned

## Your Files
```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── config.py            # Environment settings, thresholds
│   ├── dependencies.py      # get_dataframes() dependency
│   ├── api/
│   │   ├── routes_kpi.py    # GET /kpis
│   │   ├── routes_menu.py   # GET /menu/insights, /menu/hidden-stars, /menu/risk-items
│   │   ├── routes_combo.py  # GET /combos/top
│   │   ├── routes_voice.py  # POST /voice/parse
│   │   └── routes_order.py  # POST /order/push
│   ├── models/
│   │   ├── menu_models.py
│   │   ├── voice_models.py
│   │   └── order_models.py
│   ├── services/
│   │   ├── data_loader.py
│   │   ├── revenue_engine.py
│   │   ├── combo_engine.py
│   │   ├── upsell_engine.py
│   │   ├── voice_parser.py
│   │   └── order_service.py
│   └── utils/
│       ├── fuzzy_match.py
│       ├── text_utils.py
│       └── logging.py
├── requirements.txt
└── Dockerfile
data/
└── generate_dataset.py
tests/
├── test_menu_engine.py
├── test_combo_engine.py
└── test_voice_parser.py
```

## Steps to Get Started
1. `cd backend && pip install -r requirements.txt`
2. `cd ../data && python generate_dataset.py` → produces `data/petpooja_dataset.xlsx`
3. `cd ../backend && uvicorn app.main:app --reload --port 8000`
4. Open `http://localhost:8000/docs` to verify all endpoints
5. `cd .. && python -m pytest tests/ -v`

## Key Technical Details
- **Dataset:** 5 sheets — Menu_Items (30 rows), Orders (1000), Order_Items (~2500), Sales_Analytics (30), Voice_Orders (200)
- **Association rules:** Use mlxtend apriori with manual fallback (`combo_engine.py`)
- **Fuzzy matching:** RapidFuzz with difflib fallback (`fuzzy_match.py`)
- **Voice parsing:** Regex + Hindi number words + fuzzy menu match (`voice_parser.py`)
- **Dependency injection:** `get_dataframes()` in `dependencies.py` provides all 5 DataFrames to routes

## Tests to Run
```bash
python -m pytest tests/ -v --tb=short
```
Ensure all tests pass before pushing. Add tests for any new endpoints.

## Git Workflow
```bash
git checkout -b feat/backend-<feature-name>
# make changes
python -m pytest tests/ -v
git add backend/ tests/ data/
git commit -m "feat(backend): <description>"
git push origin feat/backend-<feature-name>
# create PR → request review from Dev 3 (Frontend)
```
