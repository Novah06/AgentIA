'use client';

import Link from 'next/link';
import { formatDateFr, formatEur, formatPct } from '@/lib/tcg/pricing';
import { CONDITION_LABELS } from '@/lib/tcg/types';
import type { ValuedItem } from '@/lib/tcg/types';

interface Props {
  items: ValuedItem[];
  onEdit?: (item: ValuedItem) => void;
  onDelete?: (item: ValuedItem) => void;
}

/**
 * Liste des items. Tableau sur grand écran, cartes empilées sur mobile :
 * onze colonnes ne tiennent pas sur un téléphone, et c'est justement là qu'on
 * consulte sa collection en boutique.
 */
/**
 * Gabarit de colonnes partagé par l'en-tête et les lignes.
 * Les largeurs des colonnes chiffrées sont fixes : en-tête et lignes sont deux
 * grilles distinctes, et des colonnes élastiques se calculeraient différemment
 * dans l'une et dans l'autre — les titres ne tomberaient plus en face des
 * valeurs.
 */
const GRID_AVEC_ACTIONS =
  'md:grid-cols-[minmax(0,1fr)_11rem_3rem_8rem_7rem_4.5rem_10rem]';
const GRID_SANS_ACTIONS = 'md:grid-cols-[minmax(0,1fr)_11rem_3rem_8rem_7rem_4.5rem]';

export default function ItemTable({ items, onEdit, onDelete }: Props) {
  const GRID = onEdit || onDelete ? GRID_AVEC_ACTIONS : GRID_SANS_ACTIONS;

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-tcg-line px-4 py-8 text-center text-sm text-tcg-secondary">
        Aucun item dans cette catégorie.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-tcg-line bg-tcg-card">
      <div className={`hidden gap-3 border-b border-tcg-line px-4 py-2 text-xs uppercase tracking-wide text-tcg-muted md:grid ${GRID}`}>
        <div>Item</div>
        <div>Détail</div>
        <div className="text-right">Qté</div>
        <div className="text-right">Cote unitaire</div>
        <div className="text-right">Valeur</div>
        <div className="text-right">Gain</div>
        {(onEdit || onDelete) && <div />}
      </div>

      <ul className="divide-y divide-tcg-line">
        {items.map((item) => (
          <li key={item.id} className={`px-4 py-3 md:grid md:items-center md:gap-3 ${GRID}`}>
            <div className="min-w-0">
              <Link href={`/tcg/reference/${item.refId}`} className="hover:text-tcg-gold">
                <span className="block truncate text-sm text-tcg-primary">{item.label}</span>
              </Link>
              <span className="block truncate text-xs text-tcg-muted">
                {item.setNameFr ?? item.subLabel}
              </span>
            </div>

            <div className="text-xs text-tcg-secondary">
              {item.kind === 'gradee' && `${item.gradingCompany} ${item.grade}`}
              {item.kind === 'loose' && item.condition && CONDITION_LABELS[item.condition]}
              {item.kind === 'scelle' && 'Scellé neuf'}
              {item.purchaseDate && (
                <span className="block text-tcg-muted">
                  Acheté le {formatDateFr(item.purchaseDate)}
                </span>
              )}
            </div>

            <div className="text-sm tabular-nums text-tcg-secondary md:text-right">
              ×{item.quantity}
            </div>

            <div className="text-sm tabular-nums text-tcg-secondary md:text-right">
              {formatEur(item.unitValueEur)}
              {item.estimated && (
                <span
                  className="ml-1 cursor-help text-tcg-muted"
                  title="Valeur estimée par coefficient, non issue d’une cote directe"
                >
                  ≈
                </span>
              )}
            </div>

            <div className="text-sm tabular-nums text-tcg-primary md:text-right">
              {formatEur(item.totalValueEur)}
            </div>

            <div
              className={`text-sm tabular-nums md:text-right ${
                item.gainEur === null
                  ? 'text-tcg-muted'
                  : item.gainEur >= 0
                    ? 'text-tcg-up'
                    : 'text-tcg-down'
              }`}
            >
              {item.gainPct === null ? '—' : formatPct(item.gainPct)}
            </div>

            {(onEdit || onDelete) && (
              <div className="mt-2 flex gap-2 md:mt-0 md:justify-end">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded-md border border-tcg-line px-2 py-1 text-xs text-tcg-secondary hover:text-tcg-primary"
                  >
                    Modifier
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="rounded-md border border-tcg-line px-2 py-1 text-xs text-tcg-secondary hover:text-tcg-down"
                  >
                    Retirer
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
