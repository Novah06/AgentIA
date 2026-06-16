-- Fonctions utilitaires partagées pour la création d'UI
local UIHelper = {}
local TweenService = game:GetService("TweenService")

-- Formate un nombre avec séparateurs : 1234567 → "1,234,567"
function UIHelper.formatNumber(n)
  local s = tostring(math.floor(n))
  local result = ""
  local count = 0
  for i = #s, 1, -1 do
    if count > 0 and count % 3 == 0 then result = "," .. result end
    result = s:sub(i,i) .. result
    count = count + 1
  end
  return result
end

-- Formate en K/M/B : 1500 → "1.5K", 2000000 → "2M"
function UIHelper.formatCompact(n)
  if n >= 1e9 then return string.format("%.1fB", n/1e9)
  elseif n >= 1e6 then return string.format("%.1fM", n/1e6)
  elseif n >= 1e3 then return string.format("%.1fK", n/1e3)
  else return tostring(math.floor(n)) end
end

-- Formate un temps en secondes → "MM:SS"
function UIHelper.formatTime(seconds)
  seconds = math.max(0, math.floor(seconds))
  local m = math.floor(seconds / 60)
  local s = seconds % 60
  return string.format("%02d:%02d", m, s)
end

-- Crée un Frame stylisé avec coins arrondis (UICorner)
function UIHelper.createFrame(parent, name, size, position, color, transparency)
  local f = Instance.new("Frame")
  f.Name = name
  f.Size = size or UDim2.new(1,0,1,0)
  f.Position = position or UDim2.new(0,0,0,0)
  f.BackgroundColor3 = color or Color3.fromRGB(30,30,30)
  f.BackgroundTransparency = transparency or 0
  f.BorderSizePixel = 0
  local corner = Instance.new("UICorner")
  corner.CornerRadius = UDim.new(0, 10)
  corner.Parent = f
  f.Parent = parent
  return f
end

-- Crée un TextLabel stylisé
function UIHelper.createLabel(parent, name, text, size, position, textColor, fontSize, bold)
  local l = Instance.new("TextLabel")
  l.Name = name
  l.Text = text or ""
  l.Size = size or UDim2.new(1,0,0,30)
  l.Position = position or UDim2.new(0,0,0,0)
  l.TextColor3 = textColor or Color3.fromRGB(255,255,255)
  l.FontFace = Font.fromEnum(bold and Enum.Font.GothamBold or Enum.Font.Gotham)
  l.TextSize = fontSize or 14
  l.BackgroundTransparency = 1
  l.TextScaled = false
  l.Parent = parent
  return l
end

-- Crée un bouton avec hover effect
function UIHelper.createButton(parent, name, text, size, position, bgColor, textColor, callback)
  local btn = Instance.new("TextButton")
  btn.Name = name
  btn.Text = text or "Bouton"
  btn.Size = size or UDim2.new(0, 120, 0, 40)
  btn.Position = position or UDim2.new(0,0,0,0)
  btn.BackgroundColor3 = bgColor or Color3.fromRGB(50,150,255)
  btn.TextColor3 = textColor or Color3.fromRGB(255,255,255)
  btn.FontFace = Font.fromEnum(Enum.Font.GothamBold)
  btn.TextSize = 14
  btn.AutoButtonColor = false
  btn.BorderSizePixel = 0
  local corner = Instance.new("UICorner")
  corner.CornerRadius = UDim.new(0, 8)
  corner.Parent = btn
  local baseColor = bgColor or Color3.fromRGB(50,150,255)
  btn.MouseEnter:Connect(function()
    TweenService:Create(btn, TweenInfo.new(0.15), {
      BackgroundColor3 = Color3.fromRGB(
        math.min(255, baseColor.R*255+20),
        math.min(255, baseColor.G*255+20),
        math.min(255, baseColor.B*255+20)
      )
    }):Play()
  end)
  btn.MouseLeave:Connect(function()
    TweenService:Create(btn, TweenInfo.new(0.15), { BackgroundColor3 = baseColor }):Play()
  end)
  if callback then btn.Activated:Connect(callback) end
  btn.Parent = parent
  return btn
end

-- Barre de progression animée. Retourne (background, setProgress)
function UIHelper.createProgressBar(parent, name, size, position, fillColor)
  local bg = UIHelper.createFrame(parent, name.."_BG", size, position, Color3.fromRGB(40,40,40), 0)
  local fill = UIHelper.createFrame(bg, name.."_Fill", UDim2.new(0,0,1,0), UDim2.new(0,0,0,0), fillColor or Color3.fromRGB(80,220,80), 0)
  local function setProgress(pct, instant)
    local goal = UDim2.new(math.clamp(pct,0,1), 0, 1, 0)
    if instant then
      fill.Size = goal
    else
      TweenService:Create(fill, TweenInfo.new(0.3), { Size = goal }):Play()
    end
  end
  return bg, setProgress, fill
end

-- Couleur d'une rareté
function UIHelper.getRarityColor(rarityId)
  local GameConfig = require(script.Parent.GameConfig)
  local r = GameConfig.Rarities[rarityId]
  if not r then return Color3.fromRGB(180,180,180) end
  return Color3.fromRGB(r.colorR, r.colorG, r.colorB)
end

-- Ajoute un UIListLayout à un parent
function UIHelper.addListLayout(parent, padding, direction)
  local layout = Instance.new("UIListLayout")
  layout.Padding = UDim.new(0, padding or 6)
  layout.FillDirection = direction or Enum.FillDirection.Vertical
  layout.SortOrder = Enum.SortOrder.LayoutOrder
  layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
  layout.Parent = parent
  return layout
end

-- Ajoute du padding interne à un frame
function UIHelper.addPadding(parent, px)
  local pad = Instance.new("UIPadding")
  pad.PaddingTop = UDim.new(0, px)
  pad.PaddingBottom = UDim.new(0, px)
  pad.PaddingLeft = UDim.new(0, px)
  pad.PaddingRight = UDim.new(0, px)
  pad.Parent = parent
  return pad
end

-- Ajoute un contour coloré (UIStroke)
function UIHelper.addStroke(obj, color, thickness, transparency)
  local stroke = Instance.new("UIStroke")
  stroke.Color = color or Color3.fromRGB(255,255,255)
  stroke.Thickness = thickness or 2
  stroke.Transparency = transparency or 0
  stroke.Parent = obj
  return stroke
end

-- Tween d'entrée (glisse depuis le bas, centré)
function UIHelper.slideIn(frame, targetScaleY)
  targetScaleY = targetScaleY or 0.5
  frame.Position = UDim2.new(frame.Position.X.Scale, frame.Position.X.Offset, 1.3, 0)
  frame.Visible = true
  TweenService:Create(frame, TweenInfo.new(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
    Position = UDim2.new(frame.Position.X.Scale, frame.Position.X.Offset, targetScaleY, 0)
  }):Play()
end

-- Tween de sortie (glisse vers le bas)
function UIHelper.slideOut(frame, callback)
  local tween = TweenService:Create(frame, TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
    Position = UDim2.new(frame.Position.X.Scale, frame.Position.X.Offset, 1.3, 0)
  })
  tween.Completed:Connect(function()
    frame.Visible = false
    if callback then callback() end
  end)
  tween:Play()
end

-- Flash de couleur sur un label (vert quand valeur augmente)
function UIHelper.flashLabel(label, flashColor)
  local original = label.TextColor3
  label.TextColor3 = flashColor or Color3.fromRGB(80, 255, 120)
  TweenService:Create(label, TweenInfo.new(0.4), { TextColor3 = original }):Play()
end

return UIHelper
