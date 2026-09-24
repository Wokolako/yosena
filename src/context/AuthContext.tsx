'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';

/**
 * The member's trade profile.
 *
 * Clerk owns identity — credentials, email, name, avatar. It knows nothing
 * about the trade relationship, so member id, tier, credit line and role are
 * read from this app's own database via /api/auth/me and exposed here.
 *
 * Components carry on calling `useAuth()` as before; what changed underneath is
 * that the session comes from Clerk rather than a token in localStorage.
 */
export interface AuthUser {
  id: string;
  clerkUserId: string | null;
  email: string;
  clientName: string;
  companyName: string;
  memberId: string;
  accountRole: 'trade_partner' | 'admin' | 'jeweller';
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

interface AuthContextType {
  /** The trade profile, or null when signed out. */
  user: AuthUser | null;
  /** True while Clerk is loading or the trade profile is being fetched. */
  isRestoring: boolean;
  /** Set when the profile could not be loaded despite a valid session. */
  error: string | null;
  /** Re-reads the profile — call after the desk changes tier or credit. */
  refresh: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded: isClerkLoaded, isSignedIn, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useUser();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    setError(null);

    try {
      // Clerk's session cookie rides along automatically on a same-origin fetch,
      // so there is no token to attach.
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (res.ok && data?.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
        setError(data?.error ?? 'Your trade profile could not be loaded.');
      }
    } catch {
      setUser(null);
      setError('Could not reach the trade desk. Check your connection.');
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (!isClerkLoaded) return;

    if (!isSignedIn) {
      setUser(null);
      setError(null);
      return;
    }

    void loadProfile();
    // clerkUser.id is in the deps so switching account refetches the profile.
  }, [isClerkLoaded, isSignedIn, clerkUser?.id, loadProfile]);

  const signOut = useCallback(() => {
    setUser(null);
    void clerkSignOut();
  }, [clerkSignOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isRestoring: !isClerkLoaded || isLoadingProfile,
        error,
        refresh: loadProfile,
        signOut,
      }}
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
