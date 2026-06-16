-- CHEF D'ORCHESTRE : initialise tous les services et gère le cycle de vie des joueurs
-- Type : Script (PAS un ModuleScript)

local Players            = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")
local RunService         = game:GetService("RunService")

-- Modules partagés
local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

-- Services (tous dans ServerScriptService)
local DataService        = require(script.Parent.DataService)
local NatureZoneService  = require(script.Parent.NatureZoneService)
local CaptureService     = require(script.Parent.CaptureService)
local SpaService         = require(script.Parent.SpaService)
local BreedingService    = require(script.Parent.BreedingService)
local ShopService        = require(script.Parent.ShopService)
local DecorationService  = require(script.Parent.DecorationService)
local RebirthService     = require(script.Parent.RebirthService)
local LeaderboardService = require(script.Parent.LeaderboardService)

-- Déclaré tôt pour être visible dans les closures
local GameManager = {}

function GameManager.sendFullUpdate(player)
  local data = DataService.getData(player)
  if not data then return end
  RemoteEvents.UpdateHUD:FireClient(player, {
    gold           = data.gold,
    rebirthLevel   = data.rebirthLevel,
    rebirthMult    = GameConfig.RebirthMultiplier ^ data.rebirthLevel,
    totalCapybaras = #(data.capybaras or {}),
    beautyScore    = data.beautyScore or 0,
  })
end

-- ── INITIALISATION DES SERVICES ──────────────────────────────────────────────
NatureZoneService.init()
SpaService.init()
BreedingService.init()
LeaderboardService.init()

-- ── CONNEXION DES REMOTE EVENTS ──────────────────────────────────────────────
CaptureService.registerEvents()
SpaService.registerEvents()
BreedingService.registerEvents()
ShopService.registerEvents()
DecorationService.registerEvents()
RebirthService.registerEvents()

RemoteEvents.GetPlayerData.OnServerInvoke = function(player)
  return DataService.getData(player)
end

RemoteEvents.GetInventory.OnServerInvoke = function(player)
  local data = DataService.getData(player)
  if not data then return {} end
  return {
    capybaras  = data.capybaras or {},
    tools      = data.tools or { net_basic = true },
    baits      = data.baits or {},
    decos      = data.decoInventory or {},
    equipped   = data.equippedTool or "net_basic",
    upgrades   = data.upgrades or {},
    gamePasses = data.gamePasses or {},
    unlockedPlots = data.unlockedPlots or {1},
    spas       = data.spas or {},
    breedingPlots = data.breedingPlots or {},
  }
end

RemoteEvents.GetLeaderboard.OnServerInvoke = function(player, payload)
  if type(payload) ~= "table" then return {} end
  return LeaderboardService.getTop10(payload.lbId)
end

-- ── ARRIVÉE D'UN JOUEUR ──────────────────────────────────────────────────────
local function setupPlayerWorld(player)
  task.wait(0.5)
  SpaService.rebuildPlayerSpas(player)
  DecorationService.rebuildPlayerDecorations(player)
  BreedingService.rebuildBreedingPlots(player)
  GameManager.sendFullUpdate(player)
end

local function onPlayerAdded(player)
  DataService.loadPlayer(player)
  local data = DataService.getData(player)

  -- leaderstats natifs
  local ls = Instance.new("Folder")
  ls.Name = "leaderstats"
  ls.Parent = player

  local goldStat = Instance.new("IntValue")
  goldStat.Name = "CapyGold"
  goldStat.Value = data.gold
  goldStat.Parent = ls

  local rebirthStat = Instance.new("IntValue")
  rebirthStat.Name = "Rebirths"
  rebirthStat.Value = data.rebirthLevel
  rebirthStat.Parent = ls

  local capyStat = Instance.new("IntValue")
  capyStat.Name = "Capybaras"
  capyStat.Value = #data.capybaras
  capyStat.Parent = ls

  data._leaderstats = { gold = goldStat, rebirths = rebirthStat, capys = capyStat }

  -- game passes possédés
  task.spawn(function()
    for passName, passInfo in pairs(GameConfig.GamePasses) do
      if passInfo.id and passInfo.id > 0 then
        local ok, owns = pcall(function()
          return MarketplaceService:UserOwnsGamePassAsync(player.UserId, passInfo.id)
        end)
        if ok and owns then
          data.gamePasses = data.gamePasses or {}
          data.gamePasses[passName] = true
        end
      end
    end
    -- collecte hors-ligne si AutoCollect
    SpaService.collectPendingGold(player)
    GameManager.sendFullUpdate(player)
  end)

  player.CharacterAdded:Connect(function()
    task.spawn(setupPlayerWorld, player)
  end)

  if player.Character then
    task.spawn(setupPlayerWorld, player)
  end
end

-- ── DÉPART D'UN JOUEUR ───────────────────────────────────────────────────────
local function onPlayerRemoving(player)
  SpaService.collectPendingGold(player)
  DataService.savePlayer(player)
  SpaService.cleanupPlayer(player)
  DecorationService.cleanupPlayer(player)
  BreedingService.cleanupPlayer(player)
  DataService.clear(player)
end

-- ── BOUCLE DE REVENUS SPA ────────────────────────────────────────────────────
local SPA_TICK = 10
local lastSpaTick = 0
RunService.Heartbeat:Connect(function()
  local now = tick()
  if now - lastSpaTick >= SPA_TICK then
    lastSpaTick = now
    for _, player in ipairs(Players:GetPlayers()) do
      task.spawn(function()
        SpaService.applyPassiveGold(player, SPA_TICK)
        local data = DataService.getData(player)
        if data and data.gamePasses and data.gamePasses.AutoCollect then
          SpaService.autoInteractAll(player)
        end
      end)
    end
  end
end)

-- ── BOUCLE LEADERBOARD ───────────────────────────────────────────────────────
task.spawn(function()
  while true do
    task.wait(GameConfig.LeaderboardUpdateInterval)
    pcall(LeaderboardService.updateAll)
  end
end)

-- ── BOUCLE AUTOSAVE ──────────────────────────────────────────────────────────
task.spawn(function()
  while true do
    task.wait(60)
    for _, player in ipairs(Players:GetPlayers()) do
      task.spawn(function()
        DataService.savePlayer(player)
      end)
    end
  end
end)

-- ── GAME PASS PURCHASE HANDLER ───────────────────────────────────────────────
MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, wasPurchased)
  if wasPurchased then
    ShopService.onGamePassPurchased(player, passId)
  end
end)

-- ── CONNEXIONS ───────────────────────────────────────────────────────────────
Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(onPlayerRemoving)

-- Sauvegarde à la fermeture du serveur
game:BindToClose(function()
  for _, player in ipairs(Players:GetPlayers()) do
    DataService.savePlayer(player)
  end
  task.wait(2)
end)

for _, p in ipairs(Players:GetPlayers()) do
  task.spawn(onPlayerAdded, p)
end
