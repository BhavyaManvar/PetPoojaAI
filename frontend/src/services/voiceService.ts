import { getMenuItems, type MenuItemDoc } from "./menuService";
import { getUpsellRules, type UpsellRule } from "./analyticsService";

// ── Voice Order JSON Schema ─────────────────────────────────────────────────

export interface VoiceOrderItem {
  name: string;
  quantity: number;
  modifiers: {
    size: string | null;
    spice_level: string | null;
    addons: string[];
  };
}

export interface VoiceOrderState {
  intent: "order" | "clarification" | "confirmation";
  items: VoiceOrderItem[];
  upsell_suggestion: string | null;
  message: string;
  order_status: "in_progress" | "confirmed" | "cancelled";
}

// ── Intent Detection (no AI API — pure logic) ──────────────────────────────

const CONFIRM_WORDS = [
  "yes", "yeah", "yep", "confirm", "ok", "okay", "sure", "done",
  "that's it", "place order", "go ahead", "correct", "right", "haan",
];

const CANCEL_WORDS = [
  "no", "cancel", "remove", "stop", "nevermind", "nahi",
];

const CLARIFY_WORDS = [
  "what", "which", "how much", "price", "do you have", "options",
  "menu", "available", "tell me", "suggest",
];

const SIZE_WORDS: Record<string, string> = {
  small: "small",
  medium: "medium",
  large: "large",
  regular: "medium",
  half: "small",
  full: "large",
};

const SPICE_WORDS: Record<string, string> = {
  mild: "mild",
  medium: "medium",
  spicy: "spicy",
  "extra spicy": "extra_spicy",
  "no spice": "none",
  "less spice": "mild",
};

function detectIntent(text: string): "order" | "clarification" | "confirmation" {
  const lower = text.toLowerCase().trim();

  if (CONFIRM_WORDS.some((w) => lower.includes(w))) return "confirmation";
  if (CLARIFY_WORDS.some((w) => lower.includes(w))) return "clarification";
  return "order";
}

// ── Number Parsing ──────────────────────────────────────────────────────────

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ek: 1, do: 2, teen: 3, char: 4, panch: 5,
  a: 1, an: 1,
};

function parseQuantity(text: string): number {
  const match = text.match(/\d+/);
  if (match) return parseInt(match[0], 10);

  for (const [word, num] of Object.entries(WORD_NUMBERS)) {
    if (text.toLowerCase().includes(word)) return num;
  }
  return 1;
}

// ── Fuzzy Menu Matching ─────────────────────────────────────────────────────

function similarity(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 1;
  if (la.includes(lb) || lb.includes(la)) return 0.8;

  // Simple token overlap
  const tokensA = la.split(/\s+/);
  const tokensB = lb.split(/\s+/);
  const intersection = tokensA.filter((t) => tokensB.includes(t));
  const union = new Set([...tokensA, ...tokensB]);
  return intersection.length / union.size;
}

function findBestMatch(
  text: string,
  menuItems: MenuItemDoc[]
): MenuItemDoc | null {
  let best: MenuItemDoc | null = null;
  let bestScore = 0;

  for (const mi of menuItems) {
    const score = similarity(text, mi.name);
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      best = mi;
    }
  }
  return best;
}

// ── Extract Modifiers ───────────────────────────────────────────────────────

function extractModifiers(text: string): VoiceOrderItem["modifiers"] {
  const lower = text.toLowerCase();
  let size: string | null = null;
  let spice_level: string | null = null;
  const addons: string[] = [];

  for (const [word, val] of Object.entries(SIZE_WORDS)) {
    if (lower.includes(word)) {
      size = val;
      break;
    }
  }

  for (const [word, val] of Object.entries(SPICE_WORDS)) {
    if (lower.includes(word)) {
      spice_level = val;
      break;
    }
  }

  const addonPatterns = [
    "extra cheese", "cheese", "butter", "onion", "paneer",
    "mushroom", "corn", "olives", "jalapeno",
  ];
  for (const addon of addonPatterns) {
    if (lower.includes(addon)) addons.push(addon);
  }

  return { size, spice_level, addons };
}

// ── Main Voice Parser ───────────────────────────────────────────────────────

export async function parseVoiceInput(
  transcript: string,
  currentState?: VoiceOrderState
): Promise<VoiceOrderState> {
  const intent = detectIntent(transcript);
  const menuItems = await getMenuItems();

  // Handle confirmation
  if (intent === "confirmation") {
    if (currentState && currentState.items.length > 0) {
      return {
        ...currentState,
        intent: "confirmation",
        message: "Order confirmed! Processing your order now.",
        order_status: "confirmed",
      };
    }
    return {
      intent: "clarification",
      items: currentState?.items || [],
      upsell_suggestion: null,
      message: "You haven't added any items yet. What would you like to order?",
      order_status: "in_progress",
    };
  }

  // Handle clarification
  if (intent === "clarification") {
    const categories = [...new Set(menuItems.map((m) => m.category))];
    return {
      intent: "clarification",
      items: currentState?.items || [],
      upsell_suggestion: null,
      message: `We have items in: ${categories.join(", ")}. What would you like?`,
      order_status: "in_progress",
    };
  }

  // Parse order items — split by "and" or commas
  const segments = transcript
    .split(/\band\b|,/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const newItems: VoiceOrderItem[] = [];

  for (const segment of segments) {
    const qty = parseQuantity(segment);
    const match = findBestMatch(segment, menuItems);

    if (match) {
      const modifiers = extractModifiers(segment);
      newItems.push({
        name: match.name,
        quantity: qty,
        modifiers,
      });
    }
  }

  const allItems = [...(currentState?.items || [])];

  // Merge or add new items
  for (const ni of newItems) {
    const existing = allItems.find(
      (e) => e.name.toLowerCase() === ni.name.toLowerCase()
    );
    if (existing) {
      existing.quantity += ni.quantity;
    } else {
      allItems.push(ni);
    }
  }

  // Generate upsell suggestion
  let upsellSuggestion: string | null = null;
  if (allItems.length > 0) {
    try {
      const rules = await getUpsellRules();
      for (const item of allItems) {
        const rule = rules.find(
          (r) => r.base_item.toLowerCase() === item.name.toLowerCase()
        );
        if (rule && !allItems.find((a) => a.name.toLowerCase() === rule.suggested_item.toLowerCase())) {
          upsellSuggestion = rule.suggested_item;
          break;
        }
      }
    } catch {
      // Upsell is best-effort
    }
  }

  const message =
    newItems.length > 0
      ? `Added ${newItems.map((i) => `${i.quantity}x ${i.name}`).join(", ")} to your order.${upsellSuggestion ? ` Would you also like to try ${upsellSuggestion}?` : " Anything else?"}`
      : "I couldn't find that on the menu. Could you repeat your order?";

  return {
    intent: newItems.length > 0 ? "order" : "clarification",
    items: allItems,
    upsell_suggestion: upsellSuggestion,
    message,
    order_status: "in_progress",
  };
}

// ── Sarvam AI Integration ───────────────────────────────────────────────────

const SARVAM_API_BASE = "https://api.sarvam.ai";

export async function sarvamSTT(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.wav");
  formData.append("language_code", "hi-IN");
  formData.append("model", "saarika:v2");

  const res = await fetch(`${SARVAM_API_BASE}/speech-to-text`, {
    method: "POST",
    headers: {
      "API-Subscription-Key": process.env.NEXT_PUBLIC_SARVAM_API_KEY || "",
    },
    body: formData,
  });

  if (!res.ok) throw new Error(`Sarvam STT error: ${res.status}`);
  const data = await res.json();
  return data.transcript || "";
}

export async function sarvamTTS(text: string): Promise<Blob> {
  const res = await fetch(`${SARVAM_API_BASE}/text-to-speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Subscription-Key": process.env.NEXT_PUBLIC_SARVAM_API_KEY || "",
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
