'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ValueChart, { type ChartPoint } from '@/components/tcg/ValueChart';
import StatTile from '@/components/tcg/StatTile';
import { formatDateTimeFr, formatEur, GRADE_FACTORS, COMPANY_FACTORS } from '@/lib/tcg/pricing';
import type { PricePoint, SealedProduct, TcgCard, TcgSet } from '@/lib/tcg/types';

interface Payload {
  refType: 'carte' | 'scelle';
  card: TcgCard | null;
  sealed: SealedProduct | null;
  set: TcgSet | null;
  price: PricePoint | null;
  history: PricePoint[];
  gradingUpsidePsa10: number | null;
}

/** Notes affichées dans la table de valorisation d'une carte gradée. */
const SHOWN_GRADES = [10, 9.5, 9, 8];

export default function ReferencePage({ params }: { params: { refId: string } }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/tcg/references/${params.refId}?jours=180`, {
          cache: 'no-store',
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? 'Référence introuvable');
        setData(payload as Payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Référence introuvable');
      }
    })();
  }, [params.refId]);

  if (error) return <p className="py-16 text-center text-tcg-down">{error}</p>;
  if (!data) return <p className="py-16 text-center text-tcg-secondary">Chargement…</p>;

  const title = data.card?.nameFr ?? data.sealed?.nameFr ?? params.refId;
  const curve: ChartPoint[] = data.history.map((p) => ({ t: p.capturedAt, v: p.priceEur }));

  const first = data.history[0]?.priceEur ?? null;
  const last = data.price?.priceEur ?? null;
  const deltaEur = first !== null && last !== null ? Math.round((last - first) * 100) / 100 : null;
  const deltaPct =
    first !== null && last !== null && first > 0
      ? Math.round(((last - first) / first) * 1000) / 10
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">{title}</h1>
          <p className="text-sm text-tcg-secondary">
            {data.set?.nameFr ?? 'Extension inconnue'}
            {data.card ? ` · n°${data.card.number}` : ''}
            {data.card?.rarity ? ` · ${data.card.rarity}` : ''}
          </p>
        </div>
        <Link
          href="/tcg/collection"
          className="rounded-lg bg-tcg-gold px-4 py-2 text-sm font-medium text-tcg-ink hover:bg-tcg-gold-dim"
        >
          Ajouter à ma collection
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div>
          {data.card?.imageUrl || data.sealed?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(data.card?.imageUrl ?? data.sealed?.imageUrl)!}
              alt={title}
              className="w-full rounded-xl border border-tcg-line"
            />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-tcg-line text-sm text-tcg-muted">
              Visuel indisponible
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Cote actuelle"
              value={formatEur(data.price?.priceEur ?? null)}
              accent
              hint={
                data.price
                  ? `${data.price.source} · ${formatDateTimeFr(data.price.capturedAt)}`
                  : 'Aucun relevé'
              }
            />
            <StatTile
              label="Sur la période"
              value={deltaEur === null ? '—' : formatEur(deltaEur)}
              deltaEur={deltaEur}
              deltaPct={deltaPct}
            />
            <StatTile
              label="Prix bas du marché"
              value={formatEur(data.price?.lowEur ?? null)}
              hint="Première annonce disponible"
            />
          </div>

          <ValueChart
            points={curve}
            label={title}
            color="#f2c14e"
            height={220}
            emptyLabel="Pas encore d’historique pour cette référence."
          />
        </div>
      </div>

      {data.refType === 'carte' && data.price && (
        <section className="space-y-2">
          <h2 className="font-display text-lg">Valeur selon la gradation</h2>
          <p className="text-xs text-tcg-muted">
            Estimations dérivées de la cote non gradée par les coefficients de
            l’application — elles ne remplacent pas des ventes constatées.
          </p>
          <div className="overflow-x-auto rounded-xl border border-tcg-line bg-tcg-card">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-tcg-line text-xs uppercase tracking-wide text-tcg-muted">
                  <th className="px-4 py-2 text-left">Organisme</th>
                  {SHOWN_GRADES.map((grade) => (
                    <th key={grade} className="px-4 py-2 text-right">
                      Note {grade}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-tcg-line">
                {(Object.keys(COMPANY_FACTORS) as (keyof typeof COMPANY_FACTORS)[]).map(
                  (company) => (
                    <tr key={company}>
                      <td className="px-4 py-2 text-tcg-primary">{company}</td>
                      {SHOWN_GRADES.map((grade) => (
                        <td key={grade} className="px-4 py-2 text-right tabular-nums text-tcg-secondary">
                          {formatEur(
                            data.price!.priceEur *
                              GRADE_FACTORS[String(grade)] *
                              COMPANY_FACTORS[company]
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          {data.gradingUpsidePsa10 !== null && (
            <p className="text-sm text-tcg-secondary">
              Gain estimé d’une gradation PSA 10, coût déduit :{' '}
              <span className={data.gradingUpsidePsa10 >= 0 ? 'text-tcg-up' : 'text-tcg-down'}>
                {formatEur(data.gradingUpsidePsa10)}
              </span>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
