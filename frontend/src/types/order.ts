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
  antecedent: string;
  consequent: string;
  combo: string;
  support: number;
  confidence: number;
  lift: number;
}

export interface UpsellResult {
  item: string;
  recommended_addon: string | null;
  strategy: string | null;
  confidence?: number | null;
  margin?: number;
  alternatives?: { addon: string; strategy: string }[];
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
