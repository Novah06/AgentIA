'use client';

import Link from 'next/link';
import ValueChart, { type ChartPoint } from '@/components/tcg/ValueChart';
import StatTile from '@/components/tcg/StatTile';
import KindBreakdown from '@/components/tcg/KindBreakdown';
import { EmptyState, PriceSourceNotice } from '@/components/tcg/Notices';
import { usePortfolio } from '@/components/tcg/usePortfolio';
import { formatEur, formatPct } from '@/lib/tcg/pricing';

export default function TcgDashboard() {
  const { data, error, loading } = usePortfolio(90);

  if (loading && !data) {
    return <p className="py-16 text-center text-tcg-secondary">Chargement du coffre-fort…</p>;
  }
  if (error) {
    return <p className="py-16 text-center text-tcg-down">{error}</p>;
  }
  if (!data) return null;

  const { summary, snapshots, items } = data;
  const curve: ChartPoint[] = snapshots.map((s) => ({ t: s.capturedAt, v: s.totalEur }));

  const top = [...items]
    .filter((i) => i.totalValueEur !== null)
    .sort((a, b) => (b.totalValueEur ?? 0) - (a.totalValueEur ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Tableau de bord</h1>
          <p className="text-sm text-tcg-secondary">
            {summary.itemCount} item{summary.itemCount > 1 ? 's' : ''} suivi
            {summary.itemCount > 1 ? 's' : ''} dans votre coffre-fort.
          </p>
        </div>
        <Link
          href="/tcg/collection"
          className="rounded-lg bg-tcg-gold px-4 py-2 text-sm font-medium text-tcg-ink hover:bg-tcg-gold-dim"
        >
          Ajouter un item
        </Link>
      </div>

      <PriceSourceNotice summary={summary} prochainReleve={data.prochainReleve} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Valeur du coffre-fort" value={formatEur(summary.totalEur)} accent />
        <StatTile
          label="Variation 24 h"
          value={summary.change24hEur === null ? '—' : formatEur(summary.change24hEur)}
          deltaEur={summary.change24hEur}
          deltaPct={summary.change24hPct}
          hint={summary.change24hEur === null ? 'Deux relevés nécessaires' : undefined}
        />
        <StatTile
          label="Plus-value latente"
          value={formatEur(summary.gainEur)}
          deltaEur={summary.gainEur}
          deltaPct={summary.gainPct}
          hint={`Investi : ${formatEur(summary.investedEur)}`}
        />
        <StatTile
          label="Items"
          value={String(summary.itemCount)}
          hint={`${summary.byKind.loose.itemCount} loose · ${summary.byKind.gradee.itemCount} gradées · ${summary.byKind.scelle.itemCount} scellés`}
        />
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-lg">Valeur du coffre-fort sur 90 jours</h2>
        <ValueChart points={curve} label="Valeur du coffre-fort" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <KindBreakdown summary={summary} />

        <div className="rounded-xl border border-tcg-line bg-tcg-card p-4">
          <div className="text-xs uppercase tracking-wide text-tcg-muted">
            Vos cinq plus grosses lignes
          </div>
          {top.length === 0 ? (
            <p className="mt-4 text-sm text-tcg-secondary">
              Aucun item pour l’instant. Commencez par la{' '}
              <Link href="/tcg/collection" className="text-tcg-gold underline">
                collection
              </Link>{' '}
              ou par un{' '}
              <Link href="/tcg/scan" className="text-tcg-gold underline">
                scan
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-tcg-line">
              {top.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
                  <Link
                    href={`/tcg/reference/${item.refId}`}
                    className="flex-1 truncate hover:text-tcg-gold"
                  >
                    <span className="text-tcg-primary">{item.label}</span>
                    <span className="ml-2 text-tcg-muted">{item.subLabel}</span>
                  </Link>
                  <span className="tabular-nums text-tcg-primary">
                    {formatEur(item.totalValueEur)}
                  </span>
                  {item.gainPct !== null && (
                    <span
                      className={`w-16 text-right tabular-nums ${
                        item.gainPct >= 0 ? 'text-tcg-up' : 'text-tcg-down'
                      }`}
                    >
                      {formatPct(item.gainPct)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {items.length === 0 && (
        <EmptyState title="Votre coffre-fort est vide">
          Ajoutez vos cartes loose, vos cartes gradées et vos produits scellés : leur valeur
          est recalculée à chaque relevé de cotes, et la courbe se construit toute seule.
        </EmptyState>
      )}
    </div>
  );
}
