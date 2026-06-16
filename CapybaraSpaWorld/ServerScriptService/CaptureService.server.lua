-- CaptureService : tentatives de capture
-- Type : ModuleScript dans ServerScriptService

local CaptureService = {}

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local CapybaraData  = require(game.ReplicatedStorage.Modules.CapybaraData)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local DataService        = require(script.Parent.DataService)
local NatureZoneService  = require(script.Parent.NatureZoneService)
local LeaderboardService = require(script.Parent.LeaderboardService)

local function getCaptureChance(data, rarityId, toolId, baitId)
  local rarity = GameConfig.Rarities[rarityId]
  local baseChance = rarity and rarity.captureChance or 50

  local tool = GameConfig.getToolById(toolId)
  local toolBonus = (tool and not tool.consumable) and tool.bonusChance or 0

  local baitBonus = 0
  if baitId then
    local bait = GameConfig.getToolById(baitId)
    if bait and bait.consumable then baitBonus = bait.bonusChance end
  end

  local upgradeBonus = (data.upgrades.captureBoost or 0) * 5
  local gpBonus = (data.gamePasses and data.gamePasses.LuckyAura) and 30 or 0

  return math.min(95, baseChance + toolBonus + baitBonus + upgradeBonus + gpBonus)
end

function CaptureService.handleCapture(player, capyId, toolId, baitId)
  local data = DataService.getData(player)
  if not data then return end

  local wild = NatureZoneService.getWild(capyId)
  if not wild then
    RemoteEvents.EncounterEnd:FireClient(player, { success = false, reason = "gone" })
    return
  end

  -- Vérifie possession de l'outil
  toolId = toolId or "net_basic"
  if not data.tools[toolId] then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Tu ne possèdes pas cet outil." })
    return
  end

  -- Consomme l'appât si fourni
  if baitId then
    local qty = data.baits[baitId] or 0
    if qty <= 0 then
      baitId = nil -- pas d'appât dispo, on continue sans
    else
      data.baits[baitId] = qty - 1
    end
  end

  local finalChance = getCaptureChance(data, wild.rarityId, toolId, baitId)
  local roll = math.random(100)

  if roll <= finalChance then
    -- SUCCÈS
    local newCapy = CapybaraData.new(wild.rarityId, "wild")
    newCapy.name = wild.name
    newCapy.traits = wild.traits
    local added, err = DataService.addCapybara(player, newCapy)
    if not added then
      RemoteEvents.ShowNotification:FireClient(player, { type="error", message = err or "Inventaire plein !" })
      RemoteEvents.EncounterEnd:FireClient(player, { success = false, reason = "full" })
      return
    end

    NatureZoneService.removeCaptured(capyId)
    NatureZoneService.endEncounter(player, capyId)

    RemoteEvents.EncounterEnd:FireClient(player, {
      success = true, goldGained = 0, capyName = newCapy.name, rarityId = wild.rarityId,
    })

    local rarity = GameConfig.Rarities[wild.rarityId]
    local notifType = wild.rarityId >= 5 and "legendary" or "success"
    RemoteEvents.ShowNotification:FireClient(player, {
      type = notifType,
      message = rarity.emoji .. " " .. newCapy.name .. " (" .. rarity.name .. ") capturé !",
    })

    LeaderboardService.increment(player, "capyCollect", 1)
    CaptureService.sendHUD(player)
  else
    -- ÉCHEC
    RemoteEvents.EncounterEnd:FireClient(player, { success = false, reason = "resist" })
    RemoteEvents.ShowNotification:FireClient(player, { type="info", message="Le capybara a résisté !" })

    -- chance de fuite pour les raretés élevées
    if wild.rarityId >= 4 then
      local fleeRoll = math.random(100)
      if fleeRoll <= GameConfig.NatureZone.FleeChance then
        NatureZoneService.endEncounter(player, capyId)
        NatureZoneService.despawn(capyId, true)
        RemoteEvents.ShowNotification:FireClient(player, { type="info", message="Il s'est enfui ! 💨" })
      end
    end
  end
end

function CaptureService.sendHUD(player)
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

function CaptureService.registerEvents()
  RemoteEvents.AttemptCapture.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    CaptureService.handleCapture(player, payload.capyId, payload.toolId, payload.baitId)
  end)

  -- Vente de capybara (depuis l'inventaire)
  RemoteEvents.SellCapybara.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    local data = DataService.getData(player)
    if not data then return end
    local capy = DataService.findCapybara(player, payload.capyId)
    if not capy then return end
    if capy.inSpaId or capy.inBreedId then
      RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Retire-le d'abord du spa/élevage." })
      return
    end
    local rarity = GameConfig.Rarities[capy.rarityId]
    DataService.removeCapybara(player, capy.id)
    DataService.addGold(player, rarity.sellPrice)
    RemoteEvents.ShowNotification:FireClient(player, {
      type="success", message="Vendu pour "..rarity.sellPrice.." 🪙",
    })
    CaptureService.sendHUD(player)
  end)
end

return CaptureService
