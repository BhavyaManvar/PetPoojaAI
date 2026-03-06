"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, ShoppingCart, Leaf, Flame } from "lucide-react";
import { fetchMenuItems } from "@/services/api";
import { cn, formatCurrency } from "@/utils/helpers";
import Link from "next/link";
import Image from "next/image";

interface CartItem {
  item_id: number;
  item_name: string;
  price: number;
  qty: number;
}

function useCart() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem("restro-cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveCart = (items: CartItem[]) => {
    setCart(items);
    sessionStorage.setItem("restro-cart", JSON.stringify(items));
  };

  const addItem = (item: { item_id: number; item_name: string; price: number }) => {
    const existing = cart.find((c) => c.item_id === item.item_id);
    if (existing) {
      saveCart(cart.map((c) => (c.item_id === item.item_id ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      saveCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const removeItem = (itemId: number) => {
    const existing = cart.find((c) => c.item_id === itemId);
    if (existing && existing.qty > 1) {
      saveCart(cart.map((c) => (c.item_id === itemId ? { ...c, qty: c.qty - 1 } : c)));
    } else {
      saveCart(cart.filter((c) => c.item_id !== itemId));
    }
  };

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalAmount = cart.reduce((s, c) => s + c.price * c.qty, 0);

  return { cart, addItem, removeItem, totalItems, totalAmount };
}

export default function MenuPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const { cart, addItem, removeItem, totalItems, totalAmount } = useCart();
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["menu-items"],
    queryFn: () => fetchMenuItems(),
    staleTime: 60_000,
  });

  const menuItems = data?.items ?? [];
  const serverCategories = data?.categories ?? [];

  const categories = useMemo(() => {
    return ["All", ...serverCategories];
  }, [serverCategories]);

  const filtered = useMemo(() => {
    return menuItems.filter((item) => {
      const matchSearch = !search || item.item_name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === "All" || item.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [menuItems, search, selectedCategory]);

  const getQty = (itemId: number) => cart.find((c) => c.item_id === itemId)?.qty || 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Menu</h1>
        <p className="text-sm text-text-muted mt-1">Browse and add items to your order</p>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-white pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-all",
              selectedCategory === cat
                ? "bg-btn text-white"
                : "bg-white border border-surface-border text-text-secondary hover:bg-surface-bg"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu grid */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white border border-surface-border overflow-hidden animate-pulse">
              <div className="h-40 bg-surface-bg" />
              <div className="p-4">
                <div className="h-4 bg-surface-bg rounded w-2/3 mb-3" />
                <div className="h-3 bg-surface-bg rounded w-1/3 mb-4" />
                <div className="h-8 bg-surface-bg rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => {
              const qty = getQty(item.item_id);
              const hasImgError = imgErrors.has(item.item_id);
              return (
                <motion.div
                  key={item.item_id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-xl bg-white border border-surface-border overflow-hidden transition-shadow hover:shadow-md"
                >
                  {/* Food image */}
                  <div className="relative h-40 bg-gradient-to-br from-surface-bg to-surface-border">
                    {item.image_url && !hasImgError ? (
                      <Image
                        src={item.image_url}
                        alt={item.item_name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        onError={() => setImgErrors(prev => new Set(prev).add(item.item_id))}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl opacity-30">
                          {item.category === "Beverages" ? "🥤" : item.category === "Desserts" ? "🍰" : "🍽️"}
                        </span>
                      </div>
                    )}
                    {/* Veg/Non-veg badge */}
                    <div className="absolute top-2 left-2">
                      <div className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border",
                        item.is_veg
                          ? "border-emerald-500 bg-white"
                          : "border-red-500 bg-white"
                      )}>
                        <div className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          item.is_veg ? "bg-emerald-500" : "bg-red-500"
                        )} />
                      </div>
                    </div>
                    {/* Category badge */}
                    <div className="absolute top-2 right-2">
                      <span className="rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-medium text-white">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Item info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-semibold text-text-primary leading-tight pr-2">
                        {item.item_name}
                      </h3>
                      <p className="text-sm font-bold text-text-primary shrink-0">
                        {formatCurrency(item.price)}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    {qty === 0 ? (
                      <button
                        onClick={() => addItem({ item_id: item.item_id, item_name: item.item_name, price: item.price })}
                        className="flex items-center gap-1.5 rounded-lg bg-btn px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-btn-hover"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => removeItem(item.item_id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-text-secondary hover:bg-surface-bg transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-sm font-semibold text-text-primary w-6 text-center">{qty}</span>
                        <button
                          onClick={() => addItem({ item_id: item.item_id, item_name: item.item_name, price: item.price })}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-btn text-white hover:bg-btn-hover transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <p className="text-center text-sm text-text-muted py-16">
          No items found. Try a different search or category.
        </p>
      )}

      {/* Floating cart bar */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <Link
              href="/order/cart"
              className="flex items-center gap-3 rounded-2xl bg-btn px-6 py-3.5 text-white shadow-xl shadow-black/20"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-sm font-medium">{totalItems} items</span>
              </div>
              <div className="h-4 w-px bg-white/20" />
              <span className="text-sm font-semibold">{formatCurrency(totalAmount)}</span>
              <span className="text-xs text-white/60 ml-1">View Cart →</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
