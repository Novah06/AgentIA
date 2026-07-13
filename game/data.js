// ASTRIA — données de jeu : héros, factions, équilibrage. Tout l'équilibrage vit ici (données, pas code).

export const FACTIONS = {
  solacia: { color: "#f5b942", counter: "verdaine" },
  verdaine: { color: "#6fce7f", counter: "karvok" },
  karvok: { color: "#e0813f", counter: "nerisse" },
  nerisse: { color: "#4fb8d6", counter: "solacia" },
  nyxara: { color: "#a06fd8", counter: "lucens" },
  lucens: { color: "#efe9ff", counter: "nyxara" },
  brume: { color: "#8a5fd0", counter: "" },
};

export const RARITIES = {
  eveille: { mult: 1.0, color: "#5aa2e0", stars: 3 },
  astral: { mult: 1.15, color: "#b06fe8", stars: 4 },
  legendaire: { mult: 1.35, color: "#f2c14e", stars: 5 },
  mythique: { mult: 1.6, color: "#ff9de2", stars: 6 },
};

// class → ciblage de l'attaque de base
export const CLASSES = {
  tank: { row: "front", target: "first" },
  warrior: { row: "front", target: "first" },
  assassin: { row: "back", target: "weakest" },
  archer: { row: "back", target: "random" },
  mage: { row: "back", target: "splash" },
  support: { row: "back", target: "smart" },
};

// base = stats au niveau 1 avant multiplicateur de rareté
export const HEROES = [
  { id: "kaelis", name: "Kaelis, la Lame du Zénith", faction: "solacia", cls: "warrior", rarity: "legendaire",
    base: { hp: 950, atk: 62, def: 34, spd: 100 },
    ult: { kind: "aoe_blind", pct: 1.8, dur: 4000 },
    ultName: "Jugement Solaire", ultDesc: "Onde de lumière : 180 % ATQ à tous les ennemis, qui ratent 25 % de leurs coups pendant 4 s." },
  { id: "bramble", name: "Bramble", faction: "verdaine", cls: "tank", rarity: "eveille",
    base: { hp: 1500, atk: 38, def: 52, spd: 82 },
    ult: { kind: "shield", pct: 0.4, dur: 6000 },
    ultName: "Cœur de l'Ancien", ultDesc: "Bouclier d'écorce : chaque allié gagne un bouclier de 40 % des PV max de Bramble pendant 6 s." },
  { id: "maelle", name: "Maëlle des Marées", faction: "nerisse", cls: "support", rarity: "astral",
    base: { hp: 900, atk: 50, def: 30, spd: 92 },
    ult: { kind: "heal_sleep", pct: 2.5, dur: 3000 },
    ultName: "Marée Berceuse", ultDesc: "Soigne toute l'équipe de 250 % ATQ et endort l'ennemi le plus faible 3 s." },
  { id: "sorren", name: "Sorren l'Abysse", faction: "nerisse", cls: "assassin", rarity: "legendaire",
    base: { hp: 820, atk: 74, def: 26, spd: 112 },
    ult: { kind: "execute", pct: 4.2 },
    ultName: "Plongée Nocturne", ultDesc: "Frappe l'ennemi le plus faible : 420 % ATQ. S'il meurt, Sorren regagne 60 % de son énergie." },
  { id: "grondin", name: "Grondin Feu-de-Forge", faction: "karvok", cls: "archer", rarity: "eveille",
    base: { hp: 860, atk: 58, def: 28, spd: 96 },
    ult: { kind: "turret", pct: 0.6, hits: 6, dur: 6000 },
    ultName: "Canon Geyser", ultDesc: "Déploie une tourelle : 6 tirs de 60 % ATQ sur des ennemis aléatoires pendant 6 s." },
  { id: "vesperine", name: "Dame Vespérine", faction: "nyxara", cls: "mage", rarity: "legendaire",
    base: { hp: 880, atk: 68, def: 27, spd: 90 },
    ult: { kind: "lanterns", pct: 0.9, hits: 5 },
    ultName: "Bal des Lanternes", ultDesc: "5 lanternes d'âmes : 90 % ATQ chacune, et soignent l'allié le plus blessé de 50 % des dégâts infligés." },
  { id: "pipbogue", name: "Pip & Bogue", faction: "karvok", cls: "support", rarity: "astral",
    base: { hp: 1050, atk: 44, def: 36, spd: 88 },
    ult: { kind: "haste", pct: 0.35, dur: 6000, energy: 200 },
    ultName: "Surrégime !", ultDesc: "Toute l'équipe : +35 % de vitesse d'attaque pendant 6 s et +200 énergie." },
  { id: "sylvarende", name: "Sylvarende", faction: "verdaine", cls: "mage", rarity: "astral",
    base: { hp: 920, atk: 60, def: 30, spd: 86 },
    ult: { kind: "aoe_stun", pct: 1.4, dur: 2000 },
    ultName: "Chant des Racines-Monde", ultDesc: "Ronces : 140 % ATQ à tous les ennemis et enracine la ligne avant 2 s." },
  { id: "theoline", name: "Théoline Autan", faction: "solacia", cls: "archer", rarity: "eveille",
    base: { hp: 800, atk: 60, def: 25, spd: 104 },
    ult: { kind: "volley", pct: 0.45, hits: 12, energy: 100 },
    ultName: "Pluie d'Aube", ultDesc: "12 flèches de lumière sur des cibles aléatoires (45 % ATQ) et +100 énergie à toute l'équipe." },
  { id: "nhyx", name: "Nhyx, l'Éclat Pur", faction: "lucens", cls: "assassin", rarity: "mythique",
    base: { hp: 940, atk: 78, def: 30, spd: 108 },
    ult: { kind: "timestop", pct: 1.2, dur: 2500, mark: 0.15, markDur: 5000 },
    ultName: "Heure Silencieuse", ultDesc: "Arrête le temps 2,5 s pour les ennemis ; les cibles touchées subissent +15 % de dégâts pendant 5 s." },
];

export const BAL = {
  save_key: "astria_save_v1",
  start: { gold: 2000, diamonds: 900, scrolls: 10 },

  // progression des héros
  level_cost: (l) => Math.round(12 * Math.pow(l, 1.5)),      // or pour passer du niveau l à l+1
  stat_per_level: 0.08,                                       // +8 % de stats de base par niveau
  asc_mult: 1.25,                                             // ×1,25 par palier d'ascension
  asc_cost: [1, 2, 3, 4],                                     // doublons requis par palier (max 4 = Stellaire)
  max_level: 240,

  // combat
  tick_ms: 100,
  battle_timeout_ms: 60000,
  energy_max: 1000,
  energy_per_attack: 180,
  energy_per_hit: 60,
  crit_chance: 0.15,
  crit_mult: 1.6,
  counter_bonus: 1.25,
  def_soak: 0.5,                                              // dégâts = ATQ×mult − DÉF×soak
  min_dmg_pct: 0.1,
  attack_interval_ms: 1800,                                   // à 100 de VIT

  // campagne
  stages_per_chapter: 10,
  enemy_base_mult: 0.7,
  enemy_growth: 1.055,                                        // par niveau global
  boss_mult: 1.35,
  elite_mult: 1.6,                                            // Chefs : stats ×1,6
  wave_mults: [0.5, 0.62],                                    // multiplicateur par vague (niveau normal)
  wave_mults_boss: [0.45, 0.55, 0.5],                         // niveau de boss (3e vague : le Dévoreur)
  reward_gold: (idx) => 240 + 90 * idx,
  reward_gold_replay: (idx) => 60 + 15 * idx,
  reward_diamonds_first: 50,

  // AFK
  afk_cap_h: 12,
  afk_gold_min: (idx) => 12 * Math.pow(1.07, idx),
  afk_scroll_every_h: 6,
  instant_afk_h: 2,

  // invocation
  summon_cost: 300,
  summon_cost_10: 2700,
  rates: { eveille: 0.58, astral: 0.33, legendaire: 0.084, mythique: 0.006 },
  pity_leg: 30,
  pity_myth: 80,

  // quêtes quotidiennes : id → récompense
  quests: {
    win3: { goal: 3, diamonds: 30 },
    summon1: { goal: 1, diamonds: 50 },
    afk1: { goal: 1, diamonds: 40 },
    upgrade3: { goal: 3, diamonds: 30 },
  },
  login: [
    { diamonds: 100 }, { scrolls: 1 }, { diamonds: 150 }, { gold: 3000 },
    { scrolls: 2 }, { diamonds: 200 }, { diamonds: 300, scrolls: 3 },
  ],
};

// Bestiaire de la Brume : créatures (vagues), Chefs (élites de 2e vague) et Dévoreurs (boss)
export const CREATURES = [
  { id: "brume_loup", name: "Loup Brumé", faction: "verdaine", cls: "warrior", tier: "mob",
    base: { hp: 800, atk: 55, def: 26, spd: 106 },
    ult: { kind: "execute", pct: 3.0 }, ultName: "Morsure de Brume" },
  { id: "brume_golem", name: "Golem de Suie", faction: "karvok", cls: "tank", tier: "mob",
    base: { hp: 1400, atk: 40, def: 48, spd: 78 },
    ult: { kind: "shield", pct: 0.35, dur: 5000 }, ultName: "Carapace de Cendre" },
  { id: "brume_corbeau", name: "Corbeau du Voile", faction: "nyxara", cls: "archer", tier: "mob",
    base: { hp: 720, atk: 58, def: 22, spd: 108 },
    ult: { kind: "volley", pct: 0.5, hits: 6, energy: 0 }, ultName: "Nuée de Plumes" },
  { id: "brume_meduse", name: "Méduse d'Ombre", faction: "nerisse", cls: "mage", tier: "mob",
    base: { hp: 780, atk: 60, def: 24, spd: 88 },
    ult: { kind: "lanterns", pct: 0.8, hits: 4 }, ultName: "Voile Siphon" },
  { id: "brume_aragne", name: "Aragne de Brume", faction: "nyxara", cls: "assassin", tier: "mob",
    base: { hp: 700, atk: 62, def: 20, spd: 112 },
    ult: { kind: "aoe_stun", pct: 1.0, dur: 1500 }, ultName: "Toile Paralysante" },
  { id: "brume_sanglier", name: "Sanglier Cendreux", faction: "solacia", cls: "warrior", tier: "mob",
    base: { hp: 1000, atk: 52, def: 34, spd: 92 },
    ult: { kind: "aoe_blind", pct: 1.3, dur: 2500 }, ultName: "Charge Fumante" },
  { id: "devoreur_leviathan", name: "Le Léviathan de Suie", faction: "brume", cls: "warrior", tier: "boss",
    base: { hp: 5200, atk: 85, def: 45, spd: 90 },
    ult: { kind: "aoe_blind", pct: 2.0, dur: 4000 }, ultName: "Marée de Suie" },
  { id: "devoreur_tisseuse", name: "La Tisseuse de Silence", faction: "brume", cls: "mage", tier: "boss",
    base: { hp: 4400, atk: 95, def: 38, spd: 96 },
    ult: { kind: "aoe_stun", pct: 1.6, dur: 2500 }, ultName: "Suaire de Soie" },
  { id: "devoreur_avale", name: "L'Avale-Soleil", faction: "brume", cls: "tank", tier: "boss",
    base: { hp: 6500, atk: 75, def: 55, spd: 80 },
    ult: { kind: "execute", pct: 4.5 }, ultName: "Grand Engloutissement" },
];
export const BOSS_IDS = CREATURES.filter((c) => c.tier === "boss").map((c) => c.id);
export function creatureById(id) { return CREATURES.find((c) => c.id === id); }

// biomes de combat : 1 par région du GDD, cyclés au-delà du chapitre 5
export const BIOMES = ["zenith", "sylve", "forge", "maree", "voile"];
export function biomeOf(ch) { return BIOMES[ch % BIOMES.length]; }

export function heroById(id) { return HEROES.find((h) => h.id === id); }

export function chapterOf(idx, stagesPerChapter = BAL.stages_per_chapter) {
  return { ch: Math.floor(idx / stagesPerChapter), st: idx % stagesPerChapter };
}
