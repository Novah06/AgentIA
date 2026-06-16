-- InputHandler : inputs unifiés clavier + souris + mobile
-- Type : LocalScript

local Players          = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local UIHelper = require(game.ReplicatedStorage.Modules.UIHelper)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local isMobile = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled

local InputHandler = {}

local function toggle(uiName)
  if _G.CapyUI and _G.CapyUI[uiName] and _G.CapyUI[uiName].toggle then
    _G.CapyUI[uiName].toggle()
  end
end

function InputHandler.closeAllUIs()
  if not _G.CapyUI then return end
  for _, ui in pairs(_G.CapyUI) do
    if ui.forceClose then ui.forceClose() end
  end
end

-- ── CLAVIER ──────────────────────────────────────────────────────────────────
UserInputService.InputBegan:Connect(function(input, gameProcessed)
  if gameProcessed then return end
  local key = input.KeyCode
  if key == Enum.KeyCode.E or key == Enum.KeyCode.Tab then
    toggle("Shop")
  elseif key == Enum.KeyCode.B then
    toggle("Breeding")
  elseif key == Enum.KeyCode.M then
    toggle("Spa")
  elseif key == Enum.KeyCode.L then
    toggle("Leaderboard")
  elseif key == Enum.KeyCode.R then
    toggle("Rebirth")
  elseif key == Enum.KeyCode.Escape then
    InputHandler.closeAllUIs()
  end
end)

-- ── MOBILE : boutons flottants ───────────────────────────────────────────────
if isMobile then
  local screen = Instance.new("ScreenGui")
  screen.Name = "MobileButtons"
  screen.ResetOnSpawn = false
  screen.IgnoreGuiInset = true
  screen.Parent = playerGui

  local function makeMobileBtn(emoji, posScale, posOffsetX, color, fn)
    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(0, 60, 0, 60)
    btn.AnchorPoint = Vector2.new(0.5, 1)
    btn.Position = UDim2.new(posScale, posOffsetX, 1, -20)
    btn.BackgroundColor3 = color
    btn.Text = emoji
    btn.TextScaled = true
    btn.Parent = screen
    local c = Instance.new("UICorner") c.CornerRadius = UDim.new(1, 0) c.Parent = btn
    btn.Activated:Connect(fn)
    return btn
  end

  makeMobileBtn("🛒", 0.2, 0, Color3.fromRGB(60,140,220), function() toggle("Shop") end)
  makeMobileBtn("🏊", 0.4, 0, Color3.fromRGB(60,180,200), function() toggle("Spa") end)
  makeMobileBtn("🐾", 0.6, 0, Color3.fromRGB(220,110,160), function() toggle("Breeding") end)
  makeMobileBtn("🏆", 0.8, 0, Color3.fromRGB(230,180,60), function() toggle("Leaderboard") end)

  -- bouton rebirth en haut centre
  local rebirthBtn = Instance.new("TextButton")
  rebirthBtn.Size = UDim2.new(0, 60, 0, 60)
  rebirthBtn.AnchorPoint = Vector2.new(0.5, 0)
  rebirthBtn.Position = UDim2.new(0.5, 0, 0, 76)
  rebirthBtn.BackgroundColor3 = Color3.fromRGB(140,70,210)
  rebirthBtn.Text = "✨"
  rebirthBtn.TextScaled = true
  rebirthBtn.Parent = screen
  local rc = Instance.new("UICorner") rc.CornerRadius = UDim.new(1,0) rc.Parent = rebirthBtn
  rebirthBtn.Activated:Connect(function() toggle("Rebirth") end)
end

_G.CapyUI = _G.CapyUI or {}
_G.CapyUI.Input = InputHandler

return InputHandler
