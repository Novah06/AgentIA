'use client';

import { useMemo, useState } from 'react';
import { useUnsavedChanges } from '@/lib/studio/useUnsavedChanges';
import {
  calculerTotaux,
  type ChiffrageItem,
  type Fiabilite,
  type HeureItem,
  type StudioChiffrage,
} from '@/lib/studio/types';

const FIABILITES: Fiabilite[] = ['confirme', 'estime', 'manquant'];

const FIABILITE_LABEL: Record<Fiabilite, string> = {
  confirme: 'Confirmé',
  estime: 'Estimé',
  manquant: 'Manquant',
};

const FIABILITE_CLASS: Record<Fiabilite, string> = {
  confirme: 'bg-emerald-100 text-emerald-800',
  estime: 'bg-amber-100 text-amber-800',
  manquant: 'bg-red-100 text-red-700',
};

function eur(v: number) {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
}

/** Accepte la virgule décimale, comme sur un clavier français. */
function toNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const cellInput =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-studio-line focus:border-studio-amber focus:bg-white focus:outline-none';

export function ChiffrageEditor({
  projectId,
  chiffrage: initial,
  onSaved,
}: {
  projectId: string;
  chiffrage: StudioChiffrage;
  onSaved: (c: StudioChiffrage) => void;
}) {
  const [lignes, setLignes] = useState<ChiffrageItem[]>(initial.lignes);
  const [heures, setHeures] = useState<HeureItem[]>(initial.heures);
  const [coefDefaut, setCoefDefaut] = useState(initial.coefficientDefaut);
  const [tauxDefaut, setTauxDefaut] = useState(initial.tauxHoraireDefaut);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useUnsavedChanges(dirty);

  const totaux = useMemo(
    () =>
      calculerTotaux({
        ...initial,
        lignes,
        heures,
        coefficientDefaut: coefDefaut,
        tauxHoraireDefaut: tauxDefaut,
      }),
    [initial, lignes, heures, coefDefaut, tauxDefaut]
  );

  function patchLigne(id: string, patch: Partial<ChiffrageItem>) {
    setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setDirty(true);
  }

  function patchHeure(id: string, patch: Partial<HeureItem>) {
    setHeures((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    setDirty(true);
  }

  function addLigne() {
    setLignes((prev) => [
      ...prev,
      {
        id: newId(),
        famille: 'Autre',
        designation: '',
        quantite: null,
        unite: null,
        coutHtMin: 0,
        coutHtMax: 0,
        base: 'Saisie manuelle',
        fiabilite: 'estime',
        coefficient: coefDefaut,
        valide: true,
        origine: 'humain',
      },
    ]);
    setDirty(true);
  }

  function addHeure() {
    setHeures((prev) => [
      ...prev,
      {
        id: newId(),
        poste: '',
        heuresMin: 0,
        heuresMax: 0,
        tauxHoraireHt: tauxDefaut,
        coefficient: coefDefaut,
        valide: true,
        origine: 'humain',
      },
    ]);
    setDirty(true);
  }

  /** Applique le coefficient par défaut à toutes les lignes en une fois. */
  function appliquerCoefPartout() {
    setLignes((prev) => prev.map((l) => ({ ...l, coefficient: coefDefaut })));
    setHeures((prev) => prev.map((h) => ({ ...h, coefficient: coefDefaut })));
    setDirty(true);
  }

  function toutValider() {
    setLignes((prev) => prev.map((l) => ({ ...l, valide: true })));
    setHeures((prev) => prev.map((h) => ({ ...h, valide: true })));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/projects/${projectId}/chiffrage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lignes,
          heures,
          coefficientDefaut: coefDefaut,
          tauxHoraireDefaut: tauxDefaut,
          commentaire: initial.commentaire,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Enregistrement impossible');
      setLignes(data.chiffrage.lignes);
      setHeures(data.chiffrage.heures);
      setDirty(false);
      onSaved(data.chiffrage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Réglages globaux */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg bg-studio-paper p-4">
        <label className="text-xs">
          <span className="mb-1 block font-semibold uppercase tracking-wider text-studio-gray">
            Coefficient par défaut
          </span>
          <input
            className="w-24 rounded border border-studio-line bg-white px-2 py-1.5 text-sm focus:border-studio-amber focus:outline-none"
            value={coefDefaut}
            inputMode="decimal"
            onChange={(e) => {
              setCoefDefaut(toNumber(e.target.value));
              setDirty(true);
            }}
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block font-semibold uppercase tracking-wider text-studio-gray">
            Taux horaire HT
          </span>
          <input
            className="w-24 rounded border border-studio-line bg-white px-2 py-1.5 text-sm focus:border-studio-amber focus:outline-none"
            value={tauxDefaut}
            inputMode="decimal"
            onChange={(e) => {
              setTauxDefaut(toNumber(e.target.value));
              setDirty(true);
            }}
          />
        </label>
        <button
          type="button"
          onClick={appliquerCoefPartout}
          className="rounded-lg border border-studio-line bg-white px-3 py-1.5 text-xs font-semibold transition-colors hover:border-studio-amber"
        >
          Appliquer à toutes les lignes
        </button>
        {totaux.lignesAValider > 0 && (
          <button
            type="button"
            onClick={toutValider}
            className="rounded-lg border border-studio-line bg-white px-3 py-1.5 text-xs font-semibold transition-colors hover:border-studio-amber"
          >
            Tout marquer vérifié ({totaux.lignesAValider})
          </button>
        )}
      </div>

      {/* Lignes de chiffrage */}
      <div className="overflow-x-auto rounded-lg border border-studio-line">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-studio-paper text-xs uppercase tracking-wider text-studio-gray">
            <tr>
              <th className="px-2 py-2 font-semibold" title="Ligne vérifiée par un humain">
                ✓
              </th>
              <th className="px-2 py-2 font-semibold">Désignation</th>
              <th className="px-2 py-2 font-semibold">Qté</th>
              <th className="px-2 py-2 font-semibold">Unité</th>
              <th className="px-2 py-2 font-semibold">Coût min</th>
              <th className="px-2 py-2 font-semibold">Coût max</th>
              <th className="px-2 py-2 font-semibold">Coef.</th>
              <th className="px-2 py-2 font-semibold">PV min</th>
              <th className="px-2 py-2 font-semibold">PV max</th>
              <th className="px-2 py-2 font-semibold">Fiab.</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-studio-line">
            {lignes.map((l) => (
              <tr key={l.id} className={l.valide ? '' : 'bg-amber-50/40'}>
                <td className="px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={l.valide}
                    aria-label={`Marquer « ${l.designation || 'ligne'} » comme vérifiée`}
                    onChange={(e) => patchLigne(l.id, { valide: e.target.checked })}
                    className="h-4 w-4 accent-emerald-600"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={cellInput}
                    value={l.designation}
                    placeholder="Désignation"
                    onChange={(e) => patchLigne(l.id, { designation: e.target.value })}
                  />
                  <input
                    className={`${cellInput} text-xs text-studio-gray`}
                    value={l.base}
                    placeholder="Base de calcul"
                    onChange={(e) => patchLigne(l.id, { base: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={`${cellInput} w-16`}
                    inputMode="decimal"
                    value={l.quantite ?? ''}
                    onChange={(e) =>
                      patchLigne(l.id, {
                        quantite: e.target.value === '' ? null : toNumber(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={`${cellInput} w-14`}
                    value={l.unite ?? ''}
                    onChange={(e) => patchLigne(l.id, { unite: e.target.value || null })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={`${cellInput} w-20`}
                    inputMode="decimal"
                    value={l.coutHtMin}
                    onChange={(e) => patchLigne(l.id, { coutHtMin: toNumber(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={`${cellInput} w-20`}
                    inputMode="decimal"
                    value={l.coutHtMax}
                    onChange={(e) => patchLigne(l.id, { coutHtMax: toNumber(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={`${cellInput} w-14`}
                    inputMode="decimal"
                    value={l.coefficient}
                    onChange={(e) => patchLigne(l.id, { coefficient: toNumber(e.target.value) })}
                  />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-studio-gray">
                  {eur(l.coutHtMin * l.coefficient)}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-studio-gray">
                  {eur(l.coutHtMax * l.coefficient)}
                </td>
                <td className="px-2 py-1.5">
                  <select
                    aria-label="Fiabilité"
                    value={l.fiabilite}
                    onChange={(e) =>
                      patchLigne(l.id, { fiabilite: e.target.value as Fiabilite })
                    }
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${FIABILITE_CLASS[l.fiabilite]}`}
                  >
                    {FIABILITES.map((f) => (
                      <option key={f} value={f}>
                        {FIABILITE_LABEL[f]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    aria-label={`Supprimer ${l.designation || 'la ligne'}`}
                    onClick={() => {
                      setLignes((prev) => prev.filter((x) => x.id !== l.id));
                      setDirty(true);
                    }}
                    className="text-studio-gray transition-colors hover:text-red-600"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addLigne}
        className="rounded-lg border border-dashed border-studio-gray/50 px-3 py-1.5 text-xs font-semibold text-studio-gray transition-colors hover:border-studio-amber hover:text-studio-ink"
      >
        + Ajouter une ligne
      </button>

      {/* Heures */}
      <div>
        <h4 className="mb-2 text-sm font-semibold">Heures</h4>
        <div className="overflow-x-auto rounded-lg border border-studio-line">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-studio-paper text-xs uppercase tracking-wider text-studio-gray">
              <tr>
                <th className="px-2 py-2 font-semibold">✓</th>
                <th className="px-2 py-2 font-semibold">Poste</th>
                <th className="px-2 py-2 font-semibold">H min</th>
                <th className="px-2 py-2 font-semibold">H max</th>
                <th className="px-2 py-2 font-semibold">Taux/h</th>
                <th className="px-2 py-2 font-semibold">Coef.</th>
                <th className="px-2 py-2 font-semibold">Coût min</th>
                <th className="px-2 py-2 font-semibold">Coût max</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-studio-line">
              {heures.map((h) => (
                <tr key={h.id} className={h.valide ? '' : 'bg-amber-50/40'}>
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={h.valide}
                      aria-label={`Marquer « ${h.poste || 'poste'} » comme vérifié`}
                      onChange={(e) => patchHeure(h.id, { valide: e.target.checked })}
                      className="h-4 w-4 accent-emerald-600"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={cellInput}
                      value={h.poste}
                      placeholder="Atelier, montage…"
                      onChange={(e) => patchHeure(h.id, { poste: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`${cellInput} w-16`}
                      inputMode="decimal"
                      value={h.heuresMin}
                      onChange={(e) => patchHeure(h.id, { heuresMin: toNumber(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`${cellInput} w-16`}
                      inputMode="decimal"
                      value={h.heuresMax}
                      onChange={(e) => patchHeure(h.id, { heuresMax: toNumber(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`${cellInput} w-16`}
                      inputMode="decimal"
                      value={h.tauxHoraireHt}
                      onChange={(e) =>
                        patchHeure(h.id, { tauxHoraireHt: toNumber(e.target.value) })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`${cellInput} w-14`}
                      inputMode="decimal"
                      value={h.coefficient}
                      onChange={(e) => patchHeure(h.id, { coefficient: toNumber(e.target.value) })}
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-studio-gray">
                    {eur(h.heuresMin * h.tauxHoraireHt)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-studio-gray">
                    {eur(h.heuresMax * h.tauxHoraireHt)}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      aria-label={`Supprimer ${h.poste || 'le poste'}`}
                      onClick={() => {
                        setHeures((prev) => prev.filter((x) => x.id !== h.id));
                        setDirty(true);
                      }}
                      className="text-studio-gray transition-colors hover:text-red-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addHeure}
          className="mt-2 rounded-lg border border-dashed border-studio-gray/50 px-3 py-1.5 text-xs font-semibold text-studio-gray transition-colors hover:border-studio-amber hover:text-studio-ink"
        >
          + Ajouter un poste
        </button>
      </div>

      {/* Totaux */}
      <dl className="grid gap-3 rounded-xl bg-studio-ink p-5 text-white sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wider text-white/50">Coût de revient HT</dt>
          <dd className="mt-0.5 text-lg font-semibold">
            {eur(totaux.coutTotalMin)} – {eur(totaux.coutTotalMax)}
          </dd>
          <dd className="text-xs text-white/40">
            dont main d&apos;œuvre {eur(totaux.coutMoMin)} – {eur(totaux.coutMoMax)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-white/50">Prix de vente HT</dt>
          <dd className="mt-0.5 text-lg font-semibold text-studio-amber">
            {eur(totaux.venteMin)} – {eur(totaux.venteMax)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-white/50">Marge</dt>
          <dd className="mt-0.5 text-lg font-semibold">
            {eur(totaux.margeMin)} – {eur(totaux.margeMax)}
          </dd>
          <dd className="text-xs text-white/40">
            soit {totaux.tauxMargeMin.toFixed(1)} – {totaux.tauxMargeMax.toFixed(1)} % du PV
          </dd>
        </div>
      </dl>

      {totaux.lignesAValider > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {totaux.lignesAValider} ligne{totaux.lignesAValider > 1 ? 's' : ''} proposée
          {totaux.lignesAValider > 1 ? 's' : ''} par l&apos;IA reste
          {totaux.lignesAValider > 1 ? 'nt' : ''} à vérifier (surlignée
          {totaux.lignesAValider > 1 ? 's' : ''} en jaune).
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Barre collante : les corrections non enregistrées restent visibles
          même en bas d'un long tableau. */}
      <div
        className={`sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6 ${
          dirty ? 'border-studio-amber bg-amber-50/95' : 'border-studio-line bg-white/95'
        }`}
      >
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-lg bg-studio-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-studio-coal disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : dirty ? 'Enregistrer les corrections' : 'Enregistré'}
        </button>
        <a
          href={`/api/studio/projects/${projectId}/export`}
          className="rounded-lg border border-studio-line bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:border-studio-amber hover:text-studio-amber-dark"
        >
          Exporter en Excel
        </a>
        {dirty && (
          <span className="text-xs font-medium text-amber-900">
            Corrections non enregistrées — elles seront perdues si vous quittez la page.
          </span>
        )}
      </div>
    </div>
  );
}
