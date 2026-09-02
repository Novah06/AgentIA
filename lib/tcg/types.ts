/**
 * Portefeuille de produits Pokémon — modèle de domaine.
 *
 * Trois natures d'items, qui structurent tout le reste de l'application :
 *  - `loose`   : carte simple, non gradée, décrite par son état (NM, EX…)
 *  - `gradee`  : carte sous coque, décrite par son organisme et sa note
 *  - `scelle`  : produit scellé (display, coffret dresseur d'élite, booster…)
 *
 * Les références (cartes et produits) sont communes à tous les utilisateurs ;
 * les items sont la propriété d'un compte. La valeur d'un item se déduit
 * toujours d'un prix de référence + des coefficients (voir pricing.ts), jamais
 * saisie à la main : c'est ce qui permet de recalculer tout le coffre-fort à
 * chaque relevé de prix.
 */

export type ItemKind = 'loose' | 'gradee' | 'scelle';

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  loose: 'Carte loose',
  gradee: 'Carte gradée',
  scelle: 'Scellé',
};

/** États Cardmarket, du meilleur au plus abîmé. */
export type CardCondition = 'MT' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO';

export const CONDITIONS: CardCondition[] = ['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'];

export const CONDITION_LABELS: Record<CardCondition, string> = {
  MT: 'Mint (parfaite)',
  NM: 'Near Mint (quasi neuve)',
  EX: 'Excellent',
  GD: 'Good (bon état)',
  LP: 'Light Played (légèrement jouée)',
  PL: 'Played (jouée)',
  PO: 'Poor (abîmée)',
};

/** Organismes de gradation courants sur le marché français. */
export type GradingCompany = 'PSA' | 'PCA' | 'BGS' | 'CGC' | 'AFG';

export const GRADING_COMPANIES: GradingCompany[] = ['PSA', 'PCA', 'BGS', 'CGC', 'AFG'];

/** Déclinaison d'impression d'une carte : change complètement sa cote. */
export type CardVariant = 'normale' | 'reverse' | 'holo' | 'promo';

export const VARIANT_LABELS: Record<CardVariant, string> = {
  normale: 'Normale',
  reverse: 'Reverse holo',
  holo: 'Holo',
  promo: 'Promo',
};

/** Familles de produits scellés. */
export type SealedKind =
  | 'display'
  | 'etb'
  | 'coffret'
  | 'booster'
  | 'tripack'
  | 'bundle'
  | 'premium'
  | 'blister';

export const SEALED_KIND_LABELS: Record<SealedKind, string> = {
  display: 'Display (boîte de boosters)',
  etb: 'Coffret Dresseur d’Élite (ETB)',
  coffret: 'Coffret',
  booster: 'Booster à l’unité',
  tripack: 'Tripack',
  bundle: 'Bundle / Pack multiple',
  premium: 'Collection Ultra Premium',
  blister: 'Blister',
};

/** Une série (extension) en français. */
export interface TcgSet {
  id: string;
  /** Bloc : « Écarlate et Violet », « Épée et Bouclier »… */
  serie: string;
  nameFr: string;
  nameEn: string | null;
  /** Code officiel imprimé sur les cartes : EV01, EB12… */
  code: string | null;
  releaseDate: string | null;
  cardCount: number | null;
  logoUrl: string | null;
  symbolUrl: string | null;
}

/** Une carte du catalogue français. */
export interface TcgCard {
  id: string;
  setId: string;
  /** Numéro imprimé (« 025/165 » → number = "025"). */
  number: string;
  nameFr: string;
  nameEn: string | null;
  rarity: string | null;
  illustrator: string | null;
  imageUrl: string | null;
  /** Variantes réellement imprimées pour cette carte. */
  variants: CardVariant[];
}

/** Un produit scellé du catalogue français. */
export interface SealedProduct {
  id: string;
  setId: string | null;
  kind: SealedKind;
  nameFr: string;
  releaseDate: string | null;
  imageUrl: string | null;
  /** Nombre de boosters, pour comparer un display à un bundle. */
  boosterCount: number | null;
}

/** Référence cotée : soit une carte (avec sa variante), soit un scellé. */
export type PriceRefType = 'carte' | 'scelle';

/**
 * Un relevé de prix. Un relevé = un couple (référence, moment).
 * `priceEur` est le prix de référence marché en euros, état Near Mint pour les
 * cartes, neuf scellé pour les produits. Les autres états et les notes de
 * gradation en découlent par coefficients.
 */
export interface PricePoint {
  refType: PriceRefType;
  refId: string;
  variant: CardVariant | null;
  priceEur: number;
  /** Prix bas du marché, quand la source le fournit. */
  lowEur: number | null;
  /** Tendance de la source (moyenne mobile), quand elle existe. */
  trendEur: number | null;
  source: string;
  capturedAt: string;
}

/** Un item détenu par un utilisateur. */
export interface PortfolioItem {
  id: string;
  ownerId: string;
  kind: ItemKind;
  /** Carte du catalogue (kind loose/gradee) ou produit scellé (kind scelle). */
  refId: string;
  variant: CardVariant | null;
  condition: CardCondition | null;
  gradingCompany: GradingCompany | null;
  /** Note de gradation : 1 à 10, demi-points admis (BGS 9.5). */
  grade: number | null;
  quantity: number;
  /** Prix d'achat unitaire payé, pour calculer la plus-value. */
  purchasePriceEur: number | null;
  purchaseDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Un item enrichi de sa référence catalogue et de sa valorisation. */
export interface ValuedItem extends PortfolioItem {
  label: string;
  subLabel: string;
  imageUrl: string | null;
  setNameFr: string | null;
  /** Prix de référence marché de la référence, avant coefficients. */
  basePriceEur: number | null;
  /** Valeur unitaire estimée de CET item (état et gradation appliqués). */
  unitValueEur: number | null;
  /** unitValueEur × quantity. */
  totalValueEur: number | null;
  /** Plus ou moins-value totale par rapport au prix d'achat. */
  gainEur: number | null;
  gainPct: number | null;
  /** Vrai quand la valeur provient d'un coefficient et non d'une cote directe. */
  estimated: boolean;
}

/** Un point de la courbe du coffre-fort. */
export interface PortfolioSnapshot {
  capturedAt: string;
  totalEur: number;
  looseEur: number;
  gradeeEur: number;
  scelleEur: number;
  itemCount: number;
}

export interface PortfolioSummary {
  totalEur: number;
  investedEur: number;
  gainEur: number;
  gainPct: number;
  byKind: Record<ItemKind, { valueEur: number; itemCount: number }>;
  itemCount: number;
  /** Variation sur les dernières 24 h, calculée sur les snapshots. */
  change24hEur: number | null;
  change24hPct: number | null;
  lastPriceUpdate: string | null;
  /** Sources des cotes utilisées : permet de signaler les prix d'amorce. */
  priceSources: string[];
}

export interface NewItemInput {
  kind: ItemKind;
  refId: string;
  variant?: CardVariant | null;
  condition?: CardCondition | null;
  gradingCompany?: GradingCompany | null;
  grade?: number | null;
  quantity?: number;
  purchasePriceEur?: number | null;
  purchaseDate?: string | null;
  notes?: string | null;
}

export type ItemPatch = Partial<NewItemInput>;

/** Résultat d'un scan d'item (photo → identification + état + cote). */
export interface ScanResult {
  /** Vrai si le modèle a reconnu un produit Pokémon exploitable. */
  identified: boolean;
  kind: ItemKind;
  /** Nom lu sur l'item, tel quel. */
  readName: string | null;
  readNumber: string | null;
  readSet: string | null;
  variant: CardVariant | null;
  condition: CardCondition | null;
  /** Défauts observés, en clair, qui justifient l'état retenu. */
  defects: string[];
  /** Confiance du modèle sur l'identification, 0 à 1. */
  confidence: number;
  /** Référence du catalogue retenue, quand la correspondance est trouvée. */
  matchedRefId: string | null;
  matchedLabel: string | null;
  matchedImageUrl: string | null;
  basePriceEur: number | null;
  estimatedValueEur: number | null;
  /** Explication en français de la cote retenue. */
  comment: string | null;
}
