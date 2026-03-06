import { useState, useCallback } from 'react';

export interface CartItem {
  item_id: number;
  item_name: string;
  price: number;
  qty: number;
  image_url?: string;
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

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(loadCart);

  const update = useCallback((items: CartItem[]) => {
    setCart(items);
    saveCart(items);
  }, []);

  const addItem = useCallback(
    (item: { item_id: number; item_name: string; price: number; image_url?: string }) => {
      setCart((prev) => {
        const existing = prev.find((c) => c.item_id === item.item_id);
        const next = existing
          ? prev.map((c) => (c.item_id === item.item_id ? { ...c, qty: c.qty + 1 } : c))
          : [...prev, { ...item, qty: 1 }];
        saveCart(next);
        return next;
      });
    },
    [],
  );

  const removeItem = useCallback((itemId: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item_id === itemId);
      const next =
        existing && existing.qty > 1
          ? prev.map((c) => (c.item_id === itemId ? { ...c, qty: c.qty - 1 } : c))
          : prev.filter((c) => c.item_id !== itemId);
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    update([]);
  }, [update]);

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalAmount = cart.reduce((s, c) => s + c.price * c.qty, 0);

  return { cart, addItem, removeItem, clearCart, totalItems, totalAmount };
}
