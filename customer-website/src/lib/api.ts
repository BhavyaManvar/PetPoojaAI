const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const API = {
  menuItems: (category?: string) =>
    category
      ? `${API_BASE}/menu/items?category=${encodeURIComponent(category)}`
      : `${API_BASE}/menu/items`,
  orderPush: `${API_BASE}/order/push`,
  orderList: (limit = 20) => `${API_BASE}/order/list?limit=${limit}`,
  authVerify: `${API_BASE}/auth/verify`,
  voiceChat: `${API_BASE}/voice/chat`,
} as const;

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}
