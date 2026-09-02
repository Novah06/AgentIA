import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import {
  SEED_CARDS,
  SEED_CARD_BY_ID,
  SEED_PRICES,
  SEED_SEALED,
  SEED_SEALED_BY_ID,
  SEED_SETS,
  SEED_SET_BY_ID,
  SEED_SOURCE,
} from './catalogue';
import { valueItem } from './pricing';
import type {
  CardVariant,
  ItemKind,
  ItemPatch,
  NewItemInput,
  PortfolioItem,
  PortfolioSnapshot,
  PortfolioSummary,
  PricePoint,
  PriceRefType,
  SealedProduct,
  TcgCard,
  TcgSet,
  ValuedItem,
} from './types';

/**
 * Couche de données du portefeuille Pokémon.
 *
 * Avec Supabase configuré : tables `tcg_*` (voir lib/supabase/schema-tcg.sql).
 * Sans Supabase : catalogue d'amorce + stockage mémoire, ce qui permet de
 * parcourir toute l'application en local sans aucun service externe. Les
 * données mémoire disparaissent au redémarrage du serveur.
 *
 * Comme ailleurs dans ce dépôt, le stockage mémoire est ancré sur globalThis :
 * Next.js bundle chaque route séparément et une variable de module donnerait
 * une Map différente par route.
 */

type MemStore = {
  sets: Map<string, TcgSet>;
  cards: Map<string, TcgCard>;
  sealed: Map<string, SealedProduct>;
  prices: PricePoint[];
  items: Map<string, PortfolioItem>;
  snapshotsByOwner: Map<string, PortfolioSnapshot[]>;
};

const globalStore = globalThis as unknown as { __tcgMemStore?: MemStore };

function buildMemStore(): MemStore {
  const store: MemStore = {
    sets: new Map(SEED_SETS.map((x) => [x.id, x])),
    cards: new Map(SEED_CARDS.map((x) => [x.id, x])),
    sealed: new Map(SEED_SEALED.map((x) => [x.id, x])),
    prices: seedPriceHistory(),
    items: new Map(),
    snapshotsByOwner: new Map(),
  };
  return store;
}

const mem: MemStore = globalStore.__tcgMemStore ?? (globalStore.__tcgMemStore = buildMemStore());

/**
 * Historique d'amorce : 90 jours de relevés à partir des prix de démonstration.
 * La marche aléatoire est déterministe (graine dérivée de l'identifiant) pour
 * que la courbe soit stable d'un rendu à l'autre.
 */
function seedPriceHistory(): PricePoint[] {
  const points: PricePoint[] = [];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  for (const [refId, price] of Object.entries(SEED_PRICES)) {
    const refType: PriceRefType = refId.startsWith('sc-') ? 'scelle' : 'carte';
    let seed = 0;
    for (const ch of refId) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
    let value = price * 0.86;
    for (let i = 90; i >= 0; i--) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const noise = (seed / 2147483648 - 0.5) * 0.045;
      // Dérive vers le prix cible : la courbe finit sur la valeur d'amorce.
      value = value * (1 + noise) + (price - value) * 0.035;
      points.push({
        refType,
        refId,
        variant: refType === 'carte' ? 'holo' : null,
        priceEur: Math.round(value * 100) / 100,
        lowEur: Math.round(value * 0.82 * 100) / 100,
        trendEur: Math.round(value * 100) / 100,
        source: SEED_SOURCE,
        capturedAt: new Date(now - i * day).toISOString(),
      });
    }
  }
  return points;
}

function db() {
  return getSupabaseAdmin();
}

function nowIso() {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSet(row: any): TcgSet {
  return {
    id: row.id,
    serie: row.serie,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    code: row.code,
    releaseDate: row.release_date,
    cardCount: row.card_count,
    logoUrl: row.logo_url,
    symbolUrl: row.symbol_url,
  };
}

function mapCard(row: any): TcgCard {
  return {
    id: row.id,
    setId: row.set_id,
    number: row.number,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    rarity: row.rarity,
    illustrator: row.illustrator,
    imageUrl: row.image_url,
    variants: (row.variants ?? ['normale']) as CardVariant[],
  };
}

function mapSealed(row: any): SealedProduct {
  return {
    id: row.id,
    setId: row.set_id,
    kind: row.kind,
    nameFr: row.name_fr,
    releaseDate: row.release_date,
    imageUrl: row.image_url,
    boosterCount: row.booster_count,
  };
}

export async function listSets(): Promise<TcgSet[]> {
  const sb = db();
  if (sb) {
    const { data, error } = await sb
      .from('tcg_sets')
      .select('*')
      .order('release_date', { ascending: false });
    if (error) throw error;
    if (data?.length) return data.map(mapSet);
  }
  return [...mem.sets.values()].sort((a, b) =>
    (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '')
  );
}

export async function getSet(id: string): Promise<TcgSet | null> {
  const sb = db();
  if (sb) {
    const { data } = await sb.from('tcg_sets').select('*').eq('id', id).maybeSingle();
    if (data) return mapSet(data);
  }
  return mem.sets.get(id) ?? SEED_SET_BY_ID.get(id) ?? null;
}

export interface CatalogEntry {
  refType: PriceRefType;
  id: string;
  label: string;
  subLabel: string;
  setId: string | null;
  setNameFr: string | null;
  imageUrl: string | null;
  variants: CardVariant[];
  priceEur: number | null;
}

/** Recherche plein texte dans le catalogue français (cartes + scellés). */
export async function searchCatalogue(
  query: string,
  opts: { setId?: string; refType?: PriceRefType; limit?: number } = {}
): Promise<CatalogEntry[]> {
  const limit = Math.min(opts.limit ?? 40, 200);
  const q = query.trim().toLowerCase();

  const cards = await fetchCards(q, opts.setId, limit);
  const sealed = await fetchSealed(q, opts.setId, limit);

  const wanted: CatalogEntry[] = [];
  if (opts.refType !== 'scelle') wanted.push(...cards);
  if (opts.refType !== 'carte') wanted.push(...sealed);

  const prices = await latestPrices(wanted.map((e) => e.id));
  for (const entry of wanted) {
    entry.priceEur = prices.get(entry.id)?.priceEur ?? null;
  }
  return wanted.slice(0, limit);
}

async function fetchCards(q: string, setId: string | undefined, limit: number): Promise<CatalogEntry[]> {
  const sb = db();
  let cards: TcgCard[] = [];
  if (sb) {
    let req = sb.from('tcg_cards').select('*').limit(limit);
    if (q) req = req.or(`name_fr.ilike.%${q}%,number.ilike.%${q}%,name_en.ilike.%${q}%`);
    if (setId) req = req.eq('set_id', setId);
    const { data, error } = await req;
    if (error) throw error;
    if (data?.length) cards = data.map(mapCard);
  }
  if (!cards.length) {
    cards = [...mem.cards.values()].filter((card) => {
      if (setId && card.setId !== setId) return false;
      if (!q) return true;
      return (
        card.nameFr.toLowerCase().includes(q) ||
        (card.nameEn ?? '').toLowerCase().includes(q) ||
        card.number.toLowerCase().includes(q)
      );
    });
  }
  const sets = await setLookup(cards.map((c) => c.setId));
  return cards.slice(0, limit).map((card) => ({
    refType: 'carte' as const,
    id: card.id,
    label: card.nameFr,
    subLabel: `${sets.get(card.setId)?.nameFr ?? '—'} · n°${card.number}${card.rarity ? ` · ${card.rarity}` : ''}`,
    setId: card.setId,
    setNameFr: sets.get(card.setId)?.nameFr ?? null,
    imageUrl: card.imageUrl,
    variants: card.variants,
    priceEur: null,
  }));
}

async function fetchSealed(q: string, setId: string | undefined, limit: number): Promise<CatalogEntry[]> {
  const sb = db();
  let products: SealedProduct[] = [];
  if (sb) {
    let req = sb.from('tcg_sealed').select('*').limit(limit);
    if (q) req = req.ilike('name_fr', `%${q}%`);
    if (setId) req = req.eq('set_id', setId);
    const { data, error } = await req;
    if (error) throw error;
    if (data?.length) products = data.map(mapSealed);
  }
  if (!products.length) {
    products = [...mem.sealed.values()].filter((prod) => {
      if (setId && prod.setId !== setId) return false;
      if (!q) return true;
      return prod.nameFr.toLowerCase().includes(q);
    });
  }
  const sets = await setLookup(products.map((p) => p.setId).filter(Boolean) as string[]);
  return products.slice(0, limit).map((prod) => ({
    refType: 'scelle' as const,
    id: prod.id,
    label: prod.nameFr,
    subLabel: prod.setId ? (sets.get(prod.setId)?.nameFr ?? 'Scellé') : 'Scellé',
    setId: prod.setId,
    setNameFr: prod.setId ? (sets.get(prod.setId)?.nameFr ?? null) : null,
    imageUrl: prod.imageUrl,
    variants: [],
    priceEur: null,
  }));
}

async function setLookup(ids: string[]): Promise<Map<string, TcgSet>> {
  const unique = [...new Set(ids)];
  const map = new Map<string, TcgSet>();
  const missing: string[] = [];
  for (const id of unique) {
    const local = mem.sets.get(id) ?? SEED_SET_BY_ID.get(id);
    if (local) map.set(id, local);
    else missing.push(id);
  }
  const sb = db();
  if (sb && missing.length) {
    const { data } = await sb.from('tcg_sets').select('*').in('id', missing);
    for (const row of data ?? []) map.set(row.id, mapSet(row));
  }
  return map;
}

export async function getCard(id: string): Promise<TcgCard | null> {
  const sb = db();
  if (sb) {
    const { data } = await sb.from('tcg_cards').select('*').eq('id', id).maybeSingle();
    if (data) return mapCard(data);
  }
  return mem.cards.get(id) ?? SEED_CARD_BY_ID.get(id) ?? null;
}

export async function getSealed(id: string): Promise<SealedProduct | null> {
  const sb = db();
  if (sb) {
    const { data } = await sb.from('tcg_sealed').select('*').eq('id', id).maybeSingle();
    if (data) return mapSealed(data);
  }
  return mem.sealed.get(id) ?? SEED_SEALED_BY_ID.get(id) ?? null;
}

/** Écriture du catalogue par le bot de synchronisation. */
export async function upsertCatalogue(payload: {
  sets?: TcgSet[];
  cards?: TcgCard[];
  sealed?: SealedProduct[];
}): Promise<{ sets: number; cards: number; sealed: number }> {
  const sb = db();
  const { sets = [], cards = [], sealed = [] } = payload;

  if (sb) {
    if (sets.length) {
      const { error } = await sb.from('tcg_sets').upsert(
        sets.map((x) => ({
          id: x.id,
          serie: x.serie,
          name_fr: x.nameFr,
          name_en: x.nameEn,
          code: x.code,
          release_date: x.releaseDate,
          card_count: x.cardCount,
          logo_url: x.logoUrl,
          symbol_url: x.symbolUrl,
        }))
      );
      if (error) throw error;
    }
    if (cards.length) {
      for (const chunk of chunked(cards, 500)) {
        const { error } = await sb.from('tcg_cards').upsert(
          chunk.map((x) => ({
            id: x.id,
            set_id: x.setId,
            number: x.number,
            name_fr: x.nameFr,
            name_en: x.nameEn,
            rarity: x.rarity,
            illustrator: x.illustrator,
            image_url: x.imageUrl,
            variants: x.variants,
          }))
        );
        if (error) throw error;
      }
    }
    if (sealed.length) {
      const { error } = await sb.from('tcg_sealed').upsert(
        sealed.map((x) => ({
          id: x.id,
          set_id: x.setId,
          kind: x.kind,
          name_fr: x.nameFr,
          release_date: x.releaseDate,
          image_url: x.imageUrl,
          booster_count: x.boosterCount,
        }))
      );
      if (error) throw error;
    }
  }

  for (const x of sets) mem.sets.set(x.id, x);
  for (const x of cards) mem.cards.set(x.id, x);
  for (const x of sealed) mem.sealed.set(x.id, x);

  return { sets: sets.length, cards: cards.length, sealed: sealed.length };
}

function* chunked<T>(arr: T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

/* ------------------------------------------------------------------ */
/* Prix                                                                */

function mapPrice(row: any): PricePoint {
  return {
    refType: row.ref_type,
    refId: row.ref_id,
    variant: row.variant,
    priceEur: Number(row.price_eur),
    lowEur: row.low_eur === null ? null : Number(row.low_eur),
    trendEur: row.trend_eur === null ? null : Number(row.trend_eur),
    source: row.source,
    capturedAt: row.captured_at,
  };
}

/** Dernier relevé connu pour chaque référence demandée. */
export async function latestPrices(refIds: string[]): Promise<Map<string, PricePoint>> {
  const unique = [...new Set(refIds)].filter(Boolean);
  const out = new Map<string, PricePoint>();
  if (!unique.length) return out;

  const sb = db();
  if (sb) {
    for (const chunk of chunked(unique, 200)) {
      const { data, error } = await sb
        .from('tcg_prices')
        .select('*')
        .in('ref_id', chunk)
        .order('captured_at', { ascending: false });
      if (error) throw error;
      for (const row of data ?? []) {
        if (!out.has(row.ref_id)) out.set(row.ref_id, mapPrice(row));
      }
    }
  }

  if (out.size < unique.length) {
    // Complément mémoire : le relevé le plus récent l'emporte.
    for (const point of mem.prices) {
      if (!unique.includes(point.refId)) continue;
      const current = out.get(point.refId);
      if (!current || point.capturedAt > current.capturedAt) out.set(point.refId, point);
    }
  }
  return out;
}

export async function latestPrice(refId: string): Promise<PricePoint | null> {
  return (await latestPrices([refId])).get(refId) ?? null;
}

/** Historique d'une référence, du plus ancien au plus récent. */
export async function priceHistory(refId: string, days = 90): Promise<PricePoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const sb = db();
  if (sb) {
    const { data, error } = await sb
      .from('tcg_prices')
      .select('*')
      .eq('ref_id', refId)
      .gte('captured_at', since)
      .order('captured_at', { ascending: true });
    if (error) throw error;
    if (data?.length) return data.map(mapPrice);
  }
  return mem.prices
    .filter((p) => p.refId === refId && p.capturedAt >= since)
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

/** Écriture d'un lot de relevés par le bot de prix. */
export async function recordPrices(points: PricePoint[]): Promise<number> {
  if (!points.length) return 0;
  const sb = db();
  if (sb) {
    for (const chunk of chunked(points, 500)) {
      const { error } = await sb.from('tcg_prices').insert(
        chunk.map((p) => ({
          ref_type: p.refType,
          ref_id: p.refId,
          variant: p.variant,
          price_eur: p.priceEur,
          low_eur: p.lowEur,
          trend_eur: p.trendEur,
          source: p.source,
          captured_at: p.capturedAt,
        }))
      );
      if (error) throw error;
    }
  }
  mem.prices.push(...points);
  return points.length;
}

/* ------------------------------------------------------------------ */
/* Items du portefeuille                                               */

function mapItem(row: any): PortfolioItem {
  return {
    id: row.id,
    ownerId: row.owner_id,
    kind: row.kind,
    refId: row.ref_id,
    variant: row.variant,
    condition: row.condition,
    gradingCompany: row.grading_company,
    grade: row.grade === null ? null : Number(row.grade),
    quantity: Number(row.quantity ?? 1),
    purchasePriceEur: row.purchase_price_eur === null ? null : Number(row.purchase_price_eur),
    purchaseDate: row.purchase_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function itemRow(item: PortfolioItem) {
  return {
    id: item.id,
    owner_id: item.ownerId,
    kind: item.kind,
    ref_id: item.refId,
    variant: item.variant,
    condition: item.condition,
    grading_company: item.gradingCompany,
    grade: item.grade,
    quantity: item.quantity,
    purchase_price_eur: item.purchasePriceEur,
    purchase_date: item.purchaseDate,
    notes: item.notes,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export async function listItems(ownerId: string): Promise<PortfolioItem[]> {
  const sb = db();
  if (sb) {
    const { data, error } = await sb
      .from('tcg_items')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapItem);
  }
  return [...mem.items.values()]
    .filter((i) => i.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createItem(ownerId: string, input: NewItemInput): Promise<PortfolioItem> {
  const ts = nowIso();
  const item: PortfolioItem = {
    id: randomUUID(),
    ownerId,
    kind: input.kind,
    refId: input.refId,
    variant: input.variant ?? (input.kind === 'scelle' ? null : 'normale'),
    condition: input.kind === 'loose' ? (input.condition ?? 'NM') : null,
    gradingCompany: input.kind === 'gradee' ? (input.gradingCompany ?? 'PSA') : null,
    grade: input.kind === 'gradee' ? (input.grade ?? 10) : null,
    quantity: input.quantity && input.quantity > 0 ? Math.floor(input.quantity) : 1,
    purchasePriceEur: input.purchasePriceEur ?? null,
    purchaseDate: input.purchaseDate ?? null,
    notes: input.notes ?? null,
    createdAt: ts,
    updatedAt: ts,
  };

  const sb = db();
  if (sb) {
    const { error } = await sb.from('tcg_items').insert(itemRow(item));
    if (error) throw error;
  } else {
    mem.items.set(item.id, item);
  }
  return item;
}

export async function updateItem(
  ownerId: string,
  id: string,
  patch: ItemPatch
): Promise<PortfolioItem | null> {
  const existing = await getItem(ownerId, id);
  if (!existing) return null;

  const next: PortfolioItem = {
    ...existing,
    ...('kind' in patch && patch.kind ? { kind: patch.kind } : {}),
    ...('refId' in patch && patch.refId ? { refId: patch.refId } : {}),
    ...('variant' in patch ? { variant: patch.variant ?? null } : {}),
    ...('condition' in patch ? { condition: patch.condition ?? null } : {}),
    ...('gradingCompany' in patch ? { gradingCompany: patch.gradingCompany ?? null } : {}),
    ...('grade' in patch ? { grade: patch.grade ?? null } : {}),
    ...('quantity' in patch && patch.quantity ? { quantity: Math.floor(patch.quantity) } : {}),
    ...('purchasePriceEur' in patch ? { purchasePriceEur: patch.purchasePriceEur ?? null } : {}),
    ...('purchaseDate' in patch ? { purchaseDate: patch.purchaseDate ?? null } : {}),
    ...('notes' in patch ? { notes: patch.notes ?? null } : {}),
    updatedAt: nowIso(),
  };

  const sb = db();
  if (sb) {
    const { error } = await sb
      .from('tcg_items')
      .update(itemRow(next))
      .eq('id', id)
      .eq('owner_id', ownerId);
    if (error) throw error;
  } else {
    mem.items.set(next.id, next);
  }
  return next;
}

export async function getItem(ownerId: string, id: string): Promise<PortfolioItem | null> {
  const sb = db();
  if (sb) {
    const { data } = await sb
      .from('tcg_items')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .maybeSingle();
    return data ? mapItem(data) : null;
  }
  const item = mem.items.get(id);
  return item && item.ownerId === ownerId ? item : null;
}

export async function deleteItem(ownerId: string, id: string): Promise<boolean> {
  const sb = db();
  if (sb) {
    const { error } = await sb.from('tcg_items').delete().eq('id', id).eq('owner_id', ownerId);
    if (error) throw error;
    return true;
  }
  const item = mem.items.get(id);
  if (!item || item.ownerId !== ownerId) return false;
  mem.items.delete(id);
  return true;
}

/* ------------------------------------------------------------------ */
/* Valorisation                                                        */

/** Items enrichis de leur référence catalogue et de leur valeur estimée. */
export async function valuedItems(ownerId: string): Promise<ValuedItem[]> {
  const items = await listItems(ownerId);
  if (!items.length) return [];

  const prices = await latestPrices(items.map((i) => i.refId));
  const cardIds = items.filter((i) => i.kind !== 'scelle').map((i) => i.refId);
  const sealedIds = items.filter((i) => i.kind === 'scelle').map((i) => i.refId);

  const cards = new Map<string, TcgCard>();
  for (const id of new Set(cardIds)) {
    const card = await getCard(id);
    if (card) cards.set(id, card);
  }
  const sealed = new Map<string, SealedProduct>();
  for (const id of new Set(sealedIds)) {
    const prod = await getSealed(id);
    if (prod) sealed.set(id, prod);
  }
  const sets = await setLookup([
    ...[...cards.values()].map((c) => c.setId),
    ...([...sealed.values()].map((p) => p.setId).filter(Boolean) as string[]),
  ]);

  return items.map((item) => {
    const card = cards.get(item.refId);
    const prod = sealed.get(item.refId);
    const setId = card?.setId ?? prod?.setId ?? null;
    const setName = setId ? (sets.get(setId)?.nameFr ?? null) : null;
    const basePrice = prices.get(item.refId)?.priceEur ?? null;

    const valuation = valueItem({
      kind: item.kind,
      basePriceEur: basePrice,
      condition: item.condition,
      gradingCompany: item.gradingCompany,
      grade: item.grade,
    });

    const total =
      valuation.unitValueEur === null
        ? null
        : Math.round(valuation.unitValueEur * item.quantity * 100) / 100;
    const invested =
      item.purchasePriceEur === null ? null : item.purchasePriceEur * item.quantity;
    const gain = total !== null && invested !== null ? Math.round((total - invested) * 100) / 100 : null;

    return {
      ...item,
      label: card?.nameFr ?? prod?.nameFr ?? item.refId,
      subLabel: buildSubLabel(item, card),
      imageUrl: card?.imageUrl ?? prod?.imageUrl ?? null,
      setNameFr: setName,
      basePriceEur: basePrice,
      unitValueEur: valuation.unitValueEur,
      totalValueEur: total,
      gainEur: gain,
      gainPct:
        gain !== null && invested ? Math.round((gain / invested) * 1000) / 10 : null,
      estimated: valuation.estimated,
    };
  });
}

function buildSubLabel(item: PortfolioItem, card: TcgCard | undefined): string {
  const parts: string[] = [];
  if (card) parts.push(`n°${card.number}`);
  if (item.kind === 'gradee') parts.push(`${item.gradingCompany ?? '—'} ${item.grade ?? '—'}`);
  if (item.kind === 'loose' && item.condition) parts.push(item.condition);
  if (item.variant && item.variant !== 'normale') parts.push(item.variant);
  if (item.quantity > 1) parts.push(`×${item.quantity}`);
  return parts.join(' · ');
}

/* ------------------------------------------------------------------ */
/* Coffre-fort : synthèse et courbe                                    */

export async function portfolioSummary(ownerId: string): Promise<PortfolioSummary> {
  const items = await valuedItems(ownerId);
  const byKind: Record<ItemKind, { valueEur: number; itemCount: number }> = {
    loose: { valueEur: 0, itemCount: 0 },
    gradee: { valueEur: 0, itemCount: 0 },
    scelle: { valueEur: 0, itemCount: 0 },
  };

  let total = 0;
  let invested = 0;
  let count = 0;
  for (const item of items) {
    const value = item.totalValueEur ?? 0;
    total += value;
    count += item.quantity;
    byKind[item.kind].valueEur += value;
    byKind[item.kind].itemCount += item.quantity;
    if (item.purchasePriceEur !== null) invested += item.purchasePriceEur * item.quantity;
  }

  // Variation 24 h : on compare la valeur courante au dernier relevé antérieur
  // à 12 h. Prendre l'avant-dernier snapshot donnerait une fenêtre variable
  // (12 h ou 24 h selon l'heure de consultation).
  const snapshots = await listSnapshots(ownerId, 3);
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const older = snapshots.filter((s) => s.capturedAt <= cutoff);
  const previous = older.length ? older[older.length - 1] : null;
  const change24hEur = previous ? round2(total - previous.totalEur) : null;
  const change24hPct =
    previous && previous.totalEur > 0
      ? Math.round(((total - previous.totalEur) / previous.totalEur) * 1000) / 10
      : null;

  const lastPrices = await latestPrices(items.map((i) => i.refId));
  let lastUpdate: string | null = null;
  const sources = new Set<string>();
  for (const p of lastPrices.values()) {
    if (!lastUpdate || p.capturedAt > lastUpdate) lastUpdate = p.capturedAt;
    sources.add(p.source);
  }

  return {
    totalEur: round2(total),
    investedEur: round2(invested),
    gainEur: round2(total - invested),
    gainPct: invested > 0 ? Math.round(((total - invested) / invested) * 1000) / 10 : 0,
    byKind: {
      loose: { ...byKind.loose, valueEur: round2(byKind.loose.valueEur) },
      gradee: { ...byKind.gradee, valueEur: round2(byKind.gradee.valueEur) },
      scelle: { ...byKind.scelle, valueEur: round2(byKind.scelle.valueEur) },
    },
    itemCount: count,
    change24hEur,
    change24hPct,
    lastPriceUpdate: lastUpdate,
    priceSources: [...sources],
  };
}

function mapSnapshot(row: any): PortfolioSnapshot {
  return {
    capturedAt: row.captured_at,
    totalEur: Number(row.total_eur),
    looseEur: Number(row.loose_eur),
    gradeeEur: Number(row.gradee_eur),
    scelleEur: Number(row.scelle_eur),
    itemCount: Number(row.item_count),
  };
}

export async function listSnapshots(ownerId: string, days = 90): Promise<PortfolioSnapshot[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const sb = db();
  if (sb) {
    const { data, error } = await sb
      .from('tcg_snapshots')
      .select('*')
      .eq('owner_id', ownerId)
      .gte('captured_at', since)
      .order('captured_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapSnapshot);
  }
  return (mem.snapshotsByOwner.get(ownerId) ?? []).filter((s) => s.capturedAt >= since);
}

/** Enregistre la valeur du coffre-fort à l'instant T (appelé par le bot). */
export async function recordSnapshot(ownerId: string): Promise<PortfolioSnapshot> {
  const summary = await portfolioSummary(ownerId);
  const snapshot: PortfolioSnapshot = {
    capturedAt: nowIso(),
    totalEur: summary.totalEur,
    looseEur: summary.byKind.loose.valueEur,
    gradeeEur: summary.byKind.gradee.valueEur,
    scelleEur: summary.byKind.scelle.valueEur,
    itemCount: summary.itemCount,
  };

  const sb = db();
  if (sb) {
    const { error } = await sb.from('tcg_snapshots').insert({
      owner_id: ownerId,
      captured_at: snapshot.capturedAt,
      total_eur: snapshot.totalEur,
      loose_eur: snapshot.looseEur,
      gradee_eur: snapshot.gradeeEur,
      scelle_eur: snapshot.scelleEur,
      item_count: snapshot.itemCount,
    });
    if (error) throw error;
  } else {
    const list = mem.snapshotsByOwner.get(ownerId) ?? [];
    list.push(snapshot);
    mem.snapshotsByOwner.set(ownerId, list);
  }
  return snapshot;
}

/** Tous les propriétaires ayant au moins un item — utile au bot de snapshot. */
export async function listOwners(): Promise<string[]> {
  const sb = db();
  if (sb) {
    const { data, error } = await sb.from('tcg_items').select('owner_id');
    if (error) throw error;
    return [...new Set((data ?? []).map((r: any) => r.owner_id as string))];
  }
  return [...new Set([...mem.items.values()].map((i) => i.ownerId))];
}

/** Références détenues par au moins un utilisateur : périmètre du bot de prix. */
export async function listTrackedRefs(): Promise<{ refId: string; refType: PriceRefType }[]> {
  const sb = db();
  let items: { ref_id: string; kind: ItemKind }[] = [];
  if (sb) {
    const { data, error } = await sb.from('tcg_items').select('ref_id, kind');
    if (error) throw error;
    items = (data ?? []) as any[];
  } else {
    items = [...mem.items.values()].map((i) => ({ ref_id: i.refId, kind: i.kind }));
  }
  const map = new Map<string, PriceRefType>();
  for (const row of items) {
    map.set(row.ref_id, row.kind === 'scelle' ? 'scelle' : 'carte');
  }
  return [...map.entries()].map(([refId, refType]) => ({ refId, refType }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
