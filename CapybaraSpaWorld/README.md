# 🛁 Capybara Spa World — Jeu Roblox (Lua / Luau)

Simulator/Tycoon Roblox complet : capture de capybaras sauvages façon Pokémon,
construction de spas générant du **CapyGold** passif, élevage génétique,
décoration, économie complète (boutique, game passes, rebirth, 3 leaderboards).

Tous les fichiers sont **100 % fonctionnels** (aucun placeholder). La syntaxe a été
vérifiée avec `luac` pour les 28 scripts. Le projet est **prêt pour Rojo** (sync
en un clic dans Studio).

---

## 📁 Arborescence (28 scripts — noms compatibles Rojo)

> Convention Rojo : `.lua` → **ModuleScript**, `.server.lua` → **Script**,
> `.client.lua` → **LocalScript**.

```
CapybaraSpaWorld/
├── default.project.json            ← fichier projet Rojo
│
├── ReplicatedStorage/Modules/      → ModuleScripts (partagés)
│   ├── GameConfig.lua              [1]
│   ├── CapybaraData.lua            [2]
│   ├── RemoteEvents.lua            [3]
│   └── UIHelper.lua                [4]
│
├── ServerScriptService/
│   ├── GameManager.server.lua      [5]  ⚠️ SCRIPT (orchestrateur)
│   ├── DataService.lua             [6]  ModuleScript
│   ├── NatureZoneService.lua       [7]  ModuleScript
│   ├── CaptureService.lua          [8]  ModuleScript
│   ├── SpaService.lua              [9]  ModuleScript
│   ├── BreedingService.lua         [10] ModuleScript
│   ├── ShopService.lua             [11] ModuleScript
│   ├── DecorationService.lua       [12] ModuleScript
│   ├── RebirthService.lua          [13] ModuleScript
│   └── LeaderboardService.lua      [14] ModuleScript
│
├── StarterPlayerScripts/           → LocalScripts
│   ├── ClientManager.client.lua    [15]
│   ├── NatureZoneClient.client.lua [16]
│   ├── SpaBuilderClient.client.lua [17]
│   ├── BreedingClient.client.lua   [18]
│   └── InputHandler.client.lua     [19]
│
├── StarterGui/                     → LocalScripts
│   ├── HUD.client.lua              [20]
│   ├── EncounterUI.client.lua      [21]
│   ├── SpaUI.client.lua            [22]
│   ├── BreedingUI.client.lua       [23]
│   ├── ShopUI.client.lua           [24]
│   ├── LeaderboardUI.client.lua    [25]
│   ├── RebirthUI.client.lua        [26]
│   └── NotificationUI.client.lua   [27]
│
└── StarterPack/
    └── Filet Basique/              → Tool (init.meta.json)
        ├── CaptureTool.client.lua  [28] LocalScript
        ├── Handle.model.json       (Part)
        └── ToolId.model.json       (StringValue = "net_basic")
```

---

## 🚀 Installation avec Rojo (recommandé)

### 1. Installer Rojo
- **Plugin Studio** : Studio → onglet *Plugins* → *Manage Plugins* → installe **Rojo**
  (ou via [rojo.space](https://rojo.space)).
- **CLI** : `cargo install rojo` ou `aftman add rojo-rbx/rojo`, ou télécharge le binaire.

### 2. Synchroniser
```bash
cd CapybaraSpaWorld
rojo serve          # lance le serveur sur le port 34872
```
Dans Studio : ouvre le plugin **Rojo → Connect**. Les 28 scripts (+ le Tool, les
folders) apparaissent instantanément aux bons endroits avec les **bons types
d'instance**. Toute modification de fichier est resynchronisée en direct.

> Alternative sans serveur live : `rojo build -o CapybaraSpaWorld.rbxlx` génère un
> fichier `.rbxlx` que tu ouvres directement dans Studio (`File → Open`).

### 3. Activer les services Roblox
- **Game Settings → Security** : active **Enable Studio Access to API Services**
  (obligatoire pour les DataStores).
- **Publie** le jeu (File → Publish to Roblox) pour que les DataStores et
  leaderboards fonctionnent.

> Les `RemoteEvents` sont créés automatiquement au premier `require` du module
> `RemoteEvents` — rien à ajouter à la main.
>
> Le **Tool** `Filet Basique` (avec son `Handle` et son `ToolId`) est généré
> automatiquement par Rojo. Si ton client/version de Rojo ne gère pas les
> `*.model.json`, crée le Tool manuellement : un **Tool** nommé `Filet Basique`
> contenant un **Part** `Handle` + un **StringValue** `ToolId` = `net_basic`, puis
> mets-y le LocalScript `CaptureTool`.

### Outils supérieurs (optionnel)
Duplique le dossier `Filet Basique`, renomme-le, et change la valeur de `ToolId`
dans `ToolId.model.json` : `net_silver`, `net_gold`, `net_magic`, `lasso`.

---

## 🧩 Installation manuelle (sans Rojo)
Si tu préfères copier-coller : crée chaque instance dans Studio avec le **nom sans
suffixe** (`DataService.lua` → ModuleScript nommé `DataService`,
`HUD.client.lua` → LocalScript nommé `HUD`, `GameManager.server.lua` → Script
nommé `GameManager`) et colle le contenu. Respecte les emplacements de
l'arborescence ci-dessus.

---

## 🌍 Setup du Workspace (optionnel mais recommandé)

Le code **génère automatiquement** les éléments manquants au démarrage :
- `Workspace/NatureZone/SpawnPoints` : 20 points de spawn créés si absents.
- `Workspace/PlayerAreas/Area_<userId>` : zone + 8 plots créés par joueur à la connexion.

Pour personnaliser, crée manuellement :
```
Workspace/
├── NatureZone/
│   └── SpawnPoints/        ← Parts invisibles "SP1".."SP20"
│       (ajoute un NumberValue "RarityWeight" = distance pour pondérer la rareté)
└── Baseplate
```

### Sons (SoundService) — optionnel
Ajoute des **Sound** dans **SoundService** avec ces noms exacts (sinon ignorés
silencieusement) :
`CaptureSuccess`, `CaptureFailSound`, `LegendarySound`, `RebirthSound`,
`CoinSound`, `BreedingComplete`, `Ambient`.

---

## 🔑 IDs à remplir avant publication

### Game Passes — `ReplicatedStorage/Modules/GameConfig.lua`
Remplace les `id=0` par les vrais IDs de game pass créés sur le site Roblox :

```lua
GameConfig.GamePasses = {
  VIP          = { id=0, ... },   -- ← remplace 0
  AutoCollect  = { id=0, ... },   -- ← remplace 0
  LuckyAura    = { id=0, ... },   -- ← remplace 0
  ExtraPlots   = { id=0, ... },   -- ← remplace 0
  CosmeticPack = { id=0, ... },   -- ← remplace 0
}
```

Tant que `id=0`, les game passes sont **désactivés proprement** (le bouton
affiche « bientôt disponible » et aucune erreur n'est levée).

### Clés DataStore (déjà configurées)
- Profil joueur : `CapySpaWorld_v2` + clé `CapySpaWorld_v2_<userId>`.
- Leaderboards (OrderedDataStore) : `CapySpa_TotalGold_v2`, `CapySpa_Beauty_v2`,
  `CapySpa_Collection_v2`.

Change le suffixe `_v2` si tu veux repartir de zéro après une modification de schéma.

---

## 🎮 Contrôles

| Touche | Action |
|--------|--------|
| `E` / `Tab` | Boutique |
| `M` | Mes Spas |
| `B` | Élevage |
| `L` | Classements |
| `R` | Rebirth |
| `Échap` | Fermer toutes les fenêtres |
| `G` (outil équipé) | Choisir un appât |
| Clic gauche (outil) | Lancer le filet sur un capybara proche |

**Mobile** : boutons flottants en bas d'écran + bouton ✨ en haut.

---

## 🔁 Boucle de jeu

```
CAPTURER → PLACER DANS SPA → GAGNER CapyGold → AMÉLIORER
   ↑                                              ↓
ÉLEVER ← ──────── ACHETER outils/décos ← ─────────┘
                         ↓
                   REBIRTH (×1.75 / niveau, 15 max)
```

1. **Capturer** : approche-toi (< 8 studs) d'un capybara sauvage → l'écran de
   rencontre s'ouvre → équipe un filet + appât optionnel → Capturer.
2. **Construire** : Boutique/Spa → onglet Construire → débloque un plot → bâtis un spa.
3. **Placer** : Mes Spas → Gérer → Ajouter un capybara → revenus passifs (tick 10 s).
4. **Interagir** : caresser/nourrir/coiffer → bonheur ↑ → production ↑.
5. **Élever** : Élevage → 2 parents libres → minuteur → bébé de rareté héritée.
6. **Décorer** : Boutique → Décos → Acheter → Placer (clic au sol sur ton plot).
7. **Rebirth** : 50 000 CapyGold → reset gold/capybaras/spas, garde upgrades/outils/décos/plots.

---

## 🛡️ Notes techniques

- Toutes les actions sont **validées côté serveur** (anti-triche).
- `pcall` sur **tous** les appels DataStore / MarketplaceService, avec retry ×3.
- `task.spawn`, `task.wait`, `task.delay` partout (pas de `wait`/`spawn` legacy).
- Sauvegarde : autosave 60 s + à la déconnexion + `BindToClose`.
- Protection : ne sauvegarde jamais par-dessus un profil dont le **chargement a
  échoué** (évite la perte de données).
- 7 raretés, 5 niveaux de spa, 8 plots (12 avec game pass), 18 décorations,
  7 upgrades, 5 interactions, 3 leaderboards.

Bon jeu ! 🐾
