"""PetPooja AI Revenue Copilot — FastAPI Application."""

import logging
import time
from pathlib import Path

from dotenv import load_dotenv
_env_file = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(_env_file, override=True)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes_kpi import router as kpi_router
from app.api.routes_menu import router as menu_router
from app.api.routes_combo import router as combo_router
from app.api.routes_voice import router as voice_router
from app.api.routes_order import router as order_router
from app.api.routes_price import router as price_router
from app.api.routes_ai import router as ai_router
from app.api.routes_auth import router as auth_router
from app.api.routes_call import router as call_router
from app.api.routes_inventory import router as inventory_router
from app.api.routes_kot import router as kot_router
from app.config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-powered revenue intelligence for restaurants",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.ALLOWED_METHODS,
    allow_headers=settings.ALLOWED_HEADERS,
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info("%s %s → %d (%.1fms)", request.method, request.url.path, response.status_code, elapsed)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(kpi_router, prefix="/kpis", tags=["KPIs"])
app.include_router(menu_router, prefix="/menu", tags=["Menu Intelligence"])
app.include_router(combo_router, prefix="/combos", tags=["Combo & Upsell Engine"])
app.include_router(voice_router, prefix="/voice", tags=["Voice Copilot"])
app.include_router(order_router, prefix="/order", tags=["Order / PoS"])
app.include_router(price_router, prefix="/price", tags=["Price Optimization"])
app.include_router(ai_router, prefix="/ai", tags=["AI Strategy & Insights"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(call_router, prefix="/call", tags=["Phone Call Agent"])
app.include_router(inventory_router, prefix="/inventory", tags=["Inventory Signals"])
app.include_router(kot_router, prefix="/kot", tags=["Kitchen Order Tickets"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
