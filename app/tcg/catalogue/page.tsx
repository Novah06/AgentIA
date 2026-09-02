'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { formatEur } from '@/lib/tcg/pricing';
import type { PriceRefType, TcgSet } from '@/lib/tcg/types';

interface Entry {
  refType: PriceRefType;
  id: string;
  label: string;
  subLabel: string;
  setNameFr: string | null;
  imageUrl: string | null;
  priceEur: number | null;
}

export default function CataloguePage() {
  const [query, setQuery] = useState('');
  const [setId, setSetId] = useState('');
  const [type, setType] = useState<'' | PriceRefType>('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [sets, setSets] = useState<TcgSet[]>([]);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const id = ++requestId.current;
      setLoading(true);
      const params = new URLSearchParams({ q: query.trim(), limite: '60' });
      if (setId) params.set('extension', setId);
      if (type) params.set('type', type);
      try {
        const res = await fetch(`/api/tcg/catalogue?${params.toString()}`, { cache: 'no-store' });
        const payload = await res.json();
        if (id !== requestId.current) return;
        setEntries(payload.entries ?? []);
        setSets(payload.sets ?? []);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, setId, type]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl">Catalogue français</h1>
        <p className="text-sm text-tcg-secondary">
          Toutes les extensions et références en français, avec leur dernière cote connue.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une carte ou un produit…"
          className="min-w-[14rem] flex-1 rounded-lg border border-tcg-line bg-tcg-ink px-3 py-2 text-sm text-tcg-primary placeholder:text-tcg-muted focus:border-tcg-gold focus:outline-none"
        />
        <select
          value={setId}
          onChange={(e) => setSetId(e.target.value)}
          className="rounded-lg border border-tcg-line bg-tcg-ink px-3 py-2 text-sm text-tcg-primary focus:border-tcg-gold focus:outline-none"
        >
          <option value="">Toutes les extensions</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.nameFr}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as '' | PriceRefType)}
          className="rounded-lg border border-tcg-line bg-tcg-ink px-3 py-2 text-sm text-tcg-primary focus:border-tcg-gold focus:outline-none"
        >
          <option value="">Cartes et scellés</option>
          <option value="carte">Cartes</option>
          <option value="scelle">Produits scellés</option>
        </select>
      </div>

      {loading && <p className="text-sm text-tcg-muted">Recherche…</p>}

      {!loading && entries.length === 0 && (
        <p className="rounded-xl border border-dashed border-tcg-line px-4 py-8 text-center text-sm text-tcg-secondary">
          Aucun résultat. Le catalogue livré avec l’application est une amorce : lancez le bot
          de synchronisation pour charger l’intégralité des extensions françaises.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/tcg/reference/${entry.id}`}
              className="flex h-full gap-3 rounded-xl border border-tcg-line bg-tcg-card p-3 hover:bg-tcg-card-hover"
            >
              {entry.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.imageUrl} alt="" className="h-24 w-auto rounded" />
              ) : (
                <div className="flex h-24 w-16 items-center justify-center rounded bg-tcg-ink text-xs text-tcg-muted">
                  {entry.refType === 'scelle' ? 'Scellé' : 'Carte'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-tcg-primary">{entry.label}</div>
                <div className="truncate text-xs text-tcg-muted">{entry.subLabel}</div>
                <div className="mt-2 text-sm text-tcg-gold">
                  {entry.priceEur === null ? 'Pas encore coté' : formatEur(entry.priceEur)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
