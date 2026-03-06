"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  User,
  Sparkles,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  timestamp: Date;
}

const SUGGESTED_QUERIES = [
  { label: "Revenue Strategy", query: "How can I increase revenue?", icon: TrendingUp },
  { label: "Menu Matrix", query: "Show me the menu matrix", icon: BarChart3 },
  { label: "Best Combos", query: "What are the best combos?", icon: ShoppingCart },
  { label: "Price Changes", query: "Which items need price changes?", icon: DollarSign },
  { label: "Risk Items", query: "Which items are underperforming?", icon: AlertTriangle },
  { label: "Health Report", query: "Give me a summary report", icon: Lightbulb },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "";

async function speakWithElevenLabs(text: string): Promise<HTMLAudioElement | null> {
  if (!ELEVENLABS_API_KEY) return null;
  const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.slice(0, 1000),
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return new Audio(url);
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(!!ELEVENLABS_API_KEY);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript;
      if (text) {
        setInput(text);
        setIsListening(false);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [isListening]);

  const sendMessage = async (query: string) => {
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();

      const assistantMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: data.response,
        intent: data.intent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // ElevenLabs TTS
      if (voiceEnabled && data.response) {
        try {
          const audio = await speakWithElevenLabs(data.response);
          if (audio) {
            audioRef.current = audio;
            setIsSpeaking(true);
            audio.onended = () => { setIsSpeaking(false); audioRef.current = null; };
            audio.play();
          }
        } catch {
          // TTS is best-effort
        }
      }
    } catch {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I couldn't process your request. Please make sure the backend is running and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-muted">
            <Bot className="h-5 w-5 text-text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">AI Strategy Assistant</h1>
            <p className="text-sm text-text-muted">
              Ask about revenue, menu performance, pricing, and growth strategies
            </p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-surface-border bg-white p-6 mb-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-bg">
              <Sparkles className="h-8 w-8 text-text-muted" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              What would you like to know?
            </h2>
            <p className="text-sm text-text-muted mb-8 text-center max-w-md">
              I can analyze your menu data, find growth opportunities, and suggest strategies to boost your revenue.
            </p>

            {/* Suggested queries */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl w-full">
              {SUGGESTED_QUERIES.map((sq) => (
                <button
                  key={sq.label}
                  onClick={() => sendMessage(sq.query)}
                  className="flex items-center gap-2.5 rounded-xl border border-surface-border p-3.5 text-left transition-all hover:border-text-muted hover:shadow-sm"
                >
                  <sq.icon className="h-4 w-4 text-text-muted shrink-0" />
                  <span className="text-xs font-medium text-text-secondary">{sq.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-bg">
                      <Bot className="h-4 w-4 text-text-secondary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-btn text-white"
                        : "bg-surface-bg text-text-primary"
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content.split("**").map((part, i) =>
                        i % 2 === 0 ? (
                          <span key={i}>{part}</span>
                        ) : (
                          <strong key={i} className="font-semibold">{part}</strong>
                        )
                      )}
                    </div>
                    {msg.intent && msg.role === "assistant" && (
                      <div className="mt-2 text-[10px] text-text-muted uppercase tracking-wider">
                        {msg.intent}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-muted">
                      <User className="h-4 w-4 text-text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-bg">
                  <Bot className="h-4 w-4 text-text-secondary" />
                </div>
                <div className="rounded-2xl bg-surface-bg px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about revenue, pricing, combos, menu performance..."
          className="flex-1 rounded-xl border border-surface-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-accent placeholder:text-text-muted"
          disabled={loading}
        />
        {/* Mic button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${
            isListening
              ? "border-red-300 bg-red-50 text-red-600 animate-pulse"
              : "border-surface-border bg-white text-text-muted hover:text-text-primary"
          }`}
          title={isListening ? "Stop listening" : "Voice input"}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        {/* Speaker toggle */}
        <button
          type="button"
          onClick={() => { if (isSpeaking) stopSpeaking(); else setVoiceEnabled(!voiceEnabled); }}
          className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${
            isSpeaking
              ? "border-blue-300 bg-blue-50 text-blue-600 animate-pulse"
              : voiceEnabled
                ? "border-surface-border bg-white text-text-primary"
                : "border-surface-border bg-white text-text-muted"
          }`}
          title={isSpeaking ? "Stop speaking" : voiceEnabled ? "Voice on" : "Voice off"}
        >
          {voiceEnabled || isSpeaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        {/* Send button */}
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-btn text-white transition-colors hover:bg-btn-hover disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
