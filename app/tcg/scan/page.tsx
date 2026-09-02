'use client';

import { useRef, useState } from 'react';
import ItemForm from '@/components/tcg/ItemForm';
import type { PickedRef } from '@/components/tcg/RefPicker';
import { CONDITION_LABELS, ITEM_KIND_LABELS } from '@/lib/tcg/types';
import type { ScanResult } from '@/lib/tcg/types';
import { formatEur } from '@/lib/tcg/pricing';

export default function ScanPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function analyse(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    setSaved(false);
    setAdding(false);
    setPreview(URL.createObjectURL(file));

    const form = new FormData();
    form.append('photo', file);

    try {
      const res = await fetch('/api/tcg/scan', { method: 'POST', body: form });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Analyse impossible');
      setResult(payload.result as ScanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analyse impossible');
    } finally {
      setBusy(false);
    }
  }

  const picked: PickedRef | null =
    result?.matchedRefId && result.matchedLabel
      ? {
          id: result.matchedRefId,
          label: result.matchedLabel.split(' — ')[0],
          subLabel: result.matchedLabel.split(' — ').slice(1).join(' — '),
          imageUrl: result.matchedImageUrl,
          variants: [],
          priceEur: result.basePriceEur,
          refType: result.kind === 'scelle' ? 'scelle' : 'carte',
        }
      : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl">Scan d’item</h1>
        <p className="text-sm text-tcg-secondary">
          Photographiez une carte ou un produit : l’application l’identifie, juge son état
          d’après la photo, et affiche la cote correspondante.
        </p>
      </div>

      <div className="rounded-xl border border-tcg-line bg-tcg-card p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void analyse(file);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-lg bg-tcg-gold px-4 py-2 text-sm font-medium text-tcg-ink hover:bg-tcg-gold-dim disabled:opacity-60"
          >
            {busy ? 'Analyse en cours…' : 'Prendre ou choisir une photo'}
          </button>
          <p className="text-xs text-tcg-muted">
            Cadrez la carte entière, à plat, sous une lumière franche : c’est ce qui permet
            de juger les bords et les coins. JPEG, PNG ou WebP, 5 Mo maximum.
          </p>
        </div>

        {preview && (
          <div className="mt-4 flex gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Photo analysée" className="max-h-64 rounded-lg" />
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-tcg-down/40 bg-tcg-down/10 px-4 py-3 text-sm text-tcg-primary">
          {error}
        </p>
      )}

      {result && !result.identified && (
        <p className="rounded-xl border border-tcg-line bg-tcg-card px-4 py-3 text-sm text-tcg-secondary">
          Aucun item Pokémon reconnu sur cette photo. {result.comment}
        </p>
      )}

      {result?.identified && (
        <div className="space-y-4 rounded-xl border border-tcg-line bg-tcg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Row label="Nature" value={ITEM_KIND_LABELS[result.kind]} />
              <Row label="Nom lu" value={result.readName ?? '—'} />
              <Row label="Numéro" value={result.readNumber ?? 'illisible'} />
              <Row label="Extension" value={result.readSet ?? 'non identifiée'} />
              <Row
                label="État retenu"
                value={result.condition ? CONDITION_LABELS[result.condition] : '—'}
              />
              <Row label="Confiance" value={`${Math.round(result.confidence * 100)} %`} />
            </div>

            <div className="space-y-2">
              <Row
                label="Référence du catalogue"
                value={result.matchedLabel ?? 'aucune correspondance'}
              />
              <Row label="Cote de référence" value={formatEur(result.basePriceEur)} />
              <div className="rounded-lg bg-tcg-ink px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-tcg-muted">
                  Valeur estimée de cet item
                </div>
                <div className="font-display text-2xl text-tcg-gold">
                  {formatEur(result.estimatedValueEur)}
                </div>
              </div>
            </div>
          </div>

          {result.defects.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-tcg-muted">
                Défauts observés
              </div>
              <ul className="mt-1 list-inside list-disc text-sm text-tcg-secondary">
                {result.defects.map((defect) => (
                  <li key={defect}>{defect}</li>
                ))}
              </ul>
            </div>
          )}

          {result.comment && <p className="text-xs text-tcg-muted">{result.comment}</p>}

          <p className="text-xs text-tcg-muted">
            L’état est jugé sur une seule photo : vérifiez le dos et les bords avant une
            vente. La cote vient du dernier relevé de prix, pas du modèle.
          </p>

          {picked && !saved && (
            <button
              type="button"
              onClick={() => setAdding((open) => !open)}
              className="rounded-lg bg-tcg-gold px-4 py-2 text-sm font-medium text-tcg-ink hover:bg-tcg-gold-dim"
            >
              {adding ? 'Fermer' : 'Ajouter au coffre-fort'}
            </button>
          )}

          {saved && (
            <p className="text-sm text-tcg-up">Item ajouté à votre collection.</p>
          )}

          {adding && picked && (
            <ItemForm
              initialRef={picked}
              initialKind={result.kind}
              initialCondition={result.condition}
              onSaved={() => {
                setAdding(false);
                setSaved(true);
              }}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-40 shrink-0 text-tcg-muted">{label}</span>
      <span className="min-w-0 flex-1 text-tcg-primary">{value}</span>
    </div>
  );
}
