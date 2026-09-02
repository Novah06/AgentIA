import { formatEur, formatPct } from '@/lib/tcg/pricing';

interface Props {
  label: string;
  value: string;
  /** Variation associée, colorée selon le sens. */
  deltaEur?: number | null;
  deltaPct?: number | null;
  hint?: string;
  accent?: boolean;
}

/**
 * Chiffre clé. Pas de graphique : quand la donnée est une valeur unique, un
 * nombre bien posé se lit plus vite qu'une jauge.
 */
export default function StatTile({ label, value, deltaEur, deltaPct, hint, accent }: Props) {
  const delta = deltaEur ?? null;
  const tone =
    delta === null || delta === 0
      ? 'text-tcg-secondary'
      : delta > 0
        ? 'text-tcg-up'
        : 'text-tcg-down';

  return (
    <div className="rounded-xl border border-tcg-line bg-tcg-card p-4">
      <div className="text-xs uppercase tracking-wide text-tcg-muted">{label}</div>
      <div
        className={`mt-1 font-display text-2xl ${accent ? 'text-tcg-gold' : 'text-tcg-primary'}`}
      >
        {value}
      </div>
      {delta !== null && (
        <div className={`mt-1 text-sm ${tone}`}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '■'} {formatEur(Math.abs(delta))}
          {deltaPct !== null && deltaPct !== undefined ? ` · ${formatPct(deltaPct)}` : ''}
        </div>
      )}
      {hint && <div className="mt-1 text-xs text-tcg-muted">{hint}</div>}
    </div>
  );
}
