-- BreedingService : élevage + génétique
-- Type : ModuleScript dans ServerScriptService

local BreedingService = {}

local Workspace     = game:GetService("Workspace")
local HttpService   = game:GetService("HttpService")
local TweenService  = game:GetService("TweenService")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local CapybaraData  = require(game.ReplicatedStorage.Modules.CapybaraData)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local DataService        = require(script.Parent.DataService)
local LeaderboardService = require(script.Parent.LeaderboardService)

-- Modèles 3D runtime : { [userId] = { [breedId] = Model } }
local breedModels = {}

local function findCapy(player, id)
  return DataService.findCapybara(player, id)
end

local function findBreed(data, breedId)
  for _, b in ipairs(data.breedingPlots) do
    if b.id == breedId then return b end
  end
  return nil
end

-- ── MODÈLE DU PARC D'ÉLEVAGE ─────────────────────────────────────────────────
local function buildBreedModel(player, breed)
  local SpaService = require(script.Parent.SpaService)
  local state = SpaService.getWorldState(player)
  if not state then return end
  local plot = state.plots[breed.plotId]
  if not plot then return end

  breedModels[player.UserId] = breedModels[player.UserId] or {}
  if breedModels[player.UserId][breed.id] then
    breedModels[player.UserId][breed.id]:Destroy()
  end

  local model = Instance.new("Model")
  model.Name = "Breed_" .. breed.id
  local basePos = plot.Position + Vector3.new(0, 1, 0)

  local floor = Instance.new("Part")
  floor.Anchored = true
  floor.Name = "BreedFloor"
  floor.Size = Vector3.new(14, 1, 14)
  floor.Position = basePos
  floor.Color = Color3.fromRGB(255, 200, 220)
  floor.Material = Enum.Material.Grass
  floor.Parent = model
  model.PrimaryPart = floor

  -- clôture
  for _, side in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
    local fence = Instance.new("Part")
    fence.Anchored = true
    if side[1] ~= 0 then
      fence.Size = Vector3.new(0.5, 2, 14)
      fence.Position = basePos + Vector3.new(side[1] * 7, 1, 0)
    else
      fence.Size = Vector3.new(14, 2, 0.5)
      fence.Position = basePos + Vector3.new(0, 1, side[2] * 7)
    end
    fence.Color = Color3.fromRGB(160, 120, 80)
    fence.Material = Enum.Material.Wood
    fence.Parent = model
  end

  -- coeur pulsant
  local heart = Instance.new("Part")
  heart.Name = "Heart"
  heart.Shape = Enum.PartType.Ball
  heart.Size = Vector3.new(2, 2, 2)
  heart.Color = Color3.fromRGB(255, 80, 120)
  heart.Material = Enum.Material.Neon
  heart.Anchored = true
  heart.CanCollide = false
  heart.Position = basePos + Vector3.new(0, 4, 0)
  heart.Parent = model
  TweenService:Create(heart, TweenInfo.new(0.6, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
    { Size = Vector3.new(3, 3, 3) }):Play()

  -- info billboard
  local bb = Instance.new("BillboardGui")
  bb.Name = "BreedInfo"
  bb.Size = UDim2.new(0, 160, 0, 40)
  bb.StudsOffset = Vector3.new(0, 8, 0)
  bb.AlwaysOnTop = true
  bb.Adornee = floor
  bb.Parent = floor
  local label = Instance.new("TextLabel")
  label.Name = "Title"
  label.Size = UDim2.new(1, 0, 1, 0)
  label.BackgroundTransparency = 1
  label.Text = "💕 Élevage en cours..."
  label.TextColor3 = Color3.fromRGB(255, 200, 220)
  label.FontFace = Font.fromEnum(Enum.Font.GothamBold)
  label.TextScaled = true
  label.Parent = bb

  local bid = Instance.new("StringValue")
  bid.Name = "BreedId"
  bid.Value = breed.id
  bid.Parent = model

  model.Parent = state.area
  breedModels[player.UserId][breed.id] = model
end

local function updateBreedModelComplete(player, breed, rarityId)
  local model = breedModels[player.UserId] and breedModels[player.UserId][breed.id]
  if not model then return end
  local info = model:FindFirstChild("BreedFloor")
  if info then
    local bb = info:FindFirstChild("BreedInfo")
    if bb and bb:FindFirstChild("Title") then
      bb.Title.Text = "🍼 Bébé prêt !"
    end
  end
  -- bébé visuel
  local NatureZoneService = require(script.Parent.NatureZoneService)
  local babyTraits = CapybaraData.generateTraits(rarityId)
  babyTraits.bodySize = 0.6
  local baby = NatureZoneService.buildCapybaraModel(rarityId, babyTraits, "baby", "Bébé", false)
  baby.Name = "Baby"
  baby:PivotTo(CFrame.new(model.PrimaryPart.Position + Vector3.new(0, 2, 0)))
  for _, p in ipairs(baby:GetDescendants()) do
    if p:IsA("BasePart") then p.Anchored = true end
  end
  baby.Parent = model
end

-- ── ACTIONS ──────────────────────────────────────────────────────────────────
function BreedingService.startBreeding(player, plotId, capyIdA, capyIdB)
  local data = DataService.getData(player)
  if not data then return end

  if capyIdA == capyIdB then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Choisis deux capybaras différents." })
    return
  end
  local capyA = findCapy(player, capyIdA)
  local capyB = findCapy(player, capyIdB)
  if not capyA or not capyB then return end
  if capyA.inSpaId or capyA.inBreedId or capyB.inSpaId or capyB.inBreedId then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Un parent est déjà occupé." })
    return
  end

  -- vérifie le plot
  local unlocked = false
  for _, p in ipairs(data.unlockedPlots) do if p == plotId then unlocked = true break end end
  if not unlocked then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Plot verrouillé." })
    return
  end
  for _, s in ipairs(data.spas) do
    if s.plotId == plotId then
      RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Plot occupé par un spa." })
      return
    end
  end
  for _, b in ipairs(data.breedingPlots) do
    if b.plotId == plotId and not b.collected then
      RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Élevage déjà en cours ici." })
      return
    end
  end

  -- calcul du temps
  local maxRarity = math.max(capyA.rarityId, capyB.rarityId)
  local baseTime = GameConfig.Rarities[maxRarity].breedTimeSec
  local speedUpgrade = 1 - (data.upgrades.breedSpeed or 0) * 0.1
  speedUpgrade = math.max(0.2, speedUpgrade)
  local happinessBonus = (capyA.happiness + capyB.happiness) / 200
  local finalTime = baseTime * speedUpgrade * (1 - happinessBonus * 0.2)
  finalTime = math.max(5, math.floor(finalTime))

  local breed = {
    id = HttpService:GenerateGUID(false),
    plotId = plotId,
    capyIdA = capyIdA,
    capyIdB = capyIdB,
    startTime = os.time(),
    breedTimeSec = finalTime,
    offspring = nil,
    collected = false,
    ready = false,
  }
  table.insert(data.breedingPlots, breed)
  capyA.inBreedId = breed.id
  capyB.inBreedId = breed.id

  buildBreedModel(player, breed)

  RemoteEvents.BreedingUpdate:FireClient(player, {
    breedId = breed.id,
    timeRemaining = finalTime,
    breedTimeSec = finalTime,
    parentA = { id = capyA.id, name = capyA.name, rarityId = capyA.rarityId },
    parentB = { id = capyB.id, name = capyB.name, rarityId = capyB.rarityId },
  })
  RemoteEvents.ShowNotification:FireClient(player, { type="success", message="💕 Élevage démarré !" })

  task.delay(finalTime, function()
    BreedingService.completeBreeding(player, breed.id)
  end)
end

function BreedingService.completeBreeding(player, breedId)
  local data = DataService.getData(player)
  if not data then return end
  local breed = findBreed(data, breedId)
  if not breed or breed.ready or breed.collected then return end

  local capyA = findCapy(player, breed.capyIdA)
  local capyB = findCapy(player, breed.capyIdB)
  if not capyA or not capyB then return end

  local offspringRarity = CapybaraData.calculateOffspringRarity(capyA, capyB)
  -- bonus game pass LuckyAura : relance pour tenter mieux
  if data.gamePasses and data.gamePasses.LuckyAura then
    local second = CapybaraData.calculateOffspringRarity(capyA, capyB)
    offspringRarity = math.max(offspringRarity, second)
  end

  local offspring = CapybaraData.new(offspringRarity, "bred", capyA, capyB)
  breed.offspring = CapybaraData.serialize(offspring)
  breed.offspringRarity = offspringRarity
  breed.ready = true

  updateBreedModelComplete(player, breed, offspringRarity)

  RemoteEvents.BreedingComplete:FireClient(player, {
    breedId = breed.id,
    rarityId = offspringRarity,
    offspring = { name = offspring.name, rarityId = offspringRarity },
  })
end

function BreedingService.collectOffspring(player, breedId)
  local data = DataService.getData(player)
  if not data then return end
  local breed = findBreed(data, breedId)
  if not breed or breed.collected or not breed.ready or not breed.offspring then return end

  local offspring = CapybaraData.deserialize(breed.offspring)
  local added, err = DataService.addCapybara(player, offspring)
  if not added then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message = err or "Inventaire plein !" })
    return
  end

  -- libère les parents
  local capyA = findCapy(player, breed.capyIdA)
  local capyB = findCapy(player, breed.capyIdB)
  if capyA then capyA.inBreedId = nil end
  if capyB then capyB.inBreedId = nil end

  breed.collected = true
  data.totalCapyBred = (data.totalCapyBred or 0) + 1

  -- retire l'entrée + le modèle
  for i, b in ipairs(data.breedingPlots) do
    if b.id == breedId then table.remove(data.breedingPlots, i) break end
  end
  if breedModels[player.UserId] and breedModels[player.UserId][breedId] then
    breedModels[player.UserId][breedId]:Destroy()
    breedModels[player.UserId][breedId] = nil
  end

  LeaderboardService.increment(player, "capyCollect", 1)

  local rarity = GameConfig.Rarities[breed.offspringRarity]
  local notifType = breed.offspringRarity >= 5 and "legendary" or "success"
  RemoteEvents.ShowNotification:FireClient(player, {
    type = notifType,
    message = "🍼 " .. offspring.name .. " (" .. rarity.name .. ") est né !",
  })

  BreedingService.sendHUD(player)
end

function BreedingService.sendHUD(player)
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

-- ── REBUILD / CLEANUP ────────────────────────────────────────────────────────
function BreedingService.rebuildBreedingPlots(player)
  local data = DataService.getData(player)
  if not data then return end
  for _, breed in ipairs(data.breedingPlots) do
    if not breed.collected then
      buildBreedModel(player, breed)
      local remaining = (breed.startTime + breed.breedTimeSec) - os.time()
      if remaining <= 0 then
        if not breed.ready then
          BreedingService.completeBreeding(player, breed.id)
        else
          updateBreedModelComplete(player, breed, breed.offspringRarity or 1)
        end
      else
        local capyA = findCapy(player, breed.capyIdA)
        local capyB = findCapy(player, breed.capyIdB)
        RemoteEvents.BreedingUpdate:FireClient(player, {
          breedId = breed.id,
          timeRemaining = remaining,
          breedTimeSec = breed.breedTimeSec,
          parentA = capyA and { id=capyA.id, name=capyA.name, rarityId=capyA.rarityId } or nil,
          parentB = capyB and { id=capyB.id, name=capyB.name, rarityId=capyB.rarityId } or nil,
        })
        task.delay(remaining, function()
          BreedingService.completeBreeding(player, breed.id)
        end)
      end
    end
  end
end

function BreedingService.cancelAll(player)
  local data = DataService.getData(player)
  if not data then return end
  for _, breed in ipairs(data.breedingPlots) do
    local capyA = findCapy(player, breed.capyIdA)
    local capyB = findCapy(player, breed.capyIdB)
    if capyA then capyA.inBreedId = nil end
    if capyB then capyB.inBreedId = nil end
  end
  data.breedingPlots = {}
  BreedingService.cleanupPlayer(player)
end

function BreedingService.cleanupPlayer(player)
  local models = breedModels[player.UserId]
  if models then
    for _, m in pairs(models) do
      if m then m:Destroy() end
    end
  end
  breedModels[player.UserId] = nil
end

function BreedingService.init()
  -- rien de global ; les timers sont posés via task.delay
end

function BreedingService.registerEvents()
  RemoteEvents.StartBreeding.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    BreedingService.startBreeding(player, payload.plotId, payload.capyIdA, payload.capyIdB)
  end)
  RemoteEvents.CollectOffspring.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    BreedingService.collectOffspring(player, payload.breedId)
  end)
end

return BreedingService
