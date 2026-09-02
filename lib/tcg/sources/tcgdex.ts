/**
 * Bot de catalogue — TCGdex, langue française.
 *
 * TCGdex publie l'intégralité des extensions Pokémon traduites en français,
 * sans clé d'API. C'est la seule source du dépôt qui fournit les NOMS FR
 * officiels des cartes ; tout le reste de l'application s'appuie dessus.
 *
 * Deux appels par extension : la liste des extensions, puis le détail de
 * chacune (qui embarque ses cartes). Une extension déjà connue et inchangée
 * n'est pas retéléchargée si `knownSetIds` est fourni.
 */

import type { CardVariant, TcgCard, TcgSet } from '../types';

const BASE = process.env.TCGDEX_BASE_URL ?? 'https://api.tcgdex.net/v2/fr';

/** Pause entre deux appels, pour rester courtois avec une API gratuite. */
const DELAY_MS = Number(process.env.TCGDEX_DELAY_MS ?? 120);

interface TcgdexSetBrief {
  id: string;
  name: string;
  cardCount?: { total?: number; official?: number };
  logo?: string;
  symbol?: string;
}

interface TcgdexSetDetail extends TcgdexSetBrief {
  releaseDate?: string;
  serie?: { id: string; name: string };
  cards?: { id: string; localId: string; name: string; image?: string; rarity?: string }[];
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: 'application/json' },
    // Le catalogue change rarement : un cache court suffit et évite de
    // marteler l'API quand le bot est relancé plusieurs fois de suite.
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`TCGdex ${path} → HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Déduit les variantes imprimées à partir de la rareté.
 * TCGdex expose le détail des variantes carte par carte ; le récupérer
 * multiplierait les appels par le nombre de cartes (plus de 20 000). La
 * rareté suffit pour proposer les bons choix à la saisie.
 */
function variantsFromRarity(rarity: string | undefined): CardVariant[] {
  const r = (rarity ?? '').toLowerCase();
  if (!r) return ['normale', 'reverse'];
  if (r.includes('promo')) return ['promo'];
  if (
    r.includes('holo') ||
    r.includes('rare') ||
    r.includes('ultra') ||
    r.includes('secr') ||
    r.includes('illustration')
  ) {
    return ['holo', 'reverse'];
  }
  return ['normale', 'reverse'];
}

export interface CatalogSyncResult {
  sets: TcgSet[];
  cards: TcgCard[];
  errors: string[];
}

/**
 * Récupère le catalogue français complet.
 * `setLimit` permet de synchroniser d'abord les extensions les plus récentes
 * (utile pour un premier passage rapide) ; sans limite, tout est chargé.
 */
export async function fetchCatalogue(
  opts: { setLimit?: number; onlySetIds?: string[] } = {}
): Promise<CatalogSyncResult> {
  const briefs = await getJson<TcgdexSetBrief[]>('/sets');
  const errors: string[] = [];
  const sets: TcgSet[] = [];
  const cards: TcgCard[] = [];

  let selected = briefs;
  if (opts.onlySetIds?.length) {
    const wanted = new Set(opts.onlySetIds);
    selected = briefs.filter((b) => wanted.has(b.id));
  }
  // L'API renvoie les extensions de la plus ancienne à la plus récente : on
  // inverse pour que `setLimit` retienne bien les nouveautés.
  selected = [...selected].reverse();
  if (opts.setLimit) selected = selected.slice(0, opts.setLimit);

  for (const brief of selected) {
    try {
      const detail = await getJson<TcgdexSetDetail>(`/sets/${brief.id}`);
      sets.push({
        id: detail.id,
        serie: detail.serie?.name ?? 'Autres',
        nameFr: detail.name,
        nameEn: null,
        code: detail.id.toUpperCase(),
        releaseDate: detail.releaseDate ?? null,
        cardCount: detail.cardCount?.official ?? detail.cardCount?.total ?? null,
        logoUrl: detail.logo ? `${detail.logo}.png` : null,
        symbolUrl: detail.symbol ? `${detail.symbol}.png` : null,
      });

      for (const card of detail.cards ?? []) {
        cards.push({
          id: card.id,
          setId: detail.id,
          number: card.localId,
          nameFr: card.name,
          nameEn: null,
          rarity: card.rarity ?? null,
          illustrator: null,
          // TCGdex sert les images sans extension : on demande la haute
          // définition en qualité web.
          imageUrl: card.image ? `${card.image}/high.webp` : null,
          variants: variantsFromRarity(card.rarity),
        });
      }
    } catch (err) {
      errors.push(`${brief.id} : ${err instanceof Error ? err.message : String(err)}`);
    }
    if (DELAY_MS > 0) await sleep(DELAY_MS);
  }

  return { sets, cards, errors };
}
