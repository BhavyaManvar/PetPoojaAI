/**
 * Firestore Seed Data Script
 *
 * Run: npx tsx src/scripts/seed-firestore.ts
 *
 * Make sure .env.local has your Firebase config before running.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Menu Items ──────────────────────────────────────────────────────────────

const menuItems = [
  { name: "Butter Chicken", price: 350, food_cost: 120, category: "Main Course", modifiers: ["spicy", "mild", "extra butter"] },
  { name: "Paneer Tikka", price: 280, food_cost: 90, category: "Starters", modifiers: ["spicy", "mild"] },
  { name: "Dal Makhni", price: 220, food_cost: 60, category: "Main Course", modifiers: ["extra cream"] },
  { name: "Chicken Biryani", price: 320, food_cost: 110, category: "Rice & Biryani", modifiers: ["spicy", "mild", "raita"] },
  { name: "Veg Biryani", price: 250, food_cost: 70, category: "Rice & Biryani", modifiers: ["spicy", "mild"] },
  { name: "Naan", price: 60, food_cost: 12, category: "Breads", modifiers: ["butter", "garlic", "plain"] },
  { name: "Garlic Naan", price: 80, food_cost: 18, category: "Breads", modifiers: [] },
  { name: "Roti", price: 40, food_cost: 8, category: "Breads", modifiers: ["butter"] },
  { name: "Gulab Jamun", price: 120, food_cost: 30, category: "Desserts", modifiers: [] },
  { name: "Rasgulla", price: 100, food_cost: 25, category: "Desserts", modifiers: [] },
  { name: "Masala Chai", price: 50, food_cost: 10, category: "Beverages", modifiers: ["extra sweet", "less sugar"] },
  { name: "Lassi", price: 90, food_cost: 20, category: "Beverages", modifiers: ["sweet", "salted", "mango"] },
  { name: "Cold Coffee", price: 150, food_cost: 35, category: "Beverages", modifiers: ["extra shot"] },
  { name: "Tandoori Chicken", price: 400, food_cost: 150, category: "Starters", modifiers: ["half", "full"] },
  { name: "Samosa", price: 60, food_cost: 15, category: "Snacks", modifiers: ["chutney"] },
  { name: "Spring Roll", price: 120, food_cost: 35, category: "Snacks", modifiers: ["veg", "chicken"] },
  { name: "Palak Paneer", price: 240, food_cost: 80, category: "Main Course", modifiers: ["mild", "spicy"] },
  { name: "Chole Bhature", price: 180, food_cost: 50, category: "Main Course", modifiers: [] },
  { name: "Fish Curry", price: 380, food_cost: 160, category: "Main Course", modifiers: ["spicy", "mild"] },
  { name: "Mango Kulfi", price: 110, food_cost: 28, category: "Desserts", modifiers: [] },
  { name: "Aloo Paratha", price: 100, food_cost: 25, category: "Breads", modifiers: ["butter", "curd"] },
  { name: "Chicken Tikka", price: 300, food_cost: 100, category: "Starters", modifiers: ["spicy", "mild"] },
  { name: "Mushroom Soup", price: 160, food_cost: 40, category: "Starters", modifiers: [] },
  { name: "Raita", price: 70, food_cost: 15, category: "Sides", modifiers: ["boondi", "mix veg"] },
  { name: "Papad", price: 40, food_cost: 5, category: "Sides", modifiers: ["roasted", "fried"] },
];

// ── Sample Orders ───────────────────────────────────────────────────────────

function randomItems(count: number) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const mi = menuItems[Math.floor(Math.random() * menuItems.length)];
    const qty = Math.floor(Math.random() * 3) + 1;
    items.push({
      name: mi.name,
      quantity: qty,
      price: mi.price,
    });
  }
  return items;
}

function randomDate(daysBack: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 14) + 8);
  d.setMinutes(Math.floor(Math.random() * 60));
  return d;
}

const ORDER_SOURCES = ["voice", "manual", "online"] as const;
const ORDER_STATUSES = ["confirmed", "completed", "completed", "completed", "preparing"] as const;

// ── Upsell Rules ────────────────────────────────────────────────────────────

const upsellRules = [
  { base_item: "Butter Chicken", suggested_item: "Garlic Naan", confidence_score: 0.92 },
  { base_item: "Chicken Biryani", suggested_item: "Raita", confidence_score: 0.88 },
  { base_item: "Dal Makhni", suggested_item: "Naan", confidence_score: 0.85 },
  { base_item: "Paneer Tikka", suggested_item: "Masala Chai", confidence_score: 0.78 },
  { base_item: "Chole Bhature", suggested_item: "Lassi", confidence_score: 0.82 },
  { base_item: "Tandoori Chicken", suggested_item: "Cold Coffee", confidence_score: 0.71 },
  { base_item: "Fish Curry", suggested_item: "Roti", confidence_score: 0.80 },
  { base_item: "Samosa", suggested_item: "Masala Chai", confidence_score: 0.90 },
  { base_item: "Veg Biryani", suggested_item: "Raita", confidence_score: 0.86 },
  { base_item: "Palak Paneer", suggested_item: "Garlic Naan", confidence_score: 0.84 },
];

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding menu items...");
  for (const item of menuItems) {
    await addDoc(collection(db, "menus"), {
      ...item,
      createdAt: serverTimestamp(),
    });
  }
  console.log(`  ✓ ${menuItems.length} menu items added`);

  console.log("Seeding orders...");
  const orderCount = 80;
  for (let i = 0; i < orderCount; i++) {
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const items = randomItems(itemCount);
    const total = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const createdAt = randomDate(14);

    await addDoc(collection(db, "orders"), {
      items,
      total,
      order_source: ORDER_SOURCES[Math.floor(Math.random() * ORDER_SOURCES.length)],
      status: ORDER_STATUSES[Math.floor(Math.random() * ORDER_STATUSES.length)],
      createdAt,
    });

    // Also add sales_transaction
    await addDoc(collection(db, "sales_transactions"), {
      items: items.map((it) => it.name),
      revenue: total,
      timestamp: createdAt,
    });
  }
  console.log(`  ✓ ${orderCount} orders added`);

  console.log("Seeding upsell rules...");
  for (const rule of upsellRules) {
    await setDoc(doc(db, "upsell_rules", `${rule.base_item}_${rule.suggested_item}`), rule);
  }
  console.log(`  ✓ ${upsellRules.length} upsell rules added`);

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
