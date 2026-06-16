-- HUD principal : barre top + boutons latéraux
-- Type : LocalScript

local Players      = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local UIHelper     = require(game.ReplicatedStorage.Modules.UIHelper)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screen = Instance.new("ScreenGui")
screen.Name = "HUD"
screen.IgnoreGuiInset = true
screen.ResetOnSpawn = false
screen.Parent = playerGui

-- ── TOP BAR ──────────────────────────────────────────────────────────────────
local topBar = Instance.new("Frame")
topBar.Name = "TopBar"
topBar.AnchorPoint = Vector2.new(0.5, 0)
topBar.Position = UDim2.new(0.5, 0, 0, 6)
topBar.Size = UDim2.new(0, 620, 0, 60)
topBar.BackgroundColor3 = Color3.fromRGB(25, 25, 35)
topBar.BackgroundTransparency = 0.15
topBar.BorderSizePixel = 0
topBar.Parent = screen
local tbCorner = Instance.new("UICorner")
tbCorner.CornerRadius = UDim.new(0, 14)
tbCorner.Parent = topBar
UIHelper.addStroke(topBar, Color3.fromRGB(80, 80, 120), 2, 0.4)

local hLayout = Instance.new("UIListLayout")
hLayout.FillDirection = Enum.FillDirection.Horizontal
hLayout.VerticalAlignment = Enum.VerticalAlignment.Center
hLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
hLayout.Padding = UDim.new(0, 14)
hLayout.Parent = topBar

local goldLabel = UIHelper.createLabel(topBar, "GoldLabel", "🪙 200", UDim2.new(0, 180, 1, 0), nil, Color3.fromRGB(255, 220, 100), 20, true)
goldLabel.TextXAlignment = Enum.TextXAlignment.Center
local rebirthLabel = UIHelper.createLabel(topBar, "RebirthLabel", "✨ x1", UDim2.new(0, 140, 1, 0), nil, Color3.fromRGB(200, 150, 255), 16, true)
local capyLabel = UIHelper.createLabel(topBar, "CapyLabel", "🐾 0", UDim2.new(0, 90, 1, 0), nil, Color3.fromRGB(255, 255, 255), 16, true)
local beautyLabel = UIHelper.createLabel(topBar, "BeautyLabel", "✨ 0", UDim2.new(0, 110, 1, 0), nil, Color3.fromRGB(255, 180, 230), 16, true)

-- ── RIGHT BAR (boutons) ──────────────────────────────────────────────────────
local rightBar = Instance.new("Frame")
rightBar.Name = "RightBar"
rightBar.AnchorPoint = Vector2.new(1, 0.5)
rightBar.Position = UDim2.new(1, -12, 0.5, 0)
rightBar.Size = UDim2.new(0, 150, 0, 220)
rightBar.BackgroundTransparency = 1
rightBar.Parent = screen
local rLayout = Instance.new("UIListLayout")
rLayout.Padding = UDim.new(0, 10)
rLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
rLayout.Parent = rightBar

local function makeNavButton(text, color, fn)
  return UIHelper.createButton(rightBar, text, text, UDim2.new(0, 150, 0, 46), nil, color, nil, fn)
end

local shopBtn    = makeNavButton("🛒 Boutique", Color3.fromRGB(60, 140, 220), function()
  if _G.CapyUI and _G.CapyUI.Shop then _G.CapyUI.Shop.toggle() end
end)
local spaBtn     = makeNavButton("🏊 Mes Spas", Color3.fromRGB(60, 180, 200), function()
  if _G.CapyUI and _G.CapyUI.Spa then _G.CapyUI.Spa.toggle() end
end)
local breedBtn   = makeNavButton("🐾 Élevage", Color3.fromRGB(220, 110, 160), function()
  if _G.CapyUI and _G.CapyUI.Breeding then _G.CapyUI.Breeding.toggle() end
end)
local lbBtn      = makeNavButton("🏆 Classement", Color3.fromRGB(230, 180, 60), function()
  if _G.CapyUI and _G.CapyUI.Leaderboard then _G.CapyUI.Leaderboard.toggle() end
end)
local rebirthBtn = makeNavButton("✨ Rebirth", Color3.fromRGB(140, 70, 210), function()
  if _G.CapyUI and _G.CapyUI.Rebirth then _G.CapyUI.Rebirth.toggle() end
end)

-- ── API ──────────────────────────────────────────────────────────────────────
local HUD = {}
local lastGold = 0

function HUD.update(data)
  if not data then return end
  if data.gold ~= nil then
    if data.gold > lastGold then UIHelper.flashLabel(goldLabel) end
    lastGold = data.gold
    goldLabel.Text = "🪙 " .. UIHelper.formatNumber(data.gold)
  end
  if data.rebirthLevel ~= nil then
    local mult = data.rebirthMult or 1
    rebirthLabel.Text = string.format("✨ x%d (×%.2f)", data.rebirthLevel, mult)
  end
  if data.totalCapybaras ~= nil then
    capyLabel.Text = "🐾 " .. data.totalCapybaras
  end
  if data.beautyScore ~= nil then
    beautyLabel.Text = "✨ " .. UIHelper.formatNumber(data.beautyScore)
  end
end

function HUD.updateBeauty(added, total)
  UIHelper.flashLabel(beautyLabel, Color3.fromRGB(255, 200, 240))
  if total then beautyLabel.Text = "✨ " .. UIHelper.formatNumber(total) end
end

local pulsing = false
function HUD.pulseRebirthButton(active)
  if active == pulsing then return end
  pulsing = active
  if active then
    task.spawn(function()
      while pulsing do
        TweenService:Create(rebirthBtn, TweenInfo.new(0.5), { BackgroundColor3 = Color3.fromRGB(255, 80, 120) }):Play()
        task.wait(0.5)
        TweenService:Create(rebirthBtn, TweenInfo.new(0.5), { BackgroundColor3 = Color3.fromRGB(140, 70, 210) }):Play()
        task.wait(0.5)
      end
      rebirthBtn.BackgroundColor3 = Color3.fromRGB(140, 70, 210)
    end)
  end
end

_G.CapyUI = _G.CapyUI or {}
_G.CapyUI.HUD = HUD

return HUD
