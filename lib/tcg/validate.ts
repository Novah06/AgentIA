/**
 * Validation des entrées du portefeuille.
 *
 * Isolée des routes : la création et la modification d'un item partagent
 * exactement les mêmes règles, et un fichier de route Next.js ne doit exporter
 * que ses gestionnaires HTTP.
 */

import type {
  CardCondition,
  CardVariant,
  GradingCompany,
  ItemKind,
  NewItemInput,
} from './types';
import { CONDITIONS, GRADING_COMPANIES } from './types';

const KINDS: ItemKind[] = ['loose', 'gradee', 'scelle'];
const VARIANTS: CardVariant[] = ['normale', 'reverse', 'holo', 'promo'];

export function parseItemInput(
  body: Record<string, unknown>
): { input: NewItemInput } | { error: string } {
  const kind = body.kind as ItemKind;
  if (!KINDS.includes(kind)) return { error: 'Nature d’item invalide' };

  const refId = typeof body.refId === 'string' ? body.refId.trim() : '';
  if (!refId) return { error: 'Référence manquante' };

  const quantityRaw = Number(body.quantity ?? 1);
  const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : 1;

  const variant = VARIANTS.includes(body.variant as CardVariant)
    ? (body.variant as CardVariant)
    : null;

  const condition = CONDITIONS.includes(body.condition as CardCondition)
    ? (body.condition as CardCondition)
    : null;
  if (kind === 'loose' && !condition) return { error: 'L’état de la carte est requis' };

  const gradingCompany = GRADING_COMPANIES.includes(body.gradingCompany as GradingCompany)
    ? (body.gradingCompany as GradingCompany)
    : null;
  const gradeRaw = Number(body.grade);
  const grade = Number.isFinite(gradeRaw) && gradeRaw >= 1 && gradeRaw <= 10 ? gradeRaw : null;
  if (kind === 'gradee' && (!gradingCompany || grade === null)) {
    return { error: 'L’organisme et la note sont requis pour une carte gradée' };
  }

  const purchaseRaw = Number(body.purchasePriceEur);
  const purchasePriceEur =
    Number.isFinite(purchaseRaw) && purchaseRaw >= 0 ? Math.round(purchaseRaw * 100) / 100 : null;

  const purchaseDate =
    typeof body.purchaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.purchaseDate)
      ? body.purchaseDate
      : null;

  const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;

  return {
    input: {
      kind,
      refId,
      variant,
      condition: kind === 'loose' ? condition : null,
      gradingCompany: kind === 'gradee' ? gradingCompany : null,
      grade: kind === 'gradee' ? grade : null,
      quantity,
      purchasePriceEur,
      purchaseDate,
      notes,
    },
  };
}
