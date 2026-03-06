import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Check, Plus, X, Sparkles, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { API, formatCurrency } from '@/lib/api';
import {
  parseVoiceInput,
  placeOrderViaBackend,
  type VoiceOrderItem,
  type VoiceUpsellSuggestion,
} from '@/services/voiceService';

// Category → emoji + color for combo cards
const CATEGORY_STYLE: Record<
  string,
  { emoji: string; bg: string; border: string; badge: string; text: string }
> = {
  Beverages: { emoji: '🥤', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-700' },
  Sides:     { emoji: '🍟', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-700' },
  Desserts:  { emoji: '🍰', bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700', text: 'text-pink-700' },
  Combo:     { emoji: '🎁', bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', text: 'text-purple-700' },
  Breads:    { emoji: '🫓', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-700' },
  Rice:      { emoji: '🍚', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-700' },
};
const DEFAULT_STYLE = {
  emoji: '⭐', bg: 'bg-emerald-50', border: 'border-emerald-200',
  badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700',
};

function getCategoryStyle(category: string | null | undefined) {
  if (!category) return DEFAULT_STYLE;
  return CATEGORY_STYLE[category] ?? DEFAULT_STYLE;
}

// Fetch next upsell suggestion from combo engine (anti-repeat via server history)
async function fetchUpsellForItem(itemId: number): Promise<VoiceUpsellSuggestion | null> {
  try {
    const res = await fetch(API.upsellForItem(itemId));
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.recommended_addon) return null;
    return {
      item_name: data.item ?? '',
      recommended_addon: data.recommended_addon,
      addon_id: data.addon_id,
      addon_price: data.price ?? null,
      strategy: data.strategy ?? null,
      recommended_category: data.recommended_category ?? null,
      reason: data.message ?? `Add ${data.recommended_addon} for ₹${data.price}`,
    };
  } catch {
    return null;
  }
}

export default function VoiceOrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [cartItems, setCartItems] = useState<VoiceOrderItem[]>([]);
  const [primaryItemId, setPrimaryItemId] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<VoiceUpsellSuggestion | null>(null);
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
      // Microphone not available
    }
  }, [isRecording]);

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
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

      const pid = result.items[0].item_id;
      setPrimaryItemId(pid);

      // Use suggestion already returned by /voice/chat
      const firstUpsell = result.upsells?.[0] ?? null;
      if (firstUpsell?.recommended_addon) {
        setSuggestion(firstUpsell);
      } else {
        setSuggestionLoading(true);
        const next = await fetchUpsellForItem(pid);
        setSuggestion(next);
        setSuggestionLoading(false);
      }
    } catch {
      // parse error
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestion = async () => {
    if (!suggestion?.addon_id || !primaryItemId) return;
    setCartItems((prev) => {
      const updated = [...prev];
      const existing = updated.find((e) => e.item_id === suggestion.addon_id);
      if (existing) {
        existing.quantity += 1;
        existing.line_total = existing.unit_price * existing.quantity;
      } else {
        updated.push({
          item_id: suggestion.addon_id!,
          name: suggestion.recommended_addon!,
          quantity: 1,
          unit_price: suggestion.addon_price ?? 0,
          line_total: suggestion.addon_price ?? 0,
          confidence: 100,
        });
      }
      return updated;
    });
    setSuggestion(null);
    setSuggestionLoading(true);
    const next = await fetchUpsellForItem(primaryItemId);
    setSuggestion(next);
    setSuggestionLoading(false);
  };

  const handleSkipSuggestion = async () => {
    if (!primaryItemId) return;
    setSuggestion(null);
    setSuggestionLoading(true);
    const next = await fetchUpsellForItem(primaryItemId);
    setSuggestion(next);
    setSuggestionLoading(false);
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    if (!user) {
      navigate('/login');
      return;
    }
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
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl shadow-card p-8 max-w-md w-full text-center"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-zomato-green mx-auto">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-zomato-dark mb-2">Order Placed!</h2>
          {orderId && <p className="text-sm text-zomato-gray mb-1">Order #{orderId}</p>}
          {user && <p className="text-xs text-zomato-gray mb-8">{user.email}</p>}
          <button
            onClick={() => {
              setOrderPlaced(false);
              setCartItems([]);
              setSuggestion(null);
              setPrimaryItemId(null);
              setText('');
            }}
            className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            New Order
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zomato-dark">Voice Ordering</h1>
          <p className="text-sm text-zomato-gray mt-1">
            Speak or type your order in English, Hindi, or Hinglish
          </p>
        </div>

        {/* Voice input area */}
        <div className="rounded-2xl bg-card shadow-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleMicToggle}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-zomato-gray hover:bg-gray-200'
              }`}
            >
              {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-zomato-dark">
                {isRecording ? 'Listening...' : 'Tap to speak'}
              </p>
              <p className="text-xs text-zomato-gray">
                {isRecording ? 'Tap again to stop' : 'Or type your order below'}
              </p>
            </div>
            {isRecording && (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-red-500"
                    style={{
                      animation: `waveform 0.8s ease-in-out ${i * 0.1}s infinite`,
                      height: '4px',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleParse()}
              placeholder='e.g. "Two Margherita Pizza"'
              className="flex-1 rounded-xl border border-zomato-border px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleParse}
              disabled={loading || !text.trim()}
              className="rounded-xl bg-primary px-5 py-3 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {/* Example phrases */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              'Two Margherita Pizza',
              'One paneer pizza and two coke',
              'Ek masala dosa aur teen chai',
            ].map((phrase) => (
              <button
                key={phrase}
                onClick={() => setText(phrase)}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-zomato-gray hover:bg-gray-200 transition-colors"
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
              className="rounded-2xl bg-card shadow-card p-6 space-y-5"
            >
              {/* Cart items */}
              <div>
                <h3 className="text-sm font-semibold text-zomato-dark mb-3">Your Order</h3>
                <div className="space-y-2">
                  {cartItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                    >
                      <p className="text-sm font-medium text-zomato-dark">{item.name}</p>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-zomato-gray">×{item.quantity}</span>
                        <span className="text-sm font-semibold text-zomato-dark">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between text-sm font-semibold text-zomato-dark border-t border-zomato-border pt-3">
                  <span>Total</span>
                  <span>{formatCurrency(orderTotal)}</span>
                </div>
              </div>

              {/* AI Suggestion — Combo Card */}
              <AnimatePresence mode="wait">
                {suggestionLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-dashed border-zomato-border p-6 text-center"
                  >
                    <Sparkles className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-zomato-gray mb-3">
                      Finding the perfect combo for you…
                    </p>
                    <div className="flex justify-center gap-1.5">
                      {[0, 120, 240].map((d) => (
                        <div
                          key={d}
                          className="h-2 w-2 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : suggestion?.recommended_addon
                  ? (() => {
                      const style = getCategoryStyle(suggestion.recommended_category);
                      return (
                        <motion.div
                          key={suggestion.recommended_addon}
                          initial={{ opacity: 0, scale: 0.95, y: 12 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -12 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        >
                          {/* Section header */}
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                              Recommended for you
                            </p>
                          </div>

                          {/* Combo product card */}
                          <div
                            className={`rounded-2xl border-2 ${style.border} ${style.bg} overflow-hidden transition-all hover:shadow-card-hover`}
                          >
                            <div className="p-5">
                              <div className="flex items-start gap-4">
                                {/* Category icon */}
                                <div
                                  className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${style.badge} text-2xl`}
                                >
                                  {style.emoji}
                                </div>

                                {/* Item details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {suggestion.recommended_category && (
                                      <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}
                                      >
                                        {suggestion.recommended_category}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-base font-bold text-zomato-dark truncate">
                                    {suggestion.recommended_addon}
                                  </h4>
                                  <p className="text-xs text-zomato-gray mt-1 line-clamp-2 leading-relaxed">
                                    {suggestion.reason}
                                  </p>
                                </div>

                                {/* Price */}
                                {suggestion.addon_price != null && (
                                  <div className="flex-shrink-0 text-right">
                                    <p className={`text-lg font-bold ${style.text}`}>
                                      {formatCurrency(suggestion.addon_price)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex border-t border-inherit">
                              <button
                                onClick={handleSkipSuggestion}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-zomato-gray hover:bg-white/60 transition-colors border-r border-inherit"
                              >
                                <X className="h-3.5 w-3.5" />
                                Skip
                              </button>
                              <button
                                onClick={handleAddSuggestion}
                                className="flex-[2] flex items-center justify-center gap-1.5 py-3 text-sm font-bold text-white bg-primary hover:bg-primary-600 transition-colors rounded-br-2xl"
                              >
                                <Plus className="h-4 w-4" />
                                Add to Order
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()
                  : null}
              </AnimatePresence>

              {!user && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-3">
                  <LogIn className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800">
                    Please{' '}
                    <Link to="/login" className="font-semibold text-primary underline">sign in</Link>
                    {' '}or{' '}
                    <Link to="/signup" className="font-semibold text-primary underline">sign up</Link>
                    {' '}to place your order.
                  </p>
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !user}
                className="w-full bg-primary text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Placing...' : !user ? 'Sign in to Place Order' : 'Confirm & Place Order'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
