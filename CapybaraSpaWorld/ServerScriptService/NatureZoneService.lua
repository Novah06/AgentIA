-- NatureZoneService : spawn des capybaras sauvages + rencontres
-- Type : ModuleScript dans ServerScriptService

local NatureZoneService = {}

local Players          = game:GetService("Players")
local RunService       = game:GetService("RunService")
local Workspace        = game:GetService("Workspace")
local CollectionService= game:GetService("CollectionService")
local TweenService     = game:GetService("TweenService")
local HttpService      = game:GetService("HttpService")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local CapybaraData  = require(game.ReplicatedStorage.Modules.CapybaraData)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

-- État runtime : { [capyId] = { model, rarityId, capyId, spawnTime, lockedBy } }
local wildCapybaras = {}
NatureZoneService.wildCapybaras = wildCapybaras

-- Encounters actifs : { [userId] = capyId }
local activeEncounters = {}

-- ── ZONE DE SPAWN ────────────────────────────────────────────────────────────
local function getNatureZone()
  local zone = Workspace:FindFirstChild("NatureZone")
  if not zone then
    zone = Instance.new("Folder")
    zone.Name = "NatureZone"
    zone.Parent = Workspace
  end
  return zone
end

-- Récupère/crée des points de spawn. Si aucun n'existe, génère une grille par défaut.
local function getSpawnPoints()
  local zone = getNatureZone()
  local spFolder = zone:FindFirstChild("SpawnPoints")
  if not spFolder then
    spFolder = Instance.new("Folder")
    spFolder.Name = "SpawnPoints"
    spFolder.Parent = zone
  end
  local points = {}
  for _, child in ipairs(spFolder:GetChildren()) do
    if child:IsA("BasePart") then
      table.insert(points, child)
    end
  end
  -- Génère 20 spawn points par défaut si la zone est vide
  if #points == 0 then
    for i = 1, 20 do
      local p = Instance.new("Part")
      p.Name = "SP" .. i
      p.Anchored = true
      p.CanCollide = false
      p.Transparency = 1
      p.Size = Vector3.new(2,1,2)
      -- répartis sur une zone 120×120 autour de (-100, 4, 0)
      local angle = (i / 20) * math.pi * 2
      local radius = 20 + (i % 5) * 12
      p.Position = Vector3.new(-100 + math.cos(angle) * radius, 4, math.sin(angle) * radius)
      -- "rareté de zone" : plus loin = plus rare
      local rz = Instance.new("NumberValue")
      rz.Name = "RarityWeight"
      rz.Value = radius -- distance utilisée pour pondérer la rareté
      rz.Parent = p
      p.Parent = spFolder
      table.insert(points, p)
    end
  end
  return points
end

-- ── CONSTRUCTION DU MODÈLE CAPYBARA ──────────────────────────────────────────
local function makePart(name, size, color, material)
  local p = Instance.new("Part")
  p.Name = name
  p.Size = size
  p.Color = color
  p.Material = material or Enum.Material.SmoothPlastic
  p.Anchored = false
  p.CanCollide = false
  p.TopSurface = Enum.SurfaceType.Smooth
  p.BottomSurface = Enum.SurfaceType.Smooth
  return p
end

local function weld(a, b)
  local w = Instance.new("WeldConstraint")
  w.Part0 = a
  w.Part1 = b
  w.Parent = a
end

-- Construit un modèle de capybara. tagged = true pour la nature (cliquable)
function NatureZoneService.buildCapybaraModel(rarityId, traits, capyId, displayName, tagged)
  local rarity = GameConfig.Rarities[rarityId]
  local bodyColor = Color3.fromRGB(150, 110, 70) -- brun capybara de base
  local scale = (traits and traits.bodySize) or 1

  local model = Instance.new("Model")
  model.Name = "Capybara_" .. (capyId or "x")

  -- Corps (ancré : les autres parts y sont soudées et restent en place)
  local body = makePart("Body", Vector3.new(2.5, 1.2, 3.5) * scale, bodyColor)
  body.Anchored = true
  body.Parent = model
  model.PrimaryPart = body

  -- Tête
  local head = makePart("Head", Vector3.new(1.2, 1, 1.2) * scale, bodyColor)
  head.Parent = model
  head.CFrame = body.CFrame * CFrame.new(0, 0.6 * scale, -2 * scale)
  weld(body, head)

  -- Nez
  local nose = makePart("Nose", Vector3.new(0.5, 0.35, 0.4) * scale, Color3.fromRGB(90, 55, 40))
  nose.Parent = model
  nose.CFrame = head.CFrame * CFrame.new(0, -0.1 * scale, -0.7 * scale)
  weld(head, nose)

  -- Oreilles
  for _, side in ipairs({-1, 1}) do
    local ear = makePart("Ear", Vector3.new(0.4, 0.5, 0.2) * scale, bodyColor)
    ear.Shape = Enum.PartType.Ball
    ear.Parent = model
    ear.CFrame = head.CFrame * CFrame.new(0.45 * side * scale, 0.5 * scale, 0.2 * scale)
    weld(head, ear)
  end

  -- Pattes (4)
  for _, off in ipairs({Vector3.new(0.8,0,1.2), Vector3.new(-0.8,0,1.2), Vector3.new(0.8,0,-1.2), Vector3.new(-0.8,0,-1.2)}) do
    local leg = makePart("Leg", Vector3.new(0.5, 1, 0.5) * scale, Color3.fromRGB(120, 85, 55))
    leg.Parent = model
    leg.CFrame = body.CFrame * CFrame.new(off.X * scale, -1 * scale, off.Z * scale)
    weld(body, leg)
  end

  -- Taches (cosmétique)
  if traits and traits.hasSpots then
    for i = 1, 3 do
      local spot = makePart("Spot", Vector3.new(0.6, 0.1, 0.6) * scale, traits.spotColor or Color3.fromRGB(90,60,40))
      spot.Parent = model
      spot.CFrame = body.CFrame * CFrame.new((i-2) * 0.8 * scale, 0.6 * scale, (i-2) * 0.6 * scale)
      weld(body, spot)
    end
  end

  -- Accessoire selon les traits
  if traits and traits.hasAccessory and traits.accessoryType and traits.accessoryType ~= "none" then
    local acc = makePart("Accessory", Vector3.new(1, 0.5, 1) * scale, Color3.fromRGB(255, 215, 0))
    local at = traits.accessoryType
    if at == "hat" then
      acc.Color = Color3.fromRGB(120, 60, 200)
      acc.Size = Vector3.new(1.2, 0.6, 1.2) * scale
    elseif at == "flowers" then
      acc.Color = Color3.fromRGB(255, 120, 180)
      acc.Shape = Enum.PartType.Ball
    elseif at == "crown" then
      acc.Color = Color3.fromRGB(255, 215, 0)
      acc.Material = Enum.Material.Neon
    elseif at == "halo" or at == "cosmic_ring" then
      acc.Color = Color3.fromRGB(200, 230, 255)
      acc.Material = Enum.Material.Neon
      acc.Shape = Enum.PartType.Cylinder
      acc.Size = Vector3.new(0.2, 1.4, 1.4) * scale
    end
    acc.Parent = model
    acc.CFrame = head.CFrame * CFrame.new(0, 0.9 * scale, 0)
    weld(head, acc)
  end

  -- Glow pour les hautes raretés
  if traits and traits.glowEnabled then
    local light = Instance.new("PointLight")
    light.Color = Color3.fromRGB(rarity.colorR, rarity.colorG, rarity.colorB)
    light.Brightness = 3
    light.Range = 10
    light.Parent = body
    body.Material = Enum.Material.Neon
  end

  -- BillboardGui nametag
  local bb = Instance.new("BillboardGui")
  bb.Name = "NameTag"
  bb.Size = UDim2.new(0, 160, 0, 50)
  bb.StudsOffset = Vector3.new(0, 2.5 * scale, 0)
  bb.AlwaysOnTop = true
  bb.Adornee = head
  bb.Parent = head

  local nameLabel = Instance.new("TextLabel")
  nameLabel.Size = UDim2.new(1, 0, 0.6, 0)
  nameLabel.BackgroundTransparency = 1
  nameLabel.Text = rarity.emoji .. " " .. (displayName or rarity.name)
  nameLabel.TextColor3 = Color3.fromRGB(rarity.colorR, rarity.colorG, rarity.colorB)
  nameLabel.FontFace = Font.fromEnum(Enum.Font.GothamBold)
  nameLabel.TextScaled = true
  nameLabel.Parent = bb

  -- Barre de peur (cachée par défaut, gérée en encounter)
  local fearBg = Instance.new("Frame")
  fearBg.Name = "FearBar"
  fearBg.Size = UDim2.new(0.8, 0, 0.25, 0)
  fearBg.Position = UDim2.new(0.1, 0, 0.65, 0)
  fearBg.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
  fearBg.BorderSizePixel = 0
  fearBg.Visible = false
  fearBg.Parent = bb
  local fearFill = Instance.new("Frame")
  fearFill.Name = "Fill"
  fearFill.Size = UDim2.new(0, 0, 1, 0)
  fearFill.BackgroundColor3 = Color3.fromRGB(255, 80, 80)
  fearFill.BorderSizePixel = 0
  fearFill.Parent = fearBg

  if tagged then
    -- ClickDetector
    local cd = Instance.new("ClickDetector")
    cd.MaxActivationDistance = GameConfig.NatureZone.EncounterRadius
    cd.Parent = body

    -- Valeurs
    local rv = Instance.new("NumberValue")
    rv.Name = "RarityId"
    rv.Value = rarityId
    rv.Parent = model
    local cv = Instance.new("StringValue")
    cv.Name = "CapyId"
    cv.Value = capyId
    cv.Parent = model

    -- Highlight pour le hover (désactivé par défaut)
    local hl = Instance.new("Highlight")
    hl.Name = "HoverHighlight"
    hl.FillTransparency = 1
    hl.OutlineColor = Color3.fromRGB(rarity.colorR, rarity.colorG, rarity.colorB)
    hl.OutlineTransparency = 0.3
    hl.Enabled = true
    hl.Parent = model

    CollectionService:AddTag(model, "WildCapybara")
  end

  return model
end

-- ── SPAWN ────────────────────────────────────────────────────────────────────
local function countWild()
  local n = 0
  for _ in pairs(wildCapybaras) do n = n + 1 end
  return n
end

function NatureZoneService.trySpawnWild()
  if countWild() >= GameConfig.NatureZone.MaxWildCapybaras then return end

  local points = getSpawnPoints()
  if #points == 0 then return end
  local sp = points[math.random(#points)]

  -- bonus de luck moyen des joueurs présents (simplifié : utilise un bonus de zone)
  local distanceWeight = sp:FindFirstChild("RarityWeight")
  local luckBonus = 0
  if distanceWeight then
    -- plus loin = plus de chance de rare
    luckBonus = math.clamp((distanceWeight.Value - 20) / 100, 0, 0.8)
  end

  local rarityId = CapybaraData.rollRarity(luckBonus)
  local traits = CapybaraData.generateTraits(rarityId)
  local capyId = HttpService:GenerateGUID(false)
  local displayName = CapybaraData.generateName()

  local model = NatureZoneService.buildCapybaraModel(rarityId, traits, capyId, displayName, true)
  local spawnCF = sp.CFrame * CFrame.new(0, 2, 0)
  model:PivotTo(spawnCF)
  model.Parent = getNatureZone()

  wildCapybaras[capyId] = {
    model = model,
    rarityId = rarityId,
    capyId = capyId,
    name = displayName,
    traits = traits,
    spawnTime = os.time(),
    lockedBy = nil,
    homePos = spawnCF.Position,
  }

  -- Animation de marche aléatoire simple
  task.spawn(function()
    local entry = wildCapybaras[capyId]
    while entry and entry.model and entry.model.Parent do
      if not entry.lockedBy then
        local offset = Vector3.new(math.random(-6,6), 0, math.random(-6,6))
        local goal = entry.homePos + offset
        local lookAt = goal + (offset.Magnitude > 0 and offset.Unit or Vector3.new(0,0,1))
        pcall(function() entry.model:PivotTo(CFrame.lookAt(goal, lookAt)) end)
      end
      task.wait(math.random(3, 6))
    end
  end)

  -- Fire à tous les clients
  RemoteEvents.CapybaraSpawned:FireAllClients({
    modelName = model.Name,
    position = spawnCF.Position,
    rarityId = rarityId,
    capyId = capyId,
    name = displayName,
  })
end

-- ── DESPAWN ──────────────────────────────────────────────────────────────────
function NatureZoneService.despawn(capyId, fled)
  local entry = wildCapybaras[capyId]
  if not entry then return end
  if entry.model then entry.model:Destroy() end
  wildCapybaras[capyId] = nil
  RemoteEvents.CapybaraDespawned:FireAllClients({ capyId = capyId, fled = fled })
end

-- Appelé par CaptureService quand un capybara est capturé
function NatureZoneService.removeCaptured(capyId)
  NatureZoneService.despawn(capyId, false)
end

function NatureZoneService.getWild(capyId)
  return wildCapybaras[capyId]
end

-- ── INIT ─────────────────────────────────────────────────────────────────────
function NatureZoneService.init()
  getSpawnPoints() -- garantit l'existence de la zone

  -- Boucle de spawn
  task.spawn(function()
    while true do
      task.wait(math.random(GameConfig.NatureZone.SpawnIntervalMin, GameConfig.NatureZone.SpawnIntervalMax))
      pcall(NatureZoneService.trySpawnWild)
    end
  end)

  -- Boucle de despawn naturel
  task.spawn(function()
    while true do
      task.wait(5)
      local now = os.time()
      for capyId, entry in pairs(wildCapybaras) do
        if not entry.lockedBy and (now - entry.spawnTime) >= GameConfig.NatureZone.DespawnTime then
          NatureZoneService.despawn(capyId, true)
        end
      end
    end
  end)

  -- Boucle de détection de proximité → EncounterStart
  RunService.Heartbeat:Connect(function()
    for capyId, entry in pairs(wildCapybaras) do
      if entry.model and entry.model.PrimaryPart then
        local pos = entry.model.PrimaryPart.Position
        for _, player in ipairs(Players:GetPlayers()) do
          local char = player.Character
          local hrp = char and char:FindFirstChild("HumanoidRootPart")
          if hrp then
            local dist = (hrp.Position - pos).Magnitude
            if dist <= GameConfig.NatureZone.EncounterRadius then
              if not activeEncounters[player.UserId] and not entry.lockedBy then
                entry.lockedBy = player.UserId
                activeEncounters[player.UserId] = capyId
                RemoteEvents.EncounterStart:FireClient(player, {
                  capyId = capyId,
                  rarityId = entry.rarityId,
                  name = entry.name,
                })
              end
            end
          end
        end
      end
    end
  end)
end

-- Termine la rencontre côté serveur (appelé par CaptureService)
function NatureZoneService.endEncounter(player, capyId)
  if activeEncounters[player.UserId] == capyId then
    activeEncounters[player.UserId] = nil
  end
  local entry = wildCapybaras[capyId]
  if entry and entry.lockedBy == player.UserId then
    entry.lockedBy = nil
  end
end

function NatureZoneService.getActiveEncounter(player)
  return activeEncounters[player.UserId]
end

return NatureZoneService
