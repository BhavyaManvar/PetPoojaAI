import { useState, useCallback } from 'react';

export interface CartModifiers {
  size?: string;
  spice?: string;
  addons?: string[];
}

export interface CartItem {
  item_id: number;
  item_name: string;
  price: number;
  qty: number;
  image_url?: string;
  category?: string;
  modifiers?: CartModifiers;
  modifier_price?: number;
}

const CART_KEY = 'restro-cart';

function loadCart(): CartItem[] {
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(items));
}

/** Generate a unique key for a cart item including its modifiers */
function cartItemKey(itemId: number, modifiers?: CartModifiers): string {
  const modKey = modifiers
    ? `${modifiers.size || ''}_${modifiers.spice || ''}_${(modifiers.addons || []).sort().join(',')}`
    : '';
  return `${itemId}_${modKey}`;
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(loadCart);

  const update = useCallback((items: CartItem[]) => {
    setCart(items);
    saveCart(items);
  }, []);

  const addItem = useCallback(
    (item: { item_id: number; item_name: string; price: number; image_url?: string; category?: string; modifiers?: CartModifiers; modifier_price?: number }) => {
      setCart((prev) => {
        const key = cartItemKey(item.item_id, item.modifiers);
        const existing = prev.find((c) => cartItemKey(c.item_id, c.modifiers) === key);
        const next = existing
          ? prev.map((c) => (cartItemKey(c.item_id, c.modifiers) === key ? { ...c, qty: c.qty + 1 } : c))
          : [...prev, { ...item, qty: 1 }];
        saveCart(next);
        return next;
      });
    },
    [],
  );

  const removeItem = useCallback((itemId: number, modifiers?: CartModifiers) => {
    setCart((prev) => {
      const key = cartItemKey(itemId, modifiers);
      const existing = prev.find((c) => cartItemKey(c.item_id, c.modifiers) === key);
      const next =
        existing && existing.qty > 1
          ? prev.map((c) => (cartItemKey(c.item_id, c.modifiers) === key ? { ...c, qty: c.qty - 1 } : c))
          : prev.filter((c) => cartItemKey(c.item_id, c.modifiers) !== key);
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    update([]);
  }, [update]);

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalAmount = cart.reduce((s, c) => s + (c.price + (c.modifier_price || 0)) * c.qty, 0);

  return { cart, addItem, removeItem, clearCart, totalItems, totalAmount };
}
