import type { AnalysisResult, ChiffrageItem, HeureItem, StudioChiffrage } from './types';

/**
 * Comparaison entre le préchiffrage proposé par l'IA et le chiffrage tel que
 * le chargé d'affaires l'a laissé. C'est la mesure demandée par le plan
 * d'action : combien de lignes corrigées, quels oublis, quel écart de coût.
 * Elle se calcule sans rien stocker de plus — le préchiffrage d'origine est
 * dans l'analyse, la version corrigée dans le chiffrage.
 */

export interface EcartLigne {
  designation: string;
  coutIaMin: number;
  coutIaMax: number;
  coutHumainMin: number;
  coutHumainMax: number;
  /** Écart relatif sur la borne basse, en % (positif = l'IA sous-estimait) */
  ecartPct: number;
}

export interface EcartsChiffrage {
  lignesIa: number;
  lignesConservees: number;
  lignesModifiees: number;
  lignesSupprimees: number;
  lignesAjoutees: number;
  lignesValidees: number;
  /** Lignes ajoutées à la main : ce que l'IA avait oublié */
  ajouts: string[];
  /** Lignes de l'IA absentes du chiffrage final */
  suppressions: string[];
  /** Corrections de prix les plus importantes, les plus grosses d'abord */
  correctionsMajeures: EcartLigne[];
  coutIaMin: number;
  coutIaMax: number;
  coutHumainMin: number;
  coutHumainMax: number;
  /** Écart global sur la borne basse, en % */
  ecartGlobalPct: number;
  heuresIaMin: number;
  heuresHumainMin: number;
}

/** Rapproche deux libellés malgré la casse et les espaces. */
function cle(designation: string): string {
  return designation.trim().toLowerCase().replace(/\s+/g, ' ');
}

function pct(reference: number, valeur: number): number {
  if (reference === 0) return valeur === 0 ? 0 : 100;
  return ((valeur - reference) / reference) * 100;
}

export function calculerEcarts(
  prechiffrageIa: AnalysisResult['prechiffrage'],
  chiffrage: StudioChiffrage
): EcartsChiffrage {
  const parIa = new Map(prechiffrageIa.lignes.map((l) => [cle(l.designation), l]));
  const vues = new Set<string>();

  let lignesConservees = 0;
  let lignesModifiees = 0;
  const ajouts: string[] = [];
  const correctionsMajeures: EcartLigne[] = [];

  for (const ligne of chiffrage.lignes as ChiffrageItem[]) {
    const k = cle(ligne.designation);
    const origine = parIa.get(k);

    if (!origine) {
      // Soit une ligne ajoutée, soit une ligne renommée : dans les deux cas
      // c'est une intervention humaine à signaler.
      ajouts.push(ligne.designation);
      continue;
    }
    vues.add(k);

    const identique =
      Math.abs(origine.coutHtMin - ligne.coutHtMin) < 0.01 &&
      Math.abs(origine.coutHtMax - ligne.coutHtMax) < 0.01;

    if (identique) {
      lignesConservees += 1;
      continue;
    }
    lignesModifiees += 1;
    correctionsMajeures.push({
      designation: ligne.designation,
      coutIaMin: origine.coutHtMin,
      coutIaMax: origine.coutHtMax,
      coutHumainMin: ligne.coutHtMin,
      coutHumainMax: ligne.coutHtMax,
      ecartPct: pct(origine.coutHtMin, ligne.coutHtMin),
    });
  }

  const suppressions = prechiffrageIa.lignes
    .filter((l) => !vues.has(cle(l.designation)))
    .map((l) => l.designation);

  correctionsMajeures.sort((a, b) => Math.abs(b.ecartPct) - Math.abs(a.ecartPct));

  const coutIaMin = prechiffrageIa.lignes.reduce((s, l) => s + l.coutHtMin, 0);
  const coutIaMax = prechiffrageIa.lignes.reduce((s, l) => s + l.coutHtMax, 0);
  const coutHumainMin = chiffrage.lignes.reduce((s, l) => s + l.coutHtMin, 0);
  const coutHumainMax = chiffrage.lignes.reduce((s, l) => s + l.coutHtMax, 0);

  const heuresIaMin = prechiffrageIa.heures.reduce((s, h) => s + h.heuresMin, 0);
  const heuresHumainMin = (chiffrage.heures as HeureItem[]).reduce(
    (s, h) => s + h.heuresMin,
    0
  );

  return {
    lignesIa: prechiffrageIa.lignes.length,
    lignesConservees,
    lignesModifiees,
    lignesSupprimees: suppressions.length,
    lignesAjoutees: ajouts.length,
    lignesValidees: chiffrage.lignes.filter((l) => l.valide).length,
    ajouts,
    suppressions,
    correctionsMajeures: correctionsMajeures.slice(0, 5),
    coutIaMin,
    coutIaMax,
    coutHumainMin,
    coutHumainMax,
    ecartGlobalPct: pct(coutIaMin, coutHumainMin),
    heuresIaMin,
    heuresHumainMin,
  };
}
