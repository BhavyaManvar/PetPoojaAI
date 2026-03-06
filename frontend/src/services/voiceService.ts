import { ENDPOINTS } from "./endpoints";

// ── Voice Order Types ───────────────────────────────────────────────────────

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
  strategy: string | null;
  reason: string;
}

export interface VoiceOrderState {
  intent: string;
  items: VoiceOrderItem[];
  upsells: VoiceUpsellSuggestion[];
  message: string;
  order_status: "in_progress" | "confirmed" | "cancelled";
}

// ── Backend Chat Response ───────────────────────────────────────────────────

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

// ── Main Parser — calls backend /voice/chat ─────────────────────────────────

export async function parseVoiceInput(
  transcript: string,
  currentState?: VoiceOrderState
): Promise<VoiceOrderState> {
  const res = await fetch(ENDPOINTS.voiceChat, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: transcript }),
  });
  if (!res.ok) {
    return {
      intent: "error",
      items: currentState?.items || [],
      upsells: [],
      message: "Something went wrong connecting to the server. Please try again.",
      order_status: "in_progress",
    };
  }

  const data: BackendChatResponse = await res.json();
  // Handle confirmation
  if (data.intent === "CONFIRM_ORDER") {
    if (currentState && currentState.items.length > 0) {
      return {
        intent: "confirmation",
        items: currentState.items,
        upsells: [],
        message: "Order confirmed! Processing your order now.",
        order_status: "confirmed",
      };
    }
    return {
      intent: "clarification",
      items: [],
      upsells: [],
      message: "You haven't added any items yet. What would you like to order?",
      order_status: "in_progress",
    };
  }

  // Handle remove intent
  if (data.intent === "REMOVE_ITEM") {
    return {
      intent: "remove",
      items: currentState?.items || [],
      upsells: [],
      message: data.message,
      order_status: "in_progress",
    };
  }

  // Map backend items to frontend format
  const newItems: VoiceOrderItem[] = data.items.map((i) => ({
    item_id: i.item_id,
    name: i.item_name,
    quantity: i.qty,
    unit_price: i.unit_price,
    line_total: i.line_total,
    confidence: i.confidence,
  }));

  // Merge with existing items
  const allItems = [...(currentState?.items || [])];
  for (const ni of newItems) {
    const existing = allItems.find((e) => e.item_id === ni.item_id);
    if (existing) {
      existing.quantity += ni.quantity;
      existing.line_total = existing.unit_price * existing.quantity;
    } else {
      allItems.push(ni);
    }
  }
  return {
    intent: newItems.length > 0 ? "order" : "clarification",
    items: allItems,
    upsells: data.upsells ?? [],
    message: data.message,
    order_status: "in_progress",
  };
}

// ── Place Order via Backend ─────────────────────────────────────────────────

export async function placeOrderViaBackend(
  items: VoiceOrderItem[]
): Promise<{ order_id: number; total_price: number }> {
  const res = await fetch(ENDPOINTS.orderPush, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((i) => ({ item_id: i.item_id, qty: i.quantity })),
    }),
  });

  if (!res.ok) throw new Error(`Order failed: ${res.status}`);
  return res.json();
}

// ── Sarvam AI Integration (kept for optional audio support) ─────────────────

const SARVAM_API_BASE = "https://api.sarvam.ai";

export async function sarvamSTT(audioBlob: Blob): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_SARVAM_API_KEY;
  if (!apiKey) {
    console.warn("Sarvam API key not set — skipping STT");
    return "";
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.wav");
  formData.append("language_code", "hi-IN");
  formData.append("model", "saarika:v2");

  const res = await fetch(`${SARVAM_API_BASE}/speech-to-text`, {
    method: "POST",
    headers: {
      "API-Subscription-Key": apiKey,
    },
    body: formData,
  });

  if (!res.ok) throw new Error(`Sarvam STT error: ${res.status}`);
  const data = await res.json();
  return data.transcript || "";
}

export async function sarvamTTS(text: string): Promise<Blob> {
  const apiKey = process.env.NEXT_PUBLIC_SARVAM_API_KEY;
  if (!apiKey) {
    console.warn("Sarvam API key not set — skipping TTS");
    return new Blob();
  }

  const res = await fetch(`${SARVAM_API_BASE}/text-to-speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Subscription-Key": apiKey,
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: "hi-IN",
      speaker: "meera",
      model: "bulbul:v1",
    }),
  });

  if (!res.ok) throw new Error(`Sarvam TTS error: ${res.status}`);
  const data = await res.json();

  // Decode base64 audio
  const audioBase64 = data.audios?.[0];
  if (!audioBase64) throw new Error("No audio in Sarvam TTS response");

  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: "audio/wav" });
}
