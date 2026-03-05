const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export const ENDPOINTS = {
  kpis: `${API_BASE}/kpis`,
  menuInsights: `${API_BASE}/menu/insights`,
  hiddenStars: `${API_BASE}/menu/hidden-stars`,
  riskItems: `${API_BASE}/menu/risk-items`,
  topCombos: `${API_BASE}/combos/top`,
  upsellForItem: (itemId: number) => `${API_BASE}/upsell/for-item?item_id=${itemId}`,
  voiceParse: `${API_BASE}/voice/parse`,
  orderPush: `${API_BASE}/order/push`,
} as const;
