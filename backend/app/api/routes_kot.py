"""KOT (Kitchen Order Ticket) API routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.kot_service import (
    get_all_kots,
    get_active_kots,
    get_kot_by_id,
    get_kot_stats,
    update_kot_status,
    update_kot_item_status,
)

router = APIRouter()


class KotStatusUpdate(BaseModel):
    status: str


class KotItemStatusUpdate(BaseModel):
    item_name: str
    status: str


@router.get("/list")
async def list_kots(limit: int = 100):
    """List all KOTs, newest first."""
    kots = get_all_kots(limit)
    return JSONResponse({"kots": kots, "total": len(kots)})


@router.get("/active")
async def list_active_kots():
    """List only active (non-completed) KOTs for kitchen display."""
    kots = get_active_kots()
    return JSONResponse({"kots": kots, "total": len(kots)})


@router.get("/stats")
async def kot_stats():
    """Kitchen dashboard statistics."""
    return JSONResponse(get_kot_stats())


@router.get("/{kot_id}")
async def get_kot(kot_id: str):
    """Get a single KOT by ID."""
    kot = get_kot_by_id(kot_id)
    if not kot:
        raise HTTPException(status_code=404, detail="KOT not found")
    return JSONResponse(kot)


@router.patch("/{kot_id}/status")
async def patch_kot_status(kot_id: str, body: KotStatusUpdate):
    """Update KOT status: received → preparing → ready → served."""
    updated = update_kot_status(kot_id, body.status)
    if not updated:
        raise HTTPException(status_code=404, detail="KOT not found or invalid status")
    return JSONResponse(updated)


@router.patch("/{kot_id}/item-status")
async def patch_kot_item_status(kot_id: str, body: KotItemStatusUpdate):
    """Update individual item status within a KOT."""
    updated = update_kot_item_status(kot_id, body.item_name, body.status)
    if not updated:
        raise HTTPException(status_code=404, detail="KOT or item not found")
    return JSONResponse(updated)
