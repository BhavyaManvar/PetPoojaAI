import { ENDPOINTS } from "./endpoints";
import type { KPIData, Combo, UpsellResult, VoiceParseResponse, OrderResponse, OrderLineItem, TopCombosResponse, PriceRecommendation, PriceSummary } from "@/types/order";
import type { MenuItem, HiddenStar, RiskItem } from "@/types/menu";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// ── KPIs ────────────────────────────────────────────────────────────────────────
export function fetchKPIs(): Promise<KPIData> {
  return fetchJSON<KPIData>(ENDPOINTS.kpis);
}

// ── Menu Intelligence ───────────────────────────────────────────────────────────
export async function fetchMenuInsights(): Promise<MenuItem[]> {
  const data = await fetchJSON<{ items: MenuItem[] }>(ENDPOINTS.menuInsights);
  return data.items;
}

export async function fetchHiddenStars(): Promise<HiddenStar[]> {
  const data = await fetchJSON<{ hidden_stars: HiddenStar[] }>(ENDPOINTS.hiddenStars);
  return data.hidden_stars;
}

export async function fetchRiskItems(): Promise<RiskItem[]> {
  const data = await fetchJSON<{ risk_items: RiskItem[] }>(ENDPOINTS.riskItems);
  return data.risk_items;
}

// ── Combos & Upsell ─────────────────────────────────────────────────────────────
export async function fetchTopCombos(category?: string): Promise<TopCombosResponse> {
  const url = category
    ? `${ENDPOINTS.topCombos}?category=${encodeURIComponent(category)}`
    : ENDPOINTS.topCombos;
  return fetchJSON<TopCombosResponse>(url);
}

export function fetchUpsell(itemId: number): Promise<UpsellResult> {
  return fetchJSON<UpsellResult>(ENDPOINTS.upsellForItem(itemId));
}

export async function fetchUpsellBatch(itemIds: number[]): Promise<UpsellResult[]> {
  const data = await fetchJSON<{ results: UpsellResult[] }>(ENDPOINTS.upsellBatch, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_ids: itemIds }),
  });
  return data.results;
}

// ── Voice Copilot ───────────────────────────────────────────────────────────────
export function parseVoice(text: string): Promise<VoiceParseResponse> {
  return fetchJSON<VoiceParseResponse>(ENDPOINTS.voiceParse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

// ── Price Optimization ──────────────────────────────────────────────────────────
export async function fetchPriceRecommendations(opts?: {
  category?: string;
  action?: string;
  priority?: string;
}): Promise<PriceRecommendation[]> {
  const params = new URLSearchParams();
  if (opts?.category) params.set("category", opts.category);
  if (opts?.action) params.set("action", opts.action);
  if (opts?.priority) params.set("priority", opts.priority);
  const qs = params.toString();
  const url = qs ? `${ENDPOINTS.priceRecommendations}?${qs}` : ENDPOINTS.priceRecommendations;
  const data = await fetchJSON<{ recommendations: PriceRecommendation[] }>(url);
  return data.recommendations;
}

export function fetchPriceSummary(): Promise<PriceSummary> {
  return fetchJSON<PriceSummary>(ENDPOINTS.priceSummary);
}

// ── Basket Stats ────────────────────────────────────────────────────────────────
export async function fetchBasketStats() {
  return fetchJSON<import("@/types/order").BasketStats>(ENDPOINTS.basketStats);
}

// ── Orders ──────────────────────────────────────────────────────────────────────
export function pushOrder(items: OrderLineItem[], orderSource = "manual"): Promise<OrderResponse> {
  return fetchJSON<OrderResponse>(ENDPOINTS.orderPush, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, order_source: orderSource }),
  });
}

export async function fetchOrders(limit = 50): Promise<{
  orders: (OrderResponse & { order_source?: string; created_at?: string })[];
  total: number;
}> {
  return fetchJSON(ENDPOINTS.orderList + `?limit=${limit}`);
}

export async function fetchOrderById(
  id: number
): Promise<OrderResponse & { order_source?: string; created_at?: string }> {
  return fetchJSON(ENDPOINTS.orderById(id));
}

export async function seedOrders(count = 25): Promise<{ seeded: number; message: string }> {
  return fetchJSON(ENDPOINTS.orderSeed, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
}
