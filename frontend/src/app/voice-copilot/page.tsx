"use client";

import { useState } from "react";
import { parseVoice, pushOrder } from "@/services/api";
import { VoiceInput } from "@/components/forms/voice-input";
import { OrderConfirmationModal } from "@/components/cards/order-confirmation-modal";
import { formatCurrency } from "@/utils/helpers";
import type { VoiceParseResponse, OrderLineItem } from "@/types/order";

export default function VoiceCopilotPage() {
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<VoiceParseResponse | null>(null);
  const [orderResult, setOrderResult] = useState<{
    items: OrderLineItem[];
    total: number;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleParse = async (text: string) => {
    setParsing(true);
    setParsed(null);
    setOrderResult(null);
    setSuccessMsg("");
    try {
      const result = await parseVoice(text);
      setParsed(result);
    } catch {
      setParsed(null);
    } finally {
      setParsing(false);
    }
  };

  const handlePushClick = async () => {
    if (!parsed) return;
    // First push to get line items with prices
    setPushing(true);
    try {
      const items = parsed.items.map((it) => ({
        item_id: 0,
        item_name: it.matched_name ?? it.raw_name,
        qty: it.qty,
      }));
      const result = await pushOrder(items);
      setOrderResult({ items: result.items, total: result.total });
      setShowModal(true);
    } catch {
      // silent
    } finally {
      setPushing(false);
    }
  };

  const handleConfirm = () => {
    setShowModal(false);
    setSuccessMsg(
      `Order #${Date.now().toString(36).toUpperCase()} pushed successfully!`
    );
    setParsed(null);
    setOrderResult(null);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Voice Copilot</h1>
      <p className="text-[var(--muted-foreground)]">
        Type a natural-language order in English, Hindi, or Hinglish.
      </p>

      {/* Voice Input */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <VoiceInput onSubmit={handleParse} isLoading={parsing} />
      </div>

      {/* Parsed Items */}
      {parsed && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Parsed Items</h3>
            <span className="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
              {parsed.language}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2 text-left font-medium">Raw Input</th>
                  <th className="py-2 text-left font-medium">Matched</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {parsed.items.map((it, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2">{it.raw_name}</td>
                    <td className="py-2">{it.matched_name ?? "—"}</td>
                    <td className="py-2 text-right">{it.qty}</td>
                    <td className="py-2 text-right">
                      {it.score != null ? `${it.score}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handlePushClick}
            disabled={pushing}
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {pushing ? "Preparing..." : "Push Order"}
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMsg && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800 text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Order Confirmation Modal */}
      {orderResult && (
        <OrderConfirmationModal
          open={showModal}
          items={orderResult.items}
          total={orderResult.total}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
          isSubmitting={false}
        />
      )}
    </div>
  );
}
