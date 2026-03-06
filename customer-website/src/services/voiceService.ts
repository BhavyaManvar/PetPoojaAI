import { API, fetchJSON } from '@/lib/api';

export interface VoiceOrderItem {
  item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  confidence: number;
}

export interface VoiceUpsellSuggestion {
  item_name: string;
  recommended_addon: string | null;
  addon_id: number | null;
  addon_price: number | null;
  discount_percent: number;
  discounted_price: number | null;
  strategy: string | null;
  recommended_category: string | null;
  reason: string;
}

interface BackendChatItem {
  item_id: number;
  item_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
  confidence: number;
}

interface BackendChatResponse {
  intent: string;
  items: BackendChatItem[];
  upsells?: VoiceUpsellSuggestion[];
  message: string;
  language: string;
}

export async function parseVoiceInput(
  transcript: string,
): Promise<{ items: VoiceOrderItem[]; upsells: VoiceUpsellSuggestion[] }> {
  const res = await fetch(API.voiceChat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: transcript }),
  });
  if (!res.ok) return { items: [], upsells: [] };

  const data: BackendChatResponse = await res.json();
  const items: VoiceOrderItem[] = data.items.map((i) => ({
    item_id: i.item_id,
    name: i.item_name,
    quantity: i.qty,
    unit_price: i.unit_price,
    line_total: i.line_total,
    confidence: i.confidence,
  }));
  return { items, upsells: data.upsells ?? [] };
}

export async function placeOrderViaBackend(
  items: VoiceOrderItem[],
): Promise<{ order_id: number; total_price: number }> {
  return fetchJSON(API.orderPush, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map((i) => ({ item_id: i.item_id, qty: i.quantity })),
      order_source: 'voice',
    }),
  });
}
