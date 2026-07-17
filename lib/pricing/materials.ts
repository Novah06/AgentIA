/**
 * Bibliothèque de prix de référence — matériaux, découpe CNC, main d'œuvre, peinture.
 *
 * Source : tarifs fournisseur communiqués le 17/07/2026.
 * Chaque entrée porte sa source et son niveau de fiabilité afin que le moteur
 * de chiffrage puisse afficher la provenance de chaque coût et signaler
 * les prix à confirmer (règle : toute donnée produite doit être traçable).
 */

export type Fiabilite = "confirme" | "estime" | "manquant";

export interface PlaqueMatiere {
  matiere: string;
  epaisseurMm: number;
  /** Format de plaque en millimètres */
  formatMm: { longueur: number; largeur: number };
  /** Surface d'une plaque en m² */
  surfaceM2: number;
  /** Prix d'achat HT au m², null si le fournisseur ne tarife qu'à la plaque */
  prixHtM2: number | null;
  /** Prix d'achat HT d'une plaque complète (fourchette si variable) */
  prixHtPlaque: { min: number; max: number };
  /** Facturation à la plaque entière même en cas d'utilisation partielle */
  plaqueMinimum: boolean;
  fiabilite: Fiabilite;
  source: string;
  commentaire?: string;
}

export const DATE_TARIF = "2026-07-17";
const SOURCE_FOURNISSEUR = "Tarif fournisseur matériaux (17/07/2026)";

export const plaques: PlaqueMatiere[] = [
  {
    matiere: "PVC Expansé Blanc",
    epaisseurMm: 10,
    formatMm: { longueur: 3050, largeur: 1220 },
    surfaceM2: 3.721,
    prixHtM2: 28.5,
    prixHtPlaque: { min: 105.85, max: 105.85 },
    plaqueMinimum: false,
    fiabilite: "confirme",
    source: SOURCE_FOURNISSEUR,
  },
  {
    matiere: "PVC Expansé Blanc",
    epaisseurMm: 10,
    formatMm: { longueur: 3050, largeur: 2050 },
    surfaceM2: 6.2525,
    prixHtM2: 28.55,
    prixHtPlaque: { min: 178.35, max: 178.35 },
    plaqueMinimum: false,
    fiabilite: "confirme",
    source: SOURCE_FOURNISSEUR,
  },
  {
    matiere: "PVC Expansé Blanc",
    epaisseurMm: 19,
    formatMm: { longueur: 3050, largeur: 1560 },
    surfaceM2: 4.758,
    prixHtM2: 61.6,
    prixHtPlaque: { min: 293, max: 293 },
    plaqueMinimum: false,
    fiabilite: "confirme",
    source: SOURCE_FOURNISSEUR,
  },
  {
    matiere: "PMMA Couleur",
    epaisseurMm: 5,
    formatMm: { longueur: 3050, largeur: 2030 },
    surfaceM2: 6.1915,
    prixHtM2: 56.9,
    prixHtPlaque: { min: 352.35, max: 352.35 },
    plaqueMinimum: true,
    fiabilite: "confirme",
    source: SOURCE_FOURNISSEUR,
  },
  {
    matiere: "PMMA Miroir Argent",
    epaisseurMm: 3,
    formatMm: { longueur: 3050, largeur: 2050 },
    surfaceM2: 6.2525,
    prixHtM2: 49.66,
    prixHtPlaque: { min: 310.3, max: 310.3 },
    plaqueMinimum: true,
    fiabilite: "confirme",
    source: SOURCE_FOURNISSEUR,
  },
  {
    matiere: "PMMA Miroir Or",
    epaisseurMm: 3,
    formatMm: { longueur: 3050, largeur: 2050 },
    surfaceM2: 6.2525,
    prixHtM2: 66.34,
    prixHtPlaque: { min: 414.7, max: 414.7 },
    plaqueMinimum: true,
    fiabilite: "confirme",
    source: SOURCE_FOURNISSEUR,
  },
  {
    matiere: "Dibond",
    epaisseurMm: 3,
    formatMm: { longueur: 3050, largeur: 2050 },
    surfaceM2: 6.2525,
    prixHtM2: null,
    prixHtPlaque: { min: 124, max: 215 },
    plaqueMinimum: true,
    fiabilite: "estime",
    source: SOURCE_FOURNISSEUR,
    commentaire: "Prix selon couleur, finition et format — à préciser par référence",
  },
  {
    matiere: "Dibond",
    epaisseurMm: 3,
    formatMm: { longueur: 3050, largeur: 1500 },
    surfaceM2: 4.575,
    prixHtM2: null,
    prixHtPlaque: { min: 124, max: 215 },
    plaqueMinimum: true,
    fiabilite: "estime",
    source: SOURCE_FOURNISSEUR,
    commentaire: "Prix selon couleur, finition et format — à préciser par référence",
  },
  {
    matiere: "Dibond",
    epaisseurMm: 3,
    formatMm: { longueur: 2500, largeur: 1250 },
    surfaceM2: 3.125,
    prixHtM2: null,
    prixHtPlaque: { min: 124, max: 215 },
    plaqueMinimum: true,
    fiabilite: "estime",
    source: SOURCE_FOURNISSEUR,
    commentaire: "Prix selon couleur, finition et format — à préciser par référence",
  },
];

/** Découpe CNC facturée au m² HT selon la complexité du tracé */
export const cncPrixM2Ht = {
  simple: 35,
  medium: 55,
  complexe: 75,
} as const;

export type ComplexiteCnc = keyof typeof cncPrixM2Ht;

/** Taux horaire HT de main d'œuvre de réalisation */
export const mainOeuvreHtHeure = 35;

/**
 * Peinture en bombe (aérosol ~400 ml).
 *
 * Rendement théorique fabricant : ~2 m² en une couche fine.
 * En pratique sur panneau (finition opaque, 2 couches) : ~1 m² par bombe,
 * moins sur support poreux non apprêté (~0,7 m²), plus en voile léger (~1,5 m²).
 * Fiabilité "estime" tant qu'un test atelier n'a pas mesuré le rendement réel.
 */
export const peintureBombe = {
  prixHtBombe: 5,
  rendementM2ParBombe: { min: 0.7, defaut: 1, max: 1.5 },
  couchesParDefaut: 2,
  fiabilite: "estime" as Fiabilite,
  source: "Prix d'achat interne (~5 €/bombe) ; rendement standard aérosol à valider en atelier",
};

/** Nombre de bombes nécessaires pour peindre une surface (arrondi à la bombe entière) */
export function bombesNecessaires(
  surfaceM2: number,
  rendementM2ParBombe: number = peintureBombe.rendementM2ParBombe.defaut
): number {
  if (surfaceM2 <= 0) return 0;
  return Math.ceil(surfaceM2 / rendementM2ParBombe);
}

/** Coût peinture HT pour une surface donnée */
export function coutPeintureHt(
  surfaceM2: number,
  rendementM2ParBombe?: number
): number {
  return bombesNecessaires(surfaceM2, rendementM2ParBombe) * peintureBombe.prixHtBombe;
}

/**
 * Nombre de plaques à acheter pour couvrir une surface utile,
 * en appliquant un taux de chute (15 % par défaut, à ajuster par l'atelier).
 */
export function plaquesNecessaires(
  surfaceUtileM2: number,
  plaque: PlaqueMatiere,
  tauxChute = 0.15
): number {
  if (surfaceUtileM2 <= 0) return 0;
  return Math.ceil((surfaceUtileM2 * (1 + tauxChute)) / plaque.surfaceM2);
}

/**
 * Coût matière HT pour une surface utile.
 * Si la matière est facturée "plaque minimum", on facture des plaques entières ;
 * sinon on facture au m² consommé (chute incluse).
 * Retourne une fourchette (min/max identiques quand le prix est fixe).
 */
export function coutMatiereHt(
  surfaceUtileM2: number,
  plaque: PlaqueMatiere,
  tauxChute = 0.15
): { min: number; max: number; nbPlaques: number } {
  const nbPlaques = plaquesNecessaires(surfaceUtileM2, plaque, tauxChute);
  if (plaque.plaqueMinimum || plaque.prixHtM2 === null) {
    return {
      min: nbPlaques * plaque.prixHtPlaque.min,
      max: nbPlaques * plaque.prixHtPlaque.max,
      nbPlaques,
    };
  }
  const cout = surfaceUtileM2 * (1 + tauxChute) * plaque.prixHtM2;
  return { min: cout, max: cout, nbPlaques };
}
