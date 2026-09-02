import { formatDateTimeFr } from '@/lib/tcg/pricing';
import type { PortfolioSummary } from '@/lib/tcg/types';

/**
 * Bandeaux d'état des cotes.
 * Un chiffre affiché sans savoir d'où il vient ne vaut rien : tant que les
 * bots n'ont pas tourné, l'application le dit clairement plutôt que de laisser
 * croire à des prix de marché.
 */
export function PriceSourceNotice({
  summary,
  prochainReleve,
}: {
  summary: PortfolioSummary;
  prochainReleve?: string;
}) {
  const amorce = summary.priceSources.includes('amorce');

  if (amorce) {
    return (
      <div className="rounded-xl border border-tcg-gold/40 bg-tcg-gold/10 px-4 py-3 text-sm text-tcg-primary">
        <strong className="font-medium">Cotes de démonstration.</strong> Les prix affichés
        proviennent du jeu d’amorce livré avec l’application. Lancez le bot de prix
        (<code className="rounded bg-tcg-ink px-1">POST /api/tcg/cron/prix?force=1</code>) pour
        des cotes Cardmarket réelles.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tcg-muted">
      <span>Dernier relevé : {formatDateTimeFr(summary.lastPriceUpdate)}</span>
      {prochainReleve && <span>Prochain relevé : {formatDateTimeFr(prochainReleve)}</span>}
      {summary.priceSources.length > 0 && <span>Source : {summary.priceSources.join(', ')}</span>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-tcg-line bg-tcg-card/50 px-6 py-10 text-center">
      <p className="font-display text-lg text-tcg-primary">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-tcg-secondary">{children}</div>}
    </div>
  );
}
