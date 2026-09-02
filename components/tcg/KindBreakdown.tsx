import { formatEur } from '@/lib/tcg/pricing';
import type { ItemKind, PortfolioSummary } from '@/lib/tcg/types';

const SERIES: { kind: ItemKind; label: string; color: string }[] = [
  { kind: 'loose', label: 'Cartes loose', color: '#3987e5' },
  { kind: 'gradee', label: 'Cartes gradées', color: '#d95926' },
  { kind: 'scelle', label: 'Scellés', color: '#199e70' },
];

/**
 * Répartition du coffre-fort par nature d'item.
 * Barre empilée : la question posée est « quelle part du coffre pèse quoi »,
 * pas « combien vaut chaque part » — la part relative se lit d'un coup d'œil,
 * les montants sont donnés en clair en dessous.
 */
export default function KindBreakdown({ summary }: { summary: PortfolioSummary }) {
  const total = summary.totalEur;

  return (
    <div className="rounded-xl border border-tcg-line bg-tcg-card p-4">
      <div className="text-xs uppercase tracking-wide text-tcg-muted">Répartition du coffre-fort</div>

      <div className="mt-3 flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-tcg-ink">
        {SERIES.map((serie) => {
          const value = summary.byKind[serie.kind].valueEur;
          const share = total > 0 ? (value / total) * 100 : 0;
          if (share <= 0) return null;
          return (
            <div
              key={serie.kind}
              style={{ width: `${share}%`, backgroundColor: serie.color }}
              title={`${serie.label} — ${formatEur(value)}`}
            />
          );
        })}
        {total <= 0 && <div className="w-full bg-tcg-line" />}
      </div>

      <ul className="mt-4 space-y-2">
        {SERIES.map((serie) => {
          const bucket = summary.byKind[serie.kind];
          const share = total > 0 ? (bucket.valueEur / total) * 100 : 0;
          return (
            <li key={serie.kind} className="flex items-center gap-3 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: serie.color }}
                aria-hidden
              />
              <span className="flex-1 text-tcg-secondary">{serie.label}</span>
              <span className="tabular-nums text-tcg-primary">{formatEur(bucket.valueEur)}</span>
              <span className="w-14 text-right tabular-nums text-tcg-muted">
                {share.toFixed(0)} %
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
