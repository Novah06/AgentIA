/**
 * Les « bots » du portefeuille, et leur cadence.
 *
 * Trois traitements, tous déclenchables par HTTP (routes /api/tcg/cron/*) pour
 * pouvoir être pilotés indifféremment par Vercel Cron, une tâche planifiée du
 * poste de travail (`scripts/tcg-scheduler.mjs`), ou à la main :
 *
 *  1. `runCatalogueSync` — recharge les extensions et cartes FR (rare).
 *  2. `runPriceSync`     — relève les cotes, à 00 h et 12 h (Europe/Paris).
 *  3. `runSnapshots`     — fige la valeur de chaque coffre-fort après le relevé.
 *
 * Le relevé et le snapshot vont ensemble : sans snapshot juste après la mise à
 * jour des prix, la courbe du coffre-fort n'aurait pas de point pour ce
 * passage.
 */

import { fetchCatalogue } from './sources/tcgdex';
import { fetchCardPrices, type CardPriceRequest } from './sources/prices';
import {
  getCard,
  getSealed,
  getSet,
  listOwners,
  listTrackedRefs,
  recordPrices,
  recordSnapshot,
  upsertCatalogue,
} from './store';

export interface JobReport {
  job: string;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  details: Record<string, unknown>;
  errors: string[];
}

function report(job: string, startedAt: string, details: Record<string, unknown>, errors: string[]): JobReport {
  return {
    job,
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: errors.length === 0,
    details,
    errors,
  };
}

/** Bot 1 — catalogue français complet (TCGdex). */
export async function runCatalogueSync(opts: { setLimit?: number } = {}): Promise<JobReport> {
  const startedAt = new Date().toISOString();
  try {
    const { sets, cards, errors } = await fetchCatalogue(opts);
    const written = await upsertCatalogue({ sets, cards });
    return report('catalogue', startedAt, written, errors);
  } catch (err) {
    return report('catalogue', startedAt, {}, [err instanceof Error ? err.message : String(err)]);
  }
}

/**
 * Bot 2 — relevé des cotes.
 * Par défaut, seules les références détenues par au moins un utilisateur sont
 * relevées : inutile de coter 20 000 cartes que personne ne possède, et cela
 * garde le traitement sous la minute même sur un gros portefeuille.
 */
export async function runPriceSync(opts: { refIds?: string[] } = {}): Promise<JobReport> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  try {
    const tracked = opts.refIds?.length
      ? opts.refIds.map((refId) => ({
          refId,
          refType: refId.startsWith('sc-') ? ('scelle' as const) : ('carte' as const),
        }))
      : await listTrackedRefs();

    const requests: CardPriceRequest[] = [];
    const sealedRefs: string[] = [];

    for (const ref of tracked) {
      if (ref.refType === 'scelle') {
        const product = await getSealed(ref.refId);
        if (product) sealedRefs.push(product.id);
        continue;
      }
      const card = await getCard(ref.refId);
      if (!card) {
        errors.push(`Carte inconnue au catalogue : ${ref.refId}`);
        continue;
      }
      const set = await getSet(card.setId);
      requests.push({
        refId: card.id,
        setId: card.setId,
        number: card.number,
        // On relève le tirage principal ; le reverse est coté à part quand
        // c'est la seule impression existante (cartes uniquement reverse).
        variant:
          card.variants.length === 1 && card.variants[0] === 'reverse' ? 'reverse' : null,
        releaseDate: set?.releaseDate ?? null,
        cardCount: set?.cardCount ?? null,
      });
    }

    const result = requests.length
      ? await fetchCardPrices(requests)
      : { points: [], unresolved: [], errors: [] };
    const written = await recordPrices(result.points);

    return report(
      'prix',
      startedAt,
      {
        cartesDemandees: requests.length,
        relevesEcrits: written,
        nonCotees: result.unresolved.length,
        // Les scellés n'ont pas de source publique : ils attendent un import.
        scellesEnAttenteDImport: sealedRefs.length,
      },
      [...errors, ...result.errors]
    );
  } catch (err) {
    return report('prix', startedAt, {}, [
      ...errors,
      err instanceof Error ? err.message : String(err),
    ]);
  }
}

/** Bot 3 — un point de courbe par coffre-fort. */
export async function runSnapshots(): Promise<JobReport> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let count = 0;
  try {
    for (const ownerId of await listOwners()) {
      try {
        await recordSnapshot(ownerId);
        count += 1;
      } catch (err) {
        errors.push(`${ownerId} : ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return report('snapshots', startedAt, { coffresFiges: count }, errors);
  } catch (err) {
    return report('snapshots', startedAt, { coffresFiges: count }, [
      ...errors,
      err instanceof Error ? err.message : String(err),
    ]);
  }
}

/** Passage complet : cotes puis courbe. C'est ce qu'appelle la planification. */
export async function runScheduledPass(): Promise<JobReport[]> {
  const prices = await runPriceSync();
  const snapshots = await runSnapshots();
  return [prices, snapshots];
}

/* ------------------------------------------------------------------ */
/* Cadence                                                             */

export const RELEVE_HOURS_PARIS = [0, 12];

/** Heure courante à Paris, indépendamment du fuseau du serveur. */
export function parisHour(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('fr-FR', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Europe/Paris',
    }).format(date)
  );
}

/**
 * Vrai à l'heure d'un relevé, heure de Paris.
 * Les planificateurs (Vercel Cron notamment) raisonnent en UTC : appeler la
 * route toutes les heures et filtrer ici évite d'avoir à décaler la
 * configuration deux fois par an au changement d'heure.
 */
export function isReleveHour(date = new Date()): boolean {
  return RELEVE_HOURS_PARIS.includes(parisHour(date));
}

/** Prochain relevé prévu, pour l'afficher dans l'interface. */
export function nextReleve(from = new Date()): Date {
  const next = new Date(from.getTime());
  for (let i = 1; i <= 25; i++) {
    next.setTime(from.getTime() + i * 3600_000);
    next.setMinutes(0, 0, 0);
    if (isReleveHour(next)) return next;
  }
  return next;
}
