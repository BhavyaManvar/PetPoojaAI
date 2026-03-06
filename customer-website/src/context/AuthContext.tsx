import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { API } from '@/lib/api';

export type UserRole = 'customer' | 'staff' | 'admin';

export interface AppUser {
  uid: string;
  email: string | null;
  role: UserRole;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const auth = getFirebaseAuth();
      unsub = onAuthStateChanged(auth, async (fbUser: User | null) => {
        if (!fbUser) {
          setUser(null);
          setLoading(false);
          return;
        }
        // Try to verify with backend for role
        let role: UserRole = 'customer';
        try {
          const token = await fbUser.getIdToken();
          const res = await fetch(API.authVerify, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ token }),
          });
          if (res.ok) {
            const data = await res.json();
            role = data.role || 'customer';
          }
        } catch {
          // Backend unavailable — default to customer
        }
        setUser({ uid: fbUser.uid, email: fbUser.email, role });
        setLoading(false);
      });
    } catch {
      setLoading(false);
    }
    return () => unsub?.();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  };

  const logout = async () => {
    await firebaseSignOut(getFirebaseAuth());
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
