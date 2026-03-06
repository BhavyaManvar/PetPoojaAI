import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useCart } from '@/hooks/useCart';

describe('useCart', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts with an empty cart', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.cart).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalAmount).toBe(0);
  });

  it('adds an item', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem({ item_id: 1, item_name: 'Paneer', price: 250 });
    });
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0]).toMatchObject({ item_id: 1, qty: 1 });
    expect(result.current.totalItems).toBe(1);
    expect(result.current.totalAmount).toBe(250);
  });

  it('increments qty when adding same item twice', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem({ item_id: 1, item_name: 'Paneer', price: 250 });
    });
    act(() => {
      result.current.addItem({ item_id: 1, item_name: 'Paneer', price: 250 });
    });
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].qty).toBe(2);
    expect(result.current.totalAmount).toBe(500);
  });

  it('removes an item (decrements qty)', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem({ item_id: 1, item_name: 'Paneer', price: 250 });
      result.current.addItem({ item_id: 1, item_name: 'Paneer', price: 250 });
    });
    act(() => {
      result.current.removeItem(1);
    });
    expect(result.current.cart[0].qty).toBe(1);
  });

  it('removes item entirely when qty reaches zero', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem({ item_id: 1, item_name: 'Paneer', price: 250 });
    });
    act(() => {
      result.current.removeItem(1);
    });
    expect(result.current.cart).toHaveLength(0);
  });

  it('clears the cart', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem({ item_id: 1, item_name: 'Paneer', price: 250 });
      result.current.addItem({ item_id: 2, item_name: 'Biryani', price: 350 });
    });
    act(() => {
      result.current.clearCart();
    });
    expect(result.current.cart).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
  });

  it('persists to sessionStorage', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem({ item_id: 5, item_name: 'Dal', price: 150 });
    });
    const stored = JSON.parse(sessionStorage.getItem('restro-cart') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].item_id).toBe(5);
  });
});
