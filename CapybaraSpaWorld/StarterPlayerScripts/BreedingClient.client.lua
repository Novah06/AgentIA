-- BreedingClient : effets côté client pour l'élevage
-- Type : LocalScript

local Players      = game:GetService("Players")
local SoundService = game:GetService("SoundService")
local Workspace    = game:GetService("Workspace")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local player = Players.LocalPlayer

local function playSound(name)
  local snd = SoundService:FindFirstChild(name)
  if snd and snd:IsA("Sound") then
    local clone = snd:Clone()
    clone.Parent = SoundService
    clone:Play()
    clone.Ended:Connect(function() clone:Destroy() end)
    task.delay(6, function() if clone then clone:Destroy() end end)
  end
end

RemoteEvents.BreedingComplete.OnClientEvent:Connect(function(payload)
  if not payload then return end
  playSound("BreedingComplete")

  -- notification spéciale pour rareté élevée
  if payload.rarityId and payload.rarityId >= 5 and _G.CapyUI and _G.CapyUI.Notification then
    local rarity = GameConfig.Rarities[payload.rarityId]
    _G.CapyUI.Notification.show("🍼 Un bébé "..rarity.name.." est né ! Va le collecter.", "legendary")
  end

  -- particules joyeuses près du parc (recherche du modèle Breed_)
  local breedId = payload.breedId
  for _, area in ipairs(Workspace:GetChildren()) do
    if area.Name == "PlayerAreas" then
      for _, sub in ipairs(area:GetDescendants()) do
        if sub.Name == "Breed_"..tostring(breedId) and sub.PrimaryPart then
          local p = Instance.new("Part")
          p.Anchored = true p.CanCollide = false p.Transparency = 1
          p.Position = sub.PrimaryPart.Position + Vector3.new(0, 4, 0)
          p.Parent = Workspace
          local em = Instance.new("ParticleEmitter")
          em.Color = ColorSequence.new(Color3.fromRGB(255, 180, 220))
          em.Lifetime = NumberRange.new(1, 1.6)
          em.Speed = NumberRange.new(6, 12)
          em.Rate = 0
          em.Parent = p
          em:Emit(40)
          task.delay(2.5, function() p:Destroy() end)
        end
      end
    end
  end
end)
