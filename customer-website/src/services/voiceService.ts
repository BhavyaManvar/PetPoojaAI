import { API, fetchJSON } from '@/lib/api';

export interface VoiceOrderItem {
  item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  confidence: number;
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
  message: string;
  language: string;
}

export async function parseVoiceInput(transcript: string): Promise<{ items: VoiceOrderItem[] }> {
  const res = await fetch(API.voiceChat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: transcript }),
  });
  if (!res.ok) return { items: [] };

  const data: BackendChatResponse = await res.json();
  const items: VoiceOrderItem[] = data.items.map((i) => ({
    item_id: i.item_id,
    name: i.item_name,
    quantity: i.qty,
    unit_price: i.unit_price,
    line_total: i.line_total,
    confidence: i.confidence,
  }));
  return { items };
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
