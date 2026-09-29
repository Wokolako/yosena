'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { SiteData } from '../types';

/*
 * The catalog, journal, services, policies and checkout settings, as loaded by the
 * server from the data store for this request. Admin edits appear on the next load.
 */

interface SiteDataContextType extends SiteData {
  /** Re-reads stone availability (e.g. after an order reserves stones). */
  refreshStones: () => Promise<void>;
}

const SiteDataContext = createContext<SiteDataContextType | undefined>(undefined);

export const SiteDataProvider: React.FC<{ initialData: SiteData; children: React.ReactNode }> = ({
  initialData,
  children,
}) => {
  const [data, setData] = useState<SiteData>(initialData);

  const refreshStones = useCallback(async () => {
    try {
      const res = await fetch('/api/gemstones', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setData((prev) => ({ ...prev, stones: json.data }));
      }
    } catch {
      // Keep showing the last known catalog.
    }
  }, []);

  return <SiteDataContext.Provider value={{ ...data, refreshStones }}>{children}</SiteDataContext.Provider>;
};

export const useSiteData = (): SiteDataContextType => {
  const context = useContext(SiteDataContext);
  if (!context) throw new Error('useSiteData must be used within a SiteDataProvider');
  return context;
};
