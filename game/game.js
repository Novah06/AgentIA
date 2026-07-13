// ASTRIA — Les Éclats du Ciel Brisé : client de jeu (solo, mobile-first).
import { STR } from "./strings.js";
import { HEROES, FACTIONS, RARITIES, CLASSES, BAL, heroById, chapterOf } from "./data.js";

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
    tuto: 0, attempts: 0,
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
function enemyTeamFor(idx) {
  const rng = mulberry32(idx * 7919 + 17);
  const pool = [...HEROES];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const isBoss = idx % BAL.stages_per_chapter === BAL.stages_per_chapter - 1;
  const mult = BAL.enemy_base_mult * Math.pow(BAL.enemy_growth, idx);
  return pool.slice(0, 5).map((h, k) => ({
    hero: h, echo: true, boss: isBoss && k === 0,
    mult: mult * (isBoss && k === 0 ? BAL.boss_mult : 1),
  }));
}
function enemyPower(idx) {
  return Math.round(enemyTeamFor(idx).reduce((a, e) => {
    const b = e.hero.base, m = e.mult * RARITIES[e.hero.rarity].mult;
    return a + ((b.hp * m) / 8 + b.atk * m * 4 + b.def * m * 6) * (b.spd / 100);
  }, 0));
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
for (const h of HEROES) { const im = new Image(); im.src = `./assets/portraits/${h.id}.jpg`; PORTRAITS[h.id] = im; }

let B = null; // état du combat en cours

function makeUnit(hero, side, stats, opts = {}) {
  return {
    id: hero.id, hero, side, boss: !!opts.boss, echo: !!opts.echo,
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
  const enemies = enemyTeamFor(stageIdx).map((e) => {
    const b = e.hero.base, m = e.mult * RARITIES[e.hero.rarity].mult;
    return makeUnit(e.hero, "enemy",
      { hp: Math.round(b.hp * m * (e.boss ? 1.6 : 1)), atk: Math.round(b.atk * m), def: Math.round(b.def * m), spd: b.spd },
      { boss: e.boss, echo: true });
  });
  B = {
    stageIdx, rng, allies, enemies, t: 0, over: false, victory: false,
    speed: 1, floaters: [], banner: null, scheduled: [], frozen: 0,
  };
  document.getElementById("battle").classList.add("open");
  resizeCanvas();
  document.getElementById("bTitle").textContent =
    `${STR.campaign_chapter} ${chapterOf(stageIdx).ch + 1} — ${STR.campaign_stage} ${chapterOf(stageIdx).st + 1}`;
  document.getElementById("bResult").classList.remove("open");
  layoutUnits();
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
  if (crit) dmg *= BAL.crit_mult;
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
  B.banner = { unit: u, t: 900 };
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
        B.scheduled.push({ at: B.t + (k.dur / k.hits) * i, fn: () => { const t = pickTarget(u, foes); if (t) dealDamage(u, t, pct); } });
      break;
    case "lanterns":
      for (let i = 0; i < k.hits; i++) {
        const t = alive(foes)[Math.floor(B.rng() * Math.max(1, alive(foes).length))];
        if (t) { const d = dealDamage(u, t, pct);
          const low = alive(mates).reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b), alive(mates)[0]);
          if (low) heal(low, d * 0.5); } }
      break;
    case "haste":
      for (const a of alive(mates)) { a.hasteUntil = B.t + k.dur; a.hasteMult = 1 + pct; a.energy = Math.min(BAL.energy_max, a.energy + k.energy); } break;
    case "aoe_stun":
      for (const e of alive(foes)) { dealDamage(u, e, pct); if (CLASSES[e.hero.cls].row === "front") e.stunUntil = B.t + k.dur; } break;
    case "volley":
      for (let i = 0; i < k.hits; i++) { const t = pickTarget(u, foes); if (t) dealDamage(u, t, pct); }
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
  if (u.energy >= BAL.energy_max) { castUltimate(u, foes, mates); u.lungeT = 240; return; }
  // Aube : soigne si un allié est sous 65 %
  if (CLASSES[u.hero.cls].target === "smart") {
    const low = alive(mates).reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b), alive(mates)[0]);
    if (low && low.hp / low.maxHp < 0.65) { heal(low, u.atk * 1.1); u.energy = Math.min(BAL.energy_max, u.energy + BAL.energy_per_attack); u.lungeT = 240; return; }
  }
  const t = pickTarget(u, foes);
  if (!t) return;
  dealDamage(u, t, 1.0);
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
  if (!alive(B.enemies).length) endBattle(true);
  else if (!alive(B.allies).length) endBattle(false);
  else if (B.t >= BAL.battle_timeout_ms) endBattle(false, true);
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
function closeBattle() { B = null; document.getElementById("battle").classList.remove("open"); }

/* --- rendu canvas du combat --- */

const canvas = document.getElementById("bCanvas");
const ctx = canvas.getContext("2d");
const DPR_CAP = 1.5;
function resizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, DPR_CAP);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

function renderBattle() {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  // fond procédural « Brume » (formule de style : ciel doré rongé de violet)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1a1033"); g.addColorStop(0.45, "#2a1a4d"); g.addColorStop(0.75, "#3d2a54"); g.addColorStop(1, "#593860");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W / 2, H * 0.52, 10, W / 2, H * 0.52, W * 0.7);
  g2.addColorStop(0, "rgba(255,205,120,0.16)"); g2.addColorStop(1, "rgba(255,205,120,0)");
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,215,140,0.25)"; ctx.setLineDash([6, 8]);
  ctx.beginPath(); ctx.moveTo(20, H * 0.5); ctx.lineTo(W - 20, H * 0.5); ctx.stroke(); ctx.setLineDash([]);

  for (const u of B.enemies) drawUnit(u);
  for (const u of B.allies) drawUnit(u);

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
    ctx.fillText("✦ " + B.banner.unit.hero.ultName + " ✦", W / 2, H * 0.44 + 29);
  }
  // chronomètre
  ctx.font = "12px sans-serif"; ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(Math.max(0, Math.ceil((BAL.battle_timeout_ms - B.t) / 1000)) + "s", W - 10, 16);
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
  if (B && !B.over) {
    acc += real * B.speed;
    while (acc >= BAL.tick_ms) { battleTick(BAL.tick_ms); acc -= BAL.tick_ms; }
    for (const u of [...B.allies, ...B.enemies]) {
      if (u.lungeT > 0) u.lungeT -= real;
      if (u.hitT > 0) u.hitT -= real;
    }
    for (const f of B.floaters) f.age += real;
    B.floaters = B.floaters.filter((f) => f.age < 900);
    if (B.banner) { B.banner.t -= real; if (B.banner.t <= 0) B.banner = null; }
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
render();
if (!S.tuto) welcome();
setInterval(save, 15000);
addEventListener("visibilitychange", () => { if (document.hidden) save(); });
