import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import { getChiffrage, getLatestAnalysis, getProject } from '@/lib/studio/store';
import { calculerTotaux, type StudioProject } from '@/lib/studio/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EUR = '#,##0 "€"';
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0A0A0A' },
};

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: 'middle' };
  row.height = 20;
}

function safeFileName(project: StudioProject) {
  const base = `Metria - ${project.name}`.replace(/[^a-zA-Z0-9 À-ÿ._-]+/g, ' ').trim();
  return `${base.slice(0, 80) || 'chiffrage'}.xlsx`;
}

/**
 * Export du dossier en classeur Excel modifiable :
 *   1. Chiffrage  — lignes, coûts, coefficients, prix de vente, totaux
 *   2. Heures     — postes, temps, taux, valorisation
 *   3. Questions  — questions manquantes et risques à lever
 *   4. Synthèse   — résumé du projet et prestations relevées
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const project = await getProject(ownerId, params.id);
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  const [chiffrage, analysis] = await Promise.all([
    getChiffrage(project.id),
    getLatestAnalysis(project.id),
  ]);

  if (!chiffrage && !analysis?.result) {
    return NextResponse.json(
      { error: "Rien à exporter : lancez l'analyse ou créez le chiffrage d'abord." },
      { status: 400 }
    );
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Metria';
  wb.created = new Date();

  /* --- Feuille 1 : chiffrage ------------------------------------- */
  if (chiffrage) {
    const totaux = calculerTotaux(chiffrage);
    const ws = wb.addWorksheet('Chiffrage');
    ws.columns = [
      { header: 'Famille', key: 'famille', width: 26 },
      { header: 'Désignation', key: 'designation', width: 42 },
      { header: 'Qté', key: 'quantite', width: 9 },
      { header: 'Unité', key: 'unite', width: 9 },
      { header: 'Coût HT min', key: 'coutMin', width: 13, style: { numFmt: EUR } },
      { header: 'Coût HT max', key: 'coutMax', width: 13, style: { numFmt: EUR } },
      { header: 'Coef.', key: 'coefficient', width: 8 },
      { header: 'PV HT min', key: 'pvMin', width: 13, style: { numFmt: EUR } },
      { header: 'PV HT max', key: 'pvMax', width: 13, style: { numFmt: EUR } },
      { header: 'Fiabilité', key: 'fiabilite', width: 11 },
      { header: 'Validée', key: 'valide', width: 9 },
      { header: 'Base de calcul', key: 'base', width: 46 },
    ];
    styleHeader(ws.getRow(1));

    for (const l of chiffrage.lignes) {
      const row = ws.addRow({
        famille: l.famille,
        designation: l.designation,
        quantite: l.quantite,
        unite: l.unite,
        coutMin: l.coutHtMin,
        coutMax: l.coutHtMax,
        coefficient: l.coefficient,
        pvMin: l.coutHtMin * l.coefficient,
        pvMax: l.coutHtMax * l.coefficient,
        fiabilite: l.fiabilite,
        valide: l.valide ? 'oui' : 'à vérifier',
        base: l.base,
      });
      if (!l.valide) row.getCell('valide').font = { color: { argb: 'FFB45309' }, bold: true };
    }

    ws.addRow({});
    const moRow = ws.addRow({
      designation: "Main d'œuvre (voir feuille Heures)",
      coutMin: totaux.coutMoMin,
      coutMax: totaux.coutMoMax,
      pvMin: totaux.venteMin - chiffrage.lignes.reduce((s, l) => s + l.coutHtMin * l.coefficient, 0),
      pvMax: totaux.venteMax - chiffrage.lignes.reduce((s, l) => s + l.coutHtMax * l.coefficient, 0),
    });
    moRow.font = { italic: true };

    const totalRow = ws.addRow({
      designation: 'TOTAL',
      coutMin: totaux.coutTotalMin,
      coutMax: totaux.coutTotalMax,
      pvMin: totaux.venteMin,
      pvMax: totaux.venteMax,
    });
    totalRow.font = { bold: true };
    totalRow.border = { top: { style: 'thin' } };

    const margeRow = ws.addRow({
      designation: 'Marge dégagée',
      coutMin: totaux.margeMin,
      coutMax: totaux.margeMax,
      pvMin: totaux.tauxMargeMin / 100,
      pvMax: totaux.tauxMargeMax / 100,
    });
    margeRow.font = { bold: true };
    margeRow.getCell('pvMin').numFmt = '0.0%';
    margeRow.getCell('pvMax').numFmt = '0.0%';

    ws.addRow({});
    ws.addRow({ designation: `Lignes restant à vérifier : ${totaux.lignesAValider}` });
    if (chiffrage.commentaire) ws.addRow({ designation: chiffrage.commentaire });
    ws.addRow({
      designation:
        "Estimation préparée par IA et corrigée par l'équipe — à valider avant tout engagement.",
    });

    /* --- Feuille 2 : heures --------------------------------------- */
    const wsH = wb.addWorksheet('Heures');
    wsH.columns = [
      { header: 'Poste', key: 'poste', width: 30 },
      { header: 'Heures min', key: 'hMin', width: 12 },
      { header: 'Heures max', key: 'hMax', width: 12 },
      { header: 'Taux HT/h', key: 'taux', width: 12, style: { numFmt: EUR } },
      { header: 'Coût min', key: 'cMin', width: 13, style: { numFmt: EUR } },
      { header: 'Coût max', key: 'cMax', width: 13, style: { numFmt: EUR } },
      { header: 'Coef.', key: 'coef', width: 8 },
      { header: 'Validée', key: 'valide', width: 11 },
    ];
    styleHeader(wsH.getRow(1));
    for (const h of chiffrage.heures) {
      wsH.addRow({
        poste: h.poste,
        hMin: h.heuresMin,
        hMax: h.heuresMax,
        taux: h.tauxHoraireHt,
        cMin: h.heuresMin * h.tauxHoraireHt,
        cMax: h.heuresMax * h.tauxHoraireHt,
        coef: h.coefficient,
        valide: h.valide ? 'oui' : 'à vérifier',
      });
    }
    const totalH = wsH.addRow({
      poste: 'TOTAL',
      cMin: totaux.coutMoMin,
      cMax: totaux.coutMoMax,
    });
    totalH.font = { bold: true };
  }

  /* --- Feuille 3 : questions et risques --------------------------- */
  const result = analysis?.result;
  if (result?.questions?.length || result?.risques?.length) {
    const wsQ = wb.addWorksheet('Questions & risques');
    wsQ.columns = [
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Thème / niveau', key: 'theme', width: 18 },
      { header: 'Libellé', key: 'libelle', width: 70 },
      { header: 'Hypothèse retenue', key: 'hypothese', width: 40 },
      { header: 'Action', key: 'action', width: 40 },
    ];
    styleHeader(wsQ.getRow(1));
    for (const q of result.questions ?? []) {
      wsQ.addRow({ type: 'Question', theme: q.theme, libelle: q.question, action: q.urgence });
    }
    for (const r of result.risques ?? []) {
      wsQ.addRow({
        type: 'Risque',
        theme: r.niveau,
        libelle: r.description,
        hypothese: r.hypothese ?? '',
        action: r.action ?? '',
      });
    }
    wsQ.getColumn('libelle').alignment = { wrapText: true, vertical: 'top' };
  }

  /* --- Feuille 4 : synthèse --------------------------------------- */
  const wsS = wb.addWorksheet('Synthèse');
  wsS.columns = [
    { header: 'Élément', key: 'k', width: 24 },
    { header: 'Valeur', key: 'v', width: 90 },
  ];
  styleHeader(wsS.getRow(1));
  const meta: [string, string][] = [
    ['Projet', project.name],
    ['Client', project.clientName ?? '—'],
    ['Salon / événement', project.salon ?? '—'],
    ['Ville / lieu', project.city ?? '—'],
    ['Surface', project.surfaceM2 ? `${project.surfaceM2} m²` : '—'],
    ['Statut', project.status],
    ['Export du', new Date().toLocaleString('fr-FR')],
  ];
  if (result?.resume) meta.push(['Résumé', result.resume]);
  if (result?.confianceGlobale) meta.push(['Niveau de confiance', result.confianceGlobale]);
  for (const [k, v] of meta) wsS.addRow({ k, v });
  wsS.getColumn('v').alignment = { wrapText: true, vertical: 'top' };

  if (result?.prestations?.length) {
    wsS.addRow({});
    const head = wsS.addRow({ k: 'Prestations relevées', v: '' });
    head.font = { bold: true };
    for (const p of result.prestations) {
      wsS.addRow({
        k: p.famille,
        v: `${p.designation}${p.quantite !== null ? ` — ${p.quantite} ${p.unite ?? ''}` : ''} (${p.fiabilite}, source : ${p.source})`,
      });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName(project))}`,
      'Cache-Control': 'no-store',
    },
  });
}
