"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, Check, Plus, X, Sparkles } from "lucide-react";
import { formatCurrency } from "@/utils/helpers";
import {
  parseVoiceInput,
  placeOrderViaBackend,
  VoiceOrderItem,
  VoiceUpsellSuggestion,
} from "@/services/voiceService";
import { ENDPOINTS } from "@/services/endpoints";

// Category → emoji + color config for combo cards
const CATEGORY_STYLE: Record<string, { emoji: string; bg: string; border: string; badge: string; text: string }> = {
  Beverages: { emoji: "🥤", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", text: "text-blue-700" },
  Sides:     { emoji: "🍟", bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", text: "text-orange-700" },
  Desserts:  { emoji: "🍰", bg: "bg-pink-50", border: "border-pink-200", badge: "bg-pink-100 text-pink-700", text: "text-pink-700" },
  Combo:     { emoji: "🎁", bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700", text: "text-purple-700" },
  Breads:    { emoji: "🫓", bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", text: "text-amber-700" },
  Rice:      { emoji: "🍚", bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700", text: "text-yellow-700" },
};
const DEFAULT_STYLE = { emoji: "⭐", bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" };

function getCategoryStyle(category: string | null | undefined) {
  if (!category) return DEFAULT_STYLE;
  return CATEGORY_STYLE[category] ?? DEFAULT_STYLE;
}

// Fetch next upsell suggestion from the combo engine (anti-repeat via server history)
async function fetchUpsellForItem(itemId: number): Promise<VoiceUpsellSuggestion | null> {
  try {
    const res = await fetch(ENDPOINTS.upsellForItem(itemId));
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.recommended_addon) return null;
    const rawPrice = data.price ?? null;
    const discountPct = 5;
    const discPrice = rawPrice != null ? Math.round(rawPrice * (1 - discountPct / 100) * 100) / 100 : null;
    return {
      item_name: data.item ?? '',
      recommended_addon: data.recommended_addon,
      addon_id: data.addon_id,
      addon_price: rawPrice,
      discount_percent: discountPct,
      discounted_price: discPrice,
      strategy: data.strategy ?? null,
      recommended_category: data.recommended_category ?? null,
      reason: data.message ?? `Add ${data.recommended_addon} for ₹${data.price}`,
    };
  } catch {
    return null;
  }
}

export default function VoiceOrderPage() {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [cartItems, setCartItems] = useState<VoiceOrderItem[]>([]);
  // primaryItemId: the item we base suggestions on (first ordered item)
  const [primaryItemId, setPrimaryItemId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<VoiceUpsellSuggestion[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleMicToggle = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => stream.getTracks().forEach((t) => t.stop());
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      // mic unavailable
    }
  }, [isRecording]);

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      // Call /voice/chat — returns items + upsells already computed
      const result = await parseVoiceInput(text);
      if (result.items.length === 0) return;

      // Merge into cart
      setCartItems((prev) => {
        const updated = [...prev];
        for (const ni of result.items) {
          const existing = updated.find((e) => e.item_id === ni.item_id);
          if (existing) {
            existing.quantity += ni.quantity;
            existing.line_total = existing.unit_price * existing.quantity;
          } else {
            updated.push(ni);
          }
        }
        return updated;
      });

      // Primary item for suggestion tracking
      const pid = result.items[0].item_id;
      setPrimaryItemId(pid);

      // Use all suggestions returned by /voice/chat (one per compatible category)
      const upsells = (result.upsells ?? []).filter((u) => u.recommended_addon);
      setSuggestions(upsells);
    } catch {
      // parse error — keep whatever was in cart
    } finally {
      setLoading(false);
    }
  };

  // User clicks "Add" on a suggestion
  const handleAddSuggestion = (index: number) => {
    const s = suggestions[index];
    if (!s?.addon_id) return;
    const price = s.discounted_price ?? s.addon_price ?? 0;
    setCartItems((prev) => {
      const updated = [...prev];
      const existing = updated.find((e) => e.item_id === s.addon_id);
      if (existing) {
        existing.quantity += 1;
        existing.line_total = existing.unit_price * existing.quantity;
      } else {
        updated.push({
          item_id: s.addon_id!,
          name: s.recommended_addon!,
          quantity: 1,
          unit_price: price,
          line_total: price,
          confidence: 100,
        });
      }
      return updated;
    });
    // Remove this suggestion from the list
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  // User clicks "Skip" on a suggestion
  const handleSkipSuggestion = (index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setLoading(true);
    try {
      const result = await placeOrderViaBackend(cartItems);
      setOrderId(result?.order_id ?? null);
      setOrderPlaced(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const orderTotal = cartItems.reduce((t, i) => t + i.unit_price * i.quantity, 0);

  if (orderPlaced) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
          <Check className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Order Placed!</h2>
        {orderId && <p className="text-sm text-text-muted mb-8">Order #{orderId}</p>}
        <button
          onClick={() => {
            setOrderPlaced(false);
            setCartItems([]);
            setSuggestions([]);
            setPrimaryItemId(null);
            setText("");
          }}
          className="rounded-xl bg-btn px-6 py-3 text-sm font-medium text-white hover:bg-btn-hover transition-colors"
        >
          New Order
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Voice Ordering</h1>
        <p className="text-sm text-text-muted mt-1">
          Speak or type your order in English, Hindi, or Hinglish
        </p>
      </div>

      {/* Input area */}
      <div className="rounded-2xl bg-white border border-surface-border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleMicToggle}
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
              isRecording
                ? "bg-red-500 text-white animate-pulse"
                : "bg-surface-bg text-text-secondary hover:bg-surface-border"
            }`}
          >
            {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {isRecording ? "Listening..." : "Tap to speak"}
            </p>
            <p className="text-xs text-text-muted">Or type your order below</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleParse()}
            placeholder='e.g. "Two Margherita Pizza"'
            className="flex-1 rounded-xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleParse}
            disabled={loading || !text.trim()}
            className="rounded-xl bg-btn px-5 py-3 text-white hover:bg-btn-hover transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {["Two Margherita Pizza", "One paneer pizza and two coke", "Ek masala dosa aur teen chai"].map((phrase) => (
            <button
              key={phrase}
              onClick={() => setText(phrase)}
              className="rounded-lg bg-surface-bg px-3 py-1.5 text-xs text-text-muted hover:bg-surface-border transition-colors"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>

      {/* Cart + Suggestion */}
      <AnimatePresence>
        {cartItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl bg-white border border-surface-border p-6 space-y-5"
          >
            {/* Cart items */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Your Order</h3>
              <div className="space-y-2">
                {cartItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-surface-bg px-4 py-3">
                    <p className="text-sm font-medium text-text-primary">{item.name}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-text-muted">×{item.quantity}</span>
                      <span className="text-sm font-semibold text-text-primary">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-sm font-semibold text-text-primary border-t border-surface-border pt-3">
                <span>Total</span>
                <span>{formatCurrency(orderTotal)}</span>
              </div>
            </div>

            {/* AI Suggestions — One per compatible category */}
            <AnimatePresence mode="sync">
              {suggestionLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-dashed border-surface-border p-6 text-center"
                >
                  <Sparkles className="h-5 w-5 text-accent mx-auto mb-2" />
                  <p className="text-xs text-text-muted mb-3">Finding the perfect combos for you…</p>
                  <div className="flex justify-center gap-1.5">
                    {[0, 120, 240].map((d) => (
                      <div key={d} className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </motion.div>
              ) : suggestions.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <p className="text-xs font-semibold text-accent uppercase tracking-wide">Recommended for you</p>
                  </div>
                  <div className="space-y-3">
                    {suggestions.map((s, idx) => {
                      const style = getCategoryStyle(s.recommended_category);
                      return (
                        <motion.div
                          key={`${s.addon_id}-${s.recommended_category}`}
                          initial={{ opacity: 0, scale: 0.95, y: 12 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -12 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25, delay: idx * 0.05 }}
                        >
                          <div className={`rounded-2xl border-2 ${style.border} ${style.bg} overflow-hidden transition-all hover:shadow-md`}>
                            <div className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${style.badge} text-xl`}>
                                  {style.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {s.recommended_category && (
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.badge} mb-1`}>
                                      {s.recommended_category}
                                    </span>
                                  )}
                                  <h4 className="text-sm font-bold text-text-primary truncate">{s.recommended_addon}</h4>
                                  <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{s.reason}</p>
                                </div>
                                {s.addon_price != null && (
                                  <div className="flex-shrink-0 text-right">
                                    <p className="text-[11px] text-text-muted line-through">{formatCurrency(s.addon_price)}</p>
                                    <p className={`text-base font-bold ${style.text}`}>{formatCurrency(s.discounted_price ?? s.addon_price)}</p>
                                    <span className="inline-block mt-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">{s.discount_percent}% OFF</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex border-t border-inherit">
                              <button
                                onClick={() => handleSkipSuggestion(idx)}
                                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-text-muted hover:bg-white/60 transition-colors border-r border-inherit"
                              >
                                <X className="h-3 w-3" /> Skip
                              </button>
                              <button
                                onClick={() => handleAddSuggestion(idx)}
                                className="flex-[2] flex items-center justify-center gap-1 py-2.5 text-sm font-bold text-white bg-btn hover:bg-btn-hover transition-colors rounded-br-2xl"
                              >
                                <Plus className="h-3.5 w-3.5" /> Add
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </AnimatePresence>

            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full rounded-xl bg-btn py-3.5 text-sm font-semibold text-white hover:bg-btn-hover transition-colors disabled:opacity-50"
            >
              {loading ? "Placing..." : "Confirm & Place Order"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
