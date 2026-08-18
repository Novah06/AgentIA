'use client';

import { useMemo, useState } from 'react';
import { calculerEcarts } from '@/lib/studio/ecarts';
import type { AnalysisResult, StudioChiffrage } from '@/lib/studio/types';

function eur(v: number) {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
}

function signePct(v: number) {
  const arrondi = Math.round(v);
  return `${arrondi > 0 ? '+' : ''}${arrondi} %`;
}

/**
 * Écart entre la proposition de l'IA et le chiffrage corrigé.
 * Sert à mesurer la qualité de l'outil dossier après dossier : ce qui a été
 * conservé tel quel, ce qui a été rectifié, et surtout ce que l'IA avait
 * oublié — le signal le plus utile pour l'améliorer.
 */
export function EcartsPanel({
  prechiffrageIa,
  chiffrage,
}: {
  prechiffrageIa: AnalysisResult['prechiffrage'];
  chiffrage: StudioChiffrage;
}) {
  const [ouvert, setOuvert] = useState(false);
  const e = useMemo(
    () => calculerEcarts(prechiffrageIa, chiffrage),
    [prechiffrageIa, chiffrage]
  );

  const aucuneCorrection =
    e.lignesModifiees === 0 && e.lignesAjoutees === 0 && e.lignesSupprimees === 0;

  return (
    <div className="rounded-xl border border-studio-line bg-white p-5 sm:p-6">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-studio-gray">
          <span aria-hidden className="inline-block h-2 w-2 rounded-[2px] bg-studio-gray" />
          Écart IA / vos corrections
        </span>
        <span className="flex items-center gap-3 text-xs text-studio-gray">
          {aucuneCorrection ? (
            'aucune correction'
          ) : (
            <>
              {e.lignesModifiees > 0 && <span>{e.lignesModifiees} corrigée(s)</span>}
              {e.lignesAjoutees > 0 && (
                <span className="font-semibold text-studio-amber-dark">
                  {e.lignesAjoutees} oubli(s)
                </span>
              )}
              <span>{signePct(e.ecartGlobalPct)}</span>
            </>
          )}
          <span aria-hidden>{ouvert ? '▲' : '▼'}</span>
        </span>
      </button>

      {ouvert && (
        <div className="mt-5 space-y-5">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-studio-paper p-3">
              <dt className="text-xs uppercase tracking-wider text-studio-gray">
                Proposé par l&apos;IA
              </dt>
              <dd className="mt-0.5 font-semibold">
                {eur(e.coutIaMin)} – {eur(e.coutIaMax)}
              </dd>
              <dd className="text-xs text-studio-gray">
                {e.lignesIa} ligne(s), {e.heuresIaMin} h
              </dd>
            </div>
            <div className="rounded-lg bg-studio-paper p-3">
              <dt className="text-xs uppercase tracking-wider text-studio-gray">Après correction</dt>
              <dd className="mt-0.5 font-semibold">
                {eur(e.coutHumainMin)} – {eur(e.coutHumainMax)}
              </dd>
              <dd className="text-xs text-studio-gray">
                {chiffrage.lignes.length} ligne(s), {e.heuresHumainMin} h
              </dd>
            </div>
            <div className="rounded-lg bg-studio-paper p-3">
              <dt className="text-xs uppercase tracking-wider text-studio-gray">Écart</dt>
              <dd
                className={`mt-0.5 font-semibold ${
                  Math.abs(e.ecartGlobalPct) > 20 ? 'text-red-700' : ''
                }`}
              >
                {signePct(e.ecartGlobalPct)}
              </dd>
              <dd className="text-xs text-studio-gray">
                {e.lignesConservees} ligne(s) conservée(s) telle(s) quelle(s)
              </dd>
            </div>
          </dl>

          {e.ajouts.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-sm font-semibold">
                Ce que l&apos;IA avait oublié ({e.ajouts.length})
              </h4>
              <ul className="list-inside list-disc space-y-0.5 text-sm text-studio-gray">
                {e.ajouts.map((a, i) => (
                  <li key={i}>{a || 'ligne sans désignation'}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-studio-gray">
                Ajoutez ces postes à la question « Quels postes sont presque toujours oubliés ? »
                dans <span className="font-semibold">Notre entreprise</span> : ils seront pris en
                compte dans les prochaines analyses.
              </p>
            </div>
          )}

          {e.suppressions.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-sm font-semibold">
                Lignes retirées ou renommées ({e.suppressions.length})
              </h4>
              <ul className="list-inside list-disc space-y-0.5 text-sm text-studio-gray">
                {e.suppressions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {e.correctionsMajeures.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-sm font-semibold">Principales corrections de prix</h4>
              <div className="overflow-x-auto rounded-lg border border-studio-line">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-studio-paper text-xs uppercase tracking-wider text-studio-gray">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Ligne</th>
                      <th className="px-3 py-2 font-semibold">IA</th>
                      <th className="px-3 py-2 font-semibold">Corrigé</th>
                      <th className="px-3 py-2 font-semibold">Écart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-studio-line">
                    {e.correctionsMajeures.map((c, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{c.designation}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-studio-gray">
                          {eur(c.coutIaMin)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">{eur(c.coutHumainMin)}</td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 font-semibold ${
                            Math.abs(c.ecartPct) > 30 ? 'text-red-700' : 'text-studio-gray'
                          }`}
                        >
                          {signePct(c.ecartPct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {aucuneCorrection && (
            <p className="text-sm text-studio-gray">
              Aucune correction pour l&apos;instant : le chiffrage est identique à la proposition
              de l&apos;IA. Cet écart se remplira au fur et à mesure de vos rectifications.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
