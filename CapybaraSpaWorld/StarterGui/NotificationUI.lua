-- NotificationUI : file de toasts dynamiques
-- Type : LocalScript

local Players      = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

local UIHelper = require(game.ReplicatedStorage.Modules.UIHelper)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screen = Instance.new("ScreenGui")
screen.Name = "Notifs"
screen.IgnoreGuiInset = true
screen.ResetOnSpawn = false
screen.DisplayOrder = 100
screen.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screen.Parent = playerGui

-- Conteneur des toasts (bas-droite)
local container = Instance.new("Frame")
container.Name = "ToastContainer"
container.AnchorPoint = Vector2.new(1, 1)
container.Position = UDim2.new(1, -20, 1, -20)
container.Size = UDim2.new(0, 360, 0, 400)
container.BackgroundTransparency = 1
container.Parent = screen
local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 8)
layout.VerticalAlignment = Enum.VerticalAlignment.Bottom
layout.HorizontalAlignment = Enum.HorizontalAlignment.Right
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = container

local typeColors = {
  info      = Color3.fromRGB(60, 80, 110),
  success   = Color3.fromRGB(50, 160, 80),
  error     = Color3.fromRGB(180, 60, 60),
  legendary = Color3.fromRGB(230, 180, 40),
  rebirth   = Color3.fromRGB(120, 60, 200),
}

local activeCount = 0
local MAX_VISIBLE = 4
local queue = {}

local function playSound(id, volume)
  local snd = SoundService:FindFirstChild(id)
  if snd and snd:IsA("Sound") then
    local clone = snd:Clone()
    clone.Volume = volume or snd.Volume
    clone.Parent = SoundService
    clone:Play()
    clone.Ended:Connect(function() clone:Destroy() end)
    task.delay(8, function() if clone then clone:Destroy() end end)
  end
end

local NotificationUI = {}

local function showStandardToast(message, ntype, duration)
  activeCount = activeCount + 1
  local isLegendary = ntype == "legendary"
  local size = isLegendary and UDim2.new(0, 340, 0, 80) or UDim2.new(0, 300, 0, 55)

  local toast = Instance.new("Frame")
  toast.Size = size
  toast.BackgroundColor3 = typeColors[ntype] or typeColors.info
  toast.BackgroundTransparency = 0.05
  toast.BorderSizePixel = 0
  toast.Position = UDim2.new(1.5, 0, 0, 0)
  local corner = Instance.new("UICorner")
  corner.CornerRadius = UDim.new(0, 12)
  corner.Parent = toast

  if isLegendary then
    UIHelper.addStroke(toast, Color3.fromRGB(255, 240, 150), 3)
    -- gradient animé
    local grad = Instance.new("UIGradient")
    grad.Color = ColorSequence.new{
      ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 200, 50)),
      ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 240, 160)),
      ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 200, 50)),
    }
    grad.Parent = toast
    task.spawn(function()
      while toast.Parent do
        TweenService:Create(grad, TweenInfo.new(1), { Offset = Vector2.new(1, 0) }):Play()
        task.wait(1)
        grad.Offset = Vector2.new(-1, 0)
      end
    end)
    playSound("LegendarySound", 1)
  end

  local label = Instance.new("TextLabel")
  label.Size = UDim2.new(1, -20, 1, -10)
  label.Position = UDim2.new(0, 10, 0, 5)
  label.BackgroundTransparency = 1
  label.Text = message
  label.TextColor3 = Color3.fromRGB(255, 255, 255)
  label.FontFace = Font.fromEnum(Enum.Font.GothamBold)
  label.TextSize = isLegendary and 18 or 15
  label.TextWrapped = true
  label.TextXAlignment = Enum.TextXAlignment.Left
  label.Parent = toast

  toast.Parent = container
  TweenService:Create(toast, TweenInfo.new(0.2, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
    { Position = UDim2.new(0, 0, 0, 0) }):Play()

  task.delay(duration, function()
    local out = TweenService:Create(toast, TweenInfo.new(0.3),
      { Position = UDim2.new(1.5, 0, 0, 0), BackgroundTransparency = 1 })
    out.Completed:Connect(function()
      toast:Destroy()
      activeCount = activeCount - 1
      if #queue > 0 then
        local nextToast = table.remove(queue, 1)
        nextToast()
      end
    end)
    out:Play()
  end)
end

local function showRebirthOverlay(message, level)
  playSound("RebirthSound", 1)
  local overlay = Instance.new("Frame")
  overlay.Size = UDim2.new(1, 0, 1, 0)
  overlay.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
  overlay.BackgroundTransparency = 1
  overlay.ZIndex = 50
  overlay.Parent = screen

  local title = Instance.new("TextLabel")
  title.Size = UDim2.new(1, 0, 0, 100)
  title.Position = UDim2.new(0, 0, 0.4, 0)
  title.BackgroundTransparency = 1
  title.Text = message
  title.TextColor3 = Color3.fromRGB(255, 230, 120)
  title.FontFace = Font.fromEnum(Enum.Font.FredokaOne)
  title.TextSize = 60
  title.TextTransparency = 1
  title.ZIndex = 52
  title.Parent = overlay

  -- pulse blanc 3 fois
  task.spawn(function()
    for i = 1, 3 do
      TweenService:Create(overlay, TweenInfo.new(0.15), { BackgroundTransparency = 0.3 }):Play()
      task.wait(0.15)
      TweenService:Create(overlay, TweenInfo.new(0.15), { BackgroundTransparency = 1 }):Play()
      task.wait(0.15)
    end
  end)

  -- étoiles radiales
  for i = 1, 16 do
    local star = Instance.new("TextLabel")
    star.Size = UDim2.new(0, 40, 0, 40)
    star.Position = UDim2.new(0.5, -20, 0.5, -20)
    star.BackgroundTransparency = 1
    star.Text = "✨"
    star.TextScaled = true
    star.ZIndex = 51
    star.Parent = overlay
    local angle = (i / 16) * math.pi * 2
    local dist = 400
    TweenService:Create(star, TweenInfo.new(1.2, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
      Position = UDim2.new(0.5, math.cos(angle) * dist - 20, 0.5, math.sin(angle) * dist - 20),
      TextTransparency = 1,
    }):Play()
  end

  TweenService:Create(title, TweenInfo.new(0.4), { TextTransparency = 0 }):Play()
  task.delay(2.5, function()
    TweenService:Create(title, TweenInfo.new(0.5), { TextTransparency = 1 }):Play()
    task.delay(0.5, function() overlay:Destroy() end)
  end)
end

function NotificationUI.show(message, ntype, duration)
  ntype = ntype or "info"
  if ntype == "rebirth" then
    showRebirthOverlay(message)
    return
  end
  duration = duration or (ntype == "error" and 4 or (ntype == "legendary" and 5 or 3))
  if activeCount >= MAX_VISIBLE then
    table.insert(queue, function() showStandardToast(message, ntype, duration) end)
  else
    showStandardToast(message, ntype, duration)
  end
end

function NotificationUI.clearAll()
  for _, c in ipairs(container:GetChildren()) do
    if c:IsA("Frame") then c:Destroy() end
  end
  activeCount = 0
  queue = {}
end

_G.CapyUI = _G.CapyUI or {}
_G.CapyUI.Notification = NotificationUI

return NotificationUI
