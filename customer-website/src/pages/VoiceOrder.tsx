import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Check, Plus, X, Sparkles, LogIn, Volume2, Phone, PhoneCall, PhoneOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { API, formatCurrency } from '@/lib/api';
import {
  parseVoiceInput,
  placeOrderViaBackend,
  type VoiceOrderItem,
  type VoiceUpsellSuggestion,
} from '@/services/voiceService';
import Vapi from '@vapi-ai/web';

const SARVAM_API_KEY = import.meta.env.VITE_SARVAM_API_KEY || '';
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';
const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || '';
const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID || '';
const PHONE_NUMBER = import.meta.env.VITE_PHONE_NUMBER || '';

function formatPhoneDisplay(num: string): string {
  if (num.startsWith('+1') && num.length === 12) {
    return `+1 (${num.slice(2, 5)}) ${num.slice(5, 8)}-${num.slice(8)}`;
  }
  return num;
}

/** Convert a webm/ogg Blob from MediaRecorder into WAV PCM 16-bit 16 kHz mono */
async function toWavBlob(blob: Blob): Promise<Blob> {
  const arrayBuf = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  const decoded = await audioCtx.decodeAudioData(arrayBuf);
  const pcm = decoded.getChannelData(0); // mono
  const numSamples = pcm.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  audioCtx.close();
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Send audio to Sarvam STT and return the transcript */
async function sarvamSTT(wavBlob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append('file', wavBlob, 'audio.wav');
  fd.append('model', 'saarika:v2.5');
  fd.append('language_code', 'unknown');
  fd.append('with_timestamps', 'false');
  const res = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': SARVAM_API_KEY },
    body: fd,
  });
  if (!res.ok) throw new Error(`STT ${res.status}`);
  const data = await res.json();
  return data.transcript || '';
}

/** Detect if text contains non-Latin characters (Hindi, Gujarati, etc.) */
function isNonLatin(text: string): boolean {
  return /[^\u0000-\u007F]/.test(text);
}

/** Translate any Indic text to English using Sarvam translate API */
async function sarvamTranslate(text: string): Promise<string> {
  if (!SARVAM_API_KEY || !text.trim()) return text;
  const res = await fetch('https://api.sarvam.ai/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': SARVAM_API_KEY,
    },
    body: JSON.stringify({
      input: text,
      source_language_code: 'auto',
      target_language_code: 'en-IN',
      model: 'mayura:v1',
    }),
  });
  if (!res.ok) return text; // fallback to original
  const data = await res.json();
  return data.translated_text || text;
}

/** Send order to n8n webhook for AI processing */
async function sendToN8n(englishText: string, cart: VoiceOrderItem[], sessionId: string): Promise<any> {
  if (!N8N_WEBHOOK_URL) throw new Error('No n8n URL');
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: englishText,
      cart: JSON.stringify(cart.map(i => ({ id: i.item_id, name: i.name, qty: i.quantity }))),
      session_id: sessionId,
    }),
  });
  if (!res.ok) throw new Error(`n8n ${res.status}`);
  return res.json();
}

/** Send text to Sarvam TTS and play the resulting audio */
async function sarvamTTS(text: string): Promise<void> {
  if (!text || !SARVAM_API_KEY) return;
  const res = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': SARVAM_API_KEY,
    },
    body: JSON.stringify({
      target_language_code: 'en-IN',
      speaker: 'priya',
      model: 'bulbul:v3',
      text: text,
    }),
  });
  if (!res.ok) return;
  const data = await res.json();
  if (data.audios?.[0]) {
    const audio = new Audio(`data:audio/wav;base64,${data.audios[0]}`);
    audio.play().catch(() => {});
  }
}

/** Core order processing: translate if needed → n8n (with backend fallback) */
async function processOrderText(
  rawText: string,
  currentCart: VoiceOrderItem[],
  sessionId: string,
): Promise<{ items: VoiceOrderItem[]; upsells: VoiceUpsellSuggestion[]; message: string }> {
  // Step 1: Translate to English if text is in Devanagari/non-Latin script
  const englishText = isNonLatin(rawText) ? await sarvamTranslate(rawText) : rawText;

  // Step 2: Try n8n first, fall back to direct backend
  let result: { items: VoiceOrderItem[]; upsells: VoiceUpsellSuggestion[] };
  try {
    const n8nRes = await sendToN8n(englishText, currentCart, sessionId);
    // n8n should return same format as backend /voice/chat
    if (n8nRes?.items?.length > 0) {
      result = {
        items: n8nRes.items.map((i: any) => ({
          item_id: i.item_id,
          name: i.item_name || i.name,
          quantity: i.qty || i.quantity || 1,
          unit_price: i.unit_price || 0,
          line_total: i.line_total || (i.unit_price || 0) * (i.qty || i.quantity || 1),
          confidence: i.confidence || 80,
        })),
        upsells: n8nRes.upsells ?? [],
      };
    } else {
      throw new Error('n8n returned no items');
    }
  } catch {
    // Fallback: direct backend call with English text
    result = await parseVoiceInput(englishText);
  }

  const message = result.items.length > 0
    ? `Added ${result.items.map(i => `${i.quantity} ${i.name}`).join(', ')} to your order.`
    : "Sorry, I couldn't find that on the menu. Could you try again?";

  return { ...result, message };
}

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false); // continuous listening mode
  const [cartItems, setCartItems] = useState<VoiceOrderItem[]>([]);
  const [primaryItemId, setPrimaryItemId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<VoiceUpsellSuggestion[]>([]);
  const [currentSuggIdx, setCurrentSuggIdx] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [suggestionsFinished, setSuggestionsFinished] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isListeningRef = useRef(false);  // non-stale ref for callbacks
  const cartRef = useRef(cartItems);     // non-stale ref for cart in callbacks
  cartRef.current = cartItems;

  // ── Vapi phone call state ──────────────────────────────────────────────
  const vapiRef = useRef<Vapi | null>(null);
  const vapiInitialized = useRef(false);
  const [callActive, setCallActive] = useState(false);
  const [callConnecting, setCallConnecting] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [callTranscript, setCallTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!VAPI_PUBLIC_KEY) return;
    // Guard against React StrictMode double-mount (causes KrispSDK duplicate + audio failure)
    if (vapiInitialized.current) return;
    vapiInitialized.current = true;

    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      setCallActive(true);
      setCallConnecting(false);
      setCallStatus('Connected — AI agent is speaking...');
    });
    vapi.on('call-end', () => {
      setCallActive(false);
      setCallConnecting(false);
      setCallStatus('Call ended');
    });
    vapi.on('speech-start', () => setCallStatus('AI agent is speaking...'));
    vapi.on('speech-end', () => setCallStatus('Listening to you...'));
    vapi.on('error', (err: any) => {
      console.error('Vapi error:', err);
      setCallStatus('Connection error — please try again');
      setCallActive(false);
      setCallConnecting(false);
    });
    vapi.on('message', (msg: any) => {
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        setCallTranscript((prev) => [
          ...prev,
          { role: msg.role === 'assistant' ? 'AI' : 'You', text: msg.transcript },
        ]);
      }
    });

    return () => {
      // Don't destroy on StrictMode unmount — instance is reused
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [callTranscript]);

  const handleStartCall = async () => {
    if (!vapiRef.current || !VAPI_ASSISTANT_ID) return;

    // Stop any active browser mic recording to avoid conflict
    if (isListening || isRecording) {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setIsRecording(false);
      setIsListening(false);
      isListeningRef.current = false;
    }

    setCallTranscript([]);
    setCallStatus('Connecting...');
    setCallConnecting(true);
    try {
      await vapiRef.current.start(VAPI_ASSISTANT_ID);
    } catch (err) {
      console.error('Failed to start call:', err);
      setCallStatus('Failed to connect — please try again');
      setCallConnecting(false);
    }
  };

  const handleEndCall = () => {
    vapiRef.current?.stop();
    setCallActive(false);
    setCallConnecting(false);
    setCallStatus('Call ended');
  };

  const SILENCE_THRESHOLD = 8;    // volume level below which = silence (0-255), lower = less sensitive
  const SILENCE_DURATION = 2500;  // ms of silence before auto-processing (2.5s gives time between items)

  /** Process recorded audio: STT → translate → backend → TTS */
  const processAudio = useCallback(async (webmBlob: Blob) => {
    setLoading(true);
    try {
      const wavBlob = await toWavBlob(webmBlob);
      const transcript = await sarvamSTT(wavBlob);
      if (transcript.trim()) {
        setText(transcript);
        const result = await processOrderText(transcript, cartRef.current, sessionId);
        if (result.items.length > 0) {
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
          setPrimaryItemId(result.items[0].item_id);
          const upsells = (result.upsells ?? []).filter((u) => u.recommended_addon);
          setSuggestions(upsells);
          setCurrentSuggIdx(0);
          setTotalSaved(0);
          setSuggestionsFinished(false);
        }
        sarvamTTS(result.message);
      }
    } catch (err) {
      console.error('Voice processing error:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  /** Start a new recording segment (reuses the existing mic stream) */
  const startSegment = useCallback((stream: MediaStream) => {
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorder.onstop = async () => {
      if (chunksRef.current.length === 0) return;
      const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
      await processAudio(blob);
      // Auto-restart if still in listening mode
      if (isListeningRef.current && stream.active) {
        startSegment(stream);
      }
    };
    mediaRecorder.start();
    setIsRecording(true);

    // Set up silence detection using Web Audio API
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false;

    const checkSilence = () => {
      if (!isListeningRef.current) return;
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      if (avg > SILENCE_THRESHOLD) {
        // User is speaking
        speaking = true;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (speaking && !silenceTimerRef.current) {
        // Silence detected after speech — wait SILENCE_DURATION then auto-stop segment
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          speaking = false;
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }
        }, SILENCE_DURATION);
      }
      requestAnimationFrame(checkSilence);
    };
    requestAnimationFrame(checkSilence);
  }, [processAudio]);

  /** Toggle continuous listening mode on/off */
  const handleMicToggle = useCallback(async () => {
    if (isListening) {
      // Stop everything
      isListeningRef.current = false;
      setIsListening(false);
      setIsRecording(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      isListeningRef.current = true;
      setIsListening(true);
      startSegment(stream);
    } catch {
      // Microphone not available
    }
  }, [isListening, startSegment]);

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      // Process through translate → n8n → backend flow
      const result = await processOrderText(text, cartItems, sessionId);
      if (result.items.length === 0) {
        sarvamTTS(result.message);
        return;
      }

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

      // Use all suggestions returned
      const upsells = (result.upsells ?? []).filter((u) => u.recommended_addon);
      setSuggestions(upsells);
      setCurrentSuggIdx(0);
      setTotalSaved(0);
      setSuggestionsFinished(false);

      // Speak confirmation
      sarvamTTS(result.message);
    } catch {
      // parse error
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestion = (index: number) => {
    const s = suggestions[index];
    if (!s?.addon_id) return;
    const price = s.discounted_price ?? s.addon_price ?? 0;
    const originalPrice = s.addon_price ?? 0;
    const saved = originalPrice - price;
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
    setTotalSaved((prev) => prev + saved);
    if (index + 1 >= suggestions.length) {
      setSuggestionsFinished(true);
    } else {
      setCurrentSuggIdx(index + 1);
    }
  };

  const handleSkipSuggestion = (index: number) => {
    if (index + 1 >= suggestions.length) {
      setSuggestionsFinished(true);
    } else {
      setCurrentSuggIdx(index + 1);
    }
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
              setSuggestions([]);
              setCurrentSuggIdx(0);
              setTotalSaved(0);
              setSuggestionsFinished(false);
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
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-zomato-gray hover:bg-gray-200'
              }`}
            >
              {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-zomato-dark">
                {loading ? 'Processing voice...' : isListening && isRecording ? 'Listening...' : isListening ? 'Waiting for you to speak...' : 'Tap to start voice ordering'}
              </p>
              <p className="text-xs text-zomato-gray">
                {loading ? 'Converting speech to order' : isListening ? 'Say items one by one — auto-detects when you pause. Tap mic to stop.' : 'Tap mic once — keep speaking naturally'}
              </p>
            </div>
            {isListening && (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full ${isRecording ? 'bg-red-500' : 'bg-orange-400'}`}
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

              {/* AI Suggestions — One at a time */}
              <AnimatePresence mode="sync">
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
                      Finding the perfect combos for you…
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
                ) : suggestionsFinished && totalSaved > 0 ? (
                  <motion.div
                    key="savings"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl border-2 border-green-300 bg-green-50 p-5 text-center"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mx-auto mb-3">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Total Savings</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(totalSaved)}</p>
                    <p className="text-xs text-green-600 mt-1">You saved with our special discounts!</p>
                  </motion.div>
                ) : suggestions.length > 0 && currentSuggIdx < suggestions.length ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                          Recommended for you
                        </p>
                      </div>
                      <span className="text-[10px] font-medium text-zomato-gray bg-gray-100 rounded-full px-2 py-0.5">
                        {currentSuggIdx + 1} of {suggestions.length}
                      </span>
                    </div>
                    <AnimatePresence mode="wait">
                      {(() => {
                        const s = suggestions[currentSuggIdx];
                        const style = getCategoryStyle(s.recommended_category);
                        return (
                          <motion.div
                            key={`${s.addon_id}-${currentSuggIdx}`}
                            initial={{ opacity: 0, x: 60 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -60 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          >
                            <div className={`rounded-2xl border-2 ${style.border} ${style.bg} overflow-hidden transition-all hover:shadow-card-hover`}>
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
                                    <h4 className="text-sm font-bold text-zomato-dark truncate">{s.recommended_addon}</h4>
                                    <p className="text-[11px] text-zomato-gray mt-0.5 line-clamp-1">{s.reason}</p>
                                  </div>
                                  {s.addon_price != null && (
                                    <div className="flex-shrink-0 text-right">
                                      <p className="text-[11px] text-zomato-gray line-through">{formatCurrency(s.addon_price)}</p>
                                      <p className={`text-base font-bold ${style.text}`}>{formatCurrency(s.discounted_price ?? s.addon_price)}</p>
                                      <span className="inline-block mt-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">{s.discount_percent}% OFF</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex border-t border-inherit">
                                <button
                                  onClick={() => handleSkipSuggestion(currentSuggIdx)}
                                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-zomato-gray hover:bg-white/60 transition-colors border-r border-inherit"
                                >
                                  <X className="h-3 w-3" /> Skip
                                </button>
                                <button
                                  onClick={() => handleAddSuggestion(currentSuggIdx)}
                                  className="flex-[2] flex items-center justify-center gap-1 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-600 transition-colors rounded-br-2xl"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Add
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>
                  </div>
                ) : null}
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

        {/* AI Phone Call Section */}
        <div className="mt-8 rounded-2xl bg-card shadow-card overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">AI Phone Ordering Agent</h3>
                <p className="text-xs text-green-100">Call our AI agent — speaks Hindi, English & more</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Phone number display */}
            {PHONE_NUMBER && (
              <div className="text-center">
                <p className="text-xs text-zomato-gray mb-1 uppercase tracking-wider font-medium">Call us at</p>
                <a
                  href={`tel:${PHONE_NUMBER}`}
                  className="text-2xl font-bold text-zomato-dark tracking-wide hover:text-green-600 transition-colors"
                >
                  {formatPhoneDisplay(PHONE_NUMBER)}
                </a>
                <p className="text-[10px] text-zomato-gray mt-1">US toll-free • Available 24/7</p>
              </div>
            )}

            {/* Divider */}
            {PHONE_NUMBER && VAPI_PUBLIC_KEY && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zomato-border" />
                <span className="text-xs text-zomato-gray font-medium">OR</span>
                <div className="flex-1 h-px bg-zomato-border" />
              </div>
            )}

            {/* Browser call button */}
            {VAPI_PUBLIC_KEY && VAPI_ASSISTANT_ID && (
              <div>
                {!callActive && !callConnecting ? (
                  <button
                    onClick={handleStartCall}
                    className="flex items-center justify-center gap-3 w-full bg-green-600 text-white py-4 rounded-xl text-base font-bold hover:bg-green-700 transition-all hover:shadow-lg active:scale-[0.98]"
                  >
                    <PhoneCall className="h-5 w-5" />
                    Call AI Agent (Browser)
                  </button>
                ) : (
                  <button
                    onClick={handleEndCall}
                    className="flex items-center justify-center gap-3 w-full bg-red-500 text-white py-4 rounded-xl text-base font-bold hover:bg-red-600 transition-all animate-pulse"
                  >
                    <PhoneOff className="h-5 w-5" />
                    End Call
                  </button>
                )}

                {/* Call status */}
                {callStatus && (
                  <div className={`mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${
                    callActive
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : callConnecting
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-gray-50 text-zomato-gray border border-zomato-border'
                  }`}>
                    {callActive && (
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75" />
                        <span className="relative rounded-full h-2 w-2 bg-green-500" />
                      </span>
                    )}
                    {callConnecting && (
                      <div className="flex gap-1">
                        {[0, 150, 300].map((d) => (
                          <div key={d} className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    )}
                    {callStatus}
                  </div>
                )}

                {/* Live transcript */}
                {callTranscript.length > 0 && (
                  <div className="mt-3 rounded-xl border border-zomato-border bg-gray-50 p-3 max-h-48 overflow-y-auto">
                    <p className="text-[10px] font-semibold text-zomato-gray uppercase tracking-wider mb-2">Live Transcript</p>
                    <div className="space-y-1.5">
                      {callTranscript.map((t, i) => (
                        <div key={i} className={`text-xs leading-relaxed ${t.role === 'AI' ? 'text-green-700' : 'text-zomato-dark'}`}>
                          <span className="font-semibold">{t.role}:</span> {t.text}
                        </div>
                      ))}
                      <div ref={transcriptEndRef} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <span className="font-semibold">Disclaimer:</span> Our AI-powered voice agent takes your order in your 
                preferred language (English, Hindi, Hinglish, Gujarati & more). 
                {PHONE_NUMBER ? ' Standard call charges may apply when calling the phone number. Browser calls are free.' : ' Browser calls are free.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
