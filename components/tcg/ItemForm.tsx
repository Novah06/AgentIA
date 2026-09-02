'use client';

import { useState } from 'react';
import RefPicker, { type PickedRef } from './RefPicker';
import { valueItem, formatEur } from '@/lib/tcg/pricing';
import {
  CONDITIONS,
  CONDITION_LABELS,
  GRADING_COMPANIES,
  ITEM_KIND_LABELS,
  VARIANT_LABELS,
} from '@/lib/tcg/types';
import type { CardCondition, CardVariant, GradingCompany, ItemKind, ValuedItem } from '@/lib/tcg/types';

const KINDS: ItemKind[] = ['loose', 'gradee', 'scelle'];
const VARIANTS: CardVariant[] = ['normale', 'reverse', 'holo', 'promo'];
const GRADES = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6, 5, 4, 3, 2, 1];

interface Props {
  /** Item existant à modifier, ou null pour un ajout. */
  editing?: ValuedItem | null;
  /** Référence pré-remplie, par exemple à l'issue d'un scan. */
  initialRef?: PickedRef | null;
  initialKind?: ItemKind;
  initialCondition?: CardCondition | null;
  onSaved: () => void;
  onCancel?: () => void;
}

export default function ItemForm({
  editing = null,
  initialRef = null,
  initialKind = 'loose',
  initialCondition = null,
  onSaved,
  onCancel,
}: Props) {
  const [kind, setKind] = useState<ItemKind>(editing?.kind ?? initialKind);
  const [picked, setPicked] = useState<PickedRef | null>(
    editing
      ? {
          id: editing.refId,
          label: editing.label,
          subLabel: editing.subLabel,
          imageUrl: editing.imageUrl,
          variants: [],
          priceEur: editing.basePriceEur,
          refType: editing.kind === 'scelle' ? 'scelle' : 'carte',
        }
      : initialRef
  );
  const [variant, setVariant] = useState<CardVariant>(editing?.variant ?? 'normale');
  const [condition, setCondition] = useState<CardCondition>(
    editing?.condition ?? initialCondition ?? 'NM'
  );
  const [company, setCompany] = useState<GradingCompany>(editing?.gradingCompany ?? 'PSA');
  const [grade, setGrade] = useState<number>(editing?.grade ?? 10);
  const [quantity, setQuantity] = useState<number>(editing?.quantity ?? 1);
  const [purchasePrice, setPurchasePrice] = useState<string>(
    editing?.purchasePriceEur !== null && editing?.purchasePriceEur !== undefined
      ? String(editing.purchasePriceEur)
      : ''
  );
  const [purchaseDate, setPurchaseDate] = useState<string>(editing?.purchaseDate ?? '');
  const [notes, setNotes] = useState<string>(editing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aperçu de la valeur : le même calcul que côté serveur, pour que la saisie
  // montre immédiatement ce que l'item va peser dans le coffre-fort.
  const preview = valueItem({
    kind,
    basePriceEur: picked?.priceEur ?? null,
    condition: kind === 'loose' ? condition : null,
    gradingCompany: kind === 'gradee' ? company : null,
    grade: kind === 'gradee' ? grade : null,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!picked) {
      setError('Choisissez d’abord une référence dans le catalogue.');
      return;
    }
    setSaving(true);
    setError(null);

    const body = {
      kind,
      refId: picked.id,
      variant: kind === 'scelle' ? null : variant,
      condition: kind === 'loose' ? condition : null,
      gradingCompany: kind === 'gradee' ? company : null,
      grade: kind === 'gradee' ? grade : null,
      quantity,
      purchasePriceEur: purchasePrice.trim() ? Number(purchasePrice.replace(',', '.')) : null,
      purchaseDate: purchaseDate || null,
      notes: notes.trim() || null,
    };

    try {
      const res = await fetch(editing ? `/api/tcg/items/${editing.id}` : '/api/tcg/items', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Enregistrement impossible');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-tcg-line bg-tcg-card p-4">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k);
              // Changer de nature change de catalogue : la référence choisie
              // pour une carte n'a aucun sens en scellé, et inversement.
              if ((k === 'scelle') !== (picked?.refType === 'scelle')) setPicked(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              kind === k
                ? 'bg-tcg-gold text-tcg-ink'
                : 'border border-tcg-line text-tcg-secondary hover:text-tcg-primary'
            }`}
          >
            {ITEM_KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-tcg-muted">
          Référence
        </label>
        <RefPicker
          refType={kind === 'scelle' ? 'scelle' : 'carte'}
          value={picked}
          onChange={setPicked}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {kind !== 'scelle' && (
          <Field label="Impression">
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value as CardVariant)}
              className={selectClass}
            >
              {VARIANTS.map((v) => (
                <option key={v} value={v}>
                  {VARIANT_LABELS[v]}
                </option>
              ))}
            </select>
          </Field>
        )}

        {kind === 'loose' && (
          <Field label="État">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as CardCondition)}
              className={selectClass}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
        )}

        {kind === 'gradee' && (
          <>
            <Field label="Organisme">
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value as GradingCompany)}
                className={selectClass}
              >
                {GRADING_COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note">
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className={selectClass}
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        <Field label="Quantité">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className={selectClass}
          />
        </Field>

        <Field label="Prix d’achat unitaire (€)">
          <input
            type="text"
            inputMode="decimal"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="facultatif"
            className={selectClass}
          />
        </Field>

        <Field label="Date d’achat">
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className={selectClass}
          />
        </Field>
      </div>

      <Field label="Notes">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ex. achetée en lot, léger défaut au dos…"
          className={selectClass}
        />
      </Field>

      {picked && (
        <p className="rounded-lg bg-tcg-ink px-3 py-2 text-sm text-tcg-secondary">
          Valeur estimée :{' '}
          <span className="text-tcg-gold">{formatEur(preview.unitValueEur)}</span>
          {quantity > 1 && preview.unitValueEur !== null && (
            <>
              {' '}
              × {quantity} ={' '}
              <span className="text-tcg-gold">{formatEur(preview.unitValueEur * quantity)}</span>
            </>
          )}
          {preview.explanation && (
            <span className="block text-xs text-tcg-muted">{preview.explanation}</span>
          )}
        </p>
      )}

      {error && <p className="text-sm text-tcg-down">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-tcg-gold px-4 py-2 text-sm font-medium text-tcg-ink hover:bg-tcg-gold-dim disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter au coffre-fort'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-tcg-line px-4 py-2 text-sm text-tcg-secondary hover:text-tcg-primary"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

const selectClass =
  'w-full rounded-lg border border-tcg-line bg-tcg-ink px-3 py-2 text-sm text-tcg-primary focus:border-tcg-gold focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-tcg-muted">{label}</span>
      {children}
    </label>
  );
}
