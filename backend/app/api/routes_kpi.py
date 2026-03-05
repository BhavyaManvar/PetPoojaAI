"""KPI endpoints — high-level business metrics."""

from fastapi import APIRouter, Depends
import pandas as pd

from app.dependencies import get_dataframes
from app.models.menu_models import KPIResponse
from app.services.revenue_engine import compute_kpis

router = APIRouter()


@router.get("", response_model=KPIResponse)
async def get_kpis(dfs: dict[str, pd.DataFrame] = Depends(get_dataframes)):
    return compute_kpis(dfs["orders"], dfs["order_items"])
