'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatEur } from '@/lib/tcg/pricing';
import type { PriceRefType } from '@/lib/tcg/types';

export interface PickedRef {
  id: string;
  label: string;
  subLabel: string;
  imageUrl: string | null;
  variants: string[];
  priceEur: number | null;
  refType: PriceRefType;
}

interface Props {
  refType: PriceRefType;
  value: PickedRef | null;
  onChange: (ref: PickedRef | null) => void;
}

/**
 * Sélecteur de référence du catalogue français.
 * La recherche est débattue de 250 ms : sans cela, chaque frappe déclencherait
 * une requête et l'ordre des réponses ne serait plus garanti.
 */
export default function RefPicker({ refType, value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedRef[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const placeholder = useMemo(
    () =>
      refType === 'scelle'
        ? 'Display, coffret dresseur d’élite, bundle…'
        : 'Nom de la carte, ou numéro (ex. Dracaufeu, 238)',
    [refType]
  );

  useEffect(() => {
    if (value) return;
    const trimmed = query.trim();
    const timer = setTimeout(async () => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/tcg/catalogue?q=${encodeURIComponent(trimmed)}&type=${refType}&limite=25`,
          { cache: 'no-store' }
        );
        const payload = await res.json();
        // Une réponse en retard ne doit pas écraser une recherche plus récente.
        if (id !== requestId.current) return;
        setResults(res.ok ? (payload.entries ?? []) : []);
      } catch {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, refType, value]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-tcg-line bg-tcg-ink p-3">
        {value.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.imageUrl} alt="" className="h-16 w-auto rounded" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-tcg-primary">{value.label}</div>
          <div className="truncate text-xs text-tcg-muted">{value.subLabel}</div>
          {value.priceEur !== null && (
            <div className="text-xs text-tcg-gold">Cote : {formatEur(value.priceEur)}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery('');
          }}
          className="rounded-md border border-tcg-line px-2 py-1 text-xs text-tcg-secondary hover:text-tcg-primary"
        >
          Changer
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-tcg-line bg-tcg-ink px-3 py-2 text-sm text-tcg-primary placeholder:text-tcg-muted focus:border-tcg-gold focus:outline-none"
      />
      <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-tcg-line">
        {loading && <p className="px-3 py-2 text-xs text-tcg-muted">Recherche…</p>}
        {!loading && results.length === 0 && (
          <p className="px-3 py-2 text-xs text-tcg-muted">
            Aucune référence. Le catalogue complet arrive avec le bot de synchronisation.
          </p>
        )}
        {results.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onChange(entry)}
            className="flex w-full items-center gap-3 border-b border-tcg-line px-3 py-2 text-left last:border-b-0 hover:bg-tcg-card-hover"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-tcg-primary">{entry.label}</div>
              <div className="truncate text-xs text-tcg-muted">{entry.subLabel}</div>
            </div>
            {entry.priceEur !== null && (
              <span className="shrink-0 text-xs text-tcg-gold">{formatEur(entry.priceEur)}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
