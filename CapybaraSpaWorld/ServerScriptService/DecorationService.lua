-- DecorationService : placement décos + score beauté
-- Type : ModuleScript dans ServerScriptService

local DecorationService = {}

local HttpService   = game:GetService("HttpService")
local TweenService  = game:GetService("TweenService")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local DataService        = require(script.Parent.DataService)
local LeaderboardService = require(script.Parent.LeaderboardService)

-- Modèles runtime : { [userId] = { [decoInstanceId] = Model } }
local decoModels = {}

-- couleur par catégorie
local categoryColor = {
  plante     = Color3.fromRGB(80, 200, 80),
  eau        = Color3.fromRGB(80, 180, 230),
  confort    = Color3.fromRGB(230, 180, 120),
  lumiere    = Color3.fromRGB(255, 220, 120),
  nourriture = Color3.fromRGB(255, 160, 80),
  premium    = Color3.fromRGB(255, 215, 0),
}

local function buildDecoModel(player, decoEntry)
  local SpaService = require(script.Parent.SpaService)
  local state = SpaService.getWorldState(player)
  if not state then return end

  decoModels[player.UserId] = decoModels[player.UserId] or {}
  if decoModels[player.UserId][decoEntry.id] then
    decoModels[player.UserId][decoEntry.id]:Destroy()
  end

  local cfg = GameConfig.getDecoById(decoEntry.decoConfigId)
  if not cfg then return end

  local model = Instance.new("Model")
  model.Name = "Deco_" .. decoEntry.id

  local part = Instance.new("Part")
  part.Anchored = true
  part.Name = "DecoPart"
  part.Size = Vector3.new(3, math.clamp(cfg.beautyScore / 10, 2, 12), 3)
  part.Color = categoryColor[cfg.category] or Color3.fromRGB(200, 200, 200)
  part.Material = (cfg.category == "premium" or cfg.category == "lumiere") and Enum.Material.Neon or Enum.Material.SmoothPlastic
  local pos = decoEntry.position
  part.CFrame = CFrame.new(Vector3.new(pos.x, pos.y + part.Size.Y/2, pos.z)) * CFrame.Angles(0, math.rad(decoEntry.rotation or 0), 0)
  part.Parent = model
  model.PrimaryPart = part

  -- top emoji label
  local bb = Instance.new("BillboardGui")
  bb.Size = UDim2.new(0, 60, 0, 60)
  bb.StudsOffset = Vector3.new(0, part.Size.Y/2 + 2, 0)
  bb.AlwaysOnTop = true
  bb.Adornee = part
  bb.Parent = part
  local label = Instance.new("TextLabel")
  label.Size = UDim2.new(1, 0, 1, 0)
  label.BackgroundTransparency = 1
  label.Text = cfg.emoji
  label.TextScaled = true
  label.Parent = bb

  -- effets premium
  if cfg.category == "premium" or cfg.category == "lumiere" then
    local light = Instance.new("PointLight")
    light.Brightness = 2
    light.Range = 12
    light.Color = part.Color
    light.Parent = part
  end

  model.Parent = state.area
  decoModels[player.UserId][decoEntry.id] = model
end

local function recalcBeauty(player)
  local data = DataService.getData(player)
  if not data then return 0 end
  local sum = 0
  for _, d in ipairs(data.decorations) do
    local cfg = GameConfig.getDecoById(d.decoConfigId)
    if cfg then sum = sum + cfg.beautyScore end
  end
  local auraMult = 1 + (data.upgrades.beautyAura or 0) * 0.05
  data.beautyScore = math.floor(sum * auraMult)
  return data.beautyScore
end
DecorationService.recalcBeauty = recalcBeauty

-- ── PLACEMENT ────────────────────────────────────────────────────────────────
function DecorationService.placeDecoration(player, decoConfigId, plotId, position, rotation)
  local data = DataService.getData(player)
  if not data then return end
  local cfg = GameConfig.getDecoById(decoConfigId)
  if not cfg then return end

  -- vérifie l'inventaire
  data.decoInventory = data.decoInventory or {}
  local qty = data.decoInventory[decoConfigId] or 0
  if qty <= 0 then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Achète d'abord cette décoration." })
    return
  end

  -- vérifie le plot débloqué
  local unlocked = false
  for _, p in ipairs(data.unlockedPlots) do if p == plotId then unlocked = true break end end
  if not unlocked then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Plot verrouillé." })
    return
  end

  data.decoInventory[decoConfigId] = qty - 1

  local entry = {
    id = HttpService:GenerateGUID(false),
    decoConfigId = decoConfigId,
    plotId = plotId,
    position = { x = position.x or position.X, y = position.y or position.Y, z = position.z or position.Z },
    rotation = rotation or 0,
  }
  table.insert(data.decorations, entry)
  buildDecoModel(player, entry)

  local beauty = recalcBeauty(player)
  LeaderboardService.setScore(player, "beautyScore", beauty)

  RemoteEvents.DecorationPlaced:FireClient(player, {
    decoId = entry.id,
    position = position,
    beautyAdded = cfg.beautyScore,
    beautyScore = beauty,
  })
  RemoteEvents.UpdateHUD:FireClient(player, {
    gold = data.gold,
    rebirthLevel = data.rebirthLevel,
    rebirthMult = GameConfig.RebirthMultiplier ^ data.rebirthLevel,
    totalCapybaras = #(data.capybaras or {}),
    beautyScore = beauty,
  })
end

-- ── BONUS GOLD ───────────────────────────────────────────────────────────────
function DecorationService.getGoldBonus(player)
  local data = DataService.getData(player)
  if not data then return 0 end
  local sum = 0
  for _, d in ipairs(data.decorations) do
    local cfg = GameConfig.getDecoById(d.decoConfigId)
    if cfg then sum = sum + cfg.goldBonus end
  end
  return sum
end

-- ── REBUILD / CLEANUP ────────────────────────────────────────────────────────
function DecorationService.rebuildPlayerDecorations(player)
  local data = DataService.getData(player)
  if not data then return end
  for _, entry in ipairs(data.decorations) do
    buildDecoModel(player, entry)
  end
  recalcBeauty(player)
end

function DecorationService.cleanupPlayer(player)
  local models = decoModels[player.UserId]
  if models then
    for _, m in pairs(models) do
      if m then m:Destroy() end
    end
  end
  decoModels[player.UserId] = nil
end

function DecorationService.registerEvents()
  RemoteEvents.PlaceDecoration.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    DecorationService.placeDecoration(player, payload.decoId, payload.plotId, payload.position, payload.rotation)
  end)
end

return DecorationService
