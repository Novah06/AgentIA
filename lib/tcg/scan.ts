/**
 * Scan d'item : photo → identification, état, cote.
 *
 * Le modèle fait ce qu'il sait faire (lire le nom, le numéro, l'extension, et
 * décrire l'usure visible) ; il ne fait PAS le prix. La cote vient toujours du
 * catalogue et de l'historique de prix, appliquée à l'état retenu par les
 * coefficients de `pricing.ts`. Un modèle qui « estime un prix » de mémoire
 * donnerait des chiffres invérifiables : ici, chaque euro affiché est traçable
 * jusqu'à un relevé daté.
 */

import { getAnthropic, hasAnthropicConfigured } from '@/lib/anthropic/client';
import { latestPrice, searchCatalogue, type CatalogEntry } from './store';
import { valueItem } from './pricing';
import type { CardCondition, CardVariant, ItemKind, ScanResult } from './types';

export const SCAN_MODEL = 'claude-opus-5';

/** Types d'images acceptés par l'API. */
const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export type ScanMediaType = (typeof ALLOWED_MEDIA)[number];

export function isAllowedMedia(t: string): t is ScanMediaType {
  return (ALLOWED_MEDIA as readonly string[]).includes(t);
}

/** 5 Mo par image : au-delà, la photo n'apporte plus de détail exploitable. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const SYSTEM = `Tu es expert en cartes et produits Pokémon, et tu travailles pour un
collectionneur français. On te montre la photo d'un item ; tu l'identifies et tu
évalues son état, comme le ferait un vendeur avant une mise en vente.

Ce que tu dois faire :
- Lire ce qui est réellement écrit sur l'item : nom du Pokémon (en français tel
  qu'imprimé), numéro de carte, nom ou logo de l'extension.
- Dire s'il s'agit d'une carte simple (loose), d'une carte sous coque de
  gradation (gradee), ou d'un produit scellé (scelle).
- Attribuer un état selon la grille Cardmarket, en te fondant UNIQUEMENT sur ce
  que la photo montre : MT (parfaite), NM (quasi neuve), EX, GD, LP, PL, PO.
  Regarde les bords (blanchiment), les coins (usure, pliures), la surface
  (rayures, traces de doigts, éclats de holo) et le centrage.
- Lister en clair les défauts observés, en français, un par entrée.

Règles strictes :
- Ne donne JAMAIS de prix ni d'estimation en euros : ce n'est pas ton rôle, la
  cote est calculée ailleurs.
- N'invente rien. Si le numéro n'est pas lisible, mets null plutôt qu'une
  supposition. Si la photo ne montre pas un item Pokémon, mets identified à
  false.
- Une photo floue, sombre ou trop lointaine ne permet pas de juger l'état :
  dans ce cas, baisse confidence et dis-le dans commentaire.
- Pour une carte déjà gradée, lis la note sur l'étiquette de la coque et
  reporte-la dans commentaire ; l'état Cardmarket ne s'applique pas.
- Réponds intégralement en français.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'identified',
    'kind',
    'nom',
    'numero',
    'extension',
    'variante',
    'etat',
    'defauts',
    'confiance',
    'commentaire',
  ],
  properties: {
    identified: { type: 'boolean', description: 'Faux si la photo ne montre pas un item Pokémon' },
    kind: { type: 'string', enum: ['loose', 'gradee', 'scelle'] },
    nom: { type: ['string', 'null'], description: 'Nom lu sur l’item, en français' },
    numero: { type: ['string', 'null'], description: 'Numéro imprimé, sans le total' },
    extension: { type: ['string', 'null'], description: 'Nom de l’extension si lisible' },
    variante: {
      type: ['string', 'null'],
      enum: ['normale', 'reverse', 'holo', 'promo', null],
    },
    etat: {
      type: ['string', 'null'],
      enum: ['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO', null],
    },
    defauts: { type: 'array', items: { type: 'string' } },
    confiance: { type: 'number', description: 'Entre 0 et 1' },
    commentaire: { type: ['string', 'null'] },
  },
} as const;

interface ModelAnswer {
  identified: boolean;
  kind: ItemKind;
  nom: string | null;
  numero: string | null;
  extension: string | null;
  variante: CardVariant | null;
  etat: CardCondition | null;
  defauts: string[];
  confiance: number;
  commentaire: string | null;
}

export { hasAnthropicConfigured };

/** Analyse une photo et rattache le résultat au catalogue. */
export async function scanImage(imageBase64: string, mediaType: ScanMediaType): Promise<ScanResult> {
  const answer = await askModel(imageBase64, mediaType);

  const empty: ScanResult = {
    identified: answer.identified,
    kind: answer.kind,
    readName: answer.nom,
    readNumber: answer.numero,
    readSet: answer.extension,
    variant: answer.variante,
    condition: answer.etat,
    defects: answer.defauts ?? [],
    confidence: clamp01(answer.confiance),
    matchedRefId: null,
    matchedLabel: null,
    matchedImageUrl: null,
    basePriceEur: null,
    estimatedValueEur: null,
    comment: answer.commentaire,
  };

  if (!answer.identified || !answer.nom) return empty;

  const match = await matchCatalogue(answer);
  if (!match) {
    return {
      ...empty,
      comment: joinComments(
        answer.commentaire,
        'Aucune référence du catalogue ne correspond : complétez la recherche à la main.'
      ),
    };
  }

  const price = await latestPrice(match.id);
  const valuation = valueItem({
    kind: answer.kind,
    basePriceEur: price?.priceEur ?? null,
    condition: answer.kind === 'loose' ? (answer.etat ?? 'NM') : null,
  });

  return {
    ...empty,
    matchedRefId: match.id,
    matchedLabel: `${match.label} — ${match.subLabel}`,
    matchedImageUrl: match.imageUrl,
    basePriceEur: price?.priceEur ?? null,
    estimatedValueEur: valuation.unitValueEur,
    comment: joinComments(answer.commentaire, valuation.explanation),
  };
}

async function askModel(imageBase64: string, mediaType: ScanMediaType): Promise<ModelAnswer> {
  const client = getAnthropic();
  const response = await client.messages.create({
    model: SCAN_MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: SCHEMA as unknown as Record<string, unknown> } },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          {
            type: 'text',
            text: 'Identifie cet item Pokémon et évalue son état à partir de cette photo.',
          },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error("Le modèle a refusé d'analyser cette image.");
  }

  const text = response.content
    .filter((block): block is { type: 'text'; text: string; citations: null } =>
      block.type === 'text'
    )
    .map((block) => block.text)
    .join('')
    .trim();

  if (!text) throw new Error('Réponse vide du modèle.');

  try {
    return JSON.parse(text) as ModelAnswer;
  } catch {
    throw new Error('Réponse du modèle illisible.');
  }
}

/**
 * Rapproche la lecture du modèle d'une référence du catalogue.
 * Le numéro est le critère le plus fiable (il est unique dans une extension) ;
 * le nom sert à restreindre, l'extension à départager.
 */
async function matchCatalogue(answer: ModelAnswer): Promise<CatalogEntry | null> {
  const refType = answer.kind === 'scelle' ? 'scelle' : 'carte';
  const name = (answer.nom ?? '').trim();
  if (!name) return null;

  const candidates = await searchCatalogue(name, { refType, limit: 60 });
  if (!candidates.length) return null;

  const number = (answer.numero ?? '').replace(/^0+/, '').toUpperCase();
  const setHint = (answer.extension ?? '').toLowerCase();

  const scored = candidates.map((entry) => {
    let score = 0;
    if (number && entry.subLabel.toUpperCase().includes(`N°${number}`)) score += 5;
    if (setHint && (entry.setNameFr ?? '').toLowerCase().includes(setHint)) score += 3;
    if (entry.label.toLowerCase() === name.toLowerCase()) score += 2;
    if (entry.priceEur !== null) score += 1;
    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // Sans le moindre point d'accroche, mieux vaut ne rien proposer qu'une
  // correspondance au hasard sur un nom très courant (Pikachu, Évoli…).
  return scored[0].score > 0 ? scored[0].entry : null;
}

function joinComments(...parts: (string | null | undefined)[]): string | null {
  const kept = parts.filter((p): p is string => !!p && p.trim().length > 0);
  return kept.length ? kept.join(' ') : null;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
