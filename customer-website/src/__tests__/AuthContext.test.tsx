import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase before importing anything that uses it
vi.mock('@/lib/firebase', () => ({
  getFirebaseAuth: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, cb) => {
    // call with null immediately (no user)
    cb(null);
    return vi.fn(); // unsubscribe
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import type { ReactNode } from 'react';
import React from 'react';

const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(AuthProvider, null, children);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides null user when not signed in', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('exposes signIn, signUp, logout functions', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signUp).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });
});
