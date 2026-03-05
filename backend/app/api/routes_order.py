"""Order / PoS endpoints — push confirmed orders."""

from fastapi import APIRouter, Depends
import pandas as pd

from app.dependencies import get_dataframes
from app.models.order_models import OrderRequest, OrderResponse
from app.services.order_service import create_order

router = APIRouter()


@router.post("/push", response_model=OrderResponse)
async def push_order(
    payload: OrderRequest,
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Push a confirmed order to the PoS system.

    
    Accepts a list of ``item_id`` / ``qty`` pairs, validates them
    against the menu, and returns the order confirmation with
    line-level pricing.
    """
    items = [{"item_id": line.item_id, "qty": line.qty} for line in payload.items]
    result = create_order(items, dfs["menu"])
    return OrderResponse(**result)
