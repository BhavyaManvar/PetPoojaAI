import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db as getDb } from "@/lib/firebase";

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  modifiers?: {
    size?: string | null;
    spice_level?: string | null;
    addons?: string[];
  };
}

export interface OrderDoc {
  id?: string;
  items: OrderItem[];
  total: number;
  order_source: "voice" | "manual" | "online";
  status: "pending" | "confirmed" | "preparing" | "completed" | "cancelled";
  createdAt?: Date;
}

const COLLECTION = "orders";

export async function createOrder(order: Omit<OrderDoc, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(getDb(), COLLECTION), {
    ...order,
    createdAt: serverTimestamp(),
  });

  // Also create a sales_transaction entry
  await addDoc(collection(getDb(), "sales_transactions"), {
    items: order.items.map((i) => i.name),
    revenue: order.total,
    timestamp: serverTimestamp(),
  });

  return ref.id;
}

export async function getOrders(limitCount = 50): Promise<OrderDoc[]> {
  const q = query(
    collection(getDb(), COLLECTION),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as OrderDoc;
  });
}
