import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropic, hasAnthropicConfigured } from '@/lib/anthropic/client';
import {
  cncPrixM2Ht,
  mainOeuvreHtHeure,
  peintureBombe,
  plaques,
  DATE_TARIF,
} from '@/lib/pricing/materials';
import type {
  AnalysisResult,
  StudioDocument,
  StudioProject,
  StudioSource,
} from './types';
import { SOURCE_CATEGORY_LABELS } from './types';

export const ANALYSIS_MODEL = 'claude-opus-4-8';

/** Budget total (base64 compris) pour les pièces jointes d'une requête. */
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
/** Volume max de texte injecté depuis les ressources IA. */
const MAX_SOURCES_CHARS = 80_000;

export { hasAnthropicConfigured };

/* ------------------------------------------------------------------ */
/* Bibliothèque de prix sérialisée pour le prompt                      */

function pricingLibraryText(): string {
  const lignes: string[] = [
    `Tarifs fournisseur matériaux (mis à jour le ${DATE_TARIF}) :`,
  ];
  for (const p of plaques) {
    const prix =
      p.prixHtM2 !== null
        ? `${p.prixHtM2} €HT/m² — ${p.prixHtPlaque.min} €HT/plaque`
        : `${p.prixHtPlaque.min} à ${p.prixHtPlaque.max} €HT/plaque (selon finition)`;
    lignes.push(
      `- ${p.matiere} ${p.epaisseurMm} mm, plaque ${p.formatMm.longueur}x${p.formatMm.largeur} mm (${p.surfaceM2} m²) : ${prix}${p.plaqueMinimum ? ' [facturation plaque entière minimum]' : ''}${p.commentaire ? ` — ${p.commentaire}` : ''}`
    );
  }
  lignes.push(
    `Découpe CNC au m² HT : simple ${cncPrixM2Ht.simple} €, médium ${cncPrixM2Ht.medium} €, complexe ${cncPrixM2Ht.complexe} €.`,
    `Main d'œuvre de réalisation : ${mainOeuvreHtHeure} €HT/heure.`,
    `Peinture en bombe : ${peintureBombe.prixHtBombe} €HT/bombe, rendement ~${peintureBombe.rendementM2ParBombe.defaut} m²/bombe en ${peintureBombe.couchesParDefaut} couches (fourchette ${peintureBombe.rendementM2ParBombe.min}–${peintureBombe.rendementM2ParBombe.max}) — rendement estimé, à confirmer.`
  );
  return lignes.join('\n');
}

/* ------------------------------------------------------------------ */
/* Prompt système                                                      */

const SYSTEM_CORE = `Tu es l'assistant d'avant-chiffrage d'un fabricant de stands d'exposition et d'agencement sur mesure. À partir d'un brief client, de plans et de rendus 3D, tu prépares le travail du chargé d'affaires : tu n'établis pas un devis définitif, tu produis une première analyse structurée, traçable et vérifiable, que l'humain corrigera et validera.

Familles de prestations à utiliser : cloisons et structures ; réserves et portes ; menuiserie et éléments sur mesure ; comptoirs, podiums et présentoirs ; enseignes et signalétique ; impressions et habillages graphiques ; revêtements de sol ; plafonds et éléments suspendus ; éclairage et électricité ; audiovisuel et écrans ; mobilier et décoration ; transport et logistique ; manutention et levage ; montage, démontage et personnel ; nettoyage, stockage et réemploi.

Thèmes à vérifier pour les informations manquantes : dimensions ; finitions ; structure ; sécurité (classement feu, garde-corps…) ; électricité ; audiovisuel ; logistique (accès, quai, levage…) ; montage (horaires, nuit, badges) ; démontage ; exploitation ; budget ; réemploi.

Règles métier générales : hauteur > 3 m => vérifier les contraintes techniques et majorer le montage ; montage de nuit => majorer les taux horaires ; élément suspendu => prévoir accroche, levage et contrôle ; plusieurs réserves => vérifier portes, serrures, rayonnages ; impressions non définies => hypothèse basse et haute ; accès limité => majorer manutention et organiser les livraisons ; élément courbe => temps atelier supérieur à un élément droit équivalent.

Exigences de traçabilité :
- Chaque prestation et chaque ligne de préchiffrage indique sa source (cote lue sur le plan, mention du brief, déduction du rendu, estimation) et sa fiabilité : "confirme" (donnée présente dans les documents), "estime" (déduite ou supposée), "manquant" (à demander au client).
- Ne jamais inventer une dimension : si une cote n'est pas lisible, produis une hypothèse marquée "estime" et ajoute la question correspondante.
- Le préchiffrage est un COÛT DE REVIENT HT en fourchette (min/max), basé en priorité sur la bibliothèque de prix ci-dessous et sur les documents de référence de l'entreprise ; à défaut, sur des prix de marché français en signalant fiabilite "estime". Les heures (atelier, montage, démontage) sont estimées séparément et valorisées au taux horaire de la bibliothèque.
- Signale les incohérences entre brief, plans et rendus.
- Réponds intégralement en français.`;

function buildSystem(sources: StudioSource[]): string {
  const parts = [SYSTEM_CORE, '', '## Bibliothèque de prix de l\'entreprise', pricingLibraryText()];

  const usable = sources.filter((s) => s.extractedText && s.status === 'traite');
  if (usable.length > 0) {
    parts.push('', '## Documents de référence de l\'entreprise (extraits)');
    let budget = MAX_SOURCES_CHARS;
    for (const s of usable) {
      if (budget <= 0) break;
      const text = (s.extractedText ?? '').slice(0, Math.min(budget, 12_000));
      budget -= text.length;
      parts.push(`### [${SOURCE_CATEGORY_LABELS[s.category]}] ${s.fileName}`, text, '');
    }
  }
  return parts.join('\n');
}

/* ------------------------------------------------------------------ */
/* Schéma JSON de sortie                                               */

const FIABILITE = { type: 'string', enum: ['confirme', 'estime', 'manquant'] };

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['resume', 'prestations', 'questions', 'risques', 'prechiffrage', 'confianceGlobale'],
  properties: {
    resume: { type: 'string', description: 'Résumé clair du projet en quelques phrases' },
    prestations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['famille', 'designation', 'quantite', 'unite', 'source', 'fiabilite', 'commentaire'],
        properties: {
          famille: { type: 'string' },
          designation: { type: 'string' },
          quantite: { type: ['number', 'null'] },
          unite: { type: ['string', 'null'] },
          source: { type: 'string' },
          fiabilite: FIABILITE,
          commentaire: { type: ['string', 'null'] },
        },
      },
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['theme', 'question', 'urgence'],
        properties: {
          theme: { type: 'string' },
          question: { type: 'string' },
          urgence: { type: 'string', enum: ['haute', 'moyenne', 'basse'] },
        },
      },
    },
    risques: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['description', 'hypothese', 'niveau', 'action'],
        properties: {
          description: { type: 'string' },
          hypothese: { type: ['string', 'null'] },
          niveau: { type: 'string', enum: ['faible', 'moyen', 'eleve'] },
          action: { type: ['string', 'null'] },
        },
      },
    },
    prechiffrage: {
      type: 'object',
      additionalProperties: false,
      required: ['lignes', 'heures', 'totalHtMin', 'totalHtMax', 'commentaire'],
      properties: {
        lignes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['designation', 'quantite', 'unite', 'coutHtMin', 'coutHtMax', 'base', 'fiabilite'],
            properties: {
              designation: { type: 'string' },
              quantite: { type: ['number', 'null'] },
              unite: { type: ['string', 'null'] },
              coutHtMin: { type: 'number' },
              coutHtMax: { type: 'number' },
              base: { type: 'string', description: 'Base de calcul (prix utilisé, hypothèse)' },
              fiabilite: FIABILITE,
            },
          },
        },
        heures: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['poste', 'heuresMin', 'heuresMax'],
            properties: {
              poste: { type: 'string' },
              heuresMin: { type: 'number' },
              heuresMax: { type: 'number' },
            },
          },
        },
        totalHtMin: { type: 'number' },
        totalHtMax: { type: 'number' },
        commentaire: { type: ['string', 'null'] },
      },
    },
    confianceGlobale: {
      type: 'string',
      description: "Appréciation du niveau de confiance global et des limites de l'analyse",
    },
  },
} as const;

/* ------------------------------------------------------------------ */
/* Construction du contenu utilisateur (documents du projet)           */

type ContentBlock = Anthropic.Messages.ContentBlockParam;

function documentBlocks(
  docs: { doc: StudioDocument; data: Buffer }[]
): { blocks: ContentBlock[]; skipped: string[] } {
  const blocks: ContentBlock[] = [];
  const skipped: string[] = [];
  let budget = MAX_ATTACHMENT_BYTES;

  for (const { doc, data } of docs) {
    const b64Size = Math.ceil(data.length * 1.37);
    const type = doc.fileType;
    if (type === 'application/pdf') {
      if (b64Size > budget) {
        skipped.push(doc.fileName);
        continue;
      }
      budget -= b64Size;
      blocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: data.toString('base64'),
        },
      });
    } else if (type.startsWith('image/')) {
      if (b64Size > budget) {
        skipped.push(doc.fileName);
        continue;
      }
      budget -= b64Size;
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: type as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
          data: data.toString('base64'),
        },
      });
    } else {
      // Texte / Word / e-mail : injection en texte brut (best effort)
      const text = data.toString('utf-8').replace(/[^\S\n\r\t\x20-\x7E -￿]/g, ' ');
      blocks.push({
        type: 'text',
        text: `--- Document joint : ${doc.fileName} ---\n${text.slice(0, 100_000)}`,
      });
    }
  }
  return { blocks, skipped };
}

/* ------------------------------------------------------------------ */
/* Analyse d'un projet                                                 */

export async function runProjectAnalysis(
  project: StudioProject,
  docs: { doc: StudioDocument; data: Buffer }[],
  sources: StudioSource[]
): Promise<AnalysisResult> {
  const client = getAnthropic();
  const { blocks, skipped } = documentBlocks(docs);

  const meta = [
    `Nom du projet : ${project.name}`,
    project.clientName && `Client : ${project.clientName}`,
    project.salon && `Salon / événement : ${project.salon}`,
    project.city && `Ville / lieu : ${project.city}`,
    project.surfaceM2 && `Surface annoncée : ${project.surfaceM2} m²`,
  ]
    .filter(Boolean)
    .join('\n');

  const userBlocks: ContentBlock[] = [
    ...blocks,
    {
      type: 'text',
      text: [
        'Analyse ce dossier de stand / agencement.',
        '',
        meta,
        project.brief ? `\nBrief client :\n${project.brief}` : '\nAucun brief texte fourni.',
        skipped.length > 0
          ? `\nAttention : documents trop volumineux non transmis : ${skipped.join(', ')}.`
          : '',
        '\nProduis l\'analyse complète au format demandé : résumé, prestations probables, questions manquantes, risques, préchiffrage en fourchette (coût de revient HT) et heures.',
      ].join('\n'),
    },
  ];

  const stream = client.messages.stream({
    model: ANALYSIS_MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    system: buildSystem(sources),
    output_config: {
      format: {
        type: 'json_schema',
        schema: ANALYSIS_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [{ role: 'user', content: userBlocks }],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === 'refusal') {
    throw new Error("L'analyse a été refusée par le modèle. Vérifiez le contenu des documents.");
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === 'text'
  );
  if (!textBlock) {
    throw new Error("Le modèle n'a pas produit de résultat exploitable.");
  }
  return JSON.parse(textBlock.text) as AnalysisResult;
}

/* ------------------------------------------------------------------ */
/* Extraction d'une "fiche source" à l'upload d'une ressource          */

const SOURCE_SYSTEM = `Tu documentes des sources internes pour l'outil d'avant-chiffrage d'un fabricant de stands et d'agencement. À partir du document fourni, rédige en français une fiche d'extraction compacte et directement réutilisable par un moteur de chiffrage :
1. Nature du document (ancien devis, tarif fournisseur, plan, règle métier, facture…).
2. Toutes les données chiffrées utiles : prix (avec unité : €/m², €/plaque, €/h, forfait…), dimensions, quantités, temps, taux — sous forme de liste.
3. Enseignements ou règles métier qu'on peut en tirer.
4. Limites (données illisibles, dates de validité, incertitudes).
Sois exhaustif sur les prix et quantités, concis sur le reste. N'invente rien.`;

export async function extractSourceFiche(
  fileName: string,
  fileType: string,
  data: Buffer
): Promise<string> {
  const client = getAnthropic();
  let content: ContentBlock[];

  if (fileType === 'application/pdf') {
    content = [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: data.toString('base64') },
      },
      { type: 'text', text: `Rédige la fiche d'extraction de ce document : ${fileName}` },
    ];
  } else if (fileType.startsWith('image/')) {
    content = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: fileType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
          data: data.toString('base64'),
        },
      },
      { type: 'text', text: `Rédige la fiche d'extraction de ce document : ${fileName}` },
    ];
  } else {
    const text = data.toString('utf-8');
    content = [
      {
        type: 'text',
        text: `Rédige la fiche d'extraction de ce document : ${fileName}\n\n${text.slice(0, 150_000)}`,
      },
    ];
  }

  const stream = client.messages.stream({
    model: ANALYSIS_MODEL,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: SOURCE_SYSTEM,
    messages: [{ role: 'user', content }],
  });
  const response = await stream.finalMessage();

  if (response.stop_reason === 'refusal') {
    throw new Error('Extraction refusée par le modèle.');
  }
  const textBlock = response.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === 'text'
  );
  if (!textBlock) throw new Error('Aucun texte extrait.');
  return textBlock.text;
}
