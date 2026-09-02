'use client';

import { useMemo, useState } from 'react';
import ItemTable from '@/components/tcg/ItemTable';
import KindBreakdown from '@/components/tcg/KindBreakdown';
import StatTile from '@/components/tcg/StatTile';
import ValueChart, { type ChartPoint } from '@/components/tcg/ValueChart';
import { PriceSourceNotice } from '@/components/tcg/Notices';
import { usePortfolio } from '@/components/tcg/usePortfolio';
import { formatEur, GRADING_COST_EUR, gradingUpside } from '@/lib/tcg/pricing';
import type { ItemKind } from '@/lib/tcg/types';

type Tab = 'total' | ItemKind;

const TABS: { key: Tab; label: string; color: string }[] = [
  { key: 'total', label: 'Coffre-fort', color: '#f2c14e' },
  { key: 'loose', label: 'Cartes loose', color: '#3987e5' },
  { key: 'gradee', label: 'Cartes gradées', color: '#d95926' },
  { key: 'scelle', label: 'Scellés', color: '#199e70' },
];

export default function CoffrePage() {
  const { data, error, loading } = usePortfolio(180);
  const [tab, setTab] = useState<Tab>('total');

  const active = TABS.find((t) => t.key === tab)!;

  const curve: ChartPoint[] = useMemo(() => {
    const snapshots = data?.snapshots ?? [];
    return snapshots.map((s) => ({
      t: s.capturedAt,
      v:
        tab === 'total'
          ? s.totalEur
          : tab === 'loose'
            ? s.looseEur
            : tab === 'gradee'
              ? s.gradeeEur
              : s.scelleEur,
    }));
  }, [data?.snapshots, tab]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    const filtered = tab === 'total' ? all : all.filter((i) => i.kind === tab);
    return [...filtered].sort((a, b) => (b.totalValueEur ?? 0) - (a.totalValueEur ?? 0));
  }, [data?.items, tab]);

  /**
   * Cartes loose dont la gradation rapporterait le plus : c'est la décision
   * concrète que pose un coffre-fort — quelles cartes envoyer à la note.
   */
  const gradingCandidates = useMemo(() => {
    return (data?.items ?? [])
      .filter((item) => item.kind === 'loose' && item.condition === 'NM' && item.basePriceEur)
      .map((item) => ({ item, upside: gradingUpside(item.basePriceEur!, 10, 'PSA') }))
      .filter((row) => row.upside > 0)
      .sort((a, b) => b.upside - a.upside)
      .slice(0, 5);
  }, [data?.items]);

  if (loading && !data) {
    return <p className="py-16 text-center text-tcg-secondary">Chargement du coffre-fort…</p>;
  }
  if (error) return <p className="py-16 text-center text-tcg-down">{error}</p>;
  if (!data) return null;

  const { summary } = data;
  const tabValue =
    tab === 'total' ? summary.totalEur : summary.byKind[tab].valueEur;
  const tabCount = tab === 'total' ? summary.itemCount : summary.byKind[tab].itemCount;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl">Coffre-fort</h1>
        <p className="text-sm text-tcg-secondary">
          La valeur de vos avoirs, séparée par nature : loose, gradées, scellés.
        </p>
      </div>

      <PriceSourceNotice summary={summary} prochainReleve={data.prochainReleve} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
              tab === t.key
                ? 'bg-tcg-card-hover text-tcg-primary'
                : 'text-tcg-secondary hover:text-tcg-primary'
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: t.color }}
              aria-hidden
            />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label={`Valeur — ${active.label}`} value={formatEur(tabValue)} accent />
        <StatTile
          label="Part du coffre-fort"
          value={
            summary.totalEur > 0
              ? `${Math.round((tabValue / summary.totalEur) * 100)} %`
              : '—'
          }
        />
        <StatTile label="Items" value={String(tabCount)} />
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-lg">Évolution — {active.label}</h2>
        <ValueChart points={curve} label={active.label} color={active.color} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <KindBreakdown summary={summary} />

        <div className="rounded-xl border border-tcg-line bg-tcg-card p-4">
          <div className="text-xs uppercase tracking-wide text-tcg-muted">
            À envoyer en gradation ?
          </div>
          <p className="mt-1 text-xs text-tcg-muted">
            Gain estimé si la carte obtenait une PSA 10, coût de gradation
            ({formatEur(GRADING_COST_EUR)}) déduit. Estimation par coefficients : une note
            inférieure change complètement le résultat.
          </p>
          {gradingCandidates.length === 0 ? (
            <p className="mt-4 text-sm text-tcg-secondary">
              Aucune carte loose Near Mint suffisamment cotée pour que la gradation soit
              rentable aujourd’hui.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-tcg-line">
              {gradingCandidates.map(({ item, upside }) => (
                <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-tcg-primary">{item.label}</span>
                  <span className="tabular-nums text-tcg-muted">
                    {formatEur(item.basePriceEur)}
                  </span>
                  <span className="w-24 text-right tabular-nums text-tcg-up">
                    +{formatEur(upside)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-lg">Détail — {active.label}</h2>
        <ItemTable items={items} />
      </section>
    </div>
  );
}
