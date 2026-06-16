-- Crée et retourne TOUS les RemoteEvents/Functions dans ReplicatedStorage
-- Ce module EST le seul endroit où les events sont créés.
-- Server ET client font require() de ce module pour accéder aux events.

local RemoteEvents = {}
local RS = game:GetService("ReplicatedStorage")

local function getOrCreate(parent, class, name)
  local existing = parent:FindFirstChild(name)
  if existing then return existing end
  local obj = Instance.new(class)
  obj.Name = name
  obj.Parent = parent
  return obj
end

local folder = getOrCreate(RS, "Folder", "Events")

-- ── SERVER → CLIENT (informations) ────────────────────────────────────────────
RemoteEvents.UpdateHUD          = getOrCreate(folder, "RemoteEvent", "UpdateHUD")
RemoteEvents.CapybaraSpawned    = getOrCreate(folder, "RemoteEvent", "CapybaraSpawned")
RemoteEvents.CapybaraDespawned  = getOrCreate(folder, "RemoteEvent", "CapybaraDespawned")
RemoteEvents.EncounterStart     = getOrCreate(folder, "RemoteEvent", "EncounterStart")
RemoteEvents.EncounterEnd       = getOrCreate(folder, "RemoteEvent", "EncounterEnd")
RemoteEvents.SpaUpdate          = getOrCreate(folder, "RemoteEvent", "SpaUpdate")
RemoteEvents.GoldGained         = getOrCreate(folder, "RemoteEvent", "GoldGained")
RemoteEvents.BreedingUpdate     = getOrCreate(folder, "RemoteEvent", "BreedingUpdate")
RemoteEvents.BreedingComplete   = getOrCreate(folder, "RemoteEvent", "BreedingComplete")
RemoteEvents.ShowNotification   = getOrCreate(folder, "RemoteEvent", "ShowNotification")
RemoteEvents.PlacementMode      = getOrCreate(folder, "RemoteEvent", "PlacementMode")
RemoteEvents.DecorationPlaced   = getOrCreate(folder, "RemoteEvent", "DecorationPlaced")

-- ── CLIENT → SERVER (actions joueur) ──────────────────────────────────────────
RemoteEvents.AttemptCapture     = getOrCreate(folder, "RemoteEvent", "AttemptCapture")
RemoteEvents.PlaceSpa           = getOrCreate(folder, "RemoteEvent", "PlaceSpa")
RemoteEvents.UpgradeSpa         = getOrCreate(folder, "RemoteEvent", "UpgradeSpa")
RemoteEvents.AssignCapyToSpa    = getOrCreate(folder, "RemoteEvent", "AssignCapyToSpa")
RemoteEvents.RemoveCapyFromSpa  = getOrCreate(folder, "RemoteEvent", "RemoveCapyFromSpa")
RemoteEvents.InteractCapybara   = getOrCreate(folder, "RemoteEvent", "InteractCapybara")
RemoteEvents.StartBreeding      = getOrCreate(folder, "RemoteEvent", "StartBreeding")
RemoteEvents.CollectOffspring   = getOrCreate(folder, "RemoteEvent", "CollectOffspring")
RemoteEvents.BuyUpgrade         = getOrCreate(folder, "RemoteEvent", "BuyUpgrade")
RemoteEvents.BuyItem            = getOrCreate(folder, "RemoteEvent", "BuyItem")
RemoteEvents.PlaceDecoration    = getOrCreate(folder, "RemoteEvent", "PlaceDecoration")
RemoteEvents.SellCapybara       = getOrCreate(folder, "RemoteEvent", "SellCapybara")
RemoteEvents.TriggerRebirth     = getOrCreate(folder, "RemoteEvent", "TriggerRebirth")
RemoteEvents.UnlockPlot         = getOrCreate(folder, "RemoteEvent", "UnlockPlot")
RemoteEvents.EquipTool          = getOrCreate(folder, "RemoteEvent", "EquipTool")
RemoteEvents.BuyGamePass        = getOrCreate(folder, "RemoteEvent", "BuyGamePass")

-- ── REMOTE FUNCTIONS (requête/réponse) ────────────────────────────────────────
RemoteEvents.GetPlayerData      = getOrCreate(folder, "RemoteFunction", "GetPlayerData")
RemoteEvents.GetLeaderboard     = getOrCreate(folder, "RemoteFunction", "GetLeaderboard")
RemoteEvents.GetInventory       = getOrCreate(folder, "RemoteFunction", "GetInventory")

return RemoteEvents
