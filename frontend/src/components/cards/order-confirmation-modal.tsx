"use client";

import { formatCurrency } from "@/utils/helpers";

interface ConfirmItem {
  item_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface OrderConfirmationModalProps {
  open: boolean;
  items: ConfirmItem[];
  total: number;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function OrderConfirmationModal({
  open,
  items,
  total,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: OrderConfirmationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Confirm Order</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Review items before pushing the order
        </p>

        <div className="mt-4 max-h-60 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 text-left font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Price</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2">{it.item_name}</td>
                  <td className="py-2 text-right">{it.qty}</td>
                  <td className="py-2 text-right">{formatCurrency(it.unit_price)}</td>
                  <td className="py-2 text-right">{formatCurrency(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
          <span className="text-lg font-bold">Total: {formatCurrency(total)}</span>
          <div className="space-x-3">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--muted)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Pushing..." : "Push Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
