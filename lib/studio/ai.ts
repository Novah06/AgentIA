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
import { extractOfficeText } from './extract';

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

const PRESTATION_ITEM = {
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
};

/** Étape 1 — lecture du dossier : résumé + prestations probables. */
const SCHEMA_CONTEXTE = {
  type: 'object',
  additionalProperties: false,
  required: ['resume', 'prestations'],
  properties: {
    resume: {
      type: 'string',
      description: 'Résumé clair du projet, incohérences relevées comprises',
    },
    prestations: { type: 'array', items: PRESTATION_ITEM },
  },
} as const;

/** Étape 2 — questions manquantes et risques. */
const SCHEMA_QUESTIONS = {
  type: 'object',
  additionalProperties: false,
  required: ['questions', 'risques'],
  properties: {
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
  },
} as const;

/** Étape 3 — préchiffrage et heures. */
const SCHEMA_CHIFFRAGE = {
  type: 'object',
  additionalProperties: false,
  required: ['prechiffrage', 'confianceGlobale'],
  properties: {
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

async function documentBlocks(
  docs: { doc: StudioDocument; data: Buffer }[]
): Promise<{ blocks: ContentBlock[]; skipped: string[] }> {
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

function projectMeta(project: StudioProject): string {
  return [
    `Nom du projet : ${project.name}`,
    project.clientName && `Client : ${project.clientName}`,
    project.salon && `Salon / événement : ${project.salon}`,
    project.city && `Ville / lieu : ${project.city}`,
    project.surfaceM2 && `Surface annoncée : ${project.surfaceM2} m²`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Appel commun : sortie JSON conforme au schéma, erreurs traduites. */
async function askJson<T>(
  system: string,
  content: ContentBlock[],
  schema: Record<string, unknown>,
  maxTokens: number
): Promise<T> {
  const client = getAnthropic();
  const stream = client.messages.stream({
    model: ANALYSIS_MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema },
    },
    system,
    messages: [{ role: 'user', content }],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === 'refusal') {
    throw new Error("Le modèle a refusé de traiter ce dossier. Vérifiez le contenu des documents.");
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Le dossier est trop volumineux pour être traité en une fois.');
  }
  const textBlock = response.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === 'text'
  );
  if (!textBlock) throw new Error("Le modèle n'a pas produit de résultat exploitable.");
  return JSON.parse(textBlock.text) as T;
}

/**
 * Étape 1 — la seule qui transmet les documents (plans, rendus).
 * Produit le résumé du dossier et les prestations probables.
 */
export async function analyseContexte(
  project: StudioProject,
  docs: { doc: StudioDocument; data: Buffer }[],
  sources: StudioSource[]
): Promise<Pick<AnalysisResult, 'resume' | 'prestations'>> {
  const { blocks, skipped } = await documentBlocks(docs);

  const content: ContentBlock[] = [
    ...blocks,
    {
      type: 'text',
      text: [
        'Analyse ce dossier de stand / agencement.',
        '',
        projectMeta(project),
        project.brief ? `\nBrief client :\n${project.brief}` : '\nAucun brief texte fourni.',
        skipped.length > 0
          ? `\nAttention : documents trop volumineux non transmis : ${skipped.join(', ')}.`
          : '',
        "\nProduis deux choses : (1) un résumé clair du projet, en signalant les incohérences entre brief, plans et rendus ; (2) la liste structurée des prestations probables avec leurs quantités lorsqu'elles sont lisibles ou déductibles, chacune avec sa source et son niveau de fiabilité.",
      ].join('\n'),
    },
  ];

  return askJson(
    buildSystem(sources),
    content,
    SCHEMA_CONTEXTE as unknown as Record<string, unknown>,
    16000
  );
}

/**
 * Étape 2 — travaille sur le résultat de l'étape 1, sans renvoyer les
 * documents : questions manquantes classées par thème, et risques.
 */
export async function analyseQuestions(
  project: StudioProject,
  contexte: Pick<AnalysisResult, 'resume' | 'prestations'>,
  sources: StudioSource[]
): Promise<Pick<AnalysisResult, 'questions' | 'risques'>> {
  const content: ContentBlock[] = [
    {
      type: 'text',
      text: [
        "Voici l'analyse déjà produite pour ce dossier de stand / agencement.",
        '',
        projectMeta(project),
        project.brief ? `\nBrief client :\n${project.brief}` : '',
        `\nRésumé retenu :\n${contexte.resume}`,
        `\nPrestations identifiées :\n${JSON.stringify(contexte.prestations, null, 1)}`,
        "\nÀ partir de ces éléments, produis : (1) les informations manquantes à demander au client, formulées comme des questions directement envoyables, classées par thème et par urgence ; (2) les risques techniques, financiers et logistiques, avec l'hypothèse retenue et l'action à mener. Concentre-toi sur ce qui change réellement le chiffrage ou le planning.",
      ].join('\n'),
    },
  ];

  return askJson(
    buildSystem(sources),
    content,
    SCHEMA_QUESTIONS as unknown as Record<string, unknown>,
    12000
  );
}

/**
 * Étape 3 — préchiffrage à partir des prestations retenues et de la
 * bibliothèque de prix. Ne renvoie pas non plus les documents.
 */
export async function analyseChiffrage(
  project: StudioProject,
  contexte: Pick<AnalysisResult, 'resume' | 'prestations'>,
  risques: AnalysisResult['risques'],
  sources: StudioSource[]
): Promise<Pick<AnalysisResult, 'prechiffrage' | 'confianceGlobale'>> {
  const content: ContentBlock[] = [
    {
      type: 'text',
      text: [
        'Établis le préchiffrage de ce dossier de stand / agencement.',
        '',
        projectMeta(project),
        `\nRésumé :\n${contexte.resume}`,
        `\nPrestations retenues :\n${JSON.stringify(contexte.prestations, null, 1)}`,
        risques.length > 0
          ? `\nRisques et hypothèses déjà identifiés :\n${JSON.stringify(risques, null, 1)}`
          : '',
        "\nProduis le coût de revient HT en fourchette (min/max) ligne par ligne, en indiquant pour chacune la base de calcul (prix de la bibliothèque, tarif d'un document de référence, ou estimation de marché) et son niveau de fiabilité. Ajoute l'estimation des heures par poste (atelier, montage, démontage, préparation). Les totaux doivent correspondre à la somme des lignes. Termine par une appréciation honnête du niveau de confiance et des limites de l'estimation.",
      ].join('\n'),
    },
  ];

  return askJson(
    buildSystem(sources),
    content,
    SCHEMA_CHIFFRAGE as unknown as Record<string, unknown>,
    16000
  );
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
  data: Buffer,
  /** Texte déjà extrait (Excel, Word, fichier texte) — prioritaire. */
  texteBrut?: string | null
): Promise<string> {
  const client = getAnthropic();
  let content: ContentBlock[];

  if (texteBrut) {
    content = [
      {
        type: 'text',
        text: `Rédige la fiche d'extraction de ce document : ${fileName}\n\n${texteBrut.slice(0, 150_000)}`,
      },
    ];
  } else if (fileType === 'application/pdf') {
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
