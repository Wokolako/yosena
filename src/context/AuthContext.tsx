'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/*
 * The session lives in an httpOnly cookie set by the server, so no token is ever
 * visible to page scripts. The server passes the signed-in user in on first render.
 */

export interface AuthUser {
  id: string;
  email: string;
  clientName: string;
  companyName: string;
  memberId: string;
  accountRole: 'trade_partner' | 'admin' | 'jeweller';
  status: 'pending' | 'active' | 'disabled';
  tier: string;
  creditLineUSD: number;
  phone: string;
  address: string;
  isVerifiedTrade: boolean;
  createdAt: string;
  savedStoneIds: string[];
  preferences: {
    notifyDrops: boolean;
    notifyMemos: boolean;
  };
}

export interface SignUpFields {
  clientName: string;
  companyName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

/**
 * Flat rather than a discriminated union: the project compiles with
 * `strict: false`, and without strictNullChecks TypeScript will not narrow a
 * boolean-literal discriminant, so `error` has to be readable on both outcomes.
 */
export interface AuthResult {
  ok: boolean;
  error?: string;
}

export interface ProfilePatch {
  phone?: string;
  address?: string;
  savedStoneIds?: string[];
  preferences?: { notifyDrops?: boolean; notifyMemos?: boolean };
}

interface AuthContextType {
  user: AuthUser | null;
  /** Kept for existing callers; the server supplies the session, so nothing is restored client-side. */
  isRestoring: boolean;
  /** An approved trade account (may pay online and request memos). */
  isApprovedTrade: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (fields: SignUpFields) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function postJson(url: string, body: unknown, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export const AuthProvider: React.FC<{ children: React.ReactNode; initialUser?: AuthUser | null }> = ({
  children,
  initialUser = null,
}) => {
  const [user, setUser] = useState<AuthUser | null>(initialUser);

  // Earlier versions kept a token in localStorage; remove any that is left behind.
  useEffect(() => {
    try {
      localStorage.removeItem('yosenamora_token');
    } catch {
      // Ignore in restricted environments
    }
  }, []);

  const authenticate = useCallback(async (endpoint: string, payload: unknown): Promise<AuthResult> => {
    try {
      const { res, data } = await postJson(endpoint, payload);
      if (!res.ok || !data?.success) {
        return { ok: false, error: data?.error ?? 'Something went wrong. Please try again.' };
      }
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not reach the trade desk. Check your connection.' };
    }
  }, []);

  const signIn = useCallback(
    (email: string, password: string) => authenticate('/api/auth/login', { email, password }),
    [authenticate]
  );

  const signUp = useCallback((fields: SignUpFields) => authenticate('/api/auth/register', fields), [authenticate]);

  const signOut = useCallback(async () => {
    try {
      await postJson('/api/auth/logout', {});
    } finally {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      setUser(res.ok && data?.success ? data.user : null);
    } catch {
      // Keep the current state if the network is down.
    }
  }, []);

  const updateProfile = useCallback(async (patch: ProfilePatch): Promise<AuthResult> => {
    try {
      const { res, data } = await postJson('/api/auth/profile', patch, 'PUT');
      if (!res.ok || !data?.success) return { ok: false, error: data?.error ?? 'Could not save your changes.' };
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not reach the trade desk. Check your connection.' };
    }
  }, []);

  const isApprovedTrade = !!user && user.status === 'active' && user.isVerifiedTrade;

  return (
    <AuthContext.Provider
      value={{ user, isRestoring: false, isApprovedTrade, signIn, signUp, signOut, refreshUser, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
