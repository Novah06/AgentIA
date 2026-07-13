# ASTRIA — Déploiement de la version jouable

## 🎮 Jouer

**URL de jeu : https://gallant-zephyr-298.higgsfield.gg/**

Jouable sur iOS et Android dans le navigateur. Pour l'installer comme une appli :
- **iPhone/iPad (Safari)** : Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : Menu ⋮ → « Ajouter à l'écran d'accueil ».

La sauvegarde est locale à l'appareil (localStorage). Les gains AFK s'accumulent
même application fermée (plafond 12 h), calculés au retour du joueur.

## Contenu de la tranche verticale

- **Héros en 3D** : les 10 Éveillés sont des modèles 3D texturés (reconstruction
  image→3D, 10 000 triangles, textures WebP 512 px, ~0,6 Mo chacun) rendus avec
  Three.js (vendorisé) sur le terrain du biome — équipe vue de dos au premier
  plan, Échos teintés de Brume en face. Animations procédurales : flottement,
  charge vers la cible, secousse à l'impact, chute à la mort. Jauges de vie et
  d'énergie projetées au-dessus des têtes. **Repli 2D automatique** tant que les
  modèles ne sont pas téléchargés ou si WebGL est indisponible.
- **5 terrains de biome** (un par région : Zénith Doré, Sylve Suspendue, Forges
  d'Écume, Archipel des Marées, Voile Ombral — cyclés au-delà du chapitre 5),
  chacun avec son décor généré servant de fond de combat et son **animation
  d'entrée en scène** (rayons solaires, feuilles, vapeur + lave, vague, brume
  qui se déchire) : titre du chapitre, alignements face à face et éclat « VS »
  avant le début de la simulation.

- 10 héros (GDD §3) avec portraits générés, 6 factions, boucle de contre (+25 %).
- Invocation gacha : Éveillé 58 % / Astral 33 % / Légendaire 8,4 % / Mythique 0,6 %,
  pity Légendaire à 30 tirages, Nhyx garanti au 80e — compteurs affichés.
- Combats auto 5v5 sur canvas : pas de temps fixe 100 ms, RNG seedé (déterministe),
  énergie + ultimes par héros, vitesse ×2, ennemis « Échos » teintés de Brume.
- Campagne infinie par chapitres de 10 niveaux (boss au 10e), noms des régions du GDD.
- Progression : niveaux (or), ascension (doublons), équipe de 5, résonance visuelle.
- Rétention : quêtes quotidiennes, connexion 7 jours, butin AFK + butin instantané.

## Architecture de déploiement

Le conteneur de dev n'a pas accès aux domaines Higgsfields (politique réseau).
Le workflow `.github/workflows/package-astria.yml` sert de relais : à chaque push
touchant `game/**`, il télécharge/optimise les assets générés, les committe, et
committe `astria-game.zip` (racine : `logic.js` + `index.html` + `assets/`).

Le zip est ensuite déployé via l'outil `deploy_game` (MCP Higgsfields) avec comme
source l'URL raw GitHub **épinglée au SHA du commit** (immuable).

## Mettre à jour le jeu déployé

1. Modifier le code dans `game/`, pousser sur la branche → le workflow committe un
   nouveau `astria-game.zip` (`[skip ci]`).
2. Redéployer avec **le même `game_id`** (sinon une nouvelle URL est créée) :
   - `game_id` : `a457a4e4-2b30-4221-9593-0e8960d5ef3e`
   - `source_game` : `https://raw.githubusercontent.com/Novah06/AgentIA/<SHA>/astria-game.zip`

## Limites connues (honnêteté de livraison)

- Pas d'audio ni d'animations de sprites (portraits statiques animés par code) — v2.
- Pas de service worker : le jeu nécessite une connexion au premier chargement.
- Équilibrage réglé par simulation locale, à affiner avec de vraies sessions joueur.
- La qualité perçue (feel, compositions) mérite un passage humain — voir GDD §13.
