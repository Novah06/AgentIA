# Portefeuille Pokémon — mise en service

Application de suivi de collection Pokémon en français : collection, coffre-fort
(loose / gradées / scellés), cotes en euros relevées deux fois par jour, courbes
d'évolution et scan d'item par photo.

Tout vit sous `/tcg` (interface), `/api/tcg` (services) et `lib/tcg` (métier) ;
le reste du dépôt n'est pas touché.

---

## 1. Démarrer sans rien configurer

```bash
npm install
npm run dev
```

Puis ouvrir <http://localhost:3000/tcg>.

Sans Supabase ni Clerk, l'application tourne en **mode local** : catalogue
d'amorce, cotes de démonstration, données en mémoire (perdues au redémarrage).
Un bandeau le signale sur chaque écran — aucun chiffre n'est présenté comme un
prix de marché tant que le bot de prix n'a pas tourné.

## 2. Persistance (Supabase)

1. Créer un projet Supabase.
2. Exécuter `lib/supabase/schema-tcg.sql` dans l'éditeur SQL — y compris le bloc
   `enable row level security` en fin de fichier, qui ferme l'accès par la clé
   publique `anon`.
3. Renseigner dans `.env.local` :

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

L'application n'utilise que la clé `service_role`, côté serveur : aucune donnée
n'est lisible depuis le navigateur autrement que par les routes API, qui
vérifient l'identité.

## 3. Comptes

Avec Clerk configuré (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`),
chaque utilisateur a son propre coffre-fort. Sans Clerk, tout se rattache à une
collection unique `collection-demo`, pratique pour un usage personnel en local.

## 4. Les trois bots

Chaque bot est une route HTTP, protégée par `CRON_SECRET`. Le script
`scripts/tcg-bot.mjs` les pilote depuis n'importe quel poste.

| Bot | Rôle | Cadence conseillée |
|---|---|---|
| Catalogue | Charge les extensions et cartes FR depuis TCGdex | à l'installation, puis à chaque sortie d'extension |
| Prix | Relève les cotes Cardmarket en euros | 00 h et 12 h (Europe/Paris) |
| Snapshots | Fige la valeur de chaque coffre-fort | automatiquement après chaque relevé |

### Premier chargement du catalogue

```bash
# les 20 extensions les plus récentes (quelques minutes)
npm run tcg:catalogue -- --extensions 20

# puis, plus tard, le catalogue complet
npm run tcg:catalogue
```

Le catalogue complet représente plus de 20 000 cartes : le charger par tranches
évite de dépasser la durée maximale d'une fonction serverless.

### Relevé de prix à la demande

```bash
npm run tcg:prix
```

Seules les références **détenues par au moins un utilisateur** sont relevées :
inutile de coter des cartes que personne ne possède, et le traitement reste
court même sur une grosse collection.

### Planification

Trois options, au choix.

**a. Vercel Cron** — déjà configuré dans `vercel.json` : la route est appelée
toutes les heures et ne fait rien en dehors de 00 h et 12 h (heure de Paris).
Ce filtrage côté serveur évite d'avoir à décaler la configuration deux fois par
an au changement d'heure. Définir `CRON_SECRET` dans les variables du projet
Vercel : la plateforme l'envoie automatiquement.

**b. Le planificateur fourni** — à laisser tourner sur un poste ou un serveur :

```bash
npm run tcg:planifier
```

**c. cron système** (Linux/macOS), l'application étant accessible :

```cron
0 0,12 * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://…/api/tcg/cron/prix
```

## 5. Produits scellés : import des cotes

Les displays, coffrets et bundles n'ont **pas** de source publique gratuite en
euros. Deux façons de les alimenter :

```bash
# fichier texte : refId;prix[;source], une ligne par référence
cat > cotes-scelles.csv <<'CSV'
sc-ev085-etb;205,50;cardmarket
sc-eb07-display;640;vinted
CSV

npm run tcg:import cotes-scelles.csv
```

ou directement :

```bash
curl -X POST https://…/api/tcg/prix/import \
  -H "Authorization: Bearer $CRON_SECRET" \
  --data-binary 'sc-ev085-etb;205,50;cardmarket'
```

Les identifiants de référence se lisent dans l'URL de la fiche produit
(`/tcg/reference/<refId>`).

## 6. Scan d'item

Nécessite `ANTHROPIC_API_KEY`. Le modèle lit la carte et juge son état d'après
la photo ; **il ne donne aucun prix** : la cote vient du dernier relevé et les
coefficients d'état s'y appliquent. Chaque euro affiché est donc traçable
jusqu'à un relevé daté.

Limites à connaître : une seule face est analysée, une photo floue ou sombre
fait chuter la confiance, et un état annoncé ne remplace pas un examen du dos
et des bords avant une vente.

## 7. D'où viennent les prix

| Nature | Source | Fiabilité |
|---|---|---|
| Carte Near Mint | tendance Cardmarket, via l'API pokemontcg.io (déjà en euros) | cote de marché |
| Carte dans un autre état | cote NM × coefficient d'état | estimation |
| Carte gradée | cote NM × coefficient de note × prime d'organisme | estimation |
| Produit scellé | import manuel | selon la saisie |

Les coefficients sont regroupés dans `lib/tcg/pricing.ts` et datés
(`DATE_COEFFICIENTS`) : ils sont faits pour être réajustés à mesure que
l'historique réel s'accumule. Toute valeur qui en dépend est marquée « ≈ » dans
l'interface.

## 8. Variables d'environnement

| Variable | Rôle |
|---|---|
| `CRON_SECRET` | protège les routes des bots |
| `TCG_APP_URL` | adresse visée par `scripts/tcg-bot.mjs` |
| `POKEMONTCG_API_KEY` | facultative — relève la limite de requêtes |
| `TCG_SET_OVERRIDES` | JSON, force la correspondance entre une extension FR et son équivalent pokemontcg.io |
| `ANTHROPIC_API_KEY` | scan d'item |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | persistance |
