export interface KPIData {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  top_city: string;
  revenue_by_city: Record<string, number>;
  revenue_by_order_type: Record<string, number>;
  top_items: { item_name: string; total_qty: number }[];
}

export interface Combo {
  combo: string;
  antecedent: string;
  consequent: string;
  support: number;
  confidence: number;
  lift: number;
}

export interface BasketStats {
  total_baskets: number;
  avg_basket_size: number;
  max_basket_size: number;
  min_basket_size: number;
}

export interface TopCombosResponse {
  combos: Combo[];
  basket_stats: BasketStats | null;
}

export interface UpsellResult {
  item: string;
  recommended_addon: string | null;
  addon_id: number | null;
  strategy: string | null;
  confidence?: number;
  lift?: number;
  margin?: number;
}

export interface ParsedVoiceItem {
  item: string;
  qty: number;
}

export interface VoiceParseResponse {
  items: ParsedVoiceItem[];
}

export interface OrderLineItem {
  item_id: number;
  qty: number;
}

export interface OrderResponse {
  order_id: number;
  status: string;
  total_price: number;
  items: {
    item_id: number;
    item_name: string;
    qty: number;
    unit_price: number;
    line_total: number;
  }[];
}
