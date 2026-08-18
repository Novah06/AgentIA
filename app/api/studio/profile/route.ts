import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import { getProfile, saveProfile } from '@/lib/studio/store';
import {
  BUSINESS_QUESTIONS,
  SETTINGS_DEFAUT,
  type ProfileSettings,
} from '@/lib/studio/profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REPONSE_CHARS = 4000;

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
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function sanitizeSettings(raw: any): ProfileSettings {
  return {
    coefficientDefaut: Math.max(0, num(raw?.coefficientDefaut, SETTINGS_DEFAUT.coefficientDefaut)),
    coefficientMainOeuvre: numOrNull(raw?.coefficientMainOeuvre),
    tauxHoraireAtelier: Math.max(0, num(raw?.tauxHoraireAtelier, SETTINGS_DEFAUT.tauxHoraireAtelier)),
    tauxHoraireMontage: Math.max(0, num(raw?.tauxHoraireMontage, SETTINGS_DEFAUT.tauxHoraireMontage)),
    majorationNuitPct: numOrNull(raw?.majorationNuitPct),
    tauxChutePct: Math.max(0, num(raw?.tauxChutePct, SETTINGS_DEFAUT.tauxChutePct)),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  try {
    const profile = await getProfile(ownerId);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[studio/profile] GET:', err);
    return NextResponse.json({ error: 'Lecture du profil impossible' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  // Seules les clés de questions connues sont conservées : le profil est
  // injecté dans le prompt, on ne laisse pas y entrer de champ arbitraire.
  const reponses: Record<string, string> = {};
  const raw = (body.reponses ?? {}) as Record<string, unknown>;
  for (const q of BUSINESS_QUESTIONS) {
    const value = raw[q.key];
    if (typeof value === 'string' && value.trim()) {
      reponses[q.key] = value.trim().slice(0, MAX_REPONSE_CHARS);
    }
  }

  const companyName =
    typeof body.companyName === 'string' && body.companyName.trim()
      ? body.companyName.trim().slice(0, 200)
      : null;

  try {
    const profile = await saveProfile(ownerId, {
      companyName,
      settings: sanitizeSettings(body.settings),
      reponses,
    });
    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[studio/profile] PUT:', err);
    return NextResponse.json({ error: 'Enregistrement du profil impossible' }, { status: 500 });
  }
}
