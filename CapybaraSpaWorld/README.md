# 🛁 Capybara Spa World — Jeu Roblox (Lua / Luau)

Simulator/Tycoon Roblox complet : capture de capybaras sauvages façon Pokémon,
construction de spas générant du **CapyGold** passif, élevage génétique,
décoration, économie complète (boutique, game passes, rebirth, 3 leaderboards).

Tous les fichiers sont **100 % fonctionnels** (aucun placeholder). La syntaxe a été
vérifiée avec `luac` pour les 28 scripts.

---

## 📁 Arborescence (28 fichiers)

```
CapybaraSpaWorld/
├── ReplicatedStorage/Modules/      → ModuleScripts (partagés client+serveur)
│   ├── GameConfig.lua              [1] Config centrale
│   ├── CapybaraData.lua            [2] Objet capybara + hérédité
│   ├── RemoteEvents.lua            [3] Tous les events réseau
│   └── UIHelper.lua                [4] Fonctions UI partagées
│
├── ServerScriptService/            → ModuleScripts SAUF GameManager
│   ├── GameManager.server.lua      [5]  ⚠️ SCRIPT (orchestrateur)
│   ├── DataService.server.lua      [6]  ModuleScript
│   ├── NatureZoneService.server.lua[7]  ModuleScript
│   ├── CaptureService.server.lua   [8]  ModuleScript
│   ├── SpaService.server.lua       [9]  ModuleScript
│   ├── BreedingService.server.lua  [10] ModuleScript
│   ├── ShopService.server.lua      [11] ModuleScript
│   ├── DecorationService.server.lua[12] ModuleScript
│   ├── RebirthService.server.lua   [13] ModuleScript
│   └── LeaderboardService.server.lua[14] ModuleScript
│
├── StarterPlayerScripts/           → LocalScripts
│   ├── ClientManager.client.lua    [15]
│   ├── NatureZoneClient.client.lua [16]
│   ├── SpaBuilderClient.client.lua [17]
│   ├── BreedingClient.client.lua   [18]
│   └── InputHandler.client.lua     [19]
│
├── StarterGui/                     → LocalScripts
│   ├── HUD.lua                      [20]
│   ├── EncounterUI.lua             [21]
│   ├── SpaUI.lua                   [22]
│   ├── BreedingUI.lua              [23]
│   ├── ShopUI.lua                  [24]
│   ├── LeaderboardUI.lua           [25]
│   ├── RebirthUI.lua               [26]
│   └── NotificationUI.lua          [27]
│
└── StarterPack/
    └── CaptureTool.lua             [28] LocalScript (dans un Tool)
```

---

## 🚀 Installation dans Roblox Studio

### 1. Créer les ModuleScripts partagés
Dans **ReplicatedStorage**, crée un dossier `Modules` puis 4 **ModuleScript** :
`GameConfig`, `CapybaraData`, `RemoteEvents`, `UIHelper`.
Copie le contenu des fichiers correspondants (sans l'extension `.lua`).

> Les `RemoteEvents` sont créés automatiquement au premier `require` — pas besoin
> de les ajouter à la main dans `ReplicatedStorage/Events`.

### 2. Services serveur
Dans **ServerScriptService** :
- `GameManager` → **Script** (le nom doit rester `GameManager`).
- Les 9 autres → **ModuleScript** avec les noms exacts :
  `DataService`, `NatureZoneService`, `CaptureService`, `SpaService`,
  `BreedingService`, `ShopService`, `DecorationService`, `RebirthService`,
  `LeaderboardService`.

> Dans Studio, le nom de l'instance n'a pas besoin du suffixe `.server`. Nomme
> simplement l'objet `DataService`, etc. `GameManager` fait
> `require(script.Parent.DataService)`.

### 3. Scripts client
- **StarterPlayer → StarterPlayerScripts** : 5 **LocalScript**
  (`ClientManager`, `NatureZoneClient`, `SpaBuilderClient`, `BreedingClient`, `InputHandler`).
- **StarterGui** : 8 **LocalScript**
  (`HUD`, `EncounterUI`, `SpaUI`, `BreedingUI`, `ShopUI`, `LeaderboardUI`, `RebirthUI`, `NotificationUI`).

### 4. Outil de capture
Dans **StarterPack** :
1. Crée un **Tool**, renomme-le `Filet Basique`.
2. Ajoute-lui un **Part** nommé `Handle` (l'outil ne fonctionne pas sans Handle).
3. Ajoute un **StringValue** nommé `ToolId` avec la valeur `net_basic`.
4. Place le **LocalScript** `CaptureTool` dans le Tool.

> Pour les outils supérieurs (filet argenté, etc.), duplique le Tool, change le
> nom et la valeur de `ToolId` (`net_silver`, `net_gold`, `net_magic`, `lasso`).

### 5. Activer les services Roblox
- **Game Settings → Security** : active **Enable Studio Access to API Services**
  (obligatoire pour les DataStores).
- Le jeu doit être **publié** pour que les DataStores fonctionnent en test live.

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
