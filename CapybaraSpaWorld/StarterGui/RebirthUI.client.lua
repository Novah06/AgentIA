-- RebirthUI : écran prestige
-- Type : LocalScript

local Players      = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local UIHelper      = require(game.ReplicatedStorage.Modules.UIHelper)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screen = Instance.new("ScreenGui")
screen.Name = "RebirthUI"
screen.ResetOnSpawn = false
screen.DisplayOrder = 15
screen.Enabled = false
screen.Parent = playerGui

local frame = UIHelper.createFrame(screen, "Main", UDim2.new(0, 440, 0, 500), UDim2.new(0.5,0,0.5,0), Color3.fromRGB(35, 20, 55), 0.02)
frame.AnchorPoint = Vector2.new(0.5, 0.5)
UIHelper.addStroke(frame, Color3.fromRGB(180, 120, 255), 3)
local grad = Instance.new("UIGradient")
grad.Color = ColorSequence.new{
  ColorSequenceKeypoint.new(0, Color3.fromRGB(50, 25, 80)),
  ColorSequenceKeypoint.new(1, Color3.fromRGB(25, 15, 45)),
}
grad.Rotation = 90
grad.Parent = frame

UIHelper.createLabel(frame, "Title", "✨ REBIRTH ✨", UDim2.new(1,0,0,46), UDim2.new(0,0,0,10), Color3.fromRGB(255, 220, 120), 28, true)
UIHelper.createButton(frame, "Close", "✕", UDim2.new(0,36,0,36), UDim2.new(1,-44,0,8), Color3.fromRGB(180,60,60), nil, function() screen.Enabled = false end)

-- comparaison
local compareFrame = UIHelper.createFrame(frame, "Compare", UDim2.new(1, -30, 0, 110), UDim2.new(0, 15, 0, 62), Color3.fromRGB(25, 15, 40), 0.2)
local nowLabel = UIHelper.createLabel(compareFrame, "Now", "", UDim2.new(0.5, -10, 1, -10), UDim2.new(0, 10, 0, 5), Color3.fromRGB(220,220,255), 14, false)
nowLabel.TextYAlignment = Enum.TextYAlignment.Top
nowLabel.TextXAlignment = Enum.TextXAlignment.Left
local afterLabel = UIHelper.createLabel(compareFrame, "After", "", UDim2.new(0.5, -10, 1, -10), UDim2.new(0.5, 0, 0, 5), Color3.fromRGB(180,255,200), 14, false)
afterLabel.TextYAlignment = Enum.TextYAlignment.Top
afterLabel.TextXAlignment = Enum.TextXAlignment.Left

-- perdus / conservés
local lostLabel = UIHelper.createLabel(frame, "Lost", "⚠️ PERDU : CapyGold, Capybaras, Spas construits", UDim2.new(1,-30,0,40), UDim2.new(0,15,0,182), Color3.fromRGB(255,120,120), 14, true)
lostLabel.TextWrapped = true
lostLabel.TextXAlignment = Enum.TextXAlignment.Left
local keptLabel = UIHelper.createLabel(frame, "Kept", "✓ CONSERVÉ : Upgrades, Outils, Appâts, Décos, Plots, Game Passes", UDim2.new(1,-30,0,50), UDim2.new(0,15,0,224), Color3.fromRGB(120,255,150), 14, true)
keptLabel.TextWrapped = true
keptLabel.TextXAlignment = Enum.TextXAlignment.Left

-- coût
local costLabel = UIHelper.createLabel(frame, "Cost", "", UDim2.new(1,-30,0,28), UDim2.new(0,15,0,286), Color3.fromRGB(255,220,120), 18, true)
local goldLabel = UIHelper.createLabel(frame, "Gold", "", UDim2.new(1,-30,0,24), UDim2.new(0,15,0,316), Color3.fromRGB(255,255,255), 15, false)

local confirmBtn = UIHelper.createButton(frame, "Confirm", "✨ CONFIRMER", UDim2.new(0, 220, 0, 50), UDim2.new(0.5, -110, 1, -110), Color3.fromRGB(120,120,130), nil, nil)
local cancelBtn = UIHelper.createButton(frame, "Cancel", "Annuler", UDim2.new(0, 160, 0, 40), UDim2.new(0.5, -80, 1, -52), Color3.fromRGB(80, 80, 90), nil, function() screen.Enabled = false end)

local RebirthUI = {}
local canDo = false
local counting = false

local function refresh()
  local data = (_G.CapyState or {}).PlayerData or {}
  local level = data.rebirthLevel or 0
  local mult = GameConfig.RebirthMultiplier ^ level
  local nextMult = GameConfig.RebirthMultiplier ^ (level + 1)
  local gold = data.gold or 0

  nowLabel.Text = string.format("MAINTENANT\nMult : ×%.3f\nNiveau : %d\nCapyGold : %s", mult, level, UIHelper.formatCompact(gold))
  afterLabel.Text = string.format("APRÈS\nMult : ×%.3f\nNiveau : %d\nCapyGold : %d", nextMult, level + 1, GameConfig.StartingGold)
  costLabel.Text = "Coût : " .. UIHelper.formatNumber(GameConfig.RebirthCost) .. " 🪙"

  local atMax = level >= GameConfig.RebirthMaxLevel
  canDo = gold >= GameConfig.RebirthCost and not atMax
  goldLabel.Text = "CapyGold actuel : " .. UIHelper.formatNumber(gold)
  goldLabel.TextColor3 = canDo and Color3.fromRGB(120,255,150) or Color3.fromRGB(255,140,140)

  if atMax then
    confirmBtn.Text = "⭐ NIVEAU MAX"
    confirmBtn.BackgroundColor3 = Color3.fromRGB(120,120,130)
  elseif canDo then
    confirmBtn.Text = "✨ CONFIRMER"
    confirmBtn.BackgroundColor3 = Color3.fromRGB(180, 100, 230)
  else
    confirmBtn.Text = "Pas assez de CapyGold"
    confirmBtn.BackgroundColor3 = Color3.fromRGB(120,120,130)
  end
end

confirmBtn.Activated:Connect(function()
  if not canDo or counting then return end
  counting = true
  for i = 3, 1, -1 do
    confirmBtn.Text = tostring(i) .. "..."
    task.wait(1)
    if not screen.Enabled then counting = false return end
  end
  RemoteEvents.TriggerRebirth:FireServer()
  counting = false
  screen.Enabled = false
end)

function RebirthUI.toggle()
  if screen.Enabled then screen.Enabled = false return end
  if _G.CapyUI then for n, ui in pairs(_G.CapyUI) do if ui.forceClose and n ~= "Rebirth" then ui.forceClose() end end end
  refresh()
  screen.Enabled = true
end
function RebirthUI.forceClose() screen.Enabled = false end
function RebirthUI.refresh() if screen.Enabled then refresh() end end

_G.CapyUI = _G.CapyUI or {}
_G.CapyUI.Rebirth = RebirthUI

return RebirthUI
