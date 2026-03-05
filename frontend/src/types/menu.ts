export interface MenuItem {
  item_id: number;
  item_name: string;
  category: string;
  total_qty_sold: number;
  total_revenue: number;
  contribution_margin: number;
  margin_pct: number;
  avg_daily_sales: number;
  menu_class: "Star" | "Puzzle" | "Plow Horse" | "Dog";
}

export interface HiddenStar {
  item_id: number;
  item: string;
  margin: number;
  margin_pct: number;
  reason: string;
}

export interface RiskItem {
  item_id: number;
  item: string;
  margin: number;
  reason: string;
}
