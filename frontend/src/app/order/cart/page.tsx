"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ArrowLeft, CreditCard } from "lucide-react";
import { formatCurrency } from "@/utils/helpers";
import Link from "next/link";
import { pushOrder } from "@/services/api";

interface CartItem {
  item_id: number;
  item_name: string;
  price: number;
  qty: number;
}

function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("restro-cart");
      if (stored) setCart(JSON.parse(stored));
    } catch { /* empty */ }
  }, []);

  const saveCart = (items: CartItem[]) => {
    setCart(items);
    sessionStorage.setItem("restro-cart", JSON.stringify(items));
  };

  const updateQty = (itemId: number, delta: number) => {
    const updated = cart
      .map((c) => (c.item_id === itemId ? { ...c, qty: c.qty + delta } : c))
      .filter((c) => c.qty > 0);
    saveCart(updated);
  };

  const removeItem = (itemId: number) => {
    saveCart(cart.filter((c) => c.item_id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    sessionStorage.removeItem("restro-cart");
  };

  const totalAmount = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = totalAmount * 0.05;

  return { cart, updateQty, removeItem, clearCart, totalAmount, tax };
}

export default function CartPage() {
  const { cart, updateQty, removeItem, clearCart, totalAmount, tax } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const items = cart.map((c) => ({ item_id: c.item_id, qty: c.qty }));
      const result = await pushOrder(items, "online");
      setOrderId(result.order_id);
      setOrderPlaced(true);
      clearCart();
    } catch (err) {
      console.error("Order failed:", err);
    } finally {
      setPlacing(false);
    }
  };

  if (orderPlaced) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
          <CreditCard className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Order Placed!</h2>
        <p className="text-sm text-text-muted mb-1">Order #{orderId}</p>
        <p className="text-sm text-text-muted mb-8">Your food is being prepared.</p>
        <Link
          href="/order"
          className="rounded-xl bg-btn px-6 py-3 text-sm font-medium text-white hover:bg-btn-hover transition-colors"
        >
          Order More
        </Link>
      </motion.div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold text-text-primary mb-2">Your cart is empty</p>
        <p className="text-sm text-text-muted mb-6">Browse the menu and add some items.</p>
        <Link
          href="/order"
          className="inline-flex items-center gap-2 rounded-xl bg-btn px-6 py-3 text-sm font-medium text-white hover:bg-btn-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/order" className="rounded-lg p-2 hover:bg-surface-bg transition-colors">
          <ArrowLeft className="h-5 w-5 text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Your Cart</h1>
          <p className="text-sm text-text-muted">{cart.length} items</p>
        </div>
      </div>

      {/* Cart items */}
      <div className="space-y-3 mb-8">
        <AnimatePresence>
          {cart.map((item) => (
            <motion.div
              key={item.item_id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              className="flex items-center justify-between rounded-xl bg-white border border-surface-border p-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary">{item.item_name}</h3>
                <p className="text-xs text-text-muted mt-0.5">{formatCurrency(item.price)} each</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <button onClick={() => updateQty(item.item_id, -1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-surface-border hover:bg-surface-bg transition-colors">
                  <Minus className="h-3.5 w-3.5 text-text-secondary" />
                </button>
                <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                <button onClick={() => updateQty(item.item_id, 1)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-btn text-white hover:bg-btn-hover transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => removeItem(item.item_id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors ml-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-sm font-bold text-text-primary ml-4 w-20 text-right">
                {formatCurrency(item.price * item.qty)}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Delivery details */}
      <div className="rounded-xl bg-white border border-surface-border p-5 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Delivery Details</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-lg border border-surface-border px-3.5 py-2.5 text-sm outline-none focus:border-accent transition-colors"
          />
          <input
            type="tel"
            placeholder="Phone number"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full rounded-lg border border-surface-border px-3.5 py-2.5 text-sm outline-none focus:border-accent transition-colors"
          />
          <textarea
            placeholder="Delivery address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-surface-border px-3.5 py-2.5 text-sm outline-none focus:border-accent transition-colors resize-none"
          />
        </div>
      </div>

      {/* Order summary */}
      <div className="rounded-xl bg-white border border-surface-border p-5 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Subtotal</span>
            <span className="text-text-primary">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Tax (5%)</span>
            <span className="text-text-primary">{formatCurrency(tax)}</span>
          </div>
          <div className="h-px bg-surface-border my-2" />
          <div className="flex justify-between font-semibold">
            <span className="text-text-primary">Total</span>
            <span className="text-text-primary">{formatCurrency(totalAmount + tax)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleCheckout}
        disabled={placing}
        className="w-full rounded-xl bg-btn py-3.5 text-sm font-semibold text-white transition-colors hover:bg-btn-hover disabled:opacity-50"
      >
        {placing ? "Placing Order..." : `Place Order — ${formatCurrency(totalAmount + tax)}`}
      </button>
    </div>
  );
}
