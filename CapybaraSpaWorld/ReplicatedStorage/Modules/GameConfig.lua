local GameConfig = {}

-- ── MONNAIE ─────────────────────────────────────────────────────────────────
GameConfig.CurrencyName        = "CapyGold"
GameConfig.CurrencyIcon        = "🪙"
GameConfig.StartingGold        = 200
GameConfig.GoldPerVisitorBase  = 5      -- CapyGold qu'un visiteur NPC paye

-- ── DIVERS ──────────────────────────────────────────────────────────────────
GameConfig.LeaderboardUpdateInterval = 90   -- secondes entre chaque maj leaderboard
GameConfig.MaxCapybaras              = 50    -- limite d'inventaire de capybaras
GameConfig.DataStoreKeyPrefix        = "CapySpaWorld_v2_"

-- ── RARETÉS (7 niveaux) ──────────────────────────────────────────────────────
GameConfig.Rarities = {
  { id=1, name="Commun",     emoji="⚪", colorR=180,colorG=180,colorB=180, spawnChance=40, captureChance=90, breedInheritChance=0,  spaGoldPerMin=2,   sellPrice=10,   breedTimeSec=300  },
  { id=2, name="Peu commun", emoji="🟢", colorR=80, colorG=200,colorB=80,  spawnChance=25, captureChance=75, breedInheritChance=15, spaGoldPerMin=4,   sellPrice=30,   breedTimeSec=360  },
  { id=3, name="Rare",       emoji="🔵", colorR=60, colorG=120,colorB=255, spawnChance=15, captureChance=55, breedInheritChance=25, spaGoldPerMin=10,  sellPrice=100,  breedTimeSec=480  },
  { id=4, name="Épique",     emoji="🟣", colorR=150,colorG=50, colorB=255, spawnChance=10, captureChance=35, breedInheritChance=35, spaGoldPerMin=25,  sellPrice=300,  breedTimeSec=600  },
  { id=5, name="Légendaire", emoji="🟡", colorR=255,colorG=200,colorB=0,   spawnChance=6,  captureChance=15, breedInheritChance=50, spaGoldPerMin=80,  sellPrice=1000, breedTimeSec=900  },
  { id=6, name="Mythique",   emoji="🔴", colorR=255,colorG=50, colorB=50,  spawnChance=3,  captureChance=5,  breedInheritChance=65, spaGoldPerMin=250, sellPrice=4000, breedTimeSec=1200 },
  { id=7, name="Cosmique",   emoji="🌈", colorR=255,colorG=100,colorB=255, spawnChance=1,  captureChance=1,  breedInheritChance=80, spaGoldPerMin=800, sellPrice=15000,breedTimeSec=1800 },
}
-- breedInheritChance = % que l'enfant soit de la rareté MAX des deux parents

-- ── OUTILS DE CAPTURE ────────────────────────────────────────────────────────
GameConfig.CaptureTools = {
  { id="net_basic",  name="Filet Basique",   emoji="🕸️",  bonusChance=0,    cost=0,    description="Outil de départ" },
  { id="net_silver", name="Filet Argenté",   emoji="🥈",  bonusChance=15,   cost=500,  description="+15% chance capture" },
  { id="net_gold",   name="Filet Doré",      emoji="🥇",  bonusChance=30,   cost=2000, description="+30% chance capture" },
  { id="net_magic",  name="Filet Magique",   emoji="✨",  bonusChance=50,   cost=8000, description="+50% chance capture" },
  { id="lasso",      name="Lasso Cosmique",  emoji="🌀",  bonusChance=70,   cost=25000,description="+70% chance capture" },
  -- Appâts consommables (augmentent encore la chance, usage unique)
  { id="bait_fruit",  name="Appât Fruit",    emoji="🍑",  bonusChance=10,   cost=50,   consumable=true, description="Usage unique +10%" },
  { id="bait_berry",  name="Baie Rare",      emoji="🫐",  bonusChance=25,   cost=200,  consumable=true, description="Usage unique +25%" },
  { id="bait_cosmic", name="Essence Cosmique",emoji="🌟", bonusChance=50,   cost=1000, consumable=true, description="Usage unique +50%" },
}

-- ── SPAS (5 niveaux de spa) ──────────────────────────────────────────────────
GameConfig.SpaLevels = {
  { level=1, name="Petite Flaque",    emoji="💧", buildCost=100,   upgradeCost=500,   maxCapybaras=2,  goldMultiplier=1,   visitorRate=0.5, size=Vector3.new(8,1,8)   },
  { level=2, name="Bassin Bois",      emoji="🪵", buildCost=500,   upgradeCost=1500,  maxCapybaras=4,  goldMultiplier=1.8, visitorRate=1,   size=Vector3.new(10,1,10) },
  { level=3, name="Jacuzzi Tropical", emoji="🌴", buildCost=2000,  upgradeCost=5000,  maxCapybaras=6,  goldMultiplier=3.5, visitorRate=2,   size=Vector3.new(14,1,14) },
  { level=4, name="Spa Volcanique",   emoji="🌋", buildCost=8000,  upgradeCost=20000, maxCapybaras=8,  goldMultiplier=8,   visitorRate=4,   size=Vector3.new(18,1,18) },
  { level=5, name="Spa Cosmique",     emoji="🌌", buildCost=30000, upgradeCost=nil,   maxCapybaras=12, goldMultiplier=20,  visitorRate=8,   size=Vector3.new(24,1,24) },
}

-- ── PLOTS DE CONSTRUCTION ────────────────────────────────────────────────────
GameConfig.MaxPlots = 8
GameConfig.PlotTypes = { "spa", "breeding", "decoration" }
GameConfig.PlotUnlockCosts = { 0, 300, 1000, 3000, 8000, 20000, 50000, 120000 }

-- ── ÉLEVAGE ──────────────────────────────────────────────────────────────────
GameConfig.BreedingPlot = {
  buildCost      = 800,
  maxPairs       = 2,     -- nb de paires simultanées dans un parc
  baseBreedTime  = 300,   -- secondes (modifié par rarité des parents)
  happinessBonus = true,  -- capybara heureux → -20% de temps
}

-- ── DÉCORATIONS ──────────────────────────────────────────────────────────────
GameConfig.Decorations = {
  -- Catégorie Plantes
  { id="flower_pot",  name="Pot de Fleurs",    emoji="🌺", category="plante",   cost=50,   beautyScore=2,  goldBonus=0.02 },
  { id="palm_tree",   name="Palmier",          emoji="🌴", category="plante",   cost=200,  beautyScore=8,  goldBonus=0.05 },
  { id="sakura",      name="Cerisier",         emoji="🌸", category="plante",   cost=500,  beautyScore=20, goldBonus=0.1  },
  { id="bamboo",      name="Bambou Zen",       emoji="🎋", category="plante",   cost=300,  beautyScore=12, goldBonus=0.07 },
  -- Catégorie Eau
  { id="fountain",    name="Fontaine",         emoji="⛲", category="eau",      cost=400,  beautyScore=15, goldBonus=0.08 },
  { id="waterfall",   name="Cascade",          emoji="💦", category="eau",      cost=1500, beautyScore=40, goldBonus=0.2  },
  { id="lily_pad",    name="Nénuphar",         emoji="🪷", category="eau",      cost=100,  beautyScore=5,  goldBonus=0.03 },
  -- Catégorie Confort
  { id="hammock",     name="Hamac",            emoji="🏖️", category="confort",  cost=300,  beautyScore=10, goldBonus=0.06 },
  { id="umbrella",    name="Parasol",          emoji="⛱️", category="confort",  cost=150,  beautyScore=6,  goldBonus=0.04 },
  { id="lounge",      name="Chaise Longue",    emoji="🛋️", category="confort",  cost=250,  beautyScore=9,  goldBonus=0.05 },
  { id="hot_tub",     name="Bain à Remous",    emoji="♨️", category="confort",  cost=2000, beautyScore=50, goldBonus=0.25 },
  -- Catégorie Lumière
  { id="lantern",     name="Lanterne",         emoji="🏮", category="lumiere",  cost=200,  beautyScore=8,  goldBonus=0.04 },
  { id="firepit",     name="Feu de Camp",      emoji="🔥", category="lumiere",  cost=350,  beautyScore=14, goldBonus=0.07 },
  { id="rainbow_arc", name="Arc-en-ciel",      emoji="🌈", category="lumiere",  cost=5000, beautyScore=100,goldBonus=0.5  },
  -- Catégorie Nourriture
  { id="fruit_bowl",  name="Coupe de Fruits",  emoji="🍈", category="nourriture",cost=100, beautyScore=4,  goldBonus=0.05 },
  { id="orange_tree", name="Oranger",          emoji="🍊", category="nourriture",cost=600, beautyScore=18, goldBonus=0.12 },
  -- Catégorie Premium (game pass ou CapyGold élevé)
  { id="golden_stat", name="Statue Dorée",     emoji="🏆", category="premium",  cost=10000,beautyScore=200,goldBonus=1.0  },
  { id="neon_sign",   name="Panneau Néon",     emoji="🎆", category="premium",  cost=8000, beautyScore=150,goldBonus=0.8  },
}
-- goldBonus = bonus % de CapyGold/min pour tout le spa (additif)

-- ── UPGRADES PERMANENTS ──────────────────────────────────────────────────────
GameConfig.Upgrades = {
  { id="luckBoost",    label="🍀 Chance Nature",   desc="Plus de capybaras rares dans la nature",  baseCost=300,  mult=2.5, max=10, effectType="spawnRarity"   },
  { id="goldBoost",    label="💰 CapyGold +",      desc="Tous les spas produisent plus",            baseCost=200,  mult=2,   max=15, effectType="goldMultiplier" },
  { id="captureBoost", label="🎯 Capture +",       desc="Meilleure chance de capture globale",      baseCost=400,  mult=2.2, max=8,  effectType="captureChance"  },
  { id="breedSpeed",   label="⚡ Élevage +",       desc="Réduction temps de gestation",             baseCost=500,  mult=2.5, max=8,  effectType="breedSpeed"     },
  { id="spaCapacity",  label="🏊 Capacité Spa +",  desc="+1 capybara par spa",                     baseCost=600,  mult=3,   max=5,  effectType="spaCapacity"    },
  { id="visitorMagnet",label="👥 Visiteurs +",     desc="Plus de visiteurs NPC payants",            baseCost=350,  mult=2.3, max=10, effectType="visitorRate"    },
  { id="beautyAura",   label="✨ Aura Beauté",     desc="+5% score beauté global",                  baseCost=450,  mult=2,   max=8,  effectType="beautyBonus"    },
}

-- ── GAME PASSES (IDs à 0 avant publication) ──────────────────────────────────
GameConfig.GamePasses = {
  VIP          = { id=0, name="VIP 🌟",           price=499, desc="×2 CapyGold partout, badge exclusif"       },
  AutoCollect  = { id=0, name="Auto-Spa 🤖",      price=299, desc="Les spas collectent seuls (offline)"       },
  LuckyAura    = { id=0, name="Aura Chanceux ✨",  price=199, desc="+30% chance capture ET élevage rare"       },
  ExtraPlots   = { id=0, name="Plots Bonus 🏗️",   price=399, desc="+4 plots de construction supplémentaires"  },
  CosmeticPack = { id=0, name="Pack Cosmétique 🎨",price=199, desc="Décos exclusives débloquées"               },
}

-- ── REBIRTH ───────────────────────────────────────────────────────────────────
GameConfig.RebirthCost          = 50000   -- CapyGold requis
GameConfig.RebirthMultiplier    = 1.75    -- multiplicateur cumulatif (× à chaque rebirth)
GameConfig.RebirthMaxLevel      = 15

-- ── NATURE ZONE ───────────────────────────────────────────────────────────────
GameConfig.NatureZone = {
  SpawnIntervalMin    = 5,
  SpawnIntervalMax    = 12,
  MaxWildCapybaras    = 12,
  DespawnTime         = 45,
  FleeChance          = 20,
  RareHideMultiplier  = 2,
  EncounterRadius     = 8,
}

-- ── VISITEURS NPC ─────────────────────────────────────────────────────────────
GameConfig.Visitors = {
  SpawnIntervalBase = 30,
  StayDuration      = { min=20, max=60 },
  GoldPerVisit      = { min=3, max=15 },
  BeautyScoreBonus  = 0.5,
}

-- ── SYSTÈME D'INTERACTION CAPYBARA ────────────────────────────────────────────
GameConfig.Interactions = {
  { id="pet",     label="🤚 Caresser",  happinessGain=10, goldBonus=1.05, cooldown=30  },
  { id="feed",    label="🍊 Nourrir",   happinessGain=20, goldBonus=1.1,  cooldown=60,  cost=5  },
  { id="play",    label="🎾 Jouer",     happinessGain=15, goldBonus=1.08, cooldown=45  },
  { id="groom",   label="💆 Coiffer",   happinessGain=25, goldBonus=1.15, cooldown=90,  cost=10 },
  { id="luxury",  label="♨️ Bain VIP",  happinessGain=50, goldBonus=1.3,  cooldown=180, cost=50 },
}
GameConfig.InteractionBonusDuration = 900  -- secondes (15 min) de bonus temporaire

-- ── LEADERBOARDS ──────────────────────────────────────────────────────────────
GameConfig.Leaderboards = {
  { id="totalGold",    name="💰 CapyGold Total",    dsKey="CapySpa_TotalGold_v2",    desc="Total de CapyGold gagné depuis le début" },
  { id="beautyScore",  name="✨ Plus Beau Spa",      dsKey="CapySpa_Beauty_v2",       desc="Score de beauté du spa" },
  { id="capyCollect",  name="🐾 Plus Grand Éleveur", dsKey="CapySpa_Collection_v2",   desc="Nombre total de capybaras obtenus" },
}

-- ── HELPERS ───────────────────────────────────────────────────────────────────
function GameConfig.getRarity(rarityId)
  return GameConfig.Rarities[rarityId]
end

function GameConfig.getToolById(toolId)
  for _, t in ipairs(GameConfig.CaptureTools) do
    if t.id == toolId then return t end
  end
  return nil
end

function GameConfig.getSpaLevel(level)
  return GameConfig.SpaLevels[level]
end

function GameConfig.getDecoById(decoId)
  for _, d in ipairs(GameConfig.Decorations) do
    if d.id == decoId then return d end
  end
  return nil
end

function GameConfig.getUpgradeById(upgradeId)
  for _, u in ipairs(GameConfig.Upgrades) do
    if u.id == upgradeId then return u end
  end
  return nil
end

function GameConfig.getInteractionById(interactionId)
  for _, i in ipairs(GameConfig.Interactions) do
    if i.id == interactionId then return i end
  end
  return nil
end

return GameConfig
