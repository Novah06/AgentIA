import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

interface ContactPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  employees?: string;
  secteur?: string;
  agents?: string[];
  message?: string;
}

const SECTEUR_LABELS: Record<string, string> = {
  btp: 'BTP / Construction',
  commerce: 'Commerce / Distribution',
  services: 'Services / Conseil',
  tech: 'Tech / SaaS / Start-up',
  industrie: 'Industrie / Logistique',
  sante: 'Santé / Médico-social',
  immobilier: 'Immobilier',
  expertise: 'Expertise comptable / Juridique',
  autre: 'Autre',
};

export async function POST(req: Request) {
  let body: ContactPayload;
  try {
    body = (await req.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const required: (keyof ContactPayload)[] = ['firstName', 'lastName', 'email', 'company'];
  for (const k of required) {
    if (!body[k] || String(body[k]).trim().length === 0) {
      return NextResponse.json({ error: `Champ "${k}" requis` }, { status: 400 });
    }
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(body.email))) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }

  const recipient = process.env.CONTACT_EMAIL || 'contact@operis-ai.fr';
  const apiKey = process.env.RESEND_API_KEY;

  const subject = `[OperisAI] Nouvelle demande — ${body.company}`;
  const text = renderEmail(body);

  if (!apiKey) {
    console.warn('[contact] RESEND_API_KEY non configurée — message logué seulement');
    console.info(text);
    return NextResponse.json({ ok: true, dev: true });
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'OperisAI <noreply@operis-ai.fr>',
      to: recipient,
      replyTo: body.email,
      subject,
      text,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur envoi' },
      { status: 500 },
    );
  }
}

function renderEmail(p: ContactPayload): string {
  return [
    'Nouvelle demande de contact — OperisAI Workforce',
    '',
    `Nom : ${p.firstName} ${p.lastName}`,
    `Email : ${p.email}`,
    `Téléphone : ${p.phone || '—'}`,
    `Entreprise : ${p.company}`,
    `Effectif : ${p.employees || '—'}`,
    `Secteur : ${(p.secteur && SECTEUR_LABELS[p.secteur]) || p.secteur || '—'}`,
    `Agents : ${(p.agents || []).join(', ') || '—'}`,
    '',
    'Message :',
    p.message || '—',
  ].join('\n');
}
