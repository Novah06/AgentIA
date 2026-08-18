import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import { getChiffrage, getLatestAnalysis, getProject, saveChiffrage } from '@/lib/studio/store';
import { mainOeuvreHtHeure } from '@/lib/pricing/materials';
import type { ChiffrageItem, HeureItem, StudioChiffrage } from '@/lib/studio/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COEFFICIENT_DEFAUT = 2.5;

/** Nettoie une valeur numérique venue du client (virgule décimale acceptée). */
function num(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = num(value, NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function sanitizeLigne(raw: any, coefDefaut: number): ChiffrageItem {
  const min = num(raw?.coutHtMin, 0);
  const max = num(raw?.coutHtMax, min);
  return {
    id: str(raw?.id) || randomUUID(),
    famille: str(raw?.famille, 'Autre'),
    designation: str(raw?.designation, 'Ligne sans désignation'),
    quantite: numOrNull(raw?.quantite),
    unite: raw?.unite ? str(raw.unite) : null,
    coutHtMin: Math.max(0, min),
    // Une fourchette inversée fausserait tous les totaux : on la remet d'aplomb.
    coutHtMax: Math.max(0, Math.max(min, max)),
    base: str(raw?.base),
    fiabilite:
      raw?.fiabilite === 'confirme' || raw?.fiabilite === 'manquant' ? raw.fiabilite : 'estime',
    coefficient: Math.max(0, num(raw?.coefficient, coefDefaut)),
    valide: raw?.valide === true,
    origine: raw?.origine === 'humain' ? 'humain' : 'ia',
  };
}

function sanitizeHeure(raw: any, tauxDefaut: number, coefDefaut: number): HeureItem {
  const min = num(raw?.heuresMin, 0);
  const max = num(raw?.heuresMax, min);
  return {
    id: str(raw?.id) || randomUUID(),
    poste: str(raw?.poste, 'Poste'),
    heuresMin: Math.max(0, min),
    heuresMax: Math.max(0, Math.max(min, max)),
    tauxHoraireHt: Math.max(0, num(raw?.tauxHoraireHt, tauxDefaut)),
    coefficient: Math.max(0, num(raw?.coefficient, coefDefaut)),
    valide: raw?.valide === true,
    origine: raw?.origine === 'humain' ? 'humain' : 'ia',
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Construit le chiffrage de travail initial à partir de la dernière analyse.
 * Les lignes restent marquées 'ia' et non validées tant qu'un humain ne les
 * a pas relues — c'est la règle de traçabilité du plan d'action.
 */
async function seedFromAnalysis(projectId: string): Promise<StudioChiffrage | null> {
  const analysis = await getLatestAnalysis(projectId);
  const prechiffrage = analysis?.result?.prechiffrage;
  if (!prechiffrage) return null;

  const prestations = analysis?.result?.prestations ?? [];
  const familleFor = (designation: string) =>
    prestations.find(
      (p) =>
        p.designation.toLowerCase().includes(designation.toLowerCase()) ||
        designation.toLowerCase().includes(p.designation.toLowerCase())
    )?.famille ?? 'Autre';

  const lignes: ChiffrageItem[] = prechiffrage.lignes.map((l) => ({
    id: randomUUID(),
    famille: familleFor(l.designation),
    designation: l.designation,
    quantite: l.quantite,
    unite: l.unite,
    coutHtMin: Math.max(0, l.coutHtMin),
    coutHtMax: Math.max(0, Math.max(l.coutHtMin, l.coutHtMax)),
    base: l.base,
    fiabilite: l.fiabilite,
    coefficient: COEFFICIENT_DEFAUT,
    valide: false,
    origine: 'ia',
  }));

  const heures: HeureItem[] = prechiffrage.heures.map((h) => ({
    id: randomUUID(),
    poste: h.poste,
    heuresMin: Math.max(0, h.heuresMin),
    heuresMax: Math.max(0, Math.max(h.heuresMin, h.heuresMax)),
    tauxHoraireHt: mainOeuvreHtHeure,
    coefficient: COEFFICIENT_DEFAUT,
    valide: false,
    origine: 'ia',
  }));

  return saveChiffrage(projectId, {
    lignes,
    heures,
    coefficientDefaut: COEFFICIENT_DEFAUT,
    tauxHoraireDefaut: mainOeuvreHtHeure,
    commentaire: prechiffrage.commentaire,
  });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const project = await getProject(ownerId, params.id);
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  try {
    const chiffrage = await getChiffrage(project.id);
    return NextResponse.json({ chiffrage });
  } catch (err) {
    console.error('[studio/chiffrage] GET:', err);
    return NextResponse.json({ error: 'Lecture du chiffrage impossible' }, { status: 500 });
  }
}

/** Crée le chiffrage de travail depuis la dernière analyse. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const project = await getProject(ownerId, params.id);
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  try {
    const chiffrage = await seedFromAnalysis(project.id);
    if (!chiffrage) {
      return NextResponse.json(
        { error: "Lancez d'abord l'analyse IA jusqu'à l'étape du préchiffrage." },
        { status: 400 }
      );
    }
    return NextResponse.json({ chiffrage }, { status: 201 });
  } catch (err) {
    console.error('[studio/chiffrage] POST:', err);
    return NextResponse.json({ error: 'Création du chiffrage impossible' }, { status: 500 });
  }
}

/** Enregistre les corrections du chargé d'affaires. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const project = await getProject(ownerId, params.id);
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const coefficientDefaut = Math.max(0, num(body.coefficientDefaut, COEFFICIENT_DEFAUT));
  const tauxHoraireDefaut = Math.max(0, num(body.tauxHoraireDefaut, mainOeuvreHtHeure));
  const lignesRaw = Array.isArray(body.lignes) ? body.lignes : [];
  const heuresRaw = Array.isArray(body.heures) ? body.heures : [];

  if (lignesRaw.length > 500 || heuresRaw.length > 100) {
    return NextResponse.json({ error: 'Chiffrage trop volumineux' }, { status: 413 });
  }

  try {
    const chiffrage = await saveChiffrage(project.id, {
      lignes: lignesRaw.map((l) => sanitizeLigne(l, coefficientDefaut)),
      heures: heuresRaw.map((h) => sanitizeHeure(h, tauxHoraireDefaut, coefficientDefaut)),
      coefficientDefaut,
      tauxHoraireDefaut,
      commentaire: typeof body.commentaire === 'string' ? body.commentaire : null,
    });
    return NextResponse.json({ chiffrage });
  } catch (err) {
    console.error('[studio/chiffrage] PUT:', err);
    return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 });
  }
}
