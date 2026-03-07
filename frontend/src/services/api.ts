import { ENDPOINTS } from "./endpoints";
import type { KPIData, Combo, UpsellResult, OrderResponse, OrderLineItem, TopCombosResponse, PriceRecommendation, PriceSummary, VoiceParseResponse } from "@/types/order";
import type { MenuItem, CustomerMenuItem } from "@/types/menu";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// ── Customer Menu ───────────────────────────────────────────────────────────────
export async function fetchMenuItems(category?: string): Promise<{ items: CustomerMenuItem[]; categories: string[] }> {
  const url = category
    ? `${ENDPOINTS.menuItems}?category=${encodeURIComponent(category)}`
    : ENDPOINTS.menuItems;
  return fetchJSON(url);
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

// ── Admin Menu ──────────────────────────────────────────────────────────────────
export interface AdminMenuItem {
  item_id: number;
  item_name: string;
  category: string;
  price: number;
  cost: number;
  margin: number;
  margin_pct: number;
  monthly_sales: number;
  is_available: boolean;
}

export async function fetchAdminMenuList(category?: string): Promise<{
  items: AdminMenuItem[];
  categories: string[];
  total: number;
}> {
  const url = category
    ? `${ENDPOINTS.menuAdminList}?category=${encodeURIComponent(category)}`
    : ENDPOINTS.menuAdminList;
  return fetchJSON(url);
}

export async function updateMenuItemPrice(
  itemId: number,
  price: number
): Promise<{ item_id: number; item_name: string; old_price: number; new_price: number; margin: number; margin_pct: number }> {
  return fetchJSON(ENDPOINTS.menuAdminUpdatePrice(itemId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price }),
  });
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

export async function clearUpsellHistory(itemId?: number): Promise<void> {
  const url = itemId != null
    ? `${ENDPOINTS.upsellClearHistory}?item_id=${itemId}`
    : ENDPOINTS.upsellClearHistory;
  await fetchJSON<{ status: string }>(url, { method: "POST" });
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

export async function seedOrders(count = 25): Promise<{ seeded: number; message: string }> {
  return fetchJSON(ENDPOINTS.orderSeed, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
}

// ── Inventory Signals ───────────────────────────────────────────────────────────
export interface InventoryItem {
  item_id: number;
  item_name: string;
  category: string;
  menu_class: string;
  price: number;
  cost: number;
  unit_margin: number;
  total_qty_sold: number;
  avg_daily_sales: number;
  current_stock: number;
  reorder_point: number;
  par_level: number;
  stock_status: string;
  days_until_stockout: number | null;
  signal: string;
  signal_severity: string;
  signal_message: string;
  action: string;
}

export interface InventorySummary {
  total_items: number;
  out_of_stock: number;
  low_stock: number;
  adequate: number;
  overstock: number;
  critical_alerts: number;
  warning_alerts: number;
  dead_stock_value: number;
  at_risk_revenue_7d: number;
}

export async function fetchInventoryItems(opts?: {
  category?: string;
  stock_status?: string;
  severity?: string;
}): Promise<{ items: InventoryItem[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.category) params.set("category", opts.category);
  if (opts?.stock_status) params.set("stock_status", opts.stock_status);
  if (opts?.severity) params.set("severity", opts.severity);
  const qs = params.toString();
  const url = qs ? `${ENDPOINTS.inventoryItems}?${qs}` : ENDPOINTS.inventoryItems;
  return fetchJSON(url);
}

export function fetchInventorySummary(): Promise<InventorySummary> {
  return fetchJSON<InventorySummary>(ENDPOINTS.inventorySummary);
}

export async function fetchInventoryAlerts(): Promise<{ alerts: InventoryItem[]; total: number }> {
  return fetchJSON(ENDPOINTS.inventoryAlerts);
}

// ── KOT (Kitchen Order Tickets) ─────────────────────────────────────────────────
export interface KotItem {
  item_name: string;
  qty: number;
  station: string;
  modifiers: string;
  item_status: string;
  prep_time_min: number;
}

export interface Kot {
  kot_id: string;
  order_id: number;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  stations: string[];
  estimated_prep_min: number;
  order_source: string;
  delivery_address: string;
  items: KotItem[];
}

export interface KotStats {
  total: number;
  received: number;
  preparing: number;
  ready: number;
  served: number;
  avg_prep_time_min: number;
}

export async function fetchActiveKots(): Promise<{ kots: Kot[]; total: number }> {
  return fetchJSON(ENDPOINTS.kotActive);
}

export async function fetchAllKots(limit = 100): Promise<{ kots: Kot[]; total: number }> {
  return fetchJSON(`${ENDPOINTS.kotList}?limit=${limit}`);
}

export async function fetchKotStats(): Promise<KotStats> {
  return fetchJSON(ENDPOINTS.kotStats);
}

export async function updateKotStatus(kotId: string, status: string): Promise<Kot> {
  return fetchJSON(ENDPOINTS.kotUpdateStatus(kotId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}
