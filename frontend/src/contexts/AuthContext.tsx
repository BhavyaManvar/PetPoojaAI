"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { auth as getAuth, db as getDb } from "@/lib/firebase";

export type UserRole = "admin" | "staff";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  demoMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  demoSignIn: () => void;
  addStaffMember: (email: string, password: string, name: string) => Promise<void>;
  getStaffMembers: () => Promise<StaffMember[]>;
  deleteStaffMember: (staffId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(getDb(), "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setAppUser({
            id: firebaseUser.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getAuth(), email, password);
  };

  const demoSignIn = () => {
    setDemoMode(true);
    setAppUser({
      id: "demo-user",
      name: "Demo Admin",
      email: "demo@petpooja.ai",
      role: "admin",
      createdAt: new Date(),
    });
    setLoading(false);
  };

  // Admin-only: create a staff member's Firestore record.
  // The admin creates credentials; staff uses them to log in.
  // Note: Firebase client SDK doesn't allow creating users without
  // signing them in, so we store a pending record in Firestore.
  // The staff member will be fully created when they first sign in
  // using the Firebase Admin SDK or a secondary Firebase app.
  const addStaffMember = useCallback(
    async (email: string, password: string, name: string) => {
      if (appUser?.role !== "admin") {
        throw new Error("Only admins can add staff members");
      }

      // Use a secondary Firebase app to create the user without signing out the admin
      const { initializeApp, deleteApp } = await import("firebase/app");
      const { getAuth: getSecondaryAuth, createUserWithEmailAndPassword } = await import("firebase/auth");

      const secondaryApp = initializeApp(
        {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        },
        "secondary-" + Date.now()
      );

      try {
        const secondaryAuth = getSecondaryAuth(secondaryApp);
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);

        await setDoc(doc(getDb(), "users", cred.user.uid), {
          name,
          email,
          role: "staff" as UserRole,
          createdBy: appUser.id,
          createdAt: serverTimestamp(),
        });
      } finally {
        await deleteApp(secondaryApp);
      }
    },
    [appUser]
  );

  const getStaffMembers = useCallback(async (): Promise<StaffMember[]> => {
    const q = query(
      collection(getDb(), "users"),
      where("role", "==", "staff"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        email: data.email,
        role: data.role,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });
  }, []);

  const deleteStaffMember = useCallback(
    async (staffId: string) => {
      if (appUser?.role !== "admin") {
        throw new Error("Only admins can remove staff members");
      }
      await deleteDoc(doc(getDb(), "users", staffId));
    },
    [appUser]
  );

  const signOut = async () => {
    if (demoMode) {
      setDemoMode(false);
      setAppUser(null);
      return;
    }
    await firebaseSignOut(getAuth());
    setAppUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        demoMode,
        signIn,
        signOut,
        demoSignIn,
        addStaffMember,
        getStaffMembers,
        deleteStaffMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
