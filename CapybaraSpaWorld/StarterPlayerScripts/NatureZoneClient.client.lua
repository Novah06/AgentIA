-- NatureZoneClient : rencontres visuelles côté client
-- Type : LocalScript

local Players          = game:GetService("Players")
local RunService       = game:GetService("RunService")
local CollectionService= game:GetService("CollectionService")
local TweenService     = game:GetService("TweenService")
local Workspace        = game:GetService("Workspace")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local player = Players.LocalPlayer
local camera = Workspace.CurrentCamera

_G.CapyState = _G.CapyState or {}
local state = _G.CapyState

local trackedConns = {} -- { [capyId] = {connections} }

local function findModel(capyId)
  for _, m in ipairs(CollectionService:GetTagged("WildCapybara")) do
    local cv = m:FindFirstChild("CapyId")
    if cv and cv.Value == capyId then return m end
  end
  return nil
end

-- bob animation locale
local function attachBob(model)
  local body = model.PrimaryPart or model:FindFirstChild("Body")
  if not body then return end
  task.spawn(function()
    local base = body.Position.Y
    while model.Parent do
      local hl = model:FindFirstChild("HoverHighlight")
      -- léger flottement géré par le serveur via pivot ; ici on pulse le highlight
      if hl then
        hl.OutlineTransparency = 0.3 + math.abs(math.sin(tick()*2)) * 0.4
      end
      task.wait(0.1)
    end
  end)
end

RemoteEvents.CapybaraSpawned.OnClientEvent:Connect(function(payload)
  if not payload then return end
  task.spawn(function()
    local model = nil
    local tries = 0
    while not model and tries < 30 do
      model = findModel(payload.capyId)
      if not model then task.wait(0.1) tries = tries + 1 end
    end
    if not model then return end
    attachBob(model)
    local body = model.PrimaryPart or model:FindFirstChild("Body")
    local cd = body and body:FindFirstChildOfClass("ClickDetector")
    if cd then
      local conn = cd.MouseClick:Connect(function()
        -- approche : oriente le joueur (le serveur déclenche l'encounter par proximité)
        local char = player.Character
        local hrp = char and char:FindFirstChild("HumanoidRootPart")
        if hrp and body then
          if (hrp.Position - body.Position).Magnitude <= GameConfig.NatureZone.EncounterRadius + 4 then
            -- déjà proche : rien (encounter par proximité)
          else
            if _G.CapyUI and _G.CapyUI.Notification then
              _G.CapyUI.Notification.show("Approche-toi du capybara ! 🐾", "info")
            end
          end
        end
      end)
      trackedConns[payload.capyId] = { conn }
    end
  end)
end)

RemoteEvents.CapybaraDespawned.OnClientEvent:Connect(function(payload)
  if not payload then return end
  local conns = trackedConns[payload.capyId]
  if conns then
    for _, c in ipairs(conns) do c:Disconnect() end
    trackedConns[payload.capyId] = nil
  end
end)

-- légère rotation caméra à l'encounter
RemoteEvents.EncounterStart.OnClientEvent:Connect(function(payload)
  state.InEncounter = true
end)
RemoteEvents.EncounterEnd.OnClientEvent:Connect(function(payload)
  state.InEncounter = false
  if payload and payload.success then
    -- petit effet confettis
    local char = player.Character
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    if hrp then
      local p = Instance.new("Part")
      p.Anchored = true p.CanCollide = false p.Transparency = 1
      p.Position = hrp.Position + Vector3.new(0, 3, 0)
      p.Parent = Workspace
      local emitter = Instance.new("ParticleEmitter")
      emitter.Color = ColorSequence.new(Color3.fromRGB(255, 220, 100))
      emitter.Lifetime = NumberRange.new(0.8, 1.2)
      emitter.Speed = NumberRange.new(10, 18)
      emitter.Rate = 0
      emitter.Parent = p
      emitter:Emit(30)
      task.delay(2, function() p:Destroy() end)
    end
  end
end)
