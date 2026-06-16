-- ShopService : outils, appâts, upgrades, déco, plots, game passes
-- Type : ModuleScript dans ServerScriptService

local ShopService = {}

local MarketplaceService = game:GetService("MarketplaceService")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local DataService = require(script.Parent.DataService)

local function sendHUD(player)
  local data = DataService.getData(player)
  if not data then return end
  RemoteEvents.UpdateHUD:FireClient(player, {
    gold = data.gold,
    rebirthLevel = data.rebirthLevel,
    rebirthMult = GameConfig.RebirthMultiplier ^ data.rebirthLevel,
    totalCapybaras = #(data.capybaras or {}),
    beautyScore = data.beautyScore or 0,
  })
end

-- ── UPGRADES ─────────────────────────────────────────────────────────────────
function ShopService.buyUpgrade(player, upgradeId)
  local data = DataService.getData(player)
  if not data then return end
  local cfg = GameConfig.getUpgradeById(upgradeId)
  if not cfg then return end

  local currentLevel = data.upgrades[upgradeId] or 0
  if currentLevel >= cfg.max then
    RemoteEvents.ShowNotification:FireClient(player, { type="info", message="Niveau max atteint." })
    return
  end
  local cost = math.floor(cfg.baseCost * (cfg.mult ^ currentLevel))
  if not DataService.spendGold(player, cost) then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Pas assez de CapyGold ("..cost..")." })
    return
  end
  data.upgrades[upgradeId] = currentLevel + 1
  RemoteEvents.ShowNotification:FireClient(player, {
    type="success", message = cfg.label .. " niveau " .. (currentLevel + 1) .. " !",
  })
  sendHUD(player)
end

-- ── ITEMS (tool / bait / deco) ───────────────────────────────────────────────
function ShopService.buyItem(player, itemType, itemId)
  local data = DataService.getData(player)
  if not data then return end

  if itemType == "tool" then
    local tool = GameConfig.getToolById(itemId)
    if not tool or tool.consumable then return end
    if data.tools[itemId] then
      RemoteEvents.ShowNotification:FireClient(player, { type="info", message="Déjà possédé." })
      return
    end
    if not DataService.spendGold(player, tool.cost) then
      RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Pas assez de CapyGold." })
      return
    end
    data.tools[itemId] = true
    RemoteEvents.ShowNotification:FireClient(player, { type="success", message = tool.emoji.." "..tool.name.." acheté !" })

  elseif itemType == "bait" then
    local bait = GameConfig.getToolById(itemId)
    if not bait or not bait.consumable then return end
    if not DataService.spendGold(player, bait.cost) then
      RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Pas assez de CapyGold." })
      return
    end
    data.baits[itemId] = (data.baits[itemId] or 0) + 1
    RemoteEvents.ShowNotification:FireClient(player, { type="success", message = bait.emoji.." "..bait.name.." x"..data.baits[itemId] })

  elseif itemType == "deco" then
    local deco = GameConfig.getDecoById(itemId)
    if not deco then return end
    if not DataService.spendGold(player, deco.cost) then
      RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Pas assez de CapyGold." })
      return
    end
    data.decoInventory = data.decoInventory or {}
    data.decoInventory[itemId] = (data.decoInventory[itemId] or 0) + 1
    RemoteEvents.ShowNotification:FireClient(player, { type="success", message = deco.emoji.." "..deco.name.." acheté ! Place-le depuis la boutique." })
  else
    return
  end

  sendHUD(player)
end

-- ── PLOTS ────────────────────────────────────────────────────────────────────
function ShopService.unlockPlot(player, plotId)
  local data = DataService.getData(player)
  if not data then return end
  local maxPlots = GameConfig.MaxPlots + ((data.gamePasses and data.gamePasses.ExtraPlots) and 4 or 0)
  if plotId < 1 or plotId > maxPlots then return end

  for _, p in ipairs(data.unlockedPlots) do
    if p == plotId then
      RemoteEvents.ShowNotification:FireClient(player, { type="info", message="Plot déjà débloqué." })
      return
    end
  end
  -- plot précédent requis
  if plotId > 1 then
    local prevUnlocked = false
    for _, p in ipairs(data.unlockedPlots) do if p == plotId - 1 then prevUnlocked = true break end end
    if not prevUnlocked then
      RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Débloque d'abord le plot précédent." })
      return
    end
  end

  local cost = GameConfig.PlotUnlockCosts[plotId] or (plotId > GameConfig.MaxPlots and 50000 or 0)
  if not DataService.spendGold(player, cost) then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Pas assez de CapyGold ("..cost..")." })
    return
  end
  table.insert(data.unlockedPlots, plotId)

  local SpaService = require(script.Parent.SpaService)
  SpaService.ensurePlayerArea(player)
  SpaService.refreshPlotLocks(player)

  RemoteEvents.ShowNotification:FireClient(player, { type="success", message="🏗️ Plot "..plotId.." débloqué !" })
  sendHUD(player)
end

-- ── EQUIP TOOL ───────────────────────────────────────────────────────────────
function ShopService.equipTool(player, toolId)
  local data = DataService.getData(player)
  if not data then return end
  if not data.tools[toolId] then return end
  data.equippedTool = toolId
  RemoteEvents.ShowNotification:FireClient(player, { type="info", message="Outil équipé." })
end

-- ── GAME PASSES ──────────────────────────────────────────────────────────────
function ShopService.promptGamePass(player, passName)
  local pass = GameConfig.GamePasses[passName]
  if not pass or not pass.id or pass.id <= 0 then
    RemoteEvents.ShowNotification:FireClient(player, { type="info", message="Game pass bientôt disponible." })
    return
  end
  pcall(function()
    MarketplaceService:PromptGamePassPurchase(player, pass.id)
  end)
end

function ShopService.onGamePassPurchased(player, passId)
  local data = DataService.getData(player)
  if not data then return end
  for passName, pass in pairs(GameConfig.GamePasses) do
    if pass.id == passId then
      data.gamePasses = data.gamePasses or {}
      data.gamePasses[passName] = true
      RemoteEvents.ShowNotification:FireClient(player, { type="legendary", message="🌟 "..pass.name.." activé !" })
      sendHUD(player)
      return
    end
  end
end

function ShopService.registerEvents()
  RemoteEvents.BuyUpgrade.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    ShopService.buyUpgrade(player, payload.upgradeId)
  end)
  RemoteEvents.BuyItem.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    ShopService.buyItem(player, payload.itemType, payload.itemId)
  end)
  RemoteEvents.UnlockPlot.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    ShopService.unlockPlot(player, payload.plotId)
  end)
  RemoteEvents.EquipTool.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    ShopService.equipTool(player, payload.toolId)
  end)
  RemoteEvents.BuyGamePass.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    ShopService.promptGamePass(player, payload.passName)
  end)
end

return ShopService
