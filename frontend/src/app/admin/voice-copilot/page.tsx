"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, Volume2, ShoppingCart, X, Check, Zap } from "lucide-react";
import {
  parseVoiceInput,
  placeOrderViaBackend,
  sarvamSTT,
  sarvamTTS,
  type VoiceOrderState,
  type VoiceOrderItem,
} from "@/services/voiceService";
import { clearUpsellHistory } from "@/services/api";
import { formatCurrency } from "@/utils/helpers";

export default function VoiceCopilotPage() {
  const [orderState, setOrderState] = useState<VoiceOrderState>({
    intent: "order",
    items: [],
    upsells: [],
    message: "",
    order_status: "in_progress",
  });
  const [transcript, setTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptHistory, setTranscriptHistory] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([
    { role: "assistant", text: "Welcome! I'm your voice ordering assistant. What would you like to order today?" },
  ]);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptHistory]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Sarvam STT
      const text = await sarvamSTT(audioBlob);
      if (text) {
        setTranscript(text);
        await processText(text);
      }
    } catch {
      // Fallback: if Sarvam fails, show error
      setTranscriptHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I couldn't process the audio. Please try typing your order." },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processText = async (text: string) => {
    setIsProcessing(true);
    setTranscriptHistory((prev) => [...prev, { role: "user", text }]);

    try {
      const newState = await parseVoiceInput(text, orderState);
      setOrderState(newState);

      setTranscriptHistory((prev) => [
        ...prev,
        { role: "assistant", text: newState.message },
      ]);

      // Try TTS for response
      try {
        const audioBlob = await sarvamTTS(newState.message);
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.play();
      } catch {
        // TTS is best-effort
      }

      if (newState.order_status === "confirmed") {
        await placeOrder(newState.items);
      }
    } catch (err) {
      console.error(err);
      setTranscriptHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    const text = textInput.trim();
    setTextInput("");
    setTranscript(text);
    await processText(text);
  };

  const placeOrder = async (items: VoiceOrderItem[]) => {
    try {
      const result = await placeOrderViaBackend(items);
      clearUpsellHistory().catch(() => {}); // Reset AI suggestion history for next order

      setOrderPlaced(true);
      setTranscriptHistory((prev) => [
        ...prev,
        { role: "assistant", text: `Order #${result.order_id} placed! Total: ₹${result.total_price}` },
      ]);
      setTimeout(() => {
        setOrderPlaced(false);
        setOrderState({
          intent: "order",
          items: [],
          upsells: [],
          message: "",
          order_status: "in_progress",
        });
        setTranscriptHistory((prev) => [
          ...prev,
          { role: "assistant", text: "Ready for the next order." },
        ]);
      }, 3000);
    } catch (err) {
      console.error(err);
      setTranscriptHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Failed to place order. Please try again." },
      ]);
    }
  };

  const removeItem = (index: number) => {
    setOrderState((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const orderTotal = orderState.items.reduce((total, item) => {
    return total + item.unit_price * item.quantity;
  }, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Voice Orders</h1>
        <p className="mt-1 text-sm text-text-muted">
          AI-powered voice ordering assistant
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Chat Panel */}
        <div className="lg:col-span-3 flex flex-col rounded-card border border-surface-border bg-surface-card overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-surface-border px-5 py-3.5">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-btn text-white">
                <Mic className="h-4 w-4" />
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                  isRecording ? "bg-red-500" : isSpeaking ? "bg-accent" : "bg-emerald-500"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Voice Assistant</p>
              <p className="text-xs text-text-muted">
                {isRecording
                  ? "Listening..."
                  : isProcessing
                  ? "Processing..."
                  : isSpeaking
                  ? "Speaking..."
                  : "Ready"}
              </p>
            </div>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {transcriptHistory.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-btn text-white"
                      : "bg-surface-bg text-text-primary"
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-surface-bg px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Voice waveform */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-surface-border bg-surface-bg px-5 py-4"
              >
                <div className="flex items-center justify-center gap-[3px]">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-accent"
                      style={{
                        animation: `waveform 0.8s ease-in-out infinite`,
                        animationDelay: `${i * 0.04}s`,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input area */}
          <div className="border-t border-surface-border p-4">
            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
                  isRecording
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                    : "bg-surface-bg text-text-secondary hover:bg-surface-border"
                }`}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your order or speak..."
                disabled={isRecording || isProcessing}
                className="flex-1 rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent placeholder:text-text-muted disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isProcessing}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-btn text-white hover:bg-btn-hover transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Order Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Order */}
          <div className="rounded-card border border-surface-border bg-surface-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-4 w-4 text-text-muted" />
              <h3 className="text-[13px] font-medium text-text-muted">Current Order</h3>
              {orderState.items.length > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                  {orderState.items.length}
                </span>
              )}
            </div>

            <AnimatePresence mode="popLayout">
              {orderState.items.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-8 text-center text-sm text-text-muted"
                >
                  No items yet. Start ordering!
                </motion.p>
              ) : (
                <div className="space-y-2.5">
                  {orderState.items.map((item, i) => {
                    return (
                      <motion.div
                        key={`${item.name}-${i}`}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-3 rounded-lg border border-surface-border p-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-bg text-sm font-semibold text-text-secondary">
                          {item.quantity}x
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-text-muted">
                            ₹{item.unit_price} each
                          </p>
                        </div>
                        <span className="text-sm font-medium text-text-primary">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(i)}
                          className="rounded p-1 text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>

            {orderState.items.length > 0 && (
              <>
                <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-4">
                  <span className="text-sm font-medium text-text-secondary">Total</span>
                  <span className="text-lg font-semibold text-text-primary">
                    {formatCurrency(orderTotal)}
                  </span>
                </div>
                <button
                  onClick={() => processText("confirm")}
                  disabled={isProcessing || orderPlaced}
                  className="mt-4 w-full rounded-lg bg-btn py-2.5 text-sm font-medium text-white hover:bg-btn-hover transition-colors disabled:opacity-50"
                >
                  {orderPlaced ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4" /> Order Placed!
                    </span>
                  ) : (
                    "Confirm Order"
                  )}
                </button>
              </>
            )}
          </div>          {/* AI Upsell Suggestions */}
          {orderState.upsells.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-card border border-accent/20 bg-accent/5 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-accent" />
                <h3 className="text-[13px] font-semibold text-accent">AI Suggestions</h3>
              </div>
              <div className="space-y-2">
                {orderState.upsells.map((u, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      u.recommended_addon &&
                      processText(`add one ${u.recommended_addon}`)
                    }
                    className="w-full flex items-center gap-3 rounded-lg border border-surface-border bg-surface-card p-3 text-left hover:border-accent/40 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent text-xs font-bold">
                      +1
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {u.recommended_addon}
                      </p>
                      <p className="text-[11px] text-text-muted truncate">{u.reason}</p>
                    </div>
                    {u.addon_price != null && (
                      <span className="text-sm font-medium text-text-secondary shrink-0">
                        {formatCurrency(u.addon_price)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="rounded-card border border-surface-border bg-surface-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="h-4 w-4 text-text-muted" />
                <h3 className="text-[13px] font-medium text-text-muted">
                  Last Transcript
                </h3>
              </div>
              <p className="text-sm text-text-primary">{transcript}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
