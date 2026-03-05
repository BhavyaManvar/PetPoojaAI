import { ENDPOINTS } from "./endpoints";
import type { KPIData, Combo, UpsellResult, VoiceParseResponse, OrderResponse, OrderLineItem } from "@/types/order";
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
export async function fetchTopCombos(): Promise<Combo[]> {
  const data = await fetchJSON<{ combos: Combo[] }>(ENDPOINTS.topCombos);
  return data.combos;
}

export function fetchUpsell(itemId: number): Promise<UpsellResult> {
  return fetchJSON<UpsellResult>(ENDPOINTS.upsellForItem(itemId));
}

// ── Voice Copilot ───────────────────────────────────────────────────────────────
export function parseVoice(text: string): Promise<VoiceParseResponse> {
  return fetchJSON<VoiceParseResponse>(ENDPOINTS.voiceParse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

// ── Orders ──────────────────────────────────────────────────────────────────────
export function pushOrder(items: OrderLineItem[]): Promise<OrderResponse> {
  return fetchJSON<OrderResponse>(ENDPOINTS.orderPush, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}
