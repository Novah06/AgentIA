/**
 * Valorisation d'un item à partir d'un prix de référence.
 *
 * Le marché ne cote directement qu'une chose : la carte Near Mint (ou le
 * produit neuf scellé). Tout le reste — un état Good, une PSA 10 — se déduit
 * par coefficients. Ces coefficients sont des ORDRES DE GRANDEUR du marché
 * français, pas des cotes : toute valeur qui en dépend est marquée `estimated`
 * dans l'interface, pour qu'aucun chiffre estimé ne soit lu comme une cote.
 *
 * Ils sont regroupés ici pour être ajustables en un seul endroit à mesure que
 * l'historique de prix réel s'accumule.
 */

import type { CardCondition, GradingCompany, ItemKind } from './types';

/** Date de dernier calage des coefficients, affichée dans l'interface. */
export const DATE_COEFFICIENTS = '2026-09';

/**
 * Coefficient d'état, relatif au Near Mint (= 1).
 * Une carte Mint se négocie légèrement au-dessus du NM ; en dessous, la décote
 * s'accélère car le marché français achète surtout du NM.
 */
export const CONDITION_FACTORS: Record<CardCondition, number> = {
  MT: 1.1,
  NM: 1,
  EX: 0.82,
  GD: 0.65,
  LP: 0.5,
  PL: 0.35,
  PO: 0.2,
};

/**
 * Coefficient de note, relatif au prix de la même carte Near Mint non gradée.
 * La marche est très forte entre 9 et 10 : c'est là que se fait la valeur.
 */
export const GRADE_FACTORS: Record<string, number> = {
  '10': 3.6,
  '9.5': 2.4,
  '9': 1.8,
  '8.5': 1.5,
  '8': 1.3,
  '7.5': 1.15,
  '7': 1.05,
  '6.5': 0.98,
  '6': 0.92,
  '5': 0.82,
  '4': 0.72,
  '3': 0.62,
  '2': 0.5,
  '1': 0.4,
};

/**
 * Prime de l'organisme. PSA reste la référence de revente en France, PCA
 * s'impose sur le marché francophone, AFG reste peu liquide.
 */
export const COMPANY_FACTORS: Record<GradingCompany, number> = {
  PSA: 1.15,
  BGS: 1.1,
  CGC: 1,
  PCA: 0.88,
  AFG: 0.7,
};

/** Coût moyen d'une gradation en France, port et assurance compris. */
export const GRADING_COST_EUR = 25;

function normalizeGrade(grade: number): string {
  // Les notes intermédiaires (8.5, 9.5) existent chez BGS et CGC ; ailleurs on
  // arrondit à la demi-note inférieure présente dans la table.
  const rounded = Math.round(grade * 2) / 2;
  const key = String(rounded);
  if (GRADE_FACTORS[key] !== undefined) return key;
  const floor = String(Math.floor(rounded));
  return GRADE_FACTORS[floor] !== undefined ? floor : '1';
}

export interface ValuationInput {
  kind: ItemKind;
  basePriceEur: number | null;
  condition?: CardCondition | null;
  gradingCompany?: GradingCompany | null;
  grade?: number | null;
}

export interface Valuation {
  unitValueEur: number | null;
  /** Vrai dès qu'un coefficient intervient : la valeur n'est pas une cote directe. */
  estimated: boolean;
  /** Détail lisible du calcul, affiché en info-bulle. */
  explanation: string | null;
}

/**
 * Valeur unitaire d'un item.
 * Un scellé se cote directement ; une carte loose applique son état ; une
 * carte gradée applique la note puis la prime d'organisme.
 */
export function valueItem(input: ValuationInput): Valuation {
  const base = input.basePriceEur;
  if (base === null || !Number.isFinite(base)) {
    return { unitValueEur: null, estimated: false, explanation: null };
  }

  if (input.kind === 'scelle') {
    return {
      unitValueEur: round2(base),
      estimated: false,
      explanation: 'Cote directe du produit scellé neuf.',
    };
  }

  if (input.kind === 'gradee') {
    const grade = input.grade;
    if (grade === null || grade === undefined) {
      return {
        unitValueEur: round2(base),
        estimated: true,
        explanation: 'Note manquante : valeur ramenée au prix Near Mint non gradé.',
      };
    }
    const key = normalizeGrade(grade);
    const gradeFactor = GRADE_FACTORS[key];
    const company = input.gradingCompany ?? 'CGC';
    const companyFactor = COMPANY_FACTORS[company] ?? 1;
    const value = base * gradeFactor * companyFactor;
    return {
      unitValueEur: round2(value),
      estimated: true,
      explanation:
        `Prix Near Mint ${fmt(base)} × ${gradeFactor} (note ${key}) × ` +
        `${companyFactor} (${company}) — estimation, à confronter aux ventes réelles.`,
    };
  }

  const condition = input.condition ?? 'NM';
  const factor = CONDITION_FACTORS[condition] ?? 1;
  return {
    unitValueEur: round2(base * factor),
    estimated: condition !== 'NM',
    explanation:
      condition === 'NM'
        ? 'Cote directe Near Mint.'
        : `Prix Near Mint ${fmt(base)} × ${factor} (état ${condition}).`,
  };
}

/**
 * Intérêt théorique d'une gradation : gain attendu si la carte obtenait la
 * note visée, coût de gradation déduit. Sert à l'écran « Coffre-fort ».
 */
export function gradingUpside(
  basePriceEur: number,
  targetGrade: number,
  company: GradingCompany = 'PSA'
): number {
  const graded = valueItem({
    kind: 'gradee',
    basePriceEur,
    grade: targetGrade,
    gradingCompany: company,
  }).unitValueEur;
  if (graded === null) return 0;
  return round2(graded - basePriceEur - GRADING_COST_EUR);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(n: number): string {
  return `${round2(n).toFixed(2)} €`;
}

/** Formatage monétaire français, utilisé partout dans l'interface. */
export function formatEur(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} %`;
}

export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(d);
}

export function formatDateTimeFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(d);
}
