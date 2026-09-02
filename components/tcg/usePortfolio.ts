'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PortfolioSnapshot, PortfolioSummary, ValuedItem } from '@/lib/tcg/types';

export interface PortfolioData {
  summary: PortfolioSummary;
  snapshots: PortfolioSnapshot[];
  items: ValuedItem[];
  prochainReleve: string;
}

/**
 * Chargement du coffre-fort côté client.
 * Une seule route sert le résumé, la courbe et les items : les trois sont
 * toujours affichés ensemble et doivent rester cohérents entre eux.
 */
export function usePortfolio(days = 90) {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tcg/portefeuille?jours=${days}`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Chargement impossible');
      setData(payload as PortfolioData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
