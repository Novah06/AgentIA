-- DataService : DataStore + profil joueur en mémoire
-- Type : ModuleScript dans ServerScriptService

local DataService = {}

local Players          = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local CapybaraData  = require(game.ReplicatedStorage.Modules.CapybaraData)

local store = DataStoreService:GetDataStore("CapySpaWorld_v2")

-- Cache mémoire : { [userId] = data }
local cache = {}

-- ── PROFIL PAR DÉFAUT ────────────────────────────────────────────────────────
local function defaultData()
  return {
    gold            = GameConfig.StartingGold,
    totalGoldEarned = 0,
    totalCapyBred   = 0,
    rebirthLevel    = 0,
    beautyScore     = 0,

    capybaras       = {},
    spas            = {},
    breedingPlots   = {},
    decorations     = {},

    unlockedPlots   = {1},

    upgrades        = {
      luckBoost=0, goldBoost=0, captureBoost=0,
      breedSpeed=0, spaCapacity=0, visitorMagnet=0, beautyAura=0,
    },

    tools           = { net_basic = true },
    baits           = {},
    gamePasses      = {},

    equippedTool    = "net_basic",
    lastSeen        = os.time(),
    version         = 2,
  }
end

-- ── HELPERS ──────────────────────────────────────────────────────────────────
local function keyFor(player)
  return GameConfig.DataStoreKeyPrefix .. player.UserId
end

-- Désérialise les capybaras chargés
local function postLoad(data)
  data.capybaras = data.capybaras or {}
  for i, c in ipairs(data.capybaras) do
    data.capybaras[i] = CapybaraData.deserialize(c)
  end
  -- garantit que tous les champs existent (migration douce)
  local def = defaultData()
  for k, v in pairs(def) do
    if data[k] == nil then data[k] = v end
  end
  if data.upgrades then
    for k, v in pairs(def.upgrades) do
      if data.upgrades[k] == nil then data.upgrades[k] = v end
    end
  end
  return data
end

-- Prépare les données pour la sauvegarde (sérialise les capybaras)
local function preSave(data)
  local copy = {}
  for k, v in pairs(data) do
    -- on n'enregistre pas les références runtime (leaderstats, modèles…)
    if not tostring(k):match("^_") then
      copy[k] = v
    end
  end
  local serializedCapys = {}
  for i, c in ipairs(data.capybaras or {}) do
    serializedCapys[i] = CapybaraData.serialize(c)
  end
  copy.capybaras = serializedCapys
  copy.lastSeen = os.time()
  return copy
end

-- ── CHARGEMENT ───────────────────────────────────────────────────────────────
function DataService.loadPlayer(player)
  local loaded = nil
  local success = false
  for attempt = 1, 3 do
    local ok, result = pcall(function()
      return store:GetAsync(keyFor(player))
    end)
    if ok then
      loaded = result
      success = true
      break
    else
      warn("[DataService] GetAsync échec ("..attempt.."/3) pour "..player.Name..": "..tostring(result))
      task.wait(1)
    end
  end

  local data
  if success and loaded then
    data = postLoad(loaded)
  else
    data = defaultData()
    if not success then
      data._loadFailed = true  -- ne PAS sauvegarder par-dessus en cas d'échec total
    end
  end

  cache[player.UserId] = data
  return data
end

-- ── SAUVEGARDE ───────────────────────────────────────────────────────────────
function DataService.savePlayer(player)
  local data = cache[player.UserId]
  if not data then return false end
  -- ne pas écraser des données qu'on n'a pas réussi à charger
  if data._loadFailed then
    warn("[DataService] Sauvegarde ignorée pour "..player.Name.." (chargement échoué)")
    return false
  end

  local payload = preSave(data)
  for attempt = 1, 3 do
    local ok, err = pcall(function()
      store:SetAsync(keyFor(player), payload)
    end)
    if ok then
      return true
    else
      warn("[DataService] SetAsync échec ("..attempt.."/3) pour "..player.Name..": "..tostring(err))
      task.wait(1)
    end
  end
  return false
end

-- ── ACCÈS MÉMOIRE ────────────────────────────────────────────────────────────
function DataService.getData(player)
  return cache[player.UserId]
end

function DataService.clear(player)
  cache[player.UserId] = nil
end

-- ── LEADERSTATS SYNC ─────────────────────────────────────────────────────────
local function syncLeaderstats(player, data)
  if data._leaderstats then
    if data._leaderstats.gold then data._leaderstats.gold.Value = math.floor(data.gold) end
    if data._leaderstats.rebirths then data._leaderstats.rebirths.Value = data.rebirthLevel end
    if data._leaderstats.capys then data._leaderstats.capys.Value = #data.capybaras end
  end
end

-- ── GOLD ─────────────────────────────────────────────────────────────────────
function DataService.setGold(player, amount)
  local data = cache[player.UserId]
  if not data then return end
  data.gold = math.max(0, math.floor(amount))
  syncLeaderstats(player, data)
end

function DataService.addGold(player, amount)
  local data = cache[player.UserId]
  if not data then return end
  amount = math.floor(amount)
  data.gold = data.gold + amount
  if amount > 0 then
    data.totalGoldEarned = (data.totalGoldEarned or 0) + amount
  end
  syncLeaderstats(player, data)
end

-- Retourne true si le joueur avait assez de gold (et le dépense)
function DataService.spendGold(player, amount)
  local data = cache[player.UserId]
  if not data then return false end
  amount = math.floor(amount)
  if data.gold >= amount then
    data.gold = data.gold - amount
    syncLeaderstats(player, data)
    return true
  end
  return false
end

-- ── CAPYBARAS ────────────────────────────────────────────────────────────────
function DataService.addCapybara(player, capy)
  local data = cache[player.UserId]
  if not data then return false end
  if #data.capybaras >= GameConfig.MaxCapybaras then
    return false, "Inventaire plein ("..GameConfig.MaxCapybaras..")"
  end
  table.insert(data.capybaras, capy)
  syncLeaderstats(player, data)
  return true
end

function DataService.removeCapybara(player, id)
  local data = cache[player.UserId]
  if not data then return false end
  for i, c in ipairs(data.capybaras) do
    if c.id == id then
      table.remove(data.capybaras, i)
      syncLeaderstats(player, data)
      return true
    end
  end
  return false
end

function DataService.findCapybara(player, id)
  local data = cache[player.UserId]
  if not data then return nil end
  for _, c in ipairs(data.capybaras) do
    if c.id == id then return c end
  end
  return nil
end

function DataService.updateCapybara(player, id, changes)
  local capy = DataService.findCapybara(player, id)
  if not capy then return false end
  for k, v in pairs(changes) do
    capy[k] = v
  end
  return true
end

return DataService
