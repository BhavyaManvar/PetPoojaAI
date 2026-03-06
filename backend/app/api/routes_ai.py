"""AI Insights & Strategy Chatbot routes."""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.dependencies import get_dataframes
from app.services.strategy_chatbot import chat, _build_context, generate_response
from app.services.revenue_engine import classify_menu_items, find_hidden_stars, get_risk_items, compute_kpis
from app.services.price_engine import get_price_summary

router = APIRouter()


class ChatRequest(BaseModel):
    query: str


class ChatResponse(BaseModel):
    query: str
    response: str
    intent: str


class InsightItem(BaseModel):
    type: str
    title: str
    description: str
    priority: str = "medium"


class InsightsResponse(BaseModel):
    insights: list[InsightItem]


class DashboardSummary(BaseModel):
    total_items: int
    stars: int
    puzzles: int
    plowhorses: int
    dogs: int
    hidden_stars: int
    risk_items: int
    items_to_increase: int
    items_to_decrease: int
    total_monthly_uplift: float


@router.post("/chat", response_model=ChatResponse)
async def strategy_chat(req: ChatRequest, dfs=Depends(get_dataframes)):
    """AI Strategy Chatbot — ask questions about your restaurant."""
    menu_df, order_items_df = dfs["menu"], dfs["order_items"]
    result = chat(req.query, menu_df, order_items_df)
    return ChatResponse(**result)


@router.get("/insights", response_model=InsightsResponse)
async def get_ai_insights(dfs=Depends(get_dataframes)):
    """Auto-generated AI insights for the dashboard."""
    menu_df, order_items_df = dfs["menu"], dfs["order_items"]
    ctx = _build_context(menu_df, order_items_df)

    insights: list[InsightItem] = []

    # Hidden star opportunities
    for star in ctx["hidden_stars"][:3]:
        name = star.get("item") or star.get("item_name", "Item")
        margin = star.get("margin") or star.get("contribution_margin", 0)
        insights.append(InsightItem(
            type="opportunity",
            title=f"Promote {name}",
            description=f"{name} has a high margin of ₹{margin:.0f} but low sales. Consider combo offers or prominent menu placement.",
            priority="high",
        ))

    # Risk items
    for dog in ctx["dogs"][:2]:
        name = dog.get("item_name", "Item")
        insights.append(InsightItem(
            type="risk",
            title=f"Review {name}",
            description=f"{name} has both low margin and low sales. Consider removing it or adjusting the price.",
            priority="medium",
        ))

    # Combo suggestions
    for combo in ctx["combos"][:2]:
        a, b = combo.get("item_a", ""), combo.get("item_b", "")
        lift = combo.get("lift", 0)
        insights.append(InsightItem(
            type="combo",
            title=f"Bundle {a} + {b}",
            description=f"Customers frequently order these together (lift: {lift:.1f}x). Create a combo deal to boost average order value.",
            priority="high",
        ))

    # Price optimization
    ps = ctx["price_summary"]
    if ps.get("items_to_increase", 0) > 3:
        insights.append(InsightItem(
            type="pricing",
            title="Price Optimization Available",
            description=f"{ps['items_to_increase']} items can be priced higher for an estimated ₹{ps.get('total_monthly_uplift', 0):,.0f}/month uplift.",
            priority="high",
        ))

    return InsightsResponse(insights=insights)


@router.get("/dashboard-summary", response_model=DashboardSummary)
async def dashboard_summary(dfs=Depends(get_dataframes)):
    """Quick summary for admin dashboard header."""
    menu_df, order_items_df = dfs["menu"], dfs["order_items"]
    classified = classify_menu_items(menu_df, order_items_df)
    hidden = find_hidden_stars(menu_df, order_items_df)
    risk = get_risk_items(menu_df, order_items_df)
    ps = get_price_summary(menu_df, order_items_df)

    count = lambda cls: len([i for i in classified if i.get("menu_class") == cls])

    return DashboardSummary(
        total_items=len(classified),
        stars=count("Star"),
        puzzles=count("Puzzle"),
        plowhorses=count("Plow Horse"),
        dogs=count("Dog"),
        hidden_stars=len(hidden),
        risk_items=len(risk),
        items_to_increase=ps.get("items_to_increase", 0),
        items_to_decrease=ps.get("items_to_decrease", 0),
        total_monthly_uplift=ps.get("total_monthly_uplift", 0),
    )
