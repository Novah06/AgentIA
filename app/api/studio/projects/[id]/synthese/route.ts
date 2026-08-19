import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import { getChiffrage, getLatestAnalysis, getProfile, getProject } from '@/lib/studio/store';
import { calculerTotaux, type StudioProject } from '@/lib/studio/types';
import type { StudioProfile } from '@/lib/studio/profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Synthèse imprimable du dossier.
 *
 * Rendue en HTML plutôt qu'en PDF binaire : la page s'ouvre dans un onglet
 * et déclenche l'impression, ce qui laisse au navigateur le choix de
 * « Enregistrer en PDF ». Cela évite d'embarquer un moteur de rendu PDF et
 * donne un document que l'on peut aussi relire à l'écran.
 */

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function eur(v: number): string {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
}

const FIABILITE_LABEL: Record<string, string> = {
  confirme: 'Confirmé',
  estime: 'Estimé',
  manquant: 'Manquant',
};

const NIVEAU_LABEL: Record<string, string> = {
  eleve: 'Élevé',
  moyen: 'Moyen',
  faible: 'Faible',
  haute: 'Haute',
  moyenne: 'Moyenne',
  basse: 'Basse',
};

function enTete(project: StudioProject, profile: StudioProfile): string {
  const meta = [
    project.clientName && `Client : ${esc(project.clientName)}`,
    project.salon && `Salon : ${esc(project.salon)}`,
    project.city && `Lieu : ${esc(project.city)}`,
    project.surfaceM2 && `Surface : ${project.surfaceM2} m²`,
  ]
    .filter(Boolean)
    .join(' · ');

  return `
    <header>
      <div class="marque">
        <span class="pastille"></span>
        <span>${profile.companyName ? esc(profile.companyName) : 'Metria'}</span>
      </div>
      <h1>${esc(project.name)}</h1>
      ${meta ? `<p class="meta">${meta}</p>` : ''}
      <p class="meta">Synthèse éditée le ${new Date().toLocaleDateString('fr-FR')}</p>
    </header>`;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const project = await getProject(ownerId, params.id);
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  const [analysis, chiffrage, profile] = await Promise.all([
    getLatestAnalysis(project.id),
    getChiffrage(project.id),
    getProfile(ownerId),
  ]);

  const r = analysis?.result;
  if (!r && !chiffrage) {
    return NextResponse.json(
      { error: "Rien à imprimer : lancez l'analyse ou créez le chiffrage d'abord." },
      { status: 400 }
    );
  }

  const sections: string[] = [enTete(project, profile)];

  if (r?.resume) {
    sections.push(`
      <section>
        <h2>Résumé du projet</h2>
        <p>${esc(r.resume)}</p>
      </section>`);
  }

  if (r?.prestations?.length) {
    sections.push(`
      <section>
        <h2>Prestations relevées</h2>
        <table>
          <thead><tr><th>Famille</th><th>Désignation</th><th>Qté</th><th>Source</th><th>Fiabilité</th></tr></thead>
          <tbody>
            ${r.prestations
              .map(
                (p) => `<tr>
                  <td>${esc(p.famille)}</td>
                  <td>${esc(p.designation)}${p.commentaire ? `<br><span class="note">${esc(p.commentaire)}</span>` : ''}</td>
                  <td class="num">${p.quantite !== null ? `${p.quantite} ${esc(p.unite ?? '')}` : '—'}</td>
                  <td class="note">${esc(p.source)}</td>
                  <td>${esc(FIABILITE_LABEL[p.fiabilite] ?? p.fiabilite)}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </section>`);
  }

  if (r?.questions?.length) {
    sections.push(`
      <section>
        <h2>Questions à poser au client (${r.questions.length})</h2>
        <ul>
          ${r.questions
            .map(
              (q) =>
                `<li><strong>${esc(q.theme)}</strong> — ${esc(q.question)} <span class="note">(${esc(NIVEAU_LABEL[q.urgence] ?? q.urgence)})</span></li>`
            )
            .join('')}
        </ul>
      </section>`);
  }

  if (r?.risques?.length) {
    sections.push(`
      <section>
        <h2>Risques et hypothèses</h2>
        <ul>
          ${r.risques
            .map(
              (x) =>
                `<li><strong>${esc(NIVEAU_LABEL[x.niveau] ?? x.niveau)}</strong> — ${esc(x.description)}${
                  x.hypothese ? `<br><span class="note">Hypothèse : ${esc(x.hypothese)}</span>` : ''
                }${x.action ? `<br><span class="note">Action : ${esc(x.action)}</span>` : ''}</li>`
            )
            .join('')}
        </ul>
      </section>`);
  }

  if (chiffrage) {
    const t = calculerTotaux(chiffrage);
    sections.push(`
      <section>
        <h2>Chiffrage</h2>
        <table>
          <thead><tr><th>Désignation</th><th>Qté</th><th>Coût HT</th><th>Coef.</th><th>PV HT</th><th>Vérifiée</th></tr></thead>
          <tbody>
            ${chiffrage.lignes
              .map(
                (l) => `<tr>
                  <td>${esc(l.designation)}<br><span class="note">${esc(l.base)}</span></td>
                  <td class="num">${l.quantite !== null ? `${l.quantite} ${esc(l.unite ?? '')}` : '—'}</td>
                  <td class="num">${eur(l.coutHtMin)} – ${eur(l.coutHtMax)}</td>
                  <td class="num">${l.coefficient}</td>
                  <td class="num">${eur(l.coutHtMin * l.coefficient)} – ${eur(l.coutHtMax * l.coefficient)}</td>
                  <td>${l.valide ? 'oui' : '<span class="alerte">à vérifier</span>'}</td>
                </tr>`
              )
              .join('')}
            ${chiffrage.heures
              .map(
                (h) => `<tr>
                  <td>${esc(h.poste)}<br><span class="note">main d'œuvre — ${h.tauxHoraireHt} €/h</span></td>
                  <td class="num">${h.heuresMin}–${h.heuresMax} h</td>
                  <td class="num">${eur(h.heuresMin * h.tauxHoraireHt)} – ${eur(h.heuresMax * h.tauxHoraireHt)}</td>
                  <td class="num">${h.coefficient}</td>
                  <td class="num">${eur(h.heuresMin * h.tauxHoraireHt * h.coefficient)} – ${eur(h.heuresMax * h.tauxHoraireHt * h.coefficient)}</td>
                  <td>${h.valide ? 'oui' : '<span class="alerte">à vérifier</span>'}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>

        <table class="totaux">
          <tbody>
            <tr><th>Coût de revient HT</th><td class="num">${eur(t.coutTotalMin)} – ${eur(t.coutTotalMax)}</td></tr>
            <tr><th>Prix de vente HT</th><td class="num">${eur(t.venteMin)} – ${eur(t.venteMax)}</td></tr>
            <tr><th>Marge</th><td class="num">${eur(t.margeMin)} – ${eur(t.margeMax)} (${t.tauxMargeMin.toFixed(1)} – ${t.tauxMargeMax.toFixed(1)} % du PV)</td></tr>
          </tbody>
        </table>
        ${
          t.lignesAValider > 0
            ? `<p class="alerte">${t.lignesAValider} ligne(s) proposée(s) par l'IA n'ont pas encore été vérifiées par un humain.</p>`
            : ''
        }
      </section>`);
  }

  if (r?.confianceGlobale) {
    sections.push(`
      <section>
        <h2>Niveau de confiance</h2>
        <p>${esc(r.confianceGlobale)}</p>
      </section>`);
  }

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${esc(project.name)} — synthèse</title>
<style>
  @page { margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0a0a0a;
         font-size: 11px; line-height: 1.5; margin: 0; padding: 24px; max-width: 900px; }
  header { border-bottom: 2px solid #0a0a0a; padding-bottom: 12px; margin-bottom: 20px; }
  .marque { display: flex; align-items: center; gap: 7px; font-weight: 600; font-size: 13px;
            letter-spacing: .04em; margin-bottom: 10px; }
  .pastille { width: 10px; height: 10px; border-radius: 3px; background: #e39a2e; display: inline-block; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #6b6b6b;
       border-bottom: 1px solid #e6e3dd; padding-bottom: 4px; margin: 0 0 8px; }
  section { margin-bottom: 20px; page-break-inside: avoid; }
  p { margin: 0 0 6px; }
  ul { margin: 0; padding-left: 18px; }
  li { margin-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #e6e3dd; vertical-align: top; }
  thead th { background: #f7f6f3; font-size: 10px; text-transform: uppercase;
             letter-spacing: .04em; color: #6b6b6b; }
  .num { text-align: right; white-space: nowrap; }
  .note { color: #6b6b6b; font-size: 10px; }
  .alerte { color: #b45309; font-weight: 600; }
  .totaux { width: auto; margin-left: auto; }
  .totaux th { background: none; text-transform: none; letter-spacing: 0; font-size: 11px; color: #0a0a0a; }
  .totaux tr:last-child th, .totaux tr:last-child td { font-weight: 700; }
  footer { margin-top: 24px; border-top: 1px solid #e6e3dd; padding-top: 8px;
           color: #6b6b6b; font-size: 10px; }
  .barre { position: sticky; top: 0; background: #f7f6f3; border: 1px solid #e6e3dd;
           border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; display: flex;
           align-items: center; justify-content: space-between; gap: 12px; }
  .barre button { font: inherit; font-weight: 600; background: #0a0a0a; color: #fff;
                  border: 0; border-radius: 6px; padding: 7px 14px; cursor: pointer; }
  @media print { .barre { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="barre">
    <span>Utilisez « Enregistrer au format PDF » dans la fenêtre d'impression.</span>
    <button type="button" onclick="window.print()">Imprimer / PDF</button>
  </div>
  ${sections.join('\n')}
  <footer>
    Document préparé avec l'assistance de Metria à partir des éléments fournis.
    Les quantités, prix et durées sont des estimations à vérifier ; ce document ne
    constitue ni un devis ni un engagement contractuel.
  </footer>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
