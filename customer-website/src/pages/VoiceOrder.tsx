import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/api';
import { parseVoiceInput, placeOrderViaBackend, type VoiceOrderItem } from '@/services/voiceService';
import { Link } from 'react-router-dom';

export default function VoiceOrderPage() {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [parsedItems, setParsedItems] = useState<VoiceOrderItem[]>([]);
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
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
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
      setParsedItems(result.items || []);
    } catch {
      setParsedItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (parsedItems.length === 0) return;
    setLoading(true);
    try {
      const result = await placeOrderViaBackend(parsedItems);
      setOrderId(result?.order_id || null);
      setOrderPlaced(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-2xl font-bold text-zomato-dark mb-2">Voice Order Placed!</h2>
          {orderId && <p className="text-sm text-zomato-gray mb-8">Order #{orderId}</p>}
          <button
            onClick={() => {
              setOrderPlaced(false);
              setParsedItems([]);
              setText('');
            }}
            className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            New Voice Order
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
              onKeyDown={(e) => e.key === 'Enter' && handleParse()}
              placeholder='Try: "Ek paneer pizza aur do coke"'
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
              'One paneer pizza and two coke',
              'Ek masala dosa aur teen chai',
              'Two butter naan with dal makhani',
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

        {/* Parsed results */}
        <AnimatePresence>
          {parsedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-2xl bg-card shadow-card p-6"
            >
              <h3 className="text-sm font-semibold text-zomato-dark mb-4">Parsed Order</h3>
              <div className="space-y-3 mb-6">
                {parsedItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-zomato-dark">{item.name}</p>
                      {item.confidence != null && (
                        <p className="text-xs text-zomato-gray">
                          Confidence: {(item.confidence * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zomato-dark">x{item.quantity}</p>
                      {item.unit_price != null && (
                        <p className="text-xs text-zomato-gray">
                          {formatCurrency(item.unit_price)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full bg-primary text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Placing...' : 'Confirm & Place Order'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
