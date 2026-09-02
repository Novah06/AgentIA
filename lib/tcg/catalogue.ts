/**
 * Amorce de catalogue français.
 *
 * Ce fichier n'est PAS le catalogue complet : il contient les séries et les
 * références les plus demandées, pour que l'application soit utilisable dès le
 * premier lancement, sans base de données ni réseau. Le catalogue intégral
 * (toutes les extensions FR, toutes les cartes) est chargé par le bot de
 * synchronisation (`lib/tcg/sources/tcgdex.ts`, déclenché par
 * `POST /api/tcg/cron/catalogue`), qui écrit dans Supabase et prend alors le
 * relais de cette amorce.
 *
 * Les prix de cette amorce sont des ORDRES DE GRANDEUR de démonstration,
 * signalés comme tels dans l'interface (source « amorce ») tant que le bot de
 * prix n'a pas produit de relevé réel.
 */

import type { CardVariant, SealedProduct, TcgCard, TcgSet } from './types';

export const SEED_SOURCE = 'amorce';

export const SEED_SETS: TcgSet[] = [
  // --- Écarlate et Violet ---
  s('ev01', 'Écarlate et Violet', 'Écarlate et Violet', 'Scarlet & Violet', 'EV01', '2023-03-31', 258),
  s('ev02', 'Écarlate et Violet', 'Évolutions à Paldea', 'Paldea Evolved', 'EV02', '2023-06-09', 279),
  s('ev03', 'Écarlate et Violet', 'Obsidienne Rouge', 'Obsidian Flames', 'EV03', '2023-08-11', 230),
  s('ev035', 'Écarlate et Violet', 'Destinées de Paldea', 'Paldean Fates', 'EV3.5', '2024-01-26', 245),
  s('ev04', 'Écarlate et Violet', 'Faille Paradoxe', 'Paradox Rift', 'EV04', '2023-11-03', 266),
  s('ev05', 'Écarlate et Violet', 'Forces Temporelles', 'Temporal Forces', 'EV05', '2024-03-22', 218),
  s('ev06', 'Écarlate et Violet', 'Mascarade Crépusculaire', 'Twilight Masquerade', 'EV06', '2024-05-24', 226),
  s('ev065', 'Écarlate et Violet', 'Fable Nébuleuse', 'Shrouded Fable', 'EV6.5', '2024-08-02', 99),
  s('ev07', 'Écarlate et Violet', 'Couronne Stellaire', 'Stellar Crown', 'EV07', '2024-09-13', 175),
  s('ev08', 'Écarlate et Violet', 'Étincelles Déferlantes', 'Surging Sparks', 'EV08', '2024-11-08', 252),
  s('ev085', 'Écarlate et Violet', 'Évolutions Prismatiques', 'Prismatic Evolutions', 'EV8.5', '2025-01-17', 180),
  s('ev09', 'Écarlate et Violet', 'Aventures Ensemble', 'Journey Together', 'EV09', '2025-03-28', 190),
  s('ev10', 'Écarlate et Violet', 'Rivalités Destinées', 'Destined Rivals', 'EV10', '2025-05-30', 182),

  // --- Épée et Bouclier ---
  s('eb045', 'Épée et Bouclier', 'Destinées Radieuses', 'Shining Fates', 'EB4.5', '2021-02-19', 73),
  s('ebcel', 'Épée et Bouclier', 'Célébrations', 'Celebrations', 'EB Cél.', '2021-10-08', 50),
  s('eb07', 'Épée et Bouclier', 'Évolution Céleste', 'Evolving Skies', 'EB07', '2021-08-27', 237),
  s('eb105', 'Épée et Bouclier', 'Astres Radieux', 'Astral Radiance', 'EB10', '2022-05-27', 216),
  s('eb125', 'Épée et Bouclier', 'Zénith Suprême', 'Crown Zenith', 'EB12.5', '2023-01-20', 159),

  // --- Classiques ---
  s('base1', 'Wizards', 'Set de Base', 'Base Set', 'BS', '1999-05-20', 102),
  s('base2', 'Wizards', 'Fossile', 'Fossil', 'FO', '1999-10-10', 62),
  s('neo1', 'Wizards', 'Néo Genesis', 'Neo Genesis', 'N1', '2000-12-16', 111),
];

function s(
  id: string,
  serie: string,
  nameFr: string,
  nameEn: string,
  code: string,
  releaseDate: string,
  cardCount: number
): TcgSet {
  return {
    id,
    serie,
    nameFr,
    nameEn,
    code,
    releaseDate,
    cardCount,
    logoUrl: null,
    symbolUrl: null,
  };
}

const ALL: CardVariant[] = ['normale', 'reverse'];
const HOLO: CardVariant[] = ['holo', 'reverse'];

export const SEED_CARDS: TcgCard[] = [
  c('ev08-238', 'ev08', '238', 'Pikachu-ex', 'Pikachu ex', 'Hyper rare', HOLO),
  c('ev08-247', 'ev08', '247', 'Latias-ex', 'Latias ex', 'Hyper rare', HOLO),
  c('ev085-131', 'ev085', '131', 'Évoli-ex', 'Eevee ex', 'Rare secrète', HOLO),
  c('ev085-119', 'ev085', '119', 'Aquali-ex', 'Vaporeon ex', 'Rare illustration spéciale', HOLO),
  c('ev085-122', 'ev085', '122', 'Mentali-ex', 'Espeon ex', 'Rare illustration spéciale', HOLO),
  c('ev07-173', 'ev07', '173', 'Dracaufeu-ex', 'Charizard ex', 'Hyper rare', HOLO),
  c('ev03-125', 'ev03', '125', 'Dracaufeu-ex', 'Charizard ex', 'Rare illustration spéciale', HOLO),
  c('ev03-054', 'ev03', '054', 'Dracaufeu-ex', 'Charizard ex', 'Double rare', HOLO),
  c('ev06-064', 'ev06', '064', 'Ogerpon-ex', 'Ogerpon ex', 'Double rare', HOLO),
  c('ev065-064', 'ev065', '064', 'Pêchaminus-ex', 'Pecharunt ex', 'Rare illustration spéciale', HOLO),
  c('ev035-234', 'ev035', '234', 'Mewtwo-ex', 'Mewtwo ex', 'Rare secrète', HOLO),
  c('ev01-245', 'ev01', '245', 'Miraidon-ex', 'Miraidon ex', 'Hyper rare', HOLO),
  c('ev02-259', 'ev02', '259', 'Ferdeter-ex', 'Iron Hands ex', 'Hyper rare', HOLO),
  c('ev04-231', 'ev04', '231', 'Roi Mage-ex', 'Roaring Moon ex', 'Rare illustration spéciale', HOLO),
  c('ev05-201', 'ev05', '201', 'Chapignon-ex', 'Iron Leaves ex', 'Rare illustration spéciale', HOLO),
  c('ev09-160', 'ev09', '160', 'Lilie', 'Lillie', 'Rare illustration spéciale', HOLO),
  c('ev10-160', 'ev10', '160', 'Team Rocket - Mewtwo-ex', "Team Rocket's Mewtwo ex", 'Rare illustration spéciale', HOLO),
  c('eb07-215', 'eb07', '215', 'Noctali VMAX', 'Umbreon VMAX', 'Rare secrète', HOLO),
  c('eb07-233', 'eb07', '233', 'Rayquaza VMAX', 'Rayquaza VMAX', 'Rare secrète', HOLO),
  c('eb045-sv107', 'eb045', 'SV107', 'Charmander', 'Salamèche', 'Rare brillante', HOLO),
  c('ebcel-004', 'ebcel', '004', 'Zacian V', 'Zacian V', 'Holo rare', HOLO),
  c('ebcel-cl05', 'ebcel', 'CL05', 'Dracaufeu', 'Charizard', 'Classic Collection', HOLO),
  c('eb125-gg44', 'eb125', 'GG44', 'Palkia VSTAR', 'Palkia VSTAR', 'Galarian Gallery', HOLO),
  c('eb105-tg20', 'eb105', 'TG20', 'Hisuian Zoroark VSTAR', 'Hisuian Zoroark VSTAR', 'Trainer Gallery', HOLO),
  c('base1-004', 'base1', '4', 'Dracaufeu', 'Charizard', 'Holo rare', HOLO),
  c('base1-058', 'base1', '58', 'Pikachu', 'Pikachu', 'Commune', ALL),
  c('base1-002', 'base1', '2', 'Florizarre', 'Venusaur', 'Holo rare', HOLO),
  c('base1-003', 'base1', '3', 'Tortank', 'Blastoise', 'Holo rare', HOLO),
  c('base2-002', 'base2', '2', 'Aérodactyl', 'Aerodactyl', 'Holo rare', HOLO),
  c('neo1-009', 'neo1', '9', 'Lugia', 'Lugia', 'Holo rare', HOLO),
];

function c(
  id: string,
  setId: string,
  number: string,
  nameFr: string,
  nameEn: string,
  rarity: string,
  variants: CardVariant[]
): TcgCard {
  return {
    id,
    setId,
    number,
    nameFr,
    nameEn,
    rarity,
    illustrator: null,
    imageUrl: null,
    variants,
  };
}

export const SEED_SEALED: SealedProduct[] = [
  p('sc-ev08-display', 'ev08', 'display', 'Display Étincelles Déferlantes (36 boosters)', '2024-11-08', 36),
  p('sc-ev08-etb', 'ev08', 'etb', 'Coffret Dresseur d’Élite Étincelles Déferlantes', '2024-11-08', 9),
  p('sc-ev085-etb', 'ev085', 'etb', 'Coffret Dresseur d’Élite Évolutions Prismatiques', '2025-01-17', 9),
  p('sc-ev085-display', 'ev085', 'display', 'Display Évolutions Prismatiques (18 boosters)', '2025-01-17', 18),
  p('sc-ev085-bundle', 'ev085', 'bundle', 'Bundle 6 boosters Évolutions Prismatiques', '2025-01-17', 6),
  p('sc-ev07-display', 'ev07', 'display', 'Display Couronne Stellaire (36 boosters)', '2024-09-13', 36),
  p('sc-ev06-display', 'ev06', 'display', 'Display Mascarade Crépusculaire (36 boosters)', '2024-05-24', 36),
  p('sc-ev035-display', 'ev035', 'display', 'Display Destinées de Paldea (36 boosters)', '2024-01-26', 36),
  p('sc-ev03-etb', 'ev03', 'etb', 'Coffret Dresseur d’Élite Obsidienne Rouge', '2023-08-11', 9),
  p('sc-eb07-display', 'eb07', 'display', 'Display Évolution Céleste (36 boosters)', '2021-08-27', 36),
  p('sc-ebcel-etb', 'ebcel', 'etb', 'Coffret Dresseur d’Élite Célébrations 25 ans', '2021-10-08', 8),
  p('sc-eb125-etb', 'eb125', 'etb', 'Coffret Dresseur d’Élite Zénith Suprême', '2023-01-20', 11),
  p('sc-ev09-display', 'ev09', 'display', 'Display Aventures Ensemble (36 boosters)', '2025-03-28', 36),
  p('sc-ev10-display', 'ev10', 'display', 'Display Rivalités Destinées (36 boosters)', '2025-05-30', 36),
];

function p(
  id: string,
  setId: string,
  kind: SealedProduct['kind'],
  nameFr: string,
  releaseDate: string,
  boosterCount: number
): SealedProduct {
  return { id, setId, kind, nameFr, releaseDate, boosterCount, imageUrl: null };
}

/**
 * Prix d'amorce, en euros, référence Near Mint / neuf scellé.
 * Ordres de grandeur destinés à la démonstration : ils sont remplacés dès le
 * premier passage du bot de prix, et l'interface les signale comme tels.
 */
export const SEED_PRICES: Record<string, number> = {
  'ev08-238': 95,
  'ev08-247': 55,
  'ev085-131': 210,
  'ev085-119': 48,
  'ev085-122': 62,
  'ev07-173': 78,
  'ev03-125': 260,
  'ev03-054': 22,
  'ev06-064': 14,
  'ev065-064': 40,
  'ev035-234': 34,
  'ev01-245': 30,
  'ev02-259': 18,
  'ev04-231': 42,
  'ev05-201': 20,
  'ev09-160': 88,
  'ev10-160': 70,
  'eb07-215': 380,
  'eb07-233': 130,
  'eb045-sv107': 12,
  'ebcel-004': 6,
  'ebcel-cl05': 32,
  'eb125-gg44': 9,
  'eb105-tg20': 11,
  'base1-004': 320,
  'base1-058': 9,
  'base1-002': 95,
  'base1-003': 110,
  'base2-002': 24,
  'neo1-009': 260,
  'sc-ev08-display': 145,
  'sc-ev08-etb': 55,
  'sc-ev085-etb': 190,
  'sc-ev085-display': 320,
  'sc-ev085-bundle': 75,
  'sc-ev07-display': 130,
  'sc-ev06-display': 135,
  'sc-ev035-display': 190,
  'sc-ev03-etb': 70,
  'sc-eb07-display': 620,
  'sc-ebcel-etb': 130,
  'sc-eb125-etb': 95,
  'sc-ev09-display': 140,
  'sc-ev10-display': 150,
};

export const SEED_SET_BY_ID = new Map(SEED_SETS.map((x) => [x.id, x]));
export const SEED_CARD_BY_ID = new Map(SEED_CARDS.map((x) => [x.id, x]));
export const SEED_SEALED_BY_ID = new Map(SEED_SEALED.map((x) => [x.id, x]));
