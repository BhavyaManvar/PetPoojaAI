import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db as getDb } from "@/lib/firebase";

export interface MenuItemDoc {
  id?: string;
  name: string;
  price: number;
  food_cost: number;
  category: string;
  modifiers: string[];
  createdAt?: Date;
}

const COLLECTION = "menus";

export async function getMenuItems(): Promise<MenuItemDoc[]> {
  const q = query(collection(getDb(), COLLECTION), orderBy("category"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItemDoc));
}

export async function getMenuItem(id: string): Promise<MenuItemDoc | null> {
  const snap = await getDoc(doc(getDb(), COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as MenuItemDoc;
}

export async function addMenuItem(item: Omit<MenuItemDoc, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(getDb(), COLLECTION), {
    ...item,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMenuItem(id: string, data: Partial<MenuItemDoc>): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTION, id), data as DocumentData);
}

export async function deleteMenuItem(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), COLLECTION, id));
}
