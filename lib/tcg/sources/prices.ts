/**
 * Bot de prix — cotes en euros.
 *
 * Le marché de référence en France est Cardmarket. Ses cotes sont exposées
 * publiquement, carte par carte, par l'API pokemontcg.io (bloc `cardmarket`,
 * déjà libellé en euros) : c'est la source utilisée ici, sans clé obligatoire.
 *
 * Deux limites assumées, visibles dans l'interface :
 *  - les PRODUITS SCELLÉS n'ont pas de source publique gratuite. Ils sont
 *    alimentés par import manuel (`POST /api/tcg/prix/import`), ou par un
 *    connecteur Cardmarket privé si le compte du client en dispose.
 *  - les CARTES GRADÉES ne sont pas cotées directement : leur valeur est
 *    dérivée du prix non gradé par les coefficients de `pricing.ts`.
 *
 * L'appariement entre le catalogue français (TCGdex) et pokemontcg.io se fait
 * par date de sortie + nombre de cartes, puis par numéro dans l'extension.
 */

import type { PriceRefType, PricePoint, CardVariant } from '../types';

const PTCG_BASE = process.env.POKEMONTCG_BASE_URL ?? 'https://api.pokemontcg.io/v2';
const PTCG_KEY = process.env.POKEMONTCG_API_KEY;

/** Correspondances forcées TCGdex → pokemontcg.io, pour les cas tordus. */
const SET_OVERRIDES: Record<string, string> = JSON.parse(
  process.env.TCG_SET_OVERRIDES ?? '{}'
);

interface PtcgSet {
  id: string;
  name: string;
  releaseDate: string;
  printedTotal: number;
  total: number;
}

interface PtcgCard {
  id: string;
  number: string;
  cardmarket?: {
    updatedAt?: string;
    prices?: Record<string, number | null>;
  };
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { accept: 'application/json' };
  if (PTCG_KEY) h['X-Api-Key'] = PTCG_KEY;
  return h;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: headers(), cache: 'no-store' });
  if (!res.ok) throw new Error(`pokemontcg.io → HTTP ${res.status} sur ${url}`);
  return (await res.json()) as T;
}

let setIndexCache: { at: number; sets: PtcgSet[] } | null = null;

async function ptcgSets(): Promise<PtcgSet[]> {
  // Les extensions bougent quelques fois par an : une heure de cache suffit.
  if (setIndexCache && Date.now() - setIndexCache.at < 3600_000) return setIndexCache.sets;
  const data = await getJson<{ data: PtcgSet[] }>(`${PTCG_BASE}/sets?pageSize=250`);
  setIndexCache = { at: Date.now(), sets: data.data ?? [] };
  return setIndexCache.sets;
}

function normalizeDate(d: string | null | undefined): string {
  return (d ?? '').replace(/\//g, '-').slice(0, 10);
}

/**
 * Retrouve l'extension pokemontcg.io correspondant à une extension française.
 * La date de sortie est discriminante ; en cas d'égalité (plusieurs sorties le
 * même jour), on départage sur le nombre de cartes imprimées.
 */
export async function matchSet(
  tcgdexSetId: string,
  releaseDate: string | null,
  cardCount: number | null
): Promise<string | null> {
  if (SET_OVERRIDES[tcgdexSetId]) return SET_OVERRIDES[tcgdexSetId];
  const sets = await ptcgSets();
  const date = normalizeDate(releaseDate);
  const sameDate = date ? sets.filter((s) => normalizeDate(s.releaseDate) === date) : [];
  if (sameDate.length === 1) return sameDate[0].id;
  if (sameDate.length > 1 && cardCount) {
    const best = sameDate
      .map((s) => ({ s, gap: Math.abs((s.printedTotal ?? s.total ?? 0) - cardCount) }))
      .sort((a, b) => a.gap - b.gap)[0];
    return best?.s.id ?? null;
  }
  return null;
}

/** Numéro comparable : « 025 » et « 25 » désignent la même carte. */
function normalizeNumber(n: string): string {
  return n.trim().replace(/^0+/, '').toUpperCase();
}

function pickPrice(
  prices: Record<string, number | null> | undefined,
  variant: CardVariant | null
): { price: number | null; low: number | null; trend: number | null } {
  if (!prices) return { price: null, low: null, trend: null };
  const reverse = variant === 'reverse';
  const trend = reverse ? prices.reverseHoloTrend : prices.trendPrice;
  const avg = reverse ? prices.reverseHoloSell : prices.averageSellPrice;
  const low = reverse ? prices.reverseHoloLow : prices.lowPrice;
  // La tendance Cardmarket lisse les ventes aberrantes : c'est la valeur la
  // plus proche d'un « prix de marché ». La moyenne de vente sert de repli.
  const price = trend ?? avg ?? null;
  return {
    price: typeof price === 'number' ? price : null,
    low: typeof low === 'number' ? low : null,
    trend: typeof trend === 'number' ? trend : null,
  };
}

export interface CardPriceRequest {
  refId: string;
  /** Extension TCGdex de la carte. */
  setId: string;
  number: string;
  variant: CardVariant | null;
  releaseDate: string | null;
  cardCount: number | null;
}

export interface PriceSyncResult {
  points: PricePoint[];
  /** Références qu'aucune source n'a su coter, pour affichage à l'exploitant. */
  unresolved: string[];
  errors: string[];
}

/**
 * Relève les cotes d'un lot de cartes.
 * Les requêtes sont groupées par extension : un appel rapporte jusqu'à 250
 * cartes, au lieu d'un appel par carte.
 */
export async function fetchCardPrices(requests: CardPriceRequest[]): Promise<PriceSyncResult> {
  const points: PricePoint[] = [];
  const unresolved: string[] = [];
  const errors: string[] = [];
  const capturedAt = new Date().toISOString();

  const bySet = new Map<string, CardPriceRequest[]>();
  for (const req of requests) {
    const list = bySet.get(req.setId) ?? [];
    list.push(req);
    bySet.set(req.setId, list);
  }

  for (const [setId, reqs] of bySet) {
    try {
      const ptcgSetId = await matchSet(setId, reqs[0].releaseDate, reqs[0].cardCount);
      if (!ptcgSetId) {
        unresolved.push(...reqs.map((r) => r.refId));
        continue;
      }
      const data = await getJson<{ data: PtcgCard[] }>(
        `${PTCG_BASE}/cards?q=set.id:${encodeURIComponent(ptcgSetId)}&pageSize=250&select=id,number,cardmarket`
      );
      const byNumber = new Map<string, PtcgCard>();
      for (const card of data.data ?? []) byNumber.set(normalizeNumber(card.number), card);

      for (const req of reqs) {
        const card = byNumber.get(normalizeNumber(req.number));
        const picked = pickPrice(card?.cardmarket?.prices, req.variant);
        if (picked.price === null) {
          unresolved.push(req.refId);
          continue;
        }
        points.push({
          refType: 'carte',
          refId: req.refId,
          variant: req.variant,
          priceEur: round2(picked.price),
          lowEur: picked.low === null ? null : round2(picked.low),
          trendEur: picked.trend === null ? null : round2(picked.trend),
          source: 'cardmarket/pokemontcg.io',
          capturedAt,
        });
      }
    } catch (err) {
      errors.push(`${setId} : ${err instanceof Error ? err.message : String(err)}`);
      unresolved.push(...reqs.map((r) => r.refId));
    }
  }

  return { points, unresolved, errors };
}

/**
 * Relevés importés à la main (produits scellés, ventes constatées).
 * Format accepté : `refId;prix` ou `refId;prix;source`, un par ligne, ou du
 * JSON `[{ refId, priceEur, source }]`.
 */
export function parseManualPrices(raw: string, defaultType: PriceRefType = 'scelle'): PricePoint[] {
  const capturedAt = new Date().toISOString();
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    const rows = JSON.parse(trimmed) as {
      refId: string;
      priceEur: number;
      source?: string;
      refType?: PriceRefType;
    }[];
    return rows
      .filter((r) => r.refId && Number.isFinite(r.priceEur))
      .map((r) => ({
        refType: r.refType ?? defaultType,
        refId: r.refId,
        variant: null,
        priceEur: round2(r.priceEur),
        lowEur: null,
        trendEur: null,
        source: r.source ?? 'manuel',
        capturedAt,
      }));
  }

  const points: PricePoint[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const [refId, priceRaw, source] = line.split(';').map((s) => s?.trim());
    const price = Number((priceRaw ?? '').replace(',', '.'));
    if (!refId || !Number.isFinite(price)) continue;
    points.push({
      refType: refId.startsWith('sc-') ? 'scelle' : defaultType,
      refId,
      variant: null,
      priceEur: round2(price),
      lowEur: null,
      trendEur: null,
      source: source || 'manuel',
      capturedAt,
    });
  }
  return points;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
