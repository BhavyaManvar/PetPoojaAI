"""PetPooja AI Revenue Copilot — FastAPI Application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_kpi import router as kpi_router
from app.api.routes_menu import router as menu_router
from app.api.routes_combo import router as combo_router
from app.api.routes_voice import router as voice_router
from app.api.routes_order import router as order_router
from app.config import settings

app = FastAPI(
    title="PetPooja AI Revenue Copilot",
    version="1.0.0",
    description="AI-powered revenue intelligence for restaurants",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(kpi_router, prefix="/kpis", tags=["KPIs"])
app.include_router(menu_router, prefix="/menu", tags=["Menu Intelligence"])
app.include_router(combo_router, prefix="/combos", tags=["Combo & Upsell Engine"])
app.include_router(voice_router, prefix="/voice", tags=["Voice Copilot"])
app.include_router(order_router, prefix="/order", tags=["Order / PoS"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
