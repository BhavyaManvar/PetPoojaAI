"""Order / PoS endpoints — create, list, and seed orders."""

from fastapi import APIRouter, Depends, Query
import pandas as pd

from app.dependencies import get_dataframes
from app.models.order_models import (
    OrderRequest,
    OrderResponse,
    OrderListResponse,
    SeedRequest,
    SeedResponse,
)
from app.services.order_service import (
    create_order,
    get_all_orders,
    get_order_by_id,
    get_order_count,
    seed_demo_orders,
)

router = APIRouter()


@router.post("/push", response_model=OrderResponse)
async def push_order(
    payload: OrderRequest,
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Push a confirmed order to the PoS system."""
    items = [{"item_id": line.item_id, "qty": line.qty} for line in payload.items]
    result = create_order(items, dfs["menu"], order_source=payload.order_source)
    return OrderResponse(**result)


@router.get("/list", response_model=OrderListResponse)
async def list_orders(
    limit: int = Query(50, ge=1, le=500, description="Max orders to return"),
):
    """List recent orders (newest first)."""
    orders = get_all_orders(limit)
    return OrderListResponse(
        orders=[OrderResponse(**o) for o in orders],
        total=get_order_count(),
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int):
    """Get a single order by ID."""
    order = get_order_by_id(order_id)
    if order is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return OrderResponse(**order)


@router.post("/seed", response_model=SeedResponse)
async def seed_orders(
    payload: SeedRequest = SeedRequest(),
    dfs: dict[str, pd.DataFrame] = Depends(get_dataframes),
):
    """Generate realistic demo orders for testing."""
    orders = seed_demo_orders(dfs["menu"], count=payload.count)
    return SeedResponse(
        seeded=len(orders),
        message=f"Created {len(orders)} demo orders with real menu items",
    )
