// ASTRIA — Les Éclats du Ciel Brisé : client de jeu (solo, mobile-first).
import { STR } from "./strings.js";
import { HEROES, CREATURES, BOSS_IDS, creatureById, FACTIONS, RARITIES, CLASSES, BAL, BIOMES, biomeOf, heroById, chapterOf } from "./data.js";

/* ---------------------------------- utils --------------------------------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e4 ? Math.round(n / 1e3) + "k" : n >= 1000 ? (n / 1e3).toFixed(1) + "k" : String(Math.round(n));
const todayKey = () => new Date().toISOString().slice(0, 10);

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function toast(msg) {
  const t = el("div", "toast", msg);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 350); }, 1900);
}

/* ---------------------------------- état ---------------------------------- */

function defaultState() {
  return {
    v: 1, created: Date.now(),
    gold: BAL.start.gold, diamonds: BAL.start.diamonds, scrolls: BAL.start.scrolls,
    roster: {}, team: [], stage: 0,
    afkLast: Date.now(), instantDate: "",
    pityLeg: 0, totalPulls: 0, gotNhyx: false,
    quests: { date: todayKey(), prog: {}, claimed: {} },
    login: { idx: 0, last: "" },
    tuto: 0, attempts: 0, ultMode: "auto",
  };
}
let S = load();

function load() {
  try {
    const raw = localStorage.getItem(BAL.save_key);
    if (!raw) return defaultState();
    const s = Object.assign(defaultState(), JSON.parse(raw));
    if (s.quests.date !== todayKey()) s.quests = { date: todayKey(), prog: {}, claimed: {} };
    return s;
  } catch { return defaultState(); }
}
function save() { try { localStorage.setItem(BAL.save_key, JSON.stringify(S)); } catch { /* stockage plein/privé */ } }

function quest(id, n = 1) {
  S.quests.prog[id] = (S.quests.prog[id] || 0) + n;
  save(); refreshBadges();
}

/* ------------------------------ stats de héros ----------------------------- */

function heroState(id) { return S.roster[id]; }
function heroStats(id) {
  const h = heroById(id), r = S.roster[id] || { lvl: 1, asc: 0 };
  const m = RARITIES[h.rarity].mult * (1 + BAL.stat_per_level * (r.lvl - 1)) * Math.pow(BAL.asc_mult, r.asc);
  return {
    hp: Math.round(h.base.hp * m), atk: Math.round(h.base.atk * m),
    def: Math.round(h.base.def * m), spd: h.base.spd + 2 * r.asc,
  };
}
function heroPower(id) {
  const s = heroStats(id);
  return Math.round((s.hp / 8 + s.atk * 4 + s.def * 6) * (s.spd / 100));
}
function teamPower() { return S.team.reduce((a, id) => a + heroPower(id), 0); }

/* --------------------------------- campagne -------------------------------- */

function chapterName(ch) {
  return ch < STR.ch_names.length ? STR.ch_names[ch] : `${STR.ch_endless} ${ch - STR.ch_names.length + 1}`;
}
// composition des vagues : créatures Brumées, un Chef en dernière vague, Dévoreur au niveau 10
function wavesFor(idx) {
  const rng = mulberry32(idx * 7919 + 17);
  const mobs = CREATURES.filter((c) => c.tier === "mob");
  const pick = () => mobs[Math.floor(rng() * mobs.length)];
  const mult = BAL.enemy_base_mult * Math.pow(BAL.enemy_growth, idx);
  const { ch, st } = chapterOf(idx);
  const isBoss = st === BAL.stages_per_chapter - 1;
  const mobSpecs = (n, m) => Array.from({ length: n }, () => ({ c: pick(), mult: m }));
  if (!isBoss) {
    const [m1, m2] = BAL.wave_mults;
    return [
      mobSpecs(4, mult * m1),
      [...mobSpecs(3, mult * m2), { c: pick(), mult: mult * m2, elite: true }],
    ];
  }
  const [m1, m2, m3] = BAL.wave_mults_boss;
  const boss = creatureById(BOSS_IDS[ch % BOSS_IDS.length]);
  return [
    mobSpecs(4, mult * m1),
    [...mobSpecs(3, mult * m2), { c: pick(), mult: mult * m2, elite: true }],
    [{ c: boss, mult: mult * m3, boss: true }, ...mobSpecs(2, mult * m2)],
  ];
}
function specPower(s) {
  const b = s.c.base, m = s.mult * (s.elite ? BAL.elite_mult : 1);
  return ((b.hp * m) / 8 + b.atk * m * 4 + b.def * m * 6) * (b.spd / 100);
}
function enemyPower(idx) {
  return Math.round(Math.max(...wavesFor(idx).map((w) => w.reduce((a, s) => a + specPower(s), 0))) * 1.1);
}

/* ----------------------------------- AFK ----------------------------------- */

function afkRate() { return BAL.afk_gold_min(S.stage); }
function afkPending() {
  const ms = Math.min(Date.now() - S.afkLast, BAL.afk_cap_h * 3600e3);
  const min = ms / 60000;
  return { ms, gold: Math.floor(min * afkRate()), scrolls: Math.floor(ms / 3600e3 / BAL.afk_scroll_every_h) };
}
function claimAfk() {
  const p = afkPending();
  if (p.gold < 1) { toast(STR.afk_empty); return; }
  S.gold += p.gold; S.scrolls += p.scrolls; S.afkLast = Date.now();
  quest("afk1");
  save(); toast(`+${fmt(p.gold)} ${STR.toast_gold}` + (p.scrolls ? ` · +${p.scrolls} ${STR.toast_scrolls}` : ""));
  render();
}
function instantAfk() {
  if (S.instantDate === todayKey()) { toast(STR.afk_instant_used); return; }
  S.instantDate = todayKey();
  const gold = Math.floor(BAL.instant_afk_h * 60 * afkRate());
  S.gold += gold; save(); toast(`+${fmt(gold)} ${STR.toast_gold}`); render();
}

/* --------------------------------- invocation ------------------------------ */

function rollRarity(forced) {
  if (forced) return forced;
  const r = Math.random(), R = BAL.rates;
  if (r < R.mythique) return "mythique";
  if (r < R.mythique + R.legendaire) return "legendaire";
  if (r < R.mythique + R.legendaire + R.astral) return "astral";
  return "eveille";
}
function doSummon(n) {
  const costD = n === 10 ? BAL.summon_cost_10 : BAL.summon_cost;
  if (S.scrolls >= n) S.scrolls -= n;
  else if (S.diamonds >= costD) S.diamonds -= costD;
  else { toast(STR.summon_not_enough); return null; }

  const out = [];
  for (let i = 0; i < n; i++) {
    S.totalPulls++; S.pityLeg++;
    let rar = rollRarity();
    if (!S.gotNhyx && S.totalPulls >= BAL.pity_myth) rar = "mythique";
    if (S.pityLeg >= BAL.pity_leg && rar !== "legendaire" && rar !== "mythique") rar = "legendaire";
    let pool = HEROES.filter((h) => h.rarity === rar);
    if (!pool.length) pool = HEROES.filter((h) => h.rarity === "legendaire");
    // biais découverte : favorise les héros non possédés tant qu'il en reste
    const fresh = pool.filter((h) => !S.roster[h.id]);
    if (fresh.length && Math.random() < 0.6) pool = fresh;
    const h = pool[Math.floor(Math.random() * pool.length)];
    if (rar === "legendaire" || rar === "mythique") S.pityLeg = 0;
    if (h.id === "nhyx") S.gotNhyx = true;
    const isNew = !S.roster[h.id];
    if (isNew) S.roster[h.id] = { lvl: 1, asc: 0, copies: 0 };
    else S.roster[h.id].copies++;
    out.push({ hero: h, isNew });
  }
  quest("summon1", n >= 1 ? 1 : 0);
  save();
  return out;
}

/* --------------------------------- rendu UI -------------------------------- */

const app = document.getElementById("app");
let screen = "home";

function currencyBar() {
  return `<div class="curbar">
    <span class="cur">🪙 ${fmt(S.gold)}</span>
    <span class="cur">💎 ${fmt(S.diamonds)}</span>
    <span class="cur">📜 ${S.scrolls}</span>
  </div>`;
}

function questsReady() {
  let n = 0;
  for (const [id, q] of Object.entries(BAL.quests))
    if ((S.quests.prog[id] || 0) >= q.goal && !S.quests.claimed[id]) n++;
  if (S.login.last !== todayKey() && S.login.idx < BAL.login.length) n++;
  return n;
}
function refreshBadges() {
  const b = document.querySelector('[data-nav="quests"] .badge');
  if (b) { const n = questsReady(); b.textContent = n; b.style.display = n ? "flex" : "none"; }
}

function nav() {
  const items = [
    ["home", "🏝", STR.nav_home], ["heroes", "🛡", STR.nav_heroes], ["campaign", "⚔", STR.nav_campaign],
    ["summon", "✨", STR.nav_summon], ["quests", "📜", STR.nav_quests],
  ];
  return `<nav class="nav">` + items.map(([id, ic, label]) =>
    `<button class="nav-btn ${screen === id ? "on" : ""} ${id === "campaign" ? "big" : ""}" data-nav="${id}">
       <span class="ic">${ic}</span><span>${label}</span>
       ${id === "quests" ? '<span class="badge" style="display:none"></span>' : ""}
     </button>`).join("") + `</nav>`;
}

function heroCard(h, opts = {}) {
  const r = S.roster[h.id];
  const rar = RARITIES[h.rarity], fac = FACTIONS[h.faction];
  return `<div class="hcard ${r ? "" : "locked"}" data-hero="${h.id}" style="--rar:${rar.color};--fac:${fac.color}">
    <div class="hport"><img src="./assets/portraits/${h.id}.jpg" alt="" loading="lazy" draggable="false">
      ${opts.tag ? `<span class="htag">${opts.tag}</span>` : ""}</div>
    <div class="hname">${h.name.split(",")[0]}</div>
    <div class="hmeta">${"★".repeat(Math.min(rar.stars, 5))}${r ? ` · ${STR.hero_level} ${r.lvl}` : ""}</div>
  </div>`;
}

/* --- écrans --- */

function homeScreen() {
  const p = afkPending();
  const hours = Math.floor(p.ms / 3600e3), mins = Math.floor((p.ms % 3600e3) / 60000);
  return `
  <header class="hero-head">
    <img class="keyart" src="./assets/keyart.jpg" alt="">
    <div class="title-block"><h1>${STR.title}</h1><p>${STR.subtitle}</p></div>
  </header>
  <section class="panel afk-panel" id="afkPanel">
    <div class="afk-chest">🧭</div>
    <div class="afk-info">
      <b>${STR.afk_title}</b>
      <span>${hours}h ${String(mins).padStart(2, "0")}m ${STR.afk_cap}</span>
      <span class="dim">+${fmt(p.gold)} 🪙${p.scrolls ? ` · +${p.scrolls} 📜` : ""} — ${afkRate().toFixed(1)} 🪙${STR.afk_per_min}</span>
    </div>
    <div class="afk-actions">
      <button class="btn gold" id="btnClaim">${STR.afk_claim}</button>
      <button class="btn ghost small" id="btnInstant">${STR.afk_instant}</button>
    </div>
  </section>
  <section class="panel">
    <div class="row-between"><b>${STR.team_title}</b><span class="dim">${STR.team_power} ${fmt(teamPower())}</span></div>
    <div class="team-row">${S.team.map((id) => heroCard(heroById(id))).join("") || `<span class="dim">${STR.team_edit} →</span>`}</div>
    <button class="btn ghost" data-nav="heroes">${STR.team_edit}</button>
  </section>
  <section class="panel">
    <div class="row-between"><b>${STR.campaign_title}</b>
      <span class="dim">${STR.campaign_chapter} ${chapterOf(S.stage).ch + 1} — ${chapterName(chapterOf(S.stage).ch)}</span></div>
    <button class="btn primary" id="btnFight">${STR.campaign_fight} — ${STR.campaign_stage} ${chapterOf(S.stage).st + 1}/10</button>
  </section>
  <p class="hint">${STR.install_hint}</p>`;
}

function heroesScreen() {
  const owned = HEROES.filter((h) => S.roster[h.id]);
  return `
  <h2>${STR.heroes_title} <span class="dim">${owned.length}/${HEROES.length} ${STR.heroes_owned}</span></h2>
  <p class="hint">${STR.factions_hint}</p>
  <div class="hgrid">
    ${HEROES.map((h) => heroCard(h, { tag: S.team.includes(h.id) ? "⚔" : "" })).join("")}
  </div>`;
}

function heroDetail(id) {
  const h = heroById(id), r = S.roster[id];
  const st = heroStats(id), rar = RARITIES[h.rarity];
  const inTeam = S.team.includes(id);
  const ascNeed = r && r.asc < BAL.asc_cost.length ? BAL.asc_cost[r.asc] : null;
  const cost = r ? BAL.level_cost(r.lvl) : 0;
  const body = `
  <div class="hd-top" style="--rar:${rar.color}">
    <img src="./assets/portraits/${id}.jpg" alt="">
    <div>
      <h3>${h.name}</h3>
      <div class="chips">
        <span class="chip" style="background:${FACTIONS[h.faction].color}22;border-color:${FACTIONS[h.faction].color}">${STR["fac_" + h.faction]}</span>
        <span class="chip">${STR["cls_" + h.cls]}</span>
        <span class="chip" style="color:${rar.color}">${STR["rar_" + h.rarity]} ${"★".repeat(Math.min(rar.stars, 5))}</span>
      </div>
      ${r ? `<div class="dim">${STR.hero_level} ${r.lvl}${r.asc ? ` · ${STR.hero_ascend} +${r.asc}` : ""} · ${STR.hero_power} ${fmt(heroPower(id))}</div>` : `<div class="dim">${STR.hero_not_owned}</div>`}
    </div>
  </div>
  ${r ? `
  <div class="stats4">
    <span>${STR.hero_stats_hp}<b>${fmt(st.hp)}</b></span><span>${STR.hero_stats_atk}<b>${st.atk}</b></span>
    <span>${STR.hero_stats_def}<b>${st.def}</b></span><span>${STR.hero_stats_spd}<b>${st.spd}</b></span>
  </div>` : ""}
  <div class="ult-box"><b>✦ ${STR.hero_ult} — ${h.ultName}</b><p>${h.ultDesc}</p></div>
  ${r ? `
  <div class="hd-actions">
    <button class="btn gold" id="hdUp">${STR.hero_upgrade} → ${STR.hero_level} ${r.lvl + 1} (${fmt(cost)} 🪙)</button>
    ${ascNeed !== null ? `<button class="btn ghost" id="hdAsc" ${(r.copies || 0) >= ascNeed ? "" : "disabled"}>
        ${STR.hero_ascend} (${r.copies || 0}/${ascNeed} ${STR.hero_ascend_need})</button>`
      : `<button class="btn ghost" disabled>${STR.hero_ascend} ${STR.hero_max}</button>`}
    <button class="btn ${inTeam ? "danger" : "primary"}" id="hdTeam">${inTeam ? STR.hero_remove_team : STR.hero_add_team}</button>
  </div>` : ""}`;
  openModal(body, () => {
    const up = document.getElementById("hdUp");
    if (up) up.onclick = () => {
      if (S.gold < cost) { toast(`${fmt(cost)} 🪙 ?`); return; }
      S.gold -= cost; r.lvl++; quest("upgrade3"); save();
      toast(`${h.name.split(",")[0]} ${STR.toast_upgraded} ${r.lvl}`);
      render(); heroDetail(id);
    };
    const asc = document.getElementById("hdAsc");
    if (asc) asc.onclick = () => {
      r.copies -= BAL.asc_cost[r.asc]; r.asc++; save();
      toast(STR.toast_ascended); render(); heroDetail(id);
    };
    const tm = document.getElementById("hdTeam");
    if (tm) tm.onclick = () => {
      if (inTeam) S.team = S.team.filter((x) => x !== id);
      else if (S.team.length >= 5) { toast(STR.team_full); return; }
      else S.team.push(id);
      save(); toast(STR.toast_team_saved); closeModal(); render();
    };
  });
}

function campaignScreen() {
  const { ch, st } = chapterOf(S.stage);
  const isBoss = st === BAL.stages_per_chapter - 1;
  const nodes = [];
  for (let i = 0; i < BAL.stages_per_chapter; i++) {
    const gIdx = ch * BAL.stages_per_chapter + i;
    const cls = gIdx < S.stage ? "done" : gIdx === S.stage ? "cur" : "lock";
    nodes.push(`<div class="snode ${cls}">${i === BAL.stages_per_chapter - 1 ? "👑" : i + 1}</div>`);
  }
  return `
  <h2>${STR.campaign_title}</h2>
  <div class="panel">
    <div class="row-between"><b>${STR.campaign_chapter} ${ch + 1} — ${chapterName(ch)}</b>
    ${isBoss ? `<span class="boss-tag">${STR.campaign_boss}</span>` : ""}</div>
    <div class="smap">${nodes.join("")}</div>
    <div class="row-between">
      <span class="dim">${STR.team_power} <b>${fmt(teamPower())}</b></span>
      <span class="dim">${STR.campaign_reco} <b>${fmt(enemyPower(S.stage))}</b></span>
    </div>
    <button class="btn primary" id="btnFight">${STR.campaign_fight} — ${STR.campaign_stage} ${st + 1}/10</button>
    ${S.stage > 0 ? `<button class="btn ghost" id="btnFarm">↻ ${STR.campaign_stage} ${st === 0 ? 10 : st}/10 (+${fmt(BAL.reward_gold_replay(S.stage - 1))} 🪙)</button>` : ""}
  </div>
  <div class="panel"><b>${STR.factions_title}</b><p class="hint">${STR.factions_hint}</p></div>`;
}

function summonScreen() {
  const pityL = BAL.pity_leg - S.pityLeg;
  const pityM = Math.max(0, BAL.pity_myth - S.totalPulls);
  return `
  <h2>${STR.summon_title}</h2>
  <div class="panel altar">
    <div class="altar-star">✦</div>
    <div class="pity">
      <span>${STR.summon_pity} <b>${pityL}</b> ${STR.summon_pulls}</span>
      ${!S.gotNhyx ? `<span>${STR.summon_pity_myth} <b>${pityM}</b> ${STR.summon_pulls}</span>` : ""}
    </div>
    <button class="btn gold" id="btnS1">${STR.summon_one}<small>${STR.summon_cost_1}</small></button>
    <button class="btn primary" id="btnS10">${STR.summon_ten}<small>${STR.summon_cost_10}</small></button>
    <p class="hint">${STR.summon_rates}</p>
  </div>`;
}

function questsScreen() {
  const qhtml = Object.entries(BAL.quests).map(([id, q]) => {
    const p = Math.min(S.quests.prog[id] || 0, q.goal);
    const done = p >= q.goal, claimed = S.quests.claimed[id];
    return `<div class="quest">
      <div><b>${STR["quest_" + id]}</b><div class="qbar"><i style="width:${(p / q.goal) * 100}%"></i></div>
      <span class="dim">${p}/${q.goal} · +${q.diamonds} 💎</span></div>
      <button class="btn small ${done && !claimed ? "gold" : "ghost"}" data-quest="${id}" ${done && !claimed ? "" : "disabled"}>
        ${claimed ? STR.quest_claimed : STR.quest_claim}</button>
    </div>`;
  }).join("");
  const canLogin = S.login.last !== todayKey() && S.login.idx < BAL.login.length;
  const login = BAL.login.map((r, i) => {
    const got = i < S.login.idx, cur = i === S.login.idx && canLogin;
    const txt = [r.diamonds && `${r.diamonds}💎`, r.scrolls && `${r.scrolls}📜`, r.gold && `${fmt(r.gold)}🪙`].filter(Boolean).join(" ");
    return `<div class="lcell ${got ? "got" : ""} ${cur ? "cur" : ""}"><span>${STR.login_day} ${i + 1}</span><b>${txt}</b></div>`;
  }).join("");
  return `
  <h2>${STR.quests_title}</h2><p class="hint">${STR.quests_reset}</p>
  ${qhtml}
  <div class="panel"><b>${STR.login_title}</b>
    <div class="lgrid">${login}</div>
    ${canLogin ? `<button class="btn gold" id="btnLogin">${STR.login_claim} ${S.login.idx + 1}</button>` : `<p class="hint">${STR.login_done}</p>`}
  </div>`;
}

/* --- modales --- */

function openModal(html, after) {
  closeModal();
  const wrap = el("div", "modal-wrap");
  wrap.innerHTML = `<div class="modal">${html}<button class="modal-x">✕</button></div>`;
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.classList.contains("modal-x")) closeModal(); });
  document.body.appendChild(wrap);
  if (after) after();
}
function closeModal() { document.querySelectorAll(".modal-wrap").forEach((m) => m.remove()); }

function summonResults(res) {
  openModal(`<h3>${STR.summon_title}</h3>
    <div class="sgrid">${res.map((r) => `
      <div class="scard" style="--rar:${RARITIES[r.hero.rarity].color}">
        <img src="./assets/portraits/${r.hero.id}.jpg" alt="">
        <span class="sname">${r.hero.name.split(",")[0]}</span>
        <span class="srar" style="color:${RARITIES[r.hero.rarity].color}">${"★".repeat(Math.min(RARITIES[r.hero.rarity].stars, 5))}</span>
        <span class="stag">${r.isNew ? STR.summon_new : STR.summon_dupe}</span>
      </div>`).join("")}</div>
    <button class="btn primary" id="sAgain">${STR.summon_again}</button>`,
    () => { document.getElementById("sAgain").onclick = () => { const r = doSummon(res.length); render(); if (r) summonResults(r); }; });
}

/* --------------------------------- combat --------------------------------- */

const PORTRAITS = {};
for (const h of [...HEROES, ...CREATURES]) { const im = new Image(); im.src = `./assets/portraits/${h.id}.jpg`; PORTRAITS[h.id] = im; }
const BIOME_BG = {};
for (const b of BIOMES) { const im = new Image(); im.src = `./assets/biomes/${b}.jpg`; BIOME_BG[b] = im; }

/* ------------------------- rendu 3D (Three.js vendorisé) ------------------------- */
// Les héros sont des meshs GLB statiques animés par code (flottement, charge, chute).
// Si un modèle ou WebGL manque, le combat bascule automatiquement sur le rendu 2D.

let T = null;            // module three vendorisé
let three = null;        // { renderer, texCache }
const MODELS = {};       // heroId -> Group normalisé (hauteur 1, pieds à y=0) | null si échec
const CAM = { pos: [0, 6.8, 12.6], look: [0, 0.5, -2.6] };
function fxTrailAt(pos, hex) {
  if (!fxOn() || B.fxList.length > 140) return;
  fxGeo();
  const m = new T.Mesh(FXGEO.sphere, fxMat(hex, 0.7));
  m.scale.setScalar(0.9);
  m.position.copy(pos);
  B.t3.scene.add(m);
  B.fxList.push({ kind: "trail", m, t: 0, dur: 330 });
}
function fxShake(amp, dur = 450) {
  if (!B) return;
  if (!B.shake || amp * (B.shake.t / B.shake.dur) < amp) B.shake = { t: dur, dur, amp };
}
const HERO_H = { bramble: 1.9, pipbogue: 1.4, grondin: 1.35,
  brume_loup: 1.1, brume_golem: 1.8, brume_corbeau: 1.1, brume_meduse: 1.25,
  brume_aragne: 1.0, brume_sanglier: 1.15,
  devoreur_leviathan: 2.9, devoreur_tisseuse: 2.4, devoreur_avale: 2.6 };

function request3D() {
  import("./vendor/three.js").then((m) => {
    T = m;
    const loader = new T.GLTFLoader();
    for (const h of [...HEROES, ...CREATURES]) {
      loader.load(`./assets/models/${h.id}.glb`,
        (g) => { MODELS[h.id] = prepModel(g.scene); },
        undefined,
        () => { MODELS[h.id] = null; });
    }
  }).catch(() => { T = null; });
}

function prepModel(root) {
  const box = new T.Box3().setFromObject(root);
  const size = new T.Vector3(); box.getSize(size);
  const center = new T.Vector3(); box.getCenter(center);
  root.position.set(-center.x, -box.min.y, -center.z);
  root.traverse((o) => { if (o.isMesh && o.material) o.material.side = T.DoubleSide; });
  const norm = new T.Group();
  norm.add(root);
  norm.scale.setScalar(1 / Math.max(0.0001, size.y));
  const wrap = new T.Group();
  wrap.add(norm);
  return wrap;
}

function init3D() {
  if (three) return true;
  if (!T) return false;
  try {
    const renderer = new T.WebGLRenderer({ canvas: document.getElementById("b3dCanvas"), antialias: true });
    renderer.setClearColor(0x241a4e);
    three = { renderer, texCache: {} };
    return true;
  } catch { T = null; return false; }
}

function biomeTexture(b) {
  if (three.texCache[b]) return three.texCache[b];
  const tex = new T.TextureLoader().load(`./assets/biomes/${b}.jpg`);
  tex.colorSpace = T.SRGBColorSpace;
  three.texCache[b] = tex;
  return tex;
}

function tintEcho(obj) {
  obj.traverse((o) => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      o.material.userData.cloned = true;
      if (o.material.color) o.material.color.multiply(new T.Color(0.62, 0.5, 1.05));
      if (o.material.emissive) o.material.emissive.set(0x1c0836);
    }
  });
}

function build3DScene() {
  const scene = new T.Scene();
  scene.fog = new T.Fog(0x241a4e, 15, 34);
  const camera = new T.PerspectiveCamera(52, 1, 0.1, 100);
  camera.position.set(CAM.pos[0], CAM.pos[1], CAM.pos[2]);
  camera.lookAt(CAM.look[0], CAM.look[1], CAM.look[2]);
  scene.add(new T.HemisphereLight(0xfff6e0, 0x4a3a68, 1.9));
  const dir = new T.DirectionalLight(0xffe8c0, 2.1);
  dir.position.set(3, 7, 4);
  scene.add(dir);
  const fill = new T.DirectionalLight(0xcfe4ff, 0.9);
  fill.position.set(-4, 3, 8);
  scene.add(fill);
  const mat = new T.MeshBasicMaterial({ color: 0xbdb3cf, map: biomeTexture(B.biome) });
  const backdrop = new T.Mesh(new T.PlaneGeometry(38, 64), mat);
  backdrop.position.set(0, 8, -16);
  scene.add(backdrop);
  const ground = new T.Mesh(new T.CircleGeometry(10, 40),
    new T.MeshLambertMaterial({ color: 0x2a2148, transparent: true, opacity: 0.6 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  B.t3 = { scene, camera };
  for (const u of B.allies) addUnit3D(u);
  resizeCanvas();
}

function addUnit3D(u) {
  const tpl = MODELS[u.id];
  if (!tpl || !B.t3) return;
  const obj = tpl.clone(true);
  const h = (HERO_H[u.id] || 1.55) * (u.boss ? 1.15 : 1) * (u.elite ? 1.3 : 1) * (u.side === "enemy" ? 1.22 : 1);
  obj.scale.setScalar(h);
  u.h3 = h;
  obj.rotation.y = u.side === "ally" ? Math.PI : 0;
  obj.position.set(u.px, 0, u.pz);
  B.t3.scene.add(obj);
  u.obj = obj;
}

let fxLastNow = 0;
function update3D(W, H) {
  const now = performance.now();
  const dt = fxLastNow ? Math.min(100, now - fxLastNow) : 16;
  fxLastNow = now;
  for (const u of [...B.allies, ...B.enemies]) {
    const o = u.obj;
    if (!o) continue;
    if (u.hp <= 0) {
      if (!u.deathT) u.deathT = now;
      const p = Math.min(1, (now - u.deathT) / 600);
      o.rotation.x = (u.side === "ally" ? -1 : 1) * p * Math.PI / 2;
      o.position.y = -0.3 * p;
      o.visible = now - u.deathT < 1400;
    } else {
      const melee = CLASSES[u.hero.cls].row === "front";
      const lp = u.lungeT > 0 ? Math.sin((u.lungeT / 240) * Math.PI) : 0;
      const dirZ = u.side === "ally" ? -1 : 1;
      let px = u.px, pz = u.pz + dirZ * lp * (melee ? 1.9 : 0.7);
      const py = Math.sin(now / 480 + u.px * 2) * 0.04;
      if (u.fxDash) {
        const q = Math.min(1, u.fxDash.t / 620);
        const k = Math.sin(q * Math.PI);
        px += (u.fxDash.x - px) * k;
        pz += (u.fxDash.z + dirZ * 1.1 - pz) * k;
        u.fxDash.t += dt;
        if (q >= 1) u.fxDash = null;
      }
      if (u.hitT > 0) px += (Math.random() - 0.5) * 0.08;
      o.position.set(px, py, pz);
      o.rotation.x = -0.3 * lp * (melee ? 1 : 0.4);
      let sc = u.h3;
      if (u.castPulse && u.castPulse > now)
        sc *= 1 + 0.16 * Math.sin(((u.castPulse - now) / 900) * Math.PI);
      o.scale.setScalar(sc);
    }
    const v = new T.Vector3(o.position.x, u.h3 + 0.35, o.position.z).project(B.t3.camera);
    u.x = (v.x * 0.5 + 0.5) * W;
    u.y = (-v.y * 0.5 + 0.5) * H;
  }
  fxUpdate(dt);
}

/* --- effets de combat : projectiles, éclats de particules, ondes au sol, flash --- */
const FXGEO = {};
function fxGeo() {
  if (!FXGEO.sphere) {
    FXGEO.sphere = new T.SphereGeometry(0.09, 8, 8);
    FXGEO.ring = new T.RingGeometry(0.28, 0.38, 32);
    FXGEO.beam = new T.CylinderGeometry(1, 1, 9, 10, 1, true);
    FXGEO.cone = new T.ConeGeometry(0.2, 1, 7);
    FXGEO.dome = new T.SphereGeometry(1, 14, 12);
    FXGEO.slash = new T.PlaneGeometry(2.4, 0.16);
  }
}
function fxMat(hex, opacity = 0.95) {
  return new T.MeshBasicMaterial({ color: new T.Color(hex), transparent: true, opacity,
    blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
}
function unitPos(u, hFrac = 0.6) {
  return { x: u.obj ? u.obj.position.x : u.px || 0, y: (u.h3 || 1.5) * hFrac, z: u.obj ? u.obj.position.z : u.pz || 0 };
}
function fxOn() { return B && B.use3D && B.t3 && T; }
function fxProjectile(fromU, toU, hex, opts = {}) {
  if (!fxOn() || !fromU.obj || !toU.obj || B.fxList.length > 70) return;
  fxGeo();
  const a = unitPos(fromU, 0.7), b = unitPos(toU, 0.55);
  let m;
  if (opts.tex) {
    m = new T.Sprite(new T.SpriteMaterial({ map: fxTex(opts.tex), transparent: true, depthWrite: false }));
  } else {
    m = new T.Mesh(FXGEO.sphere, fxMat(hex));
  }
  m.scale.setScalar(opts.size || 1.5);
  m.position.set(a.x, a.y, a.z);
  B.t3.scene.add(m);
  B.fxList.push({ kind: "proj", m, t: 0, dur: opts.dur || 190, a, b, hex,
    arc: opts.arc || 0.8, flicker: !!opts.flicker, burst: opts.burst !== false });
}
function fxBurstAt(c, hex, n = 6) {
  if (!fxOn() || B.fxList.length > 80) return;
  fxGeo();
  for (let i = 0; i < n; i++) {
    const m = new T.Mesh(FXGEO.sphere, fxMat(hex, 0.9));
    m.scale.setScalar(0.7 + Math.random() * 0.7);
    m.position.set(c.x, c.y, c.z);
    const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI;
    B.t3.scene.add(m);
    B.fxList.push({ kind: "part", m, t: 0, dur: 430, x: c.x, y: c.y, z: c.z,
      vx: Math.sin(ph) * Math.cos(th) * 2.6, vy: Math.abs(Math.cos(ph)) * 2.4, vz: Math.sin(ph) * Math.sin(th) * 2.6 });
  }
}
function fxBurst(u, hex, n = 6, hFrac = 0.5) { if (fxOn()) fxBurstAt(unitPos(u, hFrac), hex, n); }
function fxRing(u, hex, max = 2.4, dur = 550) {
  if (!fxOn()) return;
  fxGeo();
  const m = new T.Mesh(FXGEO.ring, fxMat(hex, 0.85));
  m.rotation.x = -Math.PI / 2;
  const c = unitPos(u, 0);
  m.position.set(c.x, 0.06, c.z);
  B.t3.scene.add(m);
  B.fxList.push({ kind: "ring", m, t: 0, dur, max });
}
function fxFlash(color) { if (B) B.flash = { color, t: 420, dur: 420 }; }
const FXTEX = {};
function fxTex(name) {
  if (!FXTEX[name]) {
    const t = new T.TextureLoader().load(`./assets/fx/${name}.png`);
    t.colorSpace = T.SRGBColorSpace;
    FXTEX[name] = t;
  }
  return FXTEX[name];
}
// sprite de VFX dessiné : billboard texturé (ancrage bas possible pour "pousser" du sol)
function fxSprite(at, name, opts = {}) {
  if (!fxOn() || B.fxList.length > 120) return;
  const c = at.hero ? unitPos(at, opts.hFrac ?? 0.5) : at;
  const mat = new T.SpriteMaterial({ map: fxTex(name), transparent: true, opacity: 0,
    depthWrite: false, rotation: opts.rot || 0,
    ...(opts.add ? { blending: T.AdditiveBlending } : {}) });
  const m = new T.Sprite(mat);
  if (opts.anchorBottom) m.center.set(0.5, 0);
  const y = opts.y !== undefined ? opts.y : c.y;
  m.position.set(c.x + (opts.ox || 0), y, c.z + (opts.oz || 0));
  m.scale.setScalar(0.01);
  m.visible = !opts.delay;
  B.t3.scene.add(m);
  const entry = { kind: "spr", m, t: -(opts.delay || 0), dur: opts.dur || 700,
    size: opts.size || 1.6, grow: opts.grow || 0, rise: opts.rise || 0,
    fall: opts.fall || null, dx: opts.dx || 0, spin: opts.spin || 0,
    x0: m.position.x, y0: y, flipX: !!opts.flipX };
  if (opts.orbit) entry.orbit = { cx: c.x, cz: c.z, r: opts.orbit.r, turns: opts.orbit.turns,
    a0: opts.orbit.a0 || Math.random() * Math.PI * 2 };
  B.fxList.push(entry);
}
// sigil : dessin posé au sol qui tourne et s'évanouit
function fxSigil(at, name, opts = {}) {
  if (!fxOn() || B.fxList.length > 120) return;
  fxGeo();
  const m = new T.Mesh(new T.PlaneGeometry(1, 1),
    new T.MeshBasicMaterial({ map: fxTex(name), transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  const c = at.hero ? unitPos(at, 0) : at;
  m.position.set(c.x, 0.06, c.z);
  m.visible = !opts.delay;
  B.t3.scene.add(m);
  B.fxList.push({ kind: "sigil", m, t: -(opts.delay || 0), dur: opts.dur || 900,
    size: opts.size || 2.4, spin: opts.spin || 1.5 });
}
function fxBeam(u, hex, opts = {}) {
  if (!fxOn() || B.fxList.length > 110) return;
  fxGeo();
  const c = unitPos(u, 0);
  const m = new T.Mesh(FXGEO.beam, fxMat(hex, 0));
  m.scale.set(opts.w || 0.5, 1, opts.w || 0.5);
  m.position.set(c.x, 4.4, c.z);
  m.visible = !opts.delay;
  B.t3.scene.add(m);
  B.fxList.push({ kind: "beam", m, t: -(opts.delay || 0), dur: opts.dur || 400, w: opts.w || 0.5 });
}
function fxDome(u, hex) {
  if (!fxOn()) return;
  fxGeo();
  const m = new T.Mesh(FXGEO.dome, fxMat(hex, 0.4));
  const r = (u.h3 || 1.5) * 0.72;
  const c = unitPos(u, 0.45);
  m.position.set(c.x, c.y, c.z);
  B.t3.scene.add(m);
  B.fxList.push({ kind: "dome", m, t: 0, dur: 750, r });
}
function fxSpikes(u, hex) {
  if (!fxOn() || B.fxList.length > 110) return;
  fxGeo();
  const c = unitPos(u, 0);
  for (let i = 0; i < 4; i++) {
    const m = new T.Mesh(FXGEO.cone, fxMat(hex, 0.9));
    const h = 0.9 + Math.random() * 0.9;
    m.position.set(c.x + (Math.random() - 0.5) * 1.1, 0, c.z + (Math.random() - 0.5) * 0.9);
    m.scale.set(1, 0.01, 1);
    m.visible = i === 0;
    B.t3.scene.add(m);
    B.fxList.push({ kind: "spike", m, t: -(i * 60), dur: 780, h });
  }
}
function fxRise(u, hex, n = 5, opts = {}) {
  if (!fxOn() || B.fxList.length > 110) return;
  fxGeo();
  const c = unitPos(u, opts.hFrac ?? 0.2);
  for (let i = 0; i < n; i++) {
    const m = new T.Mesh(FXGEO.sphere, fxMat(hex, 0.55));
    m.scale.setScalar(opts.size || 1.6);
    m.position.set(c.x + (Math.random() - 0.5) * 0.9, c.y, c.z + (Math.random() - 0.5) * 0.5);
    m.visible = false;
    B.t3.scene.add(m);
    B.fxList.push({ kind: "rise", m, t: -(Math.random() * 250), dur: opts.dur || 900,
      x: m.position.x, y: c.y, z: m.position.z, vy: 1.4 + Math.random(), grow: opts.grow ?? 1.8 });
  }
}
function fxSlash(u, hex) {
  if (!fxOn()) return;
  fxGeo();
  const c = unitPos(u, 0.55);
  for (const rz of [0.7, -0.7]) {
    const m = new T.Mesh(FXGEO.slash, fxMat(hex, 1));
    m.position.set(c.x, c.y, c.z + 0.3);
    m.rotation.z = rz;
    m.scale.setScalar(0.5);
    B.t3.scene.add(m);
    B.fxList.push({ kind: "slash", m, t: 0, dur: 280 });
  }
}
function fxRingV(hex, opts = {}) {
  if (!fxOn()) return;
  fxGeo();
  const m = new T.Mesh(FXGEO.ring, fxMat(hex, 0.9));
  m.position.set(0, 1.6, -1);
  m.visible = !opts.delay;
  B.t3.scene.add(m);
  B.fxList.push({ kind: "ringv", m, t: -(opts.delay || 0), dur: opts.dur || 700, max: opts.max || 12 });
}
function fxTurret(u, durMs) {
  if (!fxOn()) return;
  fxGeo();
  const grp = new T.Group();
  const base = new T.Mesh(new T.CylinderGeometry(0.28, 0.34, 0.34, 10),
    new T.MeshLambertMaterial({ color: 0xb87333 }));
  base.position.y = 0.17;
  const barrel = new T.Mesh(new T.CylinderGeometry(0.09, 0.11, 0.7, 8),
    new T.MeshLambertMaterial({ color: 0x8a5a28 }));
  barrel.rotation.x = Math.PI / 2.4;
  barrel.position.set(0, 0.42, u.side === "ally" ? -0.25 : 0.25);
  grp.add(base, barrel);
  grp.position.set(u.px + 0.95, 0, u.pz);
  B.t3.scene.add(grp);
  B.fxList.push({ kind: "prop", m: grp, t: 0, dur: durMs, grp: true });
}
function fxUpdate(dt) {
  if (!B || !B.fxList) return;
  for (const f of B.fxList) {
    if (f.t < 0) { f.t += dt; if (f.m) f.m.visible = false; continue; }
    if (f.m && !f.m.visible) f.m.visible = true;
    f.t += dt;
    const p = Math.min(1, f.t / f.dur);
    if (f.kind === "proj") {
      f.m.position.set(f.a.x + (f.b.x - f.a.x) * p,
        f.a.y + (f.b.y - f.a.y) * p + Math.sin(p * Math.PI) * f.arc,
        f.a.z + (f.b.z - f.a.z) * p);
      if (f.flicker) f.m.material.opacity = 0.6 + 0.4 * Math.sin(f.t / 40);
      f.trailT = (f.trailT || 0) + dt;
      while (f.trailT > 45) { f.trailT -= 45; fxTrailAt(f.m.position, f.hex || "#ffe9a8"); }
    } else if (f.kind === "part") {
      f.m.position.set(f.x + f.vx * p * 0.4, f.y + f.vy * p * 0.4 - 0.5 * p * p, f.z + f.vz * p * 0.4);
      f.m.material.opacity = 0.9 * (1 - p);
    } else if (f.kind === "ring") {
      f.m.scale.setScalar(1 + f.max * p);
      f.m.material.opacity = 0.85 * (1 - p);
    } else if (f.kind === "beam") {
      f.m.material.opacity = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75;
      const w = f.w * (1 - 0.35 * p);
      f.m.scale.set(w, 1, w);
    } else if (f.kind === "dome") {
      f.m.scale.setScalar(f.r * (0.35 + 0.65 * Math.min(1, p * 2.2)));
      f.m.material.opacity = 0.4 * (1 - p);
    } else if (f.kind === "spike") {
      const gph = p < 0.3 ? p / 0.3 : p > 0.72 ? Math.max(0, 1 - (p - 0.72) / 0.28) : 1;
      f.m.scale.set(1, Math.max(0.01, f.h * gph), 1);
      f.m.position.y = (f.h * gph) / 2;
    } else if (f.kind === "rise") {
      f.m.position.y = f.y + f.vy * p;
      f.m.scale.setScalar(1 + f.grow * p);
      f.m.material.opacity = 0.55 * (1 - p);
    } else if (f.kind === "slash") {
      f.m.scale.setScalar(0.5 + 1.1 * p);
      f.m.material.opacity = 1 - p;
    } else if (f.kind === "ringv") {
      f.m.scale.setScalar(1 + f.max * p);
      f.m.material.opacity = 0.9 * (1 - p);
    } else if (f.kind === "trail") {
      f.m.scale.setScalar(0.9 * (1 - p * 0.85));
      f.m.material.opacity = 0.7 * (1 - p);
    } else if (f.kind === "spr") {
      const sIn = 0.35 + 0.65 * Math.min(1, p * 3.5);
      const sc = f.size * sIn * (1 + f.grow * p);
      f.m.scale.set(f.flipX ? -sc : sc, sc, 1);
      f.m.material.opacity = p < 0.15 ? p / 0.15 : p > 0.62 ? (1 - p) / 0.38 : 1;
      let yy = f.y0 + f.rise * p;
      if (f.fall) {
        yy = f.fall.from + (f.fall.to - f.fall.from) * Math.min(1, p * 1.25);
        f.trailT = (f.trailT || 0) + dt;
        while (f.trailT > 55) { f.trailT -= 55; fxTrailAt(f.m.position, "#ffe9a8"); }
      }
      f.m.position.y = yy;
      if (f.orbit) {
        const ang = f.orbit.a0 + f.orbit.turns * Math.PI * 2 * p;
        f.m.position.x = f.orbit.cx + f.orbit.r * Math.cos(ang);
        f.m.position.z = f.orbit.cz + f.orbit.r * Math.sin(ang);
      } else f.m.position.x = f.x0 + f.dx * p;
      if (f.spin) f.m.material.rotation += f.spin * dt / 1000;
    } else if (f.kind === "sigil") {
      f.m.scale.setScalar(f.size * (0.35 + 0.65 * Math.min(1, p * 3)));
      f.m.material.opacity = p < 0.15 ? p / 0.15 : p > 0.62 ? 0.95 * (1 - p) / 0.38 : 0.95;
      f.m.rotation.z += f.spin * dt / 1000;
    }
    if (p >= 1) {
      B.t3.scene.remove(f.m);
      if (f.grp) f.m.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      else f.m.material.dispose();
      f.done = true;
      if (f.kind === "proj" && f.burst) fxBurstAt(f.b, f.hex, 5);
    }
  }
  B.fxList = B.fxList.filter((f) => !f.done);
}

// signatures visuelles d'ultimes : sprites dessinés (sigils, objets, matières) par héros
function fxUlt(u, k, foes, mates) {
  if (!fxOn()) return;
  const F = alive(foes), M = alive(mates);
  switch (u.id) {
    case "kaelis": // Jugement Solaire : sigils solaires au sol + éclats de soleil + piliers
      fxFlash("#ffd76a");
      F.forEach((e, i) => {
        fxSigil(e, "sigil_sun", { size: 2.6, dur: 1000, spin: 2.2, delay: i * 60 });
        fxSprite(e, "burst_sun", { size: 2.8, dur: 520, delay: i * 60, hFrac: 0.55, spin: 1.5, add: true });
        fxBeam(e, "#fff6d8", { w: 0.28, dur: 600, delay: i * 60 });
      });
      fxSigil(u, "sigil_sun", { size: 3.2, dur: 900, spin: -1.8 });
      return;
    case "bramble": // Cœur de l'Ancien : les boucliers d'écorce descendent en orbite autour des alliés
      M.forEach((a, i) => {
        fxSprite(a, "shield_leaf", { size: 1.15, dur: 1200, delay: i * 90, hFrac: 1.15,
          rise: -1.1, orbit: { r: 0.95, turns: 1.4 } });
        fxDome(a, "#7fd08a");
        fxRise(a, "#a8e6a0", 3, { size: 1.1 });
      });
      return;
    case "maelle": // Marée Berceuse : vraie vague qui balaie l'équipe + ronds d'eau
      fxFlash("#7fd6ef");
      fxSprite({ x: -5.5, y: 1.1, z: 3.2 }, "wave", { size: 4.2, dur: 950, dx: 11 });
      fxSprite({ x: 5.5, y: 1.0, z: 4.4 }, "wave", { size: 3.4, dur: 950, dx: -11, delay: 220, flipX: true });
      for (const a of M) fxSigil(a, "ring_water", { size: 2.6, dur: 900, spin: 0.8, delay: 200 });
      for (const a of M) fxRise(a, "#9fe3ff", 5, { size: 1.3, dur: 1000 });
      return;
    case "sorren": { // Plongée Nocturne : plongeon + coup d'encre en croix
      const t = F.reduce((a, b) => (a.hp < b.hp ? a : b), F[0]);
      if (t && u.obj && t.obj) {
        u.fxDash = { x: t.obj.position.x, z: t.obj.position.z, t: 0 };
        fxRing(t, "#164a5e", 2.2, 400);
        setTimeout(() => { if (B && !B.over) {
          fxSprite(t, "slash", { size: 2.8, dur: 300, hFrac: 0.55, rot: 0.5, ox: -1.3, dx: 2.6, add: true });
          fxSprite(t, "slash", { size: 2.8, dur: 300, hFrac: 0.55, rot: -0.5, flipX: true, ox: 1.3, dx: -2.6, delay: 130, add: true });
        } }, 240);
      }
      return;
    }
    case "grondin": // Canon Geyser : tourelle déployée, éclairs de bouche + fumée à chaque tir
      fxTurret(u, k.dur);
      fxSprite(u, "smoke", { size: 2.0, dur: 900, rise: 1.4, hFrac: 0.3, ox: 0.95 });
      return;
    case "vesperine": // Bal des Lanternes : vraies lanternes dessinées qui volent (tir par tir)
      return;
    case "pipbogue": // Surrégime ! : les engrenages orbitent autour de chaque allié + vapeur
      M.forEach((a, i) => {
        fxSprite(a, "gear", { size: 0.85, dur: 1100, delay: i * 70, spin: 6, hFrac: 0.35,
          rise: 1.5, orbit: { r: 0.85, turns: 2.2 } });
        fxSprite(a, "gear", { size: 0.6, dur: 1100, delay: i * 70 + 180, spin: -5, hFrac: 0.6,
          rise: 1.2, orbit: { r: 0.7, turns: -1.8 } });
        fxSprite(a, "smoke", { size: 1.6, dur: 900, rise: 1.1, hFrac: 0.2 });
        fxRing(a, "#ffb066", 2.0);
      });
      return;
    case "sylvarende": // Chant des Racines-Monde : vraies ronces qui poussent + pétales
      F.forEach((e, i) => {
        fxSprite(e, "root", { size: 2.4, dur: 850, anchorBottom: true, y: 0.02, delay: i * 70 });
        fxSprite(e, "petal", { size: 1.4, dur: 1000, rise: 1.6, spin: 1.2, hFrac: 0.7, delay: i * 70 + 150 });
      });
      return;
    case "theoline": // Pluie d'Aube : flèches de lumière dessinées qui tombent (tir par tir)
      return;
    case "nhyx": // Heure Silencieuse : cadran astral géant posé sur le terrain, en perspective
      fxFlash("#8fd8ff");
      fxSigil({ x: 0, z: -0.8 }, "clock", { size: 13, dur: 1400, spin: 0.45 });
      fxRingV("#bfe9ff", { max: 14, dur: 800, delay: 200 });
      for (const e of F) fxBurst(e, "#cfe9ff", 7);
      return;
  }
  // créatures : effets génériques selon le type de capacité
  switch (k.kind) {
    case "aoe_blind": fxFlash("#c9a2ff"); for (const e of F) fxBurst(e, "#b18aff", 6); break;
    case "shield": for (const a of M) fxDome(a, "#9ecbff"); break;
    case "heal_sleep": for (const a of M) fxRise(a, "#7fe58a", 4); break;
    case "execute": { const t = F.reduce((a, b) => (a.hp < b.hp ? a : b), F[0]); if (t) fxSlash(t, "#d9b8ff"); break; }
    case "turret": fxBurst(u, "#8a5fd0", 8); break;
    case "haste": for (const a of M) fxBurst(a, "#c9a2ff", 6); break;
    case "aoe_stun": for (const e of F) fxSpikes(e, "#8a5fd0"); break;
    case "timestop": fxFlash("#8fd8ff"); for (const e of F) fxBurst(e, "#cfe9ff", 7); break;
  }
}

function drawGauges(u) {
  if (u.hp <= 0) return;
  const bw = 54, bx = u.x - bw / 2, by = u.y;
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bx, by, bw, 5);
  ctx.fillStyle = u.side === "ally" ? "#59d977" : "#e05c5c";
  ctx.fillRect(bx, by, bw * (u.hp / u.maxHp), 5);
  if (u.shieldUntil > B.t && u.shield > 0) {
    ctx.fillStyle = "#9ecbff"; ctx.fillRect(bx, by - 2, bw * Math.min(1, u.shield / u.maxHp), 2);
  }
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bx, by + 6, bw, 3);
  ctx.fillStyle = "#ffd76a"; ctx.fillRect(bx, by + 6, bw * (u.energy / BAL.energy_max), 3);
  if (u.boss || u.elite) {
    ctx.font = "13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(u.boss ? "👑" : "⭐", u.x, by - 6);
  }
  if (u.stunUntil > B.t) { ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.fillText("💫", u.x, by - 8); }
}

let B = null; // état du combat en cours

function makeUnit(hero, side, stats, opts = {}) {
  return {
    id: hero.id, hero, side, boss: !!opts.boss, elite: !!opts.elite, echo: !!opts.echo,
    maxHp: stats.hp, hp: stats.hp, atk: stats.atk, def: stats.def, spd: stats.spd,
    energy: side === "ally" ? 250 : 0, cd: 400,
    shield: 0, shieldUntil: 0, hasteUntil: 0, hasteMult: 1,
    stunUntil: 0, markUntil: 0, markPct: 0, blindUntil: 0,
    lungeT: 0, hitT: 0, x: 0, y: 0, r: 30,
  };
}

function startBattle(stageIdx) {
  if (!S.team.length) { toast(STR.team_edit); setScreen("heroes"); return; }
  S.attempts++;
  const rng = mulberry32(stageIdx * 104729 + S.attempts * 31);
  const allies = S.team.map((id) => makeUnit(heroById(id), "ally", heroStats(id)));
  B = {
    stageIdx, rng, allies, enemies: [], waves: wavesFor(stageIdx), waveIdx: 0, waveStart: 0,
    t: 0, over: false, victory: false,
    speed: 1, floaters: [], banner: null, scheduled: [], frozen: 0,
    biome: biomeOf(chapterOf(stageIdx).ch), introT: 2300,
    fxList: [], flash: null,
  };
  document.getElementById("battle").classList.add("open");
  resizeCanvas();
  const ids = new Set([...S.team, ...B.waves.flat().map((s) => s.c.id)]);
  B.use3D = !!T && [...ids].every((id) => MODELS[id]) && init3D();
  if (B.use3D) build3DScene();
  spawnWave(0);
  buildSkillsPanel();
  buildIntro();
  document.getElementById("bTitle").textContent =
    `${STR.campaign_chapter} ${chapterOf(stageIdx).ch + 1} — ${STR.campaign_stage} ${chapterOf(stageIdx).st + 1}`;
  document.getElementById("bResult").classList.remove("open");
  document.getElementById("b3dCanvas").style.display = B.use3D ? "block" : "none";
}

function spawnWave(i) {
  if (devMode) window.__B = B;
  B.waveIdx = i;
  B.waveStart = B.t;
  if (B.t3) for (const u of B.enemies) if (u.obj) B.t3.scene.remove(u.obj);
  B.enemies = B.waves[i].map((spec) => {
    const m = spec.mult * (spec.elite ? BAL.elite_mult : 1);
    return makeUnit(spec.c, "enemy", {
      hp: Math.round(spec.c.base.hp * m), atk: Math.round(spec.c.base.atk * m),
      def: Math.round(spec.c.base.def * m), spd: spec.c.base.spd,
    }, { boss: spec.boss, elite: spec.elite });
  });
  layoutUnits();
  if (B.use3D && B.t3) for (const u of B.enemies) addUnit3D(u);
  if (i > 0) B.banner = { text: `⚔ ${STR.wave} ${i + 1}/${B.waves.length} ⚔`, t: 1100 };
}

function layoutUnits() {
  const c = document.getElementById("bCanvas");
  const W = c.clientWidth, H = c.clientHeight;
  const place = (units, top) => {
    const front = units.filter((u) => CLASSES[u.hero.cls].row === "front");
    const back = units.filter((u) => CLASSES[u.hero.cls].row === "back");
    const rows = top ? [[back, 0.16], [front, 0.34]] : [[front, 0.62], [back, 0.82]];
    for (const [row, fy] of rows) row.forEach((u, i) => {
      u.x = W * ((i + 1) / (row.length + 1));
      u.y = H * fy;
      u.r = u.boss ? 42 : 30;
    });
  };
  place(B.enemies, true); place(B.allies, false);
  // positions 3D : lignes face à face de part et d'autre du centre
  const place3d = (units, sideSign) => {
    const front = units.filter((u) => CLASSES[u.hero.cls].row === "front");
    const back = units.filter((u) => CLASSES[u.hero.cls].row === "back");
    // quinconce : la ligne arrière est décalée d'un demi-cran pour rester lisible en profondeur
    for (const [row, dz, off] of [[front, 2.3, 0], [back, 4.6, 1.05]]) row.forEach((u, i) => {
      u.px = (i - (row.length - 1) / 2) * 2.05 + off;
      u.pz = sideSign * dz;
    });
  };
  place3d(B.allies, 1); place3d(B.enemies, -1);
}

function alive(list) { return list.filter((u) => u.hp > 0); }
function counterMult(att, dif) {
  if (FACTIONS[att.hero.faction].counter === dif.hero.faction) return BAL.counter_bonus;
  return 1;
}
function dealDamage(att, dif, pct, opts = {}) {
  if (dif.hp <= 0) return 0;
  if (att.blindUntil > B.t && B.rng() < 0.25) {
    B.floaters.push({ x: dif.x, y: dif.y - 30, txt: "✕", color: "#8899aa", age: 0 });
    return 0;
  }
  let dmg = att.atk * pct * counterMult(att, dif) - dif.def * BAL.def_soak;
  dmg = Math.max(att.atk * pct * BAL.min_dmg_pct, dmg);
  const crit = B.rng() < BAL.crit_chance;
  if (crit) { dmg *= BAL.crit_mult; if (B.use3D) fxShake(0.09, 240); }
  if (dif.markUntil > B.t) dmg *= 1 + dif.markPct;
  dmg = Math.round(dmg);
  if (dif.shieldUntil > B.t && dif.shield > 0) {
    const abs = Math.min(dif.shield, dmg); dif.shield -= abs; dmg -= abs;
  }
  dif.hp = Math.max(0, dif.hp - dmg);
  dif.hitT = 160;
  if (!opts.noEnergy) dif.energy = Math.min(BAL.energy_max, dif.energy + BAL.energy_per_hit);
  B.floaters.push({ x: dif.x + (B.rng() - 0.5) * 20, y: dif.y - 34, txt: fmt(dmg), color: crit ? "#ffd76a" : "#fff", big: crit, age: 0 });
  return dmg;
}
function heal(u, amount) {
  if (u.hp <= 0) return;
  u.hp = Math.min(u.maxHp, u.hp + Math.round(amount));
  B.floaters.push({ x: u.x, y: u.y - 34, txt: "+" + fmt(amount), color: "#7fe58a", age: 0 });
}
function pickTarget(att, foes) {
  const f = alive(foes);
  if (!f.length) return null;
  const mode = CLASSES[att.hero.cls].target;
  if (mode === "weakest" || mode === "smart") return f.reduce((a, b) => (a.hp < b.hp ? a : b));
  if (mode === "random") return f[Math.floor(B.rng() * f.length)];
  const front = f.filter((u) => CLASSES[u.hero.cls].row === "front");
  return (front.length ? front : f)[0];
}

function castUltimate(u, foes, mates) {
  const k = u.hero.ult, pct = k.pct;
  u.castPulse = performance.now() + 900;
  fxUlt(u, k, foes, mates);
  const SHAKE_ULT = { kaelis: 0.34, nhyx: 0.3, sorren: 0.24, sylvarende: 0.22, theoline: 0.18 };
  fxShake(u.boss ? 0.45 : SHAKE_ULT[u.id] || (u.side === "enemy" ? 0.18 : 0.13), u.boss ? 650 : 480);
  switch (k.kind) {
    case "aoe_blind":
      for (const e of alive(foes)) { dealDamage(u, e, pct); e.blindUntil = B.t + k.dur; } break;
    case "shield":
      for (const a of alive(mates)) { a.shield = Math.round(u.maxHp * pct); a.shieldUntil = B.t + k.dur; } break;
    case "heal_sleep": {
      for (const a of alive(mates)) heal(a, u.atk * pct);
      const t = alive(foes).reduce((a, b) => (a.hp < b.hp ? a : b), alive(foes)[0]);
      if (t) t.stunUntil = B.t + k.dur; break;
    }
    case "execute": {
      const t = alive(foes).reduce((a, b) => (a.hp < b.hp ? a : b), alive(foes)[0]);
      if (t) { dealDamage(u, t, pct); if (t.hp <= 0) u.energy = BAL.energy_max * 0.6; } break;
    }
    case "turret":
      for (let i = 1; i <= k.hits; i++)
        B.scheduled.push({ at: B.t + (k.dur / k.hits) * i, fn: () => {
          const t = pickTarget(u, foes);
          if (t) {
            dealDamage(u, t, pct);
            fxProjectile(u, t, "#e0813f");
            fxSprite(u, "muzzle", { size: 1.0, dur: 200, hFrac: 0.35, ox: 0.95, oz: u.side === "ally" ? -0.4 : 0.4, add: true });
          } } });
      break;
    case "lanterns":
      for (let i = 0; i < k.hits; i++) {
        const t = alive(foes)[Math.floor(B.rng() * Math.max(1, alive(foes).length))];
        if (t) { fxProjectile(u, t, "#c9a2ff", { dur: 560, size: 1.15, arc: 2.0, flicker: true, tex: "lantern" }); const d = dealDamage(u, t, pct);
          const low = alive(mates).reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b), alive(mates)[0]);
          if (low) heal(low, d * 0.5); } }
      break;
    case "haste":
      for (const a of alive(mates)) { a.hasteUntil = B.t + k.dur; a.hasteMult = 1 + pct; a.energy = Math.min(BAL.energy_max, a.energy + k.energy); } break;
    case "aoe_stun":
      for (const e of alive(foes)) { dealDamage(u, e, pct); if (CLASSES[e.hero.cls].row === "front") e.stunUntil = B.t + k.dur; } break;
    case "volley":
      for (let i = 0; i < k.hits; i++) { const t = pickTarget(u, foes);
        if (t) { dealDamage(u, t, pct);
          if (u.id === "theoline") {
            const c0 = unitPos(t, 0);
            fxSprite({ x: c0.x, y: 0, z: c0.z }, "arrow", { size: 1.7, dur: 300, delay: i * 55, fall: { from: 5, to: 0.6 } });
            fxSprite({ x: c0.x, y: 0.5, z: c0.z }, "burst_sun", { size: 1.1, dur: 220, delay: i * 55 + 210, add: true });
          }
          else fxProjectile(u, t, FACTIONS[u.hero.faction].color, { dur: 150, size: 1.0, burst: false }); } }
      for (const a of alive(mates)) a.energy = Math.min(BAL.energy_max, a.energy + k.energy);
      break;
    case "timestop":
      for (const e of alive(foes)) { dealDamage(u, e, pct, { noEnergy: true }); e.stunUntil = B.t + k.dur; e.markUntil = B.t + k.markDur; e.markPct = k.mark; } break;
  }
  u.energy = 0;
}

function unitAct(u) {
  const foes = u.side === "ally" ? B.enemies : B.allies;
  const mates = u.side === "ally" ? B.allies : B.enemies;
  if (u.energy >= BAL.energy_max && (u.side === "enemy" || S.ultMode !== "manual")) {
    castUltimate(u, foes, mates); u.lungeT = 240; return;
  }
  // Aube : soigne si un allié est sous 65 %
  if (CLASSES[u.hero.cls].target === "smart") {
    const low = alive(mates).reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b), alive(mates)[0]);
    if (low && low.hp / low.maxHp < 0.65) { heal(low, u.atk * 1.1); fxBurst(low, "#7fe58a", 7); u.energy = Math.min(BAL.energy_max, u.energy + BAL.energy_per_attack); u.lungeT = 240; return; }
  }
  const t = pickTarget(u, foes);
  if (!t) return;
  dealDamage(u, t, 1.0);
  if (CLASSES[u.hero.cls].row === "back") fxProjectile(u, t, FACTIONS[u.hero.faction].color);
  else fxBurst(t, FACTIONS[u.hero.faction].color, 5);
  if (CLASSES[u.hero.cls].target === "splash") {
    const others = alive(foes).filter((x) => x !== t);
    if (others.length) dealDamage(u, others[Math.floor(B.rng() * others.length)], 0.3);
  }
  u.energy = Math.min(BAL.energy_max, u.energy + BAL.energy_per_attack);
  u.lungeT = 240;
}

function battleTick(dt) {
  B.t += dt;
  B.scheduled = B.scheduled.filter((s) => { if (s.at <= B.t) { s.fn(); return false; } return true; });
  for (const u of [...B.allies, ...B.enemies]) {
    if (u.hp <= 0) continue;
    if (u.stunUntil > B.t) continue;
    const haste = u.hasteUntil > B.t ? u.hasteMult : 1;
    u.cd -= dt * (u.spd / 100) * haste;
    if (u.cd <= 0) { u.cd += BAL.attack_interval_ms; unitAct(u); }
  }
  if (!alive(B.enemies).length) {
    if (B.waveIdx < B.waves.length - 1) spawnWave(B.waveIdx + 1);
    else endBattle(true);
  }
  else if (!alive(B.allies).length) endBattle(false);
  else if (B.t - B.waveStart >= BAL.battle_timeout_ms) endBattle(false, true);
}

function endBattle(victory, timeout = false) {
  if (B.over) return;
  B.over = true; B.victory = victory;
  const res = document.getElementById("bResult");
  const idx = B.stageIdx;
  let html;
  if (victory) {
    const first = idx === S.stage;
    const gold = first ? BAL.reward_gold(idx) : BAL.reward_gold_replay(idx);
    S.gold += gold;
    let dia = 0;
    if (first) { dia = BAL.reward_diamonds_first; S.diamonds += dia; S.stage++; }
    quest("win3"); save();
    const clearedChapter = first && chapterOf(idx).st === BAL.stages_per_chapter - 1;
    html = `<h3 class="win">${STR.battle_victory}</h3>
      ${clearedChapter ? `<p class="chapter-clear">🏝 ${chapterName(chapterOf(idx).ch)} — ${STR.campaign_cleared}</p>` : ""}
      <p>${STR.battle_rewards} : +${fmt(gold)} 🪙${dia ? ` · +${dia} 💎` : ""}${first ? ` <span class="dim">(${STR.campaign_first_clear})</span>` : ""}</p>
      <button class="btn primary" id="bNext">${STR.battle_continue}</button>`;
  } else {
    html = `<h3 class="lose">${STR.battle_defeat}</h3>
      ${timeout ? `<p>${STR.battle_timeout}</p>` : ""}
      <p class="hint">${STR.battle_defeat_tip}</p>
      <button class="btn gold" id="bRetry">${STR.battle_retry}</button>
      <button class="btn ghost" id="bNext">${STR.battle_continue}</button>`;
  }
  res.innerHTML = `<div class="bres-box">${html}</div>`;
  res.classList.add("open");
  document.getElementById("bNext").onclick = () => { closeBattle(); render(); };
  const retry = document.getElementById("bRetry");
  if (retry) retry.onclick = () => startBattle(idx);
}
function buildSkillsPanel() {
  const sk = document.getElementById("bSkills");
  sk.innerHTML = B.allies.map((u, i) =>
    `<button class="skill-btn" data-si="${i}" title="${u.hero.ultName}">
       <img src="./assets/portraits/${u.id}.jpg" alt="">
       <i class="sbar"><b></b></i>
     </button>`).join("");
  sk.querySelectorAll(".skill-btn").forEach((btn) => btn.addEventListener("click", () => {
    const u = B && B.allies[+btn.dataset.si];
    if (!B || B.over || B.introT > 0 || S.ultMode !== "manual") return;
    if (!u || u.hp <= 0 || u.energy < BAL.energy_max || u.stunUntil > B.t) return;
    castUltimate(u, B.enemies, B.allies);
    u.lungeT = 240;
  }));
  updateModeUI();
}

function updateModeUI() {
  const manual = S.ultMode === "manual";
  document.getElementById("bMode").textContent = manual ? STR.mode_manual : STR.mode_auto;
  document.getElementById("bSkills").classList.toggle("on", manual && !!B);
}

function refreshSkillsPanel() {
  const btns = document.querySelectorAll("#bSkills .skill-btn");
  btns.forEach((btn) => {
    const u = B.allies[+btn.dataset.si];
    if (!u) return;
    btn.querySelector(".sbar b").style.width = Math.min(100, (u.energy / BAL.energy_max) * 100) + "%";
    btn.classList.toggle("ready", u.hp > 0 && u.energy >= BAL.energy_max);
    btn.classList.toggle("dead", u.hp <= 0);
  });
}

function closeBattle() {
  if (B && B.fxList && B.t3) for (const f of B.fxList) { B.t3.scene.remove(f.m); f.m.material.dispose(); }
  if (B && B.t3) B.t3.scene.traverse((o) => {
    if (o.isMesh && o.material && o.material.userData.cloned) o.material.dispose();
  });
  B = null;
  document.querySelectorAll(".bintro").forEach((e) => e.remove());
  document.getElementById("bSkills").classList.remove("on");
  document.getElementById("battle").classList.remove("open");
}

// écran d'intro : arrivée sur le terrain du biome, alignements face à face
function buildIntro() {
  document.querySelectorAll(".bintro").forEach((e) => e.remove());
  const { ch, st } = chapterOf(B.stageIdx);
  const nFx = { sylve: 14, forge: 8, maree: 12, voile: 9, zenith: 0 }[B.biome] || 0;
  let dots = "";
  for (let i = 0; i < nFx; i++)
    dots += `<i style="left:${(5 + Math.random() * 90).toFixed(1)}%;animation-delay:${(Math.random() * 0.9).toFixed(2)}s"></i>`;
  const chips = (units, cls) => `<div class="ichips ${cls}">` +
    units.map((u) => `<span><img src="./assets/portraits/${u.id}.jpg" alt=""></span>`).join("") + `</div>`;
  const div = el("div", `bintro intro-${B.biome}`);
  div.innerHTML = `
    <img class="ibg" src="./assets/biomes/${B.biome}.jpg" alt="">
    <div class="ishade"></div>
    <div class="ifx">${dots}</div>
    <div class="ititle">${STR.campaign_chapter} ${ch + 1} — ${chapterName(ch)} · ${st + 1}/10</div>
    ${chips(B.enemies, "foe")}
    <div class="ivs">${STR.intro_vs}</div>
    ${chips(B.allies, "ally")}`;
  document.getElementById("battle").appendChild(div);
}

/* --- rendu canvas du combat --- */

const canvas = document.getElementById("bCanvas");
const ctx = canvas.getContext("2d");
const DPR_CAP = 1.5;
function resizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, DPR_CAP);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (three && B && B.t3) {
    three.renderer.setPixelRatio(dpr);
    three.renderer.setSize(w, h, false);
    B.t3.camera.aspect = w / h;
    B.t3.camera.updateProjectionMatrix();
  }
  if (B) layoutUnits();
}
addEventListener("resize", resizeCanvas);
addEventListener("orientationchange", resizeCanvas);

function drawUnit(u) {
  const { x, y } = u;
  const lunge = u.lungeT > 0 ? (u.side === "ally" ? -1 : 1) * Math.sin((u.lungeT / 240) * Math.PI) * 10 : 0;
  const yy = y + lunge;
  ctx.save();
  if (u.hp <= 0) ctx.globalAlpha = 0.22;
  // anneau de rareté / faction
  ctx.beginPath(); ctx.arc(x, yy, u.r + 2.5, 0, Math.PI * 2);
  ctx.strokeStyle = u.side === "ally" ? RARITIES[u.hero.rarity].color : "#7d5bb0";
  ctx.lineWidth = 3; ctx.stroke();
  // portrait
  ctx.save();
  ctx.beginPath(); ctx.arc(x, yy, u.r, 0, Math.PI * 2); ctx.clip();
  const img = PORTRAITS[u.id];
  if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x - u.r, yy - u.r, u.r * 2, u.r * 2);
  else { ctx.fillStyle = "#223"; ctx.fillRect(x - u.r, yy - u.r, u.r * 2, u.r * 2); }
  if (u.echo) { ctx.fillStyle = "rgba(96,50,150,0.45)"; ctx.fillRect(x - u.r, yy - u.r, u.r * 2, u.r * 2); }
  if (u.hitT > 0) { ctx.fillStyle = "rgba(255,80,80,0.35)"; ctx.fillRect(x - u.r, yy - u.r, u.r * 2, u.r * 2); }
  ctx.restore();
  if (u.hp > 0) {
    // barre de PV
    const bw = u.r * 2, bx = x - u.r, by = yy + u.r + 6;
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = u.side === "ally" ? "#59d977" : "#e05c5c";
    ctx.fillRect(bx, by, bw * (u.hp / u.maxHp), 5);
    if (u.shieldUntil > B.t && u.shield > 0) {
      ctx.fillStyle = "#9ecbff"; ctx.fillRect(bx, by - 2, bw * Math.min(1, u.shield / u.maxHp), 2);
    }
    // jauge d'énergie
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bx, by + 6, bw, 3);
    ctx.fillStyle = "#ffd76a"; ctx.fillRect(bx, by + 6, bw * (u.energy / BAL.energy_max), 3);
    if (u.stunUntil > B.t) { ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.fillText("💫", x, yy - u.r - 6); }
  }
  ctx.restore();
}

function drawOverlays(W, H) {
  // dégâts flottants
  for (const f of B.floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.age / 900);
    ctx.font = (f.big ? "bold 17px" : "13px") + " sans-serif";
    ctx.textAlign = "center"; ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y - f.age * 0.045);
    ctx.globalAlpha = 1;
  }
  // bannière d'ultime
  if (B.banner) {
    const a = Math.min(1, B.banner.t / 300);
    ctx.fillStyle = `rgba(10,6,26,${0.75 * a})`;
    ctx.fillRect(0, H * 0.44, W, 46);
    ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255,215,140,${a})`;
    ctx.fillText(B.banner.text, W / 2, H * 0.44 + 29);
  }
  // flash plein écran (ultimes majeurs)
  if (B.flash) {
    ctx.globalAlpha = Math.max(0, B.flash.t / B.flash.dur) * 0.5;
    ctx.fillStyle = B.flash.color;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  // chronomètre
  ctx.font = "12px sans-serif"; ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(Math.max(0, Math.ceil((BAL.battle_timeout_ms - (B.t - B.waveStart)) / 1000)) + "s", W - 10, 16);
  ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,215,140,0.85)";
  ctx.fillText(`${STR.wave} ${B.waveIdx + 1}/${B.waves.length}`, 10, 16);
}

function renderBattle() {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (B.use3D && three && B.t3) {
    update3D(W, H);
    const cam = B.t3.camera;
    if (B.shake && B.shake.t > 0) {
      const a = B.shake.amp * (B.shake.t / B.shake.dur);
      cam.position.set(CAM.pos[0] + (Math.random() - 0.5) * 2 * a,
        CAM.pos[1] + (Math.random() - 0.5) * 1.3 * a,
        CAM.pos[2] + (Math.random() - 0.5) * a);
    } else {
      cam.position.set(CAM.pos[0], CAM.pos[1], CAM.pos[2]);
    }
    cam.lookAt(CAM.look[0], CAM.look[1], CAM.look[2]);
    three.renderer.render(B.t3.scene, B.t3.camera);
    ctx.clearRect(0, 0, W, H);
    for (const u of [...B.enemies, ...B.allies]) drawGauges(u);
    drawOverlays(W, H);
    return;
  }
  const bg = BIOME_BG[B.biome];
  if (bg && bg.complete && bg.naturalWidth) {
    const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
    const dw = bg.naturalWidth * s, dh = bg.naturalHeight * s;
    ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.fillStyle = "rgba(11,10,31,0.45)"; ctx.fillRect(0, 0, W, H);
  } else {
    // repli procédural « Brume » (formule de style : ciel doré rongé de violet)
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a1033"); g.addColorStop(0.45, "#2a1a4d"); g.addColorStop(0.75, "#3d2a54"); g.addColorStop(1, "#593860");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const g2 = ctx.createRadialGradient(W / 2, H * 0.52, 10, W / 2, H * 0.52, W * 0.7);
  g2.addColorStop(0, "rgba(255,205,120,0.16)"); g2.addColorStop(1, "rgba(255,205,120,0)");
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,215,140,0.25)"; ctx.setLineDash([6, 8]);
  ctx.beginPath(); ctx.moveTo(20, H * 0.5); ctx.lineTo(W - 20, H * 0.5); ctx.stroke(); ctx.setLineDash([]);

  for (const u of B.enemies) drawUnit(u);
  for (const u of B.allies) drawUnit(u);
  drawOverlays(W, H);
}

/* --- boucle à pas de temps fixe --- */

let last = performance.now(), acc = 0, paused = false;
let frames = 0, fpsAt = last;
const devMode = new URLSearchParams(location.search).has("dev");
addEventListener("blur", () => (paused = true));
addEventListener("focus", () => { paused = false; last = performance.now(); });

function frame(now) {
  requestAnimationFrame(frame);
  if (paused) { last = now; return; }
  const real = Math.min(100, now - last); last = now;
  if (B && !B.over && B.introT > 0) {
    B.introT -= real;
    if (B.introT <= 0) document.querySelectorAll(".bintro").forEach((e) => e.remove());
    acc = 0;
  } else if (B && !B.over) {
    acc += real * B.speed;
    while (acc >= BAL.tick_ms) { battleTick(BAL.tick_ms); acc -= BAL.tick_ms; }
    for (const u of [...B.allies, ...B.enemies]) {
      if (u.lungeT > 0) u.lungeT -= real;
      if (u.hitT > 0) u.hitT -= real;
    }
    for (const f of B.floaters) f.age += real;
    B.floaters = B.floaters.filter((f) => f.age < 900);
    if (B.banner) { B.banner.t -= real; if (B.banner.t <= 0) B.banner = null; }
    if (B.flash) { B.flash.t -= real; if (B.flash.t <= 0) B.flash = null; }
    if (B.shake) { B.shake.t -= real; if (B.shake.t <= 0) B.shake = null; }
    if (S.ultMode === "manual") refreshSkillsPanel();
  }
  if (B) renderBattle();
  if (devMode) {
    frames++;
    if (now - fpsAt >= 500) {
      document.getElementById("dev").textContent = Math.round((frames * 1000) / (now - fpsAt)) + " fps";
      frames = 0; fpsAt = now;
    }
  }
}
requestAnimationFrame(frame);

/* ------------------------------- navigation ------------------------------- */

function setScreen(s) { screen = s; render(); }

function render() {
  closeModal();
  let body = "";
  if (screen === "home") body = homeScreen();
  else if (screen === "heroes") body = heroesScreen();
  else if (screen === "campaign") body = campaignScreen();
  else if (screen === "summon") body = summonScreen();
  else if (screen === "quests") body = questsScreen();
  app.innerHTML = `${currencyBar()}<main class="screen">${body}</main>${nav()}`;
  refreshBadges();

  app.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => setScreen(b.dataset.nav)));
  app.querySelectorAll("[data-hero]").forEach((c) => c.addEventListener("click", () => heroDetail(c.dataset.hero)));
  app.querySelectorAll("[data-quest]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.quest, q = BAL.quests[id];
    S.quests.claimed[id] = true; S.diamonds += q.diamonds; save();
    toast(`+${q.diamonds} 💎`); render();
  }));
  const on = (id, fn) => { const e = document.getElementById(id); if (e) e.onclick = fn; };
  on("btnClaim", claimAfk);
  on("btnInstant", instantAfk);
  on("btnFight", () => startBattle(S.stage));
  on("btnFarm", () => startBattle(S.stage - 1));
  on("btnS1", () => { const r = doSummon(1); render(); if (r) summonResults(r); });
  on("btnS10", () => { const r = doSummon(10); render(); if (r) summonResults(r); });
  on("btnLogin", () => {
    const r = BAL.login[S.login.idx];
    S.diamonds += r.diamonds || 0; S.scrolls += r.scrolls || 0; S.gold += r.gold || 0;
    S.login.idx++; S.login.last = todayKey(); save(); toast(STR.quest_claimed); render();
  });
}

/* boutons de l'écran de combat */
document.getElementById("bMode").addEventListener("click", () => {
  S.ultMode = S.ultMode === "manual" ? "auto" : "manual";
  save();
  updateModeUI();
  if (S.ultMode === "manual") toast(STR.mode_hint);
});
document.getElementById("bSpeed").addEventListener("click", (e) => {
  if (!B) return;
  B.speed = B.speed === 1 ? 2 : 1;
  e.target.textContent = "×" + B.speed;
});
document.getElementById("bQuit").addEventListener("click", () => { closeBattle(); render(); });

/* ------------------------------- onboarding ------------------------------- */

function welcome() {
  openModal(`<h3>${STR.welcome_title}</h3><p>${STR.welcome_body}</p>
    <button class="btn primary" id="wGo">${STR.welcome_cta}</button>`, () => {
    document.getElementById("wGo").onclick = () => {
      S.roster.kaelis = { lvl: 1, asc: 0, copies: 0 };
      S.team = ["kaelis"]; S.tuto = 1; save();
      render();
      openModal(`<h3>${STR.gift_title}</h3>
        <div class="hd-top"><img src="./assets/portraits/kaelis.jpg" alt=""><p>${STR.gift_body}</p></div>
        <button class="btn gold" id="wOk">${STR.gift_cta}</button>`, () => {
        document.getElementById("wOk").onclick = () => { setScreen("summon"); };
      });
    };
  });
}

/* ---------------------------------- boot ----------------------------------- */

if (devMode) document.getElementById("dev").style.display = "block";
resizeCanvas();
request3D();
render();
if (!S.tuto) welcome();
setInterval(save, 15000);
addEventListener("visibilitychange", () => { if (document.hidden) save(); });
