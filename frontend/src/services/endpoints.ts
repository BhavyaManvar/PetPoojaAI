const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export const ENDPOINTS = {
  kpis: `${API_BASE}/kpis`,
  menuItems: `${API_BASE}/menu/items`,
  menuInsights: `${API_BASE}/menu/insights`,
  topCombos: `${API_BASE}/combos/top`,
  basketStats: `${API_BASE}/combos/basket-stats`,
  upsellForItem: (itemId: number) => `${API_BASE}/combos/upsell/for-item?item_id=${itemId}`,
  upsellBatch: `${API_BASE}/combos/upsell/batch`,
  upsellClearHistory: `${API_BASE}/combos/upsell/clear-history`,
  priceRecommendations: `${API_BASE}/price/recommendations`,
  priceSummary: `${API_BASE}/price/summary`,
  voiceChat: `${API_BASE}/voice/chat`,
  orderPush: `${API_BASE}/order/push`,
  orderList: `${API_BASE}/order/list`,
  orderSeed: `${API_BASE}/order/seed`,
  aiChat: `${API_BASE}/ai/chat`,
} as const;
