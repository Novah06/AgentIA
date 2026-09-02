#!/usr/bin/env node
/**
 * Pilote des bots du portefeuille Pokémon.
 *
 * Ce script ne contient aucune logique métier : il appelle les routes de
 * l'application, qui portent les traitements. C'est ce qui permet de faire
 * tourner les bots depuis n'importe où — un poste de travail, un serveur, une
 * tâche planifiée — sans dupliquer le code ni exposer la base de données.
 *
 * Usage :
 *   node scripts/tcg-bot.mjs catalogue [--extensions 20]
 *   node scripts/tcg-bot.mjs prix [--force]
 *   node scripts/tcg-bot.mjs import cotes-scelles.csv
 *   node scripts/tcg-bot.mjs planifier
 *
 * Configuration, dans l'environnement ou dans .env.local :
 *   TCG_APP_URL   adresse de l'application (défaut http://localhost:3000)
 *   CRON_SECRET   secret attendu par les routes de planification
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const HEURES_RELEVE = [0, 12]; // heure de Paris

async function chargerEnv() {
  if (!existsSync('.env.local')) return;
  const contenu = await readFile('.env.local', 'utf8');
  for (const ligne of contenu.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(ligne.trim());
    if (!match) continue;
    const [, cle, valeur] = match;
    if (!process.env[cle]) process.env[cle] = valeur.replace(/^["']|["']$/g, '');
  }
}

function baseUrl() {
  return (process.env.TCG_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function entetes(extra = {}) {
  const h = { ...extra };
  if (process.env.CRON_SECRET) h.authorization = `Bearer ${process.env.CRON_SECRET}`;
  return h;
}

async function appeler(chemin, options = {}) {
  const url = `${baseUrl()}${chemin}`;
  const res = await fetch(url, { ...options, headers: entetes(options.headers) });
  const texte = await res.text();
  let corps;
  try {
    corps = JSON.parse(texte);
  } catch {
    corps = texte;
  }
  if (!res.ok) {
    throw new Error(`${chemin} → HTTP ${res.status} ${JSON.stringify(corps)}`);
  }
  return corps;
}

function argument(nom, defaut = null) {
  const index = process.argv.indexOf(`--${nom}`);
  if (index === -1) return defaut;
  const suivant = process.argv[index + 1];
  return suivant && !suivant.startsWith('--') ? suivant : true;
}

function heureParis(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat('fr-FR', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Europe/Paris',
    }).format(date)
  );
}

function horodatage() {
  return new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
}

async function catalogue() {
  const extensions = argument('extensions');
  const suffixe = extensions && extensions !== true ? `?extensions=${extensions}` : '';
  console.log(`[${horodatage()}] Synchronisation du catalogue français…`);
  const reponse = await appeler(`/api/tcg/cron/catalogue${suffixe}`, { method: 'POST' });
  console.log(JSON.stringify(reponse, null, 2));
}

async function prix() {
  const force = argument('force') ? '?force=1' : '';
  console.log(`[${horodatage()}] Relevé des cotes…`);
  const reponse = await appeler(`/api/tcg/cron/prix${force}`, { method: 'POST' });
  console.log(JSON.stringify(reponse, null, 2));
}

async function importer() {
  const fichier = process.argv[3];
  if (!fichier) {
    console.error('Indiquez le fichier à importer : node scripts/tcg-bot.mjs import cotes.csv');
    process.exit(1);
  }
  const contenu = await readFile(fichier, 'utf8');
  const reponse = await appeler('/api/tcg/prix/import', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: contenu,
  });
  console.log(JSON.stringify(reponse, null, 2));
}

/**
 * Attend la prochaine heure de relevé (00 h ou 12 h à Paris) puis déclenche.
 * On se réveille toutes les minutes plutôt que de calculer un délai unique :
 * un changement d'heure, une mise en veille ou un décalage d'horloge ne
 * décalent alors jamais le relevé de plus d'une minute.
 */
async function planifier() {
  console.log(
    `[${horodatage()}] Planificateur démarré — relevés à ${HEURES_RELEVE.map((h) => `${h} h`).join(' et ')} (Europe/Paris).`
  );
  let dernierePasse = null;

  for (;;) {
    const maintenant = new Date();
    const heure = heureParis(maintenant);
    const cle = `${maintenant.toDateString()}-${heure}`;

    if (HEURES_RELEVE.includes(heure) && cle !== dernierePasse) {
      dernierePasse = cle;
      try {
        await prix();
      } catch (err) {
        console.error(`[${horodatage()}] Échec du relevé :`, err.message);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }
}

const COMMANDES = { catalogue, prix, import: importer, planifier };

await chargerEnv();
const commande = process.argv[2];
const action = COMMANDES[commande];

if (!action) {
  console.error(`Commande inconnue : ${commande ?? '(aucune)'}
Commandes disponibles : ${Object.keys(COMMANDES).join(', ')}`);
  process.exit(1);
}

try {
  await action();
} catch (err) {
  console.error(`[${horodatage()}] Erreur :`, err.message);
  process.exit(1);
}
