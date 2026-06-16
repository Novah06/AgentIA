-- SpaService : construction + revenus passifs + visiteurs + interactions
-- Type : ModuleScript dans ServerScriptService

local SpaService = {}

local Players       = game:GetService("Players")
local Workspace     = game:GetService("Workspace")
local TweenService  = game:GetService("TweenService")
local HttpService   = game:GetService("HttpService")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local CapybaraData  = require(game.ReplicatedStorage.Modules.CapybaraData)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local DataService        = require(script.Parent.DataService)
local LeaderboardService = require(script.Parent.LeaderboardService)

-- Modèles 3D runtime : { [userId] = { area=Model, plots={[plotId]=Part}, spas={[spaId]=Model} } }
local worldState = {}

-- ── ZONE JOUEUR ──────────────────────────────────────────────────────────────
local function getPlayerAreasFolder()
  local f = Workspace:FindFirstChild("PlayerAreas")
  if not f then
    f = Instance.new("Folder")
    f.Name = "PlayerAreas"
    f.Parent = Workspace
  end
  return f
end

-- Calcule la base CFrame d'un joueur selon un slot
local slotForUser = {}
local nextSlot = 0
local function getSlot(player)
  if slotForUser[player.UserId] == nil then
    slotForUser[player.UserId] = nextSlot
    nextSlot = nextSlot + 1
  end
  return slotForUser[player.UserId]
end

-- Crée (ou récupère) la zone du joueur avec ses plots
local function ensurePlayerArea(player)
  local state = worldState[player.UserId]
  if state and state.area and state.area.Parent then return state end

  local slot = getSlot(player)
  local baseX = 200 + slot * 220  -- chaque joueur espacé de 220 studs
  local baseCFrame = CFrame.new(baseX, 0, 200)

  local area = Instance.new("Model")
  area.Name = "Area_" .. player.UserId

  -- Sol de la zone
  local floor = Instance.new("Part")
  floor.Name = "Ground"
  floor.Anchored = true
  floor.Size = Vector3.new(200, 1, 100)
  floor.Position = baseCFrame.Position
  floor.Color = Color3.fromRGB(120, 180, 120)
  floor.Material = Enum.Material.Grass
  floor.Parent = area

  -- 8 plots en grille 4×2
  local plots = {}
  for plotId = 1, GameConfig.MaxPlots do
    local col = (plotId - 1) % 4
    local row = math.floor((plotId - 1) / 4)
    local plotPos = baseCFrame.Position + Vector3.new(-75 + col * 50, 1, -22 + row * 44)

    local plot = Instance.new("Part")
    plot.Name = "Plot" .. plotId
    plot.Anchored = true
    plot.Size = Vector3.new(30, 1, 30)
    plot.Position = plotPos
    plot.Color = Color3.fromRGB(90, 90, 90)
    plot.Material = Enum.Material.Slate
    plot.Transparency = 0.3
    plot.Parent = area

    -- Cadenas visuel
    local lockBB = Instance.new("BillboardGui")
    lockBB.Name = "Lock"
    lockBB.Size = UDim2.new(0, 120, 0, 60)
    lockBB.StudsOffset = Vector3.new(0, 6, 0)
    lockBB.AlwaysOnTop = true
    lockBB.Adornee = plot
    lockBB.Parent = plot
    local lockLabel = Instance.new("TextLabel")
    lockLabel.Size = UDim2.new(1, 0, 1, 0)
    lockLabel.BackgroundTransparency = 1
    lockLabel.Text = "🔒 " .. (GameConfig.PlotUnlockCosts[plotId] or 0) .. " 🪙"
    lockLabel.TextColor3 = Color3.fromRGB(255, 230, 120)
    lockLabel.FontFace = Font.fromEnum(Enum.Font.GothamBold)
    lockLabel.TextScaled = true
    lockLabel.Parent = lockBB

    local pid = Instance.new("IntValue")
    pid.Name = "PlotId"
    pid.Value = plotId
    pid.Parent = plot
    local owner = Instance.new("IntValue")
    owner.Name = "OwnerUserId"
    owner.Value = player.UserId
    owner.Parent = plot

    plots[plotId] = plot
  end

  area.Parent = getPlayerAreasFolder()

  state = { area = area, plots = plots, spas = {}, breedModels = {}, decoModels = {} }
  worldState[player.UserId] = state

  -- Téléporte le joueur près de sa zone si pas encore placé
  task.spawn(function()
    local char = player.Character or player.CharacterAdded:Wait()
    local hrp = char:WaitForChild("HumanoidRootPart", 5)
    if hrp then
      hrp.CFrame = CFrame.new(baseCFrame.Position + Vector3.new(0, 6, -60))
    end
  end)

  SpaService.refreshPlotLocks(player)
  return state
end

-- Affiche/cache les cadenas selon les plots débloqués
function SpaService.refreshPlotLocks(player)
  local data = DataService.getData(player)
  local state = worldState[player.UserId]
  if not data or not state then return end
  local unlocked = {}
  for _, p in ipairs(data.unlockedPlots) do unlocked[p] = true end
  for plotId, plot in pairs(state.plots) do
    local lock = plot:FindFirstChild("Lock")
    if unlocked[plotId] then
      if lock then lock.Enabled = false end
      plot.Color = Color3.fromRGB(110, 170, 110)
      plot.Transparency = 0.2
    else
      if lock then lock.Enabled = true end
      plot.Color = Color3.fromRGB(90, 90, 90)
      plot.Transparency = 0.4
    end
  end
end

-- ── CONSTRUCTION DU MODÈLE DE SPA ────────────────────────────────────────────
local function buildSpaModel(player, spa)
  local state = worldState[player.UserId]
  if not state then return nil end
  local plot = state.plots[spa.plotId]
  if not plot then return nil end

  -- supprime l'ancien si présent
  if state.spas[spa.id] then state.spas[spa.id]:Destroy() end

  local cfg = GameConfig.SpaLevels[spa.level]
  local model = Instance.new("Model")
  model.Name = "Spa_" .. spa.id

  local basePos = plot.Position + Vector3.new(0, 1, 0)
  local size = cfg.size

  -- Plateforme du spa
  local floor = Instance.new("Part")
  floor.Name = "SpaFloor"
  floor.Anchored = true
  floor.Size = Vector3.new(size.X, 1, size.Z)
  floor.Position = basePos
  floor.Color = Color3.fromRGB(200, 200, 210)
  floor.Material = Enum.Material.Marble
  floor.Parent = model
  model.PrimaryPart = floor

  -- Bassin d'eau
  local water = Instance.new("Part")
  water.Name = "Water"
  water.Anchored = true
  water.Size = Vector3.new(size.X - 3, 1.2, size.Z - 3)
  water.Position = basePos + Vector3.new(0, 1, 0)
  water.Color = Color3.fromRGB(80, 200, 230)
  water.Material = Enum.Material.Glass
  water.Transparency = 0.3
  water.Parent = model

  -- Particules d'eau
  local emitter = Instance.new("ParticleEmitter")
  emitter.Texture = "rbxassetid://6328685136"
  emitter.Color = ColorSequence.new(Color3.fromRGB(150, 230, 255))
  emitter.Rate = 8
  emitter.Lifetime = NumberRange.new(1, 2)
  emitter.Speed = NumberRange.new(1, 2)
  emitter.Size = NumberSequence.new(0.5)
  emitter.Parent = water

  -- Murs / bordure
  for _, side in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
    local wall = Instance.new("Part")
    wall.Anchored = true
    wall.Name = "Border"
    if side[1] ~= 0 then
      wall.Size = Vector3.new(0.8, 2, size.Z)
      wall.Position = basePos + Vector3.new(side[1] * size.X/2, 1, 0)
    else
      wall.Size = Vector3.new(size.X, 2, 0.8)
      wall.Position = basePos + Vector3.new(0, 1, side[2] * size.Z/2)
    end
    wall.Color = Color3.fromRGB(180, 160, 140)
    wall.Material = Enum.Material.WoodPlanks
    wall.Parent = model
  end

  -- Niveau 5 : effets cosmiques
  if spa.level >= 5 then
    floor.Material = Enum.Material.Neon
    floor.Color = Color3.fromRGB(120, 80, 200)
    local light = Instance.new("PointLight")
    light.Brightness = 5
    light.Range = 30
    light.Color = Color3.fromRGB(200, 150, 255)
    light.Parent = floor
  end

  -- BillboardGui infos
  local bb = Instance.new("BillboardGui")
  bb.Name = "SpaInfo"
  bb.Size = UDim2.new(0, 200, 0, 50)
  bb.StudsOffset = Vector3.new(0, size.Y + 6, 0)
  bb.AlwaysOnTop = true
  bb.Adornee = floor
  bb.Parent = floor
  local label = Instance.new("TextLabel")
  label.Name = "Title"
  label.Size = UDim2.new(1, 0, 1, 0)
  label.BackgroundTransparency = 1
  label.Text = cfg.emoji .. " " .. cfg.name .. " (Niv." .. spa.level .. ")"
  label.TextColor3 = Color3.fromRGB(255, 255, 255)
  label.FontFace = Font.fromEnum(Enum.Font.GothamBold)
  label.TextScaled = true
  label.Parent = bb

  local spaId = Instance.new("StringValue")
  spaId.Name = "SpaId"
  spaId.Value = spa.id
  spaId.Parent = model

  model.Parent = state.area
  state.spas[spa.id] = model
  return model
end

-- Place un modèle simplifié de capybara dans un spa
local function placeCapyInSpaModel(player, spa, capy)
  local state = worldState[player.UserId]
  local spaModel = state and state.spas[spa.id]
  if not spaModel or not spaModel.PrimaryPart then return end

  local NatureZoneService = require(script.Parent.NatureZoneService)
  local model = NatureZoneService.buildCapybaraModel(capy.rarityId, capy.traits, capy.id, capy.name, false)
  model.Name = "SpaCapy_" .. capy.id
  -- ClickDetector pour interactions
  local cd = Instance.new("ClickDetector")
  cd.MaxActivationDistance = 20
  cd.Parent = model.PrimaryPart
  local cv = Instance.new("StringValue")
  cv.Name = "CapyId"
  cv.Value = capy.id
  cv.Parent = model
  local sv = Instance.new("StringValue")
  sv.Name = "SpaId"
  sv.Value = spa.id
  sv.Parent = model

  -- position dans le bassin (cercle)
  local idx = #spa.capyIds
  local cfg = GameConfig.SpaLevels[spa.level]
  local angle = (idx / math.max(1, cfg.maxCapybaras)) * math.pi * 2
  local r = math.max(2, cfg.size.X/2 - 3)
  local pos = spaModel.PrimaryPart.Position + Vector3.new(math.cos(angle) * r, 2, math.sin(angle) * r)
  model:PivotTo(CFrame.new(pos))
  for _, part in ipairs(model:GetDescendants()) do
    if part:IsA("BasePart") then part.Anchored = true end
  end
  model.Parent = spaModel
end

local function removeCapyFromSpaModel(player, spaId, capyId)
  local state = worldState[player.UserId]
  local spaModel = state and state.spas[spaId]
  if not spaModel then return end
  local m = spaModel:FindFirstChild("SpaCapy_" .. capyId)
  if m then m:Destroy() end
end

-- ── ACTIONS ──────────────────────────────────────────────────────────────────
local function findSpa(data, spaId)
  for _, s in ipairs(data.spas) do
    if s.id == spaId then return s end
  end
  return nil
end

local function plotOccupied(data, plotId)
  for _, s in ipairs(data.spas) do
    if s.plotId == plotId then return true end
  end
  for _, b in ipairs(data.breedingPlots or {}) do
    if b.plotId == plotId then return true end
  end
  return false
end

local function isPlotUnlocked(data, plotId)
  for _, p in ipairs(data.unlockedPlots) do
    if p == plotId then return true end
  end
  return false
end

function SpaService.placeSpa(player, plotId, spaLevel)
  local data = DataService.getData(player)
  if not data then return end
  ensurePlayerArea(player)

  spaLevel = 1 -- on construit toujours en niveau 1 ; améliorations via upgradeSpa
  if not isPlotUnlocked(data, plotId) then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Plot verrouillé." })
    return
  end
  if plotOccupied(data, plotId) then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Plot déjà occupé." })
    return
  end

  local cost = GameConfig.SpaLevels[1].buildCost
  if not DataService.spendGold(player, cost) then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Pas assez de CapyGold ("..cost..")." })
    return
  end

  local spa = { id = HttpService:GenerateGUID(false), level = 1, plotId = plotId, capyIds = {}, lastGoldTick = os.time() }
  table.insert(data.spas, spa)
  buildSpaModel(player, spa)

  RemoteEvents.ShowNotification:FireClient(player, { type="success", message="🏊 Spa construit !" })
  SpaService.fireSpaUpdate(player, spa)
  SpaService.sendHUD(player)
end

function SpaService.upgradeSpa(player, spaId)
  local data = DataService.getData(player)
  if not data then return end
  local spa = findSpa(data, spaId)
  if not spa then return end
  local cfg = GameConfig.SpaLevels[spa.level]
  if not cfg.upgradeCost then
    RemoteEvents.ShowNotification:FireClient(player, { type="info", message="Niveau maximum atteint." })
    return
  end
  if not DataService.spendGold(player, cfg.upgradeCost) then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Pas assez de CapyGold ("..cfg.upgradeCost..")." })
    return
  end
  spa.level = spa.level + 1
  buildSpaModel(player, spa)
  -- replace les capybaras présents
  for _, capyId in ipairs(spa.capyIds) do
    local capy = DataService.findCapybara(player, capyId)
    if capy then placeCapyInSpaModel(player, spa, capy) end
  end
  RemoteEvents.ShowNotification:FireClient(player, { type="success", message="⬆️ Spa amélioré niveau "..spa.level.." !" })
  SpaService.fireSpaUpdate(player, spa)
  SpaService.sendHUD(player)
end

function SpaService.getSpaCapacity(data, spa)
  local cfg = GameConfig.SpaLevels[spa.level]
  return cfg.maxCapybaras + (data.upgrades.spaCapacity or 0)
end

function SpaService.assignCapyToSpa(player, capyId, spaId)
  local data = DataService.getData(player)
  if not data then return end
  local spa = findSpa(data, spaId)
  if not spa then return end
  local capy = DataService.findCapybara(player, capyId)
  if not capy then return end
  if capy.inSpaId or capy.inBreedId then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Capybara déjà occupé." })
    return
  end
  if #spa.capyIds >= SpaService.getSpaCapacity(data, spa) then
    RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Spa plein." })
    return
  end
  table.insert(spa.capyIds, capyId)
  capy.inSpaId = spaId
  placeCapyInSpaModel(player, spa, capy)
  SpaService.fireSpaUpdate(player, spa)
end

function SpaService.removeCapyFromSpa(player, capyId)
  local data = DataService.getData(player)
  if not data then return end
  local capy = DataService.findCapybara(player, capyId)
  if not capy or not capy.inSpaId then return end
  local spa = findSpa(data, capy.inSpaId)
  if spa then
    for i, id in ipairs(spa.capyIds) do
      if id == capyId then table.remove(spa.capyIds, i) break end
    end
    removeCapyFromSpaModel(player, spa.id, capyId)
    SpaService.fireSpaUpdate(player, spa)
  end
  capy.inSpaId = nil
end

-- ── REVENUS PASSIFS ──────────────────────────────────────────────────────────
function SpaService.computeSpaGoldPerMin(player, data, spa)
  local DecorationService = require(script.Parent.DecorationService)
  local total = 0
  local cfg = GameConfig.SpaLevels[spa.level]
  local upgradeMult = 1 + (data.upgrades.goldBoost or 0) * 0.1
  local rebirthMult = GameConfig.RebirthMultiplier ^ (data.rebirthLevel or 0)
  local vipMult = (data.gamePasses and data.gamePasses.VIP) and 2 or 1
  local decoBonus = DecorationService.getGoldBonus(player)

  for _, capyId in ipairs(spa.capyIds) do
    local capy = DataService.findCapybara(player, capyId)
    if capy then
      local rarity = GameConfig.Rarities[capy.rarityId]
      local happinessMult = CapybaraData.getHappinessMultiplier(capy)
      local interMult = CapybaraData.getInteractionMultiplier(capy)
      total = total + rarity.spaGoldPerMin * cfg.goldMultiplier * happinessMult * interMult
        * upgradeMult * rebirthMult * vipMult * (1 + decoBonus)
    end
  end
  return total
end

function SpaService.applyPassiveGold(player, tickSeconds)
  local data = DataService.getData(player)
  if not data then return end
  local DecorationService = require(script.Parent.DecorationService)
  local upgradeMult = 1 + (data.upgrades.goldBoost or 0) * 0.1
  local rebirthMult = GameConfig.RebirthMultiplier ^ (data.rebirthLevel or 0)
  local vipMult = (data.gamePasses and data.gamePasses.VIP) and 2 or 1
  local decoBonus = DecorationService.getGoldBonus(player)

  local gained = 0
  for _, spa in ipairs(data.spas) do
    local cfg = GameConfig.SpaLevels[spa.level]
    for _, capyId in ipairs(spa.capyIds) do
      local capy = DataService.findCapybara(player, capyId)
      if capy then
        CapybaraData.tickHappiness(capy)
        local rarity = GameConfig.Rarities[capy.rarityId]
        local happinessMult = CapybaraData.getHappinessMultiplier(capy)
        local interMult = CapybaraData.getInteractionMultiplier(capy)
        local goldThisTick = rarity.spaGoldPerMin * cfg.goldMultiplier * happinessMult * interMult
          * upgradeMult * rebirthMult * vipMult * (1 + decoBonus) * (tickSeconds / 60)
        capy.totalGoldGen = (capy.totalGoldGen or 0) + goldThisTick
        gained = gained + goldThisTick
      end
    end
    spa.lastGoldTick = os.time()
  end

  if gained >= 1 then
    DataService.addGold(player, math.floor(gained))
    LeaderboardService.setScore(player, "totalGold", data.totalGoldEarned or 0)
    SpaService.sendHUD(player)
  end
end

-- Collecte les gains accumulés hors-ligne (au départ / reconnexion avec AutoCollect)
function SpaService.collectPendingGold(player)
  local data = DataService.getData(player)
  if not data then return end
  -- AutoCollect : applique le temps écoulé depuis lastGoldTick
  if not (data.gamePasses and data.gamePasses.AutoCollect) then return end
  local now = os.time()
  for _, spa in ipairs(data.spas) do
    local elapsed = math.min(now - (spa.lastGoldTick or now), 3600 * 8) -- cap 8h
    if elapsed > 0 then
      local perMin = SpaService.computeSpaGoldPerMin(player, data, spa)
      DataService.addGold(player, math.floor(perMin * elapsed / 60))
      spa.lastGoldTick = now
    end
  end
end

-- ── INTERACTIONS ─────────────────────────────────────────────────────────────
function SpaService.interactCapybara(player, capyId, interactionId)
  local data = DataService.getData(player)
  if not data then return end
  local capy = DataService.findCapybara(player, capyId)
  if not capy or not capy.inSpaId then return end
  local inter = GameConfig.getInteractionById(interactionId)
  if not inter then return end

  capy.interactionCooldowns = capy.interactionCooldowns or {}
  local now = os.time()
  local nextTime = capy.interactionCooldowns[interactionId] or 0
  if now < nextTime then
    RemoteEvents.ShowNotification:FireClient(player, { type="info", message="Encore en cooldown ⏳" })
    return
  end

  if inter.cost and inter.cost > 0 then
    if not DataService.spendGold(player, inter.cost) then
      RemoteEvents.ShowNotification:FireClient(player, { type="error", message="Pas assez de CapyGold." })
      return
    end
  end

  CapybaraData.addHappiness(capy, inter.happinessGain)
  CapybaraData.applyInteractionBonus(capy, inter.goldBonus)
  capy.interactionCooldowns[interactionId] = now + inter.cooldown

  local spa = findSpa(data, capy.inSpaId)
  local state = worldState[player.UserId]
  local pos = state and state.spas[capy.inSpaId] and state.spas[capy.inSpaId].PrimaryPart
    and state.spas[capy.inSpaId].PrimaryPart.Position or Vector3.new(0, 5, 0)
  RemoteEvents.GoldGained:FireClient(player, { amount = 0, position = pos, source = "interact" })
  if spa then SpaService.fireSpaUpdate(player, spa) end
  SpaService.sendHUD(player)
end

-- Auto-collect game pass : applique "pet" sur tous les capybaras sans coût/cooldown
function SpaService.autoInteractAll(player)
  local data = DataService.getData(player)
  if not data then return end
  for _, spa in ipairs(data.spas) do
    for _, capyId in ipairs(spa.capyIds) do
      local capy = DataService.findCapybara(player, capyId)
      if capy then
        CapybaraData.addHappiness(capy, 1)
      end
    end
  end
end

-- ── VISITEURS NPC ────────────────────────────────────────────────────────────
local function spawnVisitorNPC(player, spa)
  local state = worldState[player.UserId]
  local spaModel = state and state.spas[spa.id]
  if not spaModel or not spaModel.PrimaryPart then return end
  local data = DataService.getData(player)
  if not data then return end

  local spaPos = spaModel.PrimaryPart.Position

  -- NPC simple
  local npc = Instance.new("Model")
  npc.Name = "Visitor"
  local torso = Instance.new("Part")
  torso.Size = Vector3.new(2, 3, 1)
  torso.Color = Color3.fromRGB(math.random(100,255), math.random(100,255), math.random(100,255))
  torso.Anchored = true
  torso.CanCollide = false
  torso.Position = spaPos + Vector3.new(20, 3, 0)
  torso.Parent = npc
  npc.PrimaryPart = torso
  local head = Instance.new("Part")
  head.Shape = Enum.PartType.Ball
  head.Size = Vector3.new(1.5, 1.5, 1.5)
  head.Color = Color3.fromRGB(255, 220, 180)
  head.Anchored = true
  head.CanCollide = false
  head.Position = torso.Position + Vector3.new(0, 2.2, 0)
  head.Parent = npc
  npc.Parent = spaModel

  -- marche vers le spa
  local goal = spaPos + Vector3.new(math.random(-5,5), 3, math.random(-5,5))
  TweenService:Create(torso, TweenInfo.new(2), { Position = goal }):Play()
  TweenService:Create(head, TweenInfo.new(2), { Position = goal + Vector3.new(0, 2.2, 0) }):Play()

  local stay = math.random(GameConfig.Visitors.StayDuration.min, GameConfig.Visitors.StayDuration.max)
  task.delay(stay, function()
    if npc and npc.Parent then
      local cfg = GameConfig.SpaLevels[spa.level]
      local pay = math.random(GameConfig.Visitors.GoldPerVisit.min, GameConfig.Visitors.GoldPerVisit.max)
      pay = math.floor(pay * cfg.goldMultiplier * (1 + (data.rebirthLevel or 0) * 0.2))
      DataService.addGold(player, pay)
      RemoteEvents.GoldGained:FireClient(player, { amount = pay, position = goal, source = "visitor" })
      SpaService.sendHUD(player)
      npc:Destroy()
    end
  end)
end

-- ── HELPERS RÉSEAU ───────────────────────────────────────────────────────────
function SpaService.fireSpaUpdate(player, spa)
  local data = DataService.getData(player)
  if not data then return end
  local capys = {}
  for _, capyId in ipairs(spa.capyIds) do
    local capy = DataService.findCapybara(player, capyId)
    if capy then
      table.insert(capys, {
        id = capy.id, name = capy.name, rarityId = capy.rarityId,
        happiness = capy.happiness,
      })
    end
  end
  RemoteEvents.SpaUpdate:FireClient(player, {
    spaId = spa.id,
    level = spa.level,
    plotId = spa.plotId,
    goldPerMin = math.floor(SpaService.computeSpaGoldPerMin(player, data, spa)),
    capybarasInside = capys,
    capacity = SpaService.getSpaCapacity(data, spa),
  })
end

function SpaService.sendHUD(player)
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
function SpaService.rebuildPlayerSpas(player)
  local data = DataService.getData(player)
  if not data then return end
  ensurePlayerArea(player)
  for _, spa in ipairs(data.spas) do
    buildSpaModel(player, spa)
    for _, capyId in ipairs(spa.capyIds) do
      local capy = DataService.findCapybara(player, capyId)
      if capy then placeCapyInSpaModel(player, spa, capy) end
    end
    SpaService.fireSpaUpdate(player, spa)
  end
  SpaService.refreshPlotLocks(player)
end

function SpaService.cleanupPlayer(player)
  local state = worldState[player.UserId]
  if state and state.area then state.area:Destroy() end
  worldState[player.UserId] = nil
end

-- Détruit uniquement les modèles de spas (pour rebirth)
function SpaService.destroyAllSpas(player)
  local state = worldState[player.UserId]
  if not state then return end
  for spaId, model in pairs(state.spas) do
    model:Destroy()
  end
  state.spas = {}
end

function SpaService.getWorldState(player)
  return worldState[player.UserId]
end

-- ── INIT + EVENTS ────────────────────────────────────────────────────────────
function SpaService.init()
  -- Boucle des visiteurs NPC
  task.spawn(function()
    while true do
      task.wait(GameConfig.Visitors.SpawnIntervalBase / 2)
      for _, player in ipairs(Players:GetPlayers()) do
        local data = DataService.getData(player)
        if data then
          for _, spa in ipairs(data.spas) do
            if #spa.capyIds > 0 then
              local cfg = GameConfig.SpaLevels[spa.level]
              local beautyFactor = 1 + (data.beautyScore or 0) * GameConfig.Visitors.BeautyScoreBonus / 100
              local magnet = 1 + (data.upgrades.visitorMagnet or 0) * 0.15
              local chance = math.clamp(cfg.visitorRate * beautyFactor * magnet * 0.15, 0, 1)
              if math.random() < chance then
                task.spawn(spawnVisitorNPC, player, spa)
              end
            end
          end
        end
      end
    end
  end)
end

function SpaService.registerEvents()
  RemoteEvents.PlaceSpa.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    SpaService.placeSpa(player, payload.plotId, payload.spaLevel)
  end)
  RemoteEvents.UpgradeSpa.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    SpaService.upgradeSpa(player, payload.spaId)
  end)
  RemoteEvents.AssignCapyToSpa.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    SpaService.assignCapyToSpa(player, payload.capyId, payload.spaId)
  end)
  RemoteEvents.RemoveCapyFromSpa.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    SpaService.removeCapyFromSpa(player, payload.capyId)
  end)
  RemoteEvents.InteractCapybara.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then return end
    SpaService.interactCapybara(player, payload.capyId, payload.interactionId)
  end)
end

SpaService.ensurePlayerArea = ensurePlayerArea
return SpaService
