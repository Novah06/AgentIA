-- ClientManager : état client centralisé + distribution aux UIs
-- Type : LocalScript

local Players      = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local Workspace    = game:GetService("Workspace")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local UIHelper      = require(game.ReplicatedStorage.Modules.UIHelper)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local player = Players.LocalPlayer

_G.CapyState = _G.CapyState or {}
_G.CapyUI = _G.CapyUI or {}
local state = _G.CapyState

-- attend que les UIs soient enregistrées
local function waitForUI(name, timeout)
  local t = 0
  while not (_G.CapyUI[name]) and t < (timeout or 5) do
    task.wait(0.1)
    t = t + 0.1
  end
  return _G.CapyUI[name]
end

-- ── ÉTAT INITIAL ─────────────────────────────────────────────────────────────
task.spawn(function()
  task.wait(1) -- laisse les LocalScripts StarterGui s'initialiser
  local ok, data = pcall(function() return RemoteEvents.GetPlayerData:InvokeServer() end)
  if ok and data then
    state.PlayerData = data
    if _G.CapyUI.HUD then
      _G.CapyUI.HUD.update({
        gold = data.gold,
        rebirthLevel = data.rebirthLevel,
        rebirthMult = GameConfig.RebirthMultiplier ^ (data.rebirthLevel or 0),
        totalCapybaras = #(data.capybaras or {}),
        beautyScore = data.beautyScore or 0,
      })
    end
  end
  local ok2, inv = pcall(function() return RemoteEvents.GetInventory:InvokeServer() end)
  if ok2 and inv then state.Inventory = inv end
end)

-- ── FLOTTANTS "+X CapyGold" ──────────────────────────────────────────────────
local function spawnGoldFloat(amount, position)
  if not position then return end
  local part = Instance.new("Part")
  part.Anchored = true
  part.CanCollide = false
  part.Transparency = 1
  part.Size = Vector3.new(1,1,1)
  part.Position = position
  part.Parent = Workspace

  local bb = Instance.new("BillboardGui")
  bb.Size = UDim2.new(0, 120, 0, 40)
  bb.AlwaysOnTop = true
  bb.Adornee = part
  bb.Parent = part
  local label = Instance.new("TextLabel")
  label.Size = UDim2.new(1,0,1,0)
  label.BackgroundTransparency = 1
  label.Text = (amount > 0 and ("+"..UIHelper.formatCompact(amount).." 🪙") or "💕")
  label.TextColor3 = Color3.fromRGB(255, 220, 100)
  label.FontFace = Font.fromEnum(Enum.Font.GothamBold)
  label.TextScaled = true
  label.TextStrokeTransparency = 0.4
  label.Parent = bb

  TweenService:Create(part, TweenInfo.new(0.8), { Position = position + Vector3.new(0, 5, 0) }):Play()
  TweenService:Create(label, TweenInfo.new(0.8), { TextTransparency = 1 }):Play()
  task.delay(0.85, function() part:Destroy() end)
end

-- ── HANDLERS REMOTE ──────────────────────────────────────────────────────────
RemoteEvents.UpdateHUD.OnClientEvent:Connect(function(data)
  state.PlayerData = state.PlayerData or {}
  for k, v in pairs(data) do state.PlayerData[k] = v end
  if _G.CapyUI.HUD then _G.CapyUI.HUD.update(data) end
  -- bouton rebirth pulsant si dispo
  if _G.CapyUI.HUD and data.gold ~= nil then
    local canRebirth = (data.gold >= GameConfig.RebirthCost) and ((data.rebirthLevel or 0) < GameConfig.RebirthMaxLevel)
    _G.CapyUI.HUD.pulseRebirthButton(canRebirth)
  end
  if _G.CapyUI.Rebirth then _G.CapyUI.Rebirth.refresh() end
  if _G.CapyUI.Shop then _G.CapyUI.Shop.refresh() end
end)

RemoteEvents.ShowNotification.OnClientEvent:Connect(function(payload)
  if not payload then return end
  if _G.CapyUI.Notification then
    _G.CapyUI.Notification.show(payload.message, payload.type)
  end
end)

RemoteEvents.SpaUpdate.OnClientEvent:Connect(function(payload)
  state.Spas = state.Spas or {}
  if payload and payload.spaId then state.Spas[payload.spaId] = payload end
  if _G.CapyUI.Spa then _G.CapyUI.Spa.updateSpa(payload) end
end)

RemoteEvents.GoldGained.OnClientEvent:Connect(function(payload)
  if payload then spawnGoldFloat(payload.amount or 0, payload.position) end
end)

RemoteEvents.BreedingUpdate.OnClientEvent:Connect(function(payload)
  if _G.CapyUI.Breeding then _G.CapyUI.Breeding.updateTimer(payload) end
end)

RemoteEvents.BreedingComplete.OnClientEvent:Connect(function(payload)
  if _G.CapyUI.Breeding then _G.CapyUI.Breeding.onComplete(payload) end
end)

RemoteEvents.DecorationPlaced.OnClientEvent:Connect(function(payload)
  if _G.CapyUI.HUD and payload then _G.CapyUI.HUD.updateBeauty(payload.beautyAdded, payload.beautyScore) end
end)

RemoteEvents.EncounterStart.OnClientEvent:Connect(function(payload)
  if _G.CapyUI.Encounter then _G.CapyUI.Encounter.open(payload) end
end)

RemoteEvents.EncounterEnd.OnClientEvent:Connect(function(payload)
  if _G.CapyUI.Encounter then _G.CapyUI.Encounter.onResult(payload) end
end)

-- refresh périodique de l'inventaire (léger)
task.spawn(function()
  while true do
    task.wait(8)
    local ok, inv = pcall(function() return RemoteEvents.GetInventory:InvokeServer() end)
    if ok and inv then state.Inventory = inv end
  end
end)
