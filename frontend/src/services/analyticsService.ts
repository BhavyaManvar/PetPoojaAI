import {
  collection,
  getDocs,
  setDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db as getDb } from "@/lib/firebase";
import { getMenuItems, type MenuItemDoc } from "./menuService";
import { getOrders, type OrderDoc } from "./orderService";

export type MenuClass = "Star" | "Plowhorse" | "Puzzle" | "Dog";

export interface AnalyticsItem {
  id?: string;
  item_id: string;
  item_name: string;
  category: string;
  price: number;
  food_cost: number;
  contribution_margin: number;
  margin_pct: number;
  total_qty_sold: number;
  total_revenue: number;
  popularity_score: number;
  classification: MenuClass;
}

export interface UpsellRule {
  id?: string;
  base_item: string;
  suggested_item: string;
  confidence_score: number;
}

export interface DashboardKPIs {
  totalRevenue: number;
  avgOrderValue: number;
  totalOrders: number;
  topSellingItems: { name: string; qty: number; revenue: number }[];
  highMarginItems: { name: string; margin: number; classification: MenuClass }[];
  upsellConversionRate: number;
  revenueByDay: { date: string; revenue: number }[];
}

// ── Contribution Margin & Classification ────────────────────────────────────

function classifyItem(
  marginPct: number,
  popularityScore: number,
  avgMarginPct: number,
  avgPopularity: number
): MenuClass {
  const highProfit = marginPct >= avgMarginPct;
  const highPopularity = popularityScore >= avgPopularity;

  if (highProfit && highPopularity) return "Star";
  if (!highProfit && highPopularity) return "Plowhorse";
  if (highProfit && !highPopularity) return "Puzzle";
  return "Dog";
}

export async function computeAnalytics(): Promise<AnalyticsItem[]> {
  const [menuItems, orders] = await Promise.all([getMenuItems(), getOrders(500)]);

  // Count item quantities from orders
  const itemCounts: Record<string, number> = {};
  const itemRevenue: Record<string, number> = {};
  let totalItemsSold = 0;

  for (const order of orders) {
    for (const oi of order.items) {
      const key = oi.name.toLowerCase().trim();
      itemCounts[key] = (itemCounts[key] || 0) + oi.quantity;
      itemRevenue[key] = (itemRevenue[key] || 0) + oi.price * oi.quantity;
      totalItemsSold += oi.quantity;
    }
  }

  // Build analytics for each menu item
  const analytics: AnalyticsItem[] = menuItems.map((mi) => {
    const key = mi.name.toLowerCase().trim();
    const qtySold = itemCounts[key] || 0;
    const revenue = itemRevenue[key] || 0;
    const margin = mi.price - mi.food_cost;
    const marginPct = mi.price > 0 ? (margin / mi.price) * 100 : 0;
    const popularityScore = totalItemsSold > 0 ? qtySold / totalItemsSold : 0;

    return {
      item_id: mi.id!,
      item_name: mi.name,
      category: mi.category,
      price: mi.price,
      food_cost: mi.food_cost,
      contribution_margin: margin,
      margin_pct: marginPct,
      total_qty_sold: qtySold,
      total_revenue: revenue,
      popularity_score: popularityScore,
      classification: "Star" as MenuClass, // placeholder
    };
  });

  // Compute averages for classification
  const avgMargin =
    analytics.length > 0
      ? analytics.reduce((s, a) => s + a.margin_pct, 0) / analytics.length
      : 0;
  const avgPopularity =
    analytics.length > 0
      ? analytics.reduce((s, a) => s + a.popularity_score, 0) / analytics.length
      : 0;

  // Classify
  for (const a of analytics) {
    a.classification = classifyItem(a.margin_pct, a.popularity_score, avgMargin, avgPopularity);
  }

  // Save to Firestore analytics collection
  for (const a of analytics) {
    await setDoc(doc(getDb(), "analytics", a.item_id), {
      item_id: a.item_id,
      contribution_margin: a.contribution_margin,
      popularity_score: a.popularity_score,
      classification: a.classification,
    });
  }

  return analytics;
}

// ── Upsell Rules ────────────────────────────────────────────────────────────

export async function getUpsellRules(): Promise<UpsellRule[]> {
  const q = query(
    collection(getDb(), "upsell_rules"),
    orderBy("confidence_score", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UpsellRule));
}

export async function generateUpsellRules(): Promise<UpsellRule[]> {
  const analytics = await computeAnalytics();

  const stars = analytics.filter((a) => a.classification === "Star");
  const puzzles = analytics.filter((a) => a.classification === "Puzzle");
  const plowhorses = analytics.filter((a) => a.classification === "Plowhorse");

  const rules: UpsellRule[] = [];

  // Suggest pairing popular (plowhorse) items with high-margin (puzzle) items
  for (const ph of plowhorses) {
    for (const pz of puzzles) {
      if (ph.category !== pz.category) {
        const confidence = Math.min(
          0.95,
          0.5 + ph.popularity_score * 5 + pz.margin_pct / 200
        );
        rules.push({
          base_item: ph.item_name,
          suggested_item: pz.item_name,
          confidence_score: Math.round(confidence * 100) / 100,
        });
      }
    }
  }

  // Star items can upsell other stars from different categories
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      if (stars[i].category !== stars[j].category) {
        rules.push({
          base_item: stars[i].item_name,
          suggested_item: stars[j].item_name,
          confidence_score: 0.85,
        });
      }
    }
  }

  // Sort by confidence and keep top 20
  rules.sort((a, b) => b.confidence_score - a.confidence_score);
  const topRules = rules.slice(0, 20);

  // Save to Firestore
  for (const rule of topRules) {
    await setDoc(doc(getDb(), "upsell_rules", `${rule.base_item}_${rule.suggested_item}`), rule);
  }

  return topRules;
}

// ── Dashboard KPIs ──────────────────────────────────────────────────────────

export async function computeDashboardKPIs(): Promise<DashboardKPIs> {
  const orders = await getOrders(500);
  const analytics = await computeAnalytics();

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Top selling items
  const itemMap: Record<string, { qty: number; revenue: number }> = {};
  for (const o of orders) {
    for (const item of o.items) {
      const key = item.name;
      if (!itemMap[key]) itemMap[key] = { qty: 0, revenue: 0 };
      itemMap[key].qty += item.quantity;
      itemMap[key].revenue += item.price * item.quantity;
    }
  }
  const topSellingItems = Object.entries(itemMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  // High margin items
  const highMarginItems = analytics
    .sort((a, b) => b.contribution_margin - a.contribution_margin)
    .slice(0, 8)
    .map((a) => ({
      name: a.item_name,
      margin: a.contribution_margin,
      classification: a.classification,
    }));

  // Upsell conversion (approximation: orders with 3+ items / total orders)
  const upsellOrders = orders.filter((o) => o.items.length >= 3).length;
  const upsellConversionRate = totalOrders > 0 ? (upsellOrders / totalOrders) * 100 : 0;

  // Revenue by day (last 7 days)
  const revenueByDay: Record<string, number> = {};
  for (const o of orders) {
    if (o.createdAt) {
      const d = new Date(o.createdAt).toISOString().split("T")[0];
      revenueByDay[d] = (revenueByDay[d] || 0) + o.total;
    }
  }
  const sortedDays = Object.entries(revenueByDay)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  return {
    totalRevenue,
    avgOrderValue,
    totalOrders,
    topSellingItems,
    highMarginItems,
    upsellConversionRate,
    revenueByDay: sortedDays,
  };
}
