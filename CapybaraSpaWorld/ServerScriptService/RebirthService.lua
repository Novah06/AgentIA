-- RebirthService : prestige + multiplicateurs
-- Type : ModuleScript dans ServerScriptService

local RebirthService = {}

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local DataService = require(script.Parent.DataService)

function RebirthService.canRebirth(player)
  local data = DataService.getData(player)
  if not data then return false end
  return data.gold >= GameConfig.RebirthCost and data.rebirthLevel < GameConfig.RebirthMaxLevel
end

function RebirthService.getRebirthMultiplier(player)
  local data = DataService.getData(player)
  if not data then return 1 end
  return GameConfig.RebirthMultiplier ^ data.rebirthLevel
end

function RebirthService.performRebirth(player)
  local data = DataService.getData(player)
  if not data then return end

  if not RebirthService.canRebirth(player) then
    if data.rebirthLevel >= GameConfig.RebirthMaxLevel then
      RemoteEvents.ShowNotification:FireClient(player, { type="info", message="Rebirth maximum atteint !" })
    else
      RemoteEvents.ShowNotification:FireClient(player, {
        type="error", message="Il te faut "..GameConfig.RebirthCost.." CapyGold.",
      })
    end
    return
  end

  local SpaService      = require(script.Parent.SpaService)
  local BreedingService = require(script.Parent.BreedingService)
  local DecorationService= require(script.Parent.DecorationService)

  data.rebirthLevel = data.rebirthLevel + 1

  -- RESET
  data.gold = GameConfig.StartingGold
  data.capybaras = {}
  -- détruit les modèles de spas puis vide la liste
  SpaService.destroyAllSpas(player)
  data.spas = {}
  -- annule les élevages en cours proprement
  BreedingService.cancelAll(player)

  -- CONSERVÉ : upgrades, tools, baits, decorations, unlockedPlots, gamePasses, decoInventory
  -- recalcule beautyScore (décos conservées)
  DecorationService.recalcBeauty(player)

  -- sauvegarde forcée
  task.spawn(function()
    DataService.savePlayer(player)
  end)

  RemoteEvents.ShowNotification:FireClient(player, {
    type="rebirth", message="✨ REBIRTH x"..data.rebirthLevel.." !",
    rebirthLevel = data.rebirthLevel,
  })
  RemoteEvents.UpdateHUD:FireClient(player, {
    gold = data.gold,
    rebirthLevel = data.rebirthLevel,
    rebirthMult = GameConfig.RebirthMultiplier ^ data.rebirthLevel,
    totalCapybaras = 0,
    beautyScore = data.beautyScore or 0,
  })
end

function RebirthService.registerEvents()
  RemoteEvents.TriggerRebirth.OnServerEvent:Connect(function(player)
    RebirthService.performRebirth(player)
  end)
end

return RebirthService
