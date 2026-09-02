'use client';

import { useMemo, useState } from 'react';
import ItemForm from '@/components/tcg/ItemForm';
import ItemTable from '@/components/tcg/ItemTable';
import { PriceSourceNotice } from '@/components/tcg/Notices';
import { usePortfolio } from '@/components/tcg/usePortfolio';
import { formatEur } from '@/lib/tcg/pricing';
import { ITEM_KIND_LABELS } from '@/lib/tcg/types';
import type { ItemKind, ValuedItem } from '@/lib/tcg/types';

type Filter = 'tous' | ItemKind;
type Sort = 'valeur' | 'gain' | 'recent' | 'nom';

export default function CollectionPage() {
  const { data, error, loading, reload } = usePortfolio(30);
  const [filter, setFilter] = useState<Filter>('tous');
  const [sort, setSort] = useState<Sort>('valeur');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ValuedItem | null>(null);

  const items = useMemo(() => {
    const source = data?.items ?? [];
    const q = search.trim().toLowerCase();
    const filtered = source.filter((item) => {
      if (filter !== 'tous' && item.kind !== filter) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        (item.setNameFr ?? '').toLowerCase().includes(q) ||
        item.subLabel.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'valeur') return (b.totalValueEur ?? 0) - (a.totalValueEur ?? 0);
      if (sort === 'gain') return (b.gainEur ?? 0) - (a.gainEur ?? 0);
      if (sort === 'nom') return a.label.localeCompare(b.label, 'fr');
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [data?.items, filter, search, sort]);

  const shownValue = items.reduce((sum, item) => sum + (item.totalValueEur ?? 0), 0);

  async function remove(item: ValuedItem) {
    if (!confirm(`Retirer « ${item.label} » de votre collection ?`)) return;
    const res = await fetch(`/api/tcg/items/${item.id}`, { method: 'DELETE' });
    if (res.ok) void reload();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Collection</h1>
          <p className="text-sm text-tcg-secondary">
            {items.length} item{items.length > 1 ? 's' : ''} affiché
            {items.length > 1 ? 's' : ''} · {formatEur(shownValue)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen((open) => !open);
          }}
          className="rounded-lg bg-tcg-gold px-4 py-2 text-sm font-medium text-tcg-ink hover:bg-tcg-gold-dim"
        >
          {formOpen && !editing ? 'Fermer' : 'Ajouter un item'}
        </button>
      </div>

      {data && <PriceSourceNotice summary={data.summary} prochainReleve={data.prochainReleve} />}

      {(formOpen || editing) && (
        <ItemForm
          editing={editing}
          onSaved={() => {
            setFormOpen(false);
            setEditing(null);
            void reload();
          }}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(['tous', 'loose', 'gradee', 'scelle'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === f
                ? 'bg-tcg-card-hover text-tcg-primary'
                : 'text-tcg-secondary hover:text-tcg-primary'
            }`}
          >
            {f === 'tous' ? 'Tout' : ITEM_KIND_LABELS[f]}
          </button>
        ))}

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer…"
          className="ml-auto w-40 rounded-lg border border-tcg-line bg-tcg-ink px-3 py-1.5 text-sm text-tcg-primary placeholder:text-tcg-muted focus:border-tcg-gold focus:outline-none"
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-lg border border-tcg-line bg-tcg-ink px-3 py-1.5 text-sm text-tcg-primary focus:border-tcg-gold focus:outline-none"
        >
          <option value="valeur">Valeur décroissante</option>
          <option value="gain">Plus-value</option>
          <option value="recent">Ajout récent</option>
          <option value="nom">Nom</option>
        </select>
      </div>

      {loading && !data && <p className="py-10 text-center text-tcg-secondary">Chargement…</p>}
      {error && <p className="text-sm text-tcg-down">{error}</p>}

      <ItemTable
        items={items}
        onEdit={(item) => {
          setEditing(item);
          setFormOpen(true);
        }}
        onDelete={remove}
      />
    </div>
  );
}
