-- EncounterUI : écran de rencontre style Pokémon
-- Type : LocalScript

local Players          = game:GetService("Players")
local TweenService     = game:GetService("TweenService")
local RunService       = game:GetService("RunService")
local CollectionService= game:GetService("CollectionService")
local Workspace        = game:GetService("Workspace")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local UIHelper      = require(game.ReplicatedStorage.Modules.UIHelper)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screen = Instance.new("ScreenGui")
screen.Name = "EncounterUI"
screen.ResetOnSpawn = false
screen.DisplayOrder = 20
screen.Enabled = false
screen.Parent = playerGui

local frame = Instance.new("Frame")
frame.Name = "EncounterFrame"
frame.AnchorPoint = Vector2.new(0.5, 0.5)
frame.Position = UDim2.new(0.5, 0, 0.5, 0)
frame.Size = UDim2.new(0, 500, 0, 360)
frame.BackgroundColor3 = Color3.fromRGB(28, 28, 40)
frame.BorderSizePixel = 0
frame.Visible = true
frame.Parent = screen
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 16)
corner.Parent = frame
local stroke = UIHelper.addStroke(frame, Color3.fromRGB(200, 200, 200), 4)

-- Moitié gauche : ViewportFrame du capybara
local viewport = Instance.new("ViewportFrame")
viewport.Name = "CapyView"
viewport.Size = UDim2.new(0.5, -15, 1, -90)
viewport.Position = UDim2.new(0, 10, 0, 10)
viewport.BackgroundColor3 = Color3.fromRGB(60, 90, 70)
viewport.BorderSizePixel = 0
viewport.Parent = frame
local vpCorner = Instance.new("UICorner")
vpCorner.CornerRadius = UDim.new(0, 12)
vpCorner.Parent = viewport

local vpCamera = Instance.new("Camera")
vpCamera.Parent = viewport
viewport.CurrentCamera = vpCamera

-- Barre de peur (au-dessus du viewport)
local fearBg, setFear = UIHelper.createProgressBar(frame, "FearBar",
  UDim2.new(0.5, -15, 0, 12), UDim2.new(0, 10, 1, -78), Color3.fromRGB(255, 80, 80))
local fearLabel = UIHelper.createLabel(frame, "FearLabel", "Peur", UDim2.new(0.5, -15, 0, 16), UDim2.new(0, 10, 1, -62), Color3.fromRGB(255, 180, 180), 12, true)

-- Moitié droite : infos
local infoArea = Instance.new("Frame")
infoArea.Size = UDim2.new(0.5, -20, 1, -90)
infoArea.Position = UDim2.new(0.5, 10, 0, 10)
infoArea.BackgroundTransparency = 1
infoArea.Parent = frame

local nameLabel = UIHelper.createLabel(infoArea, "Name", "Capybara", UDim2.new(1, 0, 0, 34), UDim2.new(0, 0, 0, 0), Color3.fromRGB(255,255,255), 22, true)
local rarityLabel = UIHelper.createLabel(infoArea, "Rarity", "Commun", UDim2.new(1, 0, 0, 24), UDim2.new(0, 0, 0, 38), Color3.fromRGB(200,200,200), 16, true)
local chanceLabel = UIHelper.createLabel(infoArea, "Chance", "Chance: --%", UDim2.new(1, 0, 0, 20), UDim2.new(0, 0, 0, 66), Color3.fromRGB(150, 230, 150), 14, false)

local baitLabel = UIHelper.createLabel(infoArea, "Bait", "Appât: aucun", UDim2.new(1, 0, 0, 18), UDim2.new(0, 0, 0, 88), Color3.fromRGB(255, 200, 120), 13, false)

local btnCapture = UIHelper.createButton(infoArea, "Capture", "🕸️ Capturer", UDim2.new(1, 0, 0, 40), UDim2.new(0, 0, 0, 116), Color3.fromRGB(60, 170, 90))
local btnBait = UIHelper.createButton(infoArea, "Bait", "🍊 Choisir Appât", UDim2.new(1, 0, 0, 36), UDim2.new(0, 0, 0, 162), Color3.fromRGB(200, 140, 60))
local btnFlee = UIHelper.createButton(infoArea, "Flee", "👟 Fuir", UDim2.new(1, 0, 0, 32), UDim2.new(0, 0, 0, 204), Color3.fromRGB(120, 120, 130))

-- Message box
local msgBox = Instance.new("TextLabel")
msgBox.Size = UDim2.new(1, -20, 0, 50)
msgBox.Position = UDim2.new(0, 10, 1, -60)
msgBox.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
msgBox.TextColor3 = Color3.fromRGB(255, 255, 255)
msgBox.FontFace = Font.fromEnum(Enum.Font.Gotham)
msgBox.TextSize = 15
msgBox.Text = ""
msgBox.TextWrapped = true
msgBox.Parent = frame
local mbCorner = Instance.new("UICorner")
mbCorner.CornerRadius = UDim.new(0, 10)
mbCorner.Parent = msgBox

-- ── ÉTAT ─────────────────────────────────────────────────────────────────────
local EncounterUI = {}
local current = nil  -- { capyId, rarityId, name }
local fearValue = 0
local fearConn = nil
local clonedModel = nil

local function getState()
  _G.CapyState = _G.CapyState or {}
  return _G.CapyState
end

local function findWildModel(capyId)
  for _, m in ipairs(CollectionService:GetTagged("WildCapybara")) do
    local cv = m:FindFirstChild("CapyId")
    if cv and cv.Value == capyId then return m end
  end
  return nil
end

local function computeChanceEstimate(rarityId)
  local state = getState()
  local inv = state.Inventory or {}
  local data = state.PlayerData or {}
  local rarity = GameConfig.Rarities[rarityId]
  local base = rarity and rarity.captureChance or 50
  local toolId = inv.equipped or "net_basic"
  local tool = GameConfig.getToolById(toolId)
  local toolBonus = (tool and not tool.consumable) and tool.bonusChance or 0
  local baitBonus = 0
  if state.SelectedBait then
    local b = GameConfig.getToolById(state.SelectedBait)
    if b then baitBonus = b.bonusChance end
  end
  local upgradeBonus = ((data.upgrades and data.upgrades.captureBoost) or 0) * 5
  local gpBonus = (data.gamePasses and data.gamePasses.LuckyAura) and 30 or 0
  return math.min(95, base + toolBonus + baitBonus + upgradeBonus + gpBonus)
end

local function refreshLabels()
  if not current then return end
  chanceLabel.Text = "Chance: " .. computeChanceEstimate(current.rarityId) .. "%"
  local state = getState()
  if state.SelectedBait then
    local b = GameConfig.getToolById(state.SelectedBait)
    baitLabel.Text = "Appât: " .. (b and b.emoji .. " " .. b.name or state.SelectedBait)
  else
    baitLabel.Text = "Appât: aucun"
  end
end

function EncounterUI.open(payload)
  current = payload
  fearValue = 0
  getState().SelectedBait = nil

  local rarity = GameConfig.Rarities[payload.rarityId]
  local rColor = Color3.fromRGB(rarity.colorR, rarity.colorG, rarity.colorB)
  nameLabel.Text = payload.name or "Capybara"
  nameLabel.TextColor3 = rColor
  rarityLabel.Text = rarity.emoji .. " " .. rarity.name
  rarityLabel.TextColor3 = rColor
  stroke.Color = rColor
  msgBox.Text = "Un capybara " .. rarity.name .. " est apparu !"
  setFear(0, true)
  refreshLabels()

  -- viewport
  if clonedModel then clonedModel:Destroy() clonedModel = nil end
  local wild = findWildModel(payload.capyId)
  if wild then
    clonedModel = wild:Clone()
    for _, d in ipairs(clonedModel:GetDescendants()) do
      if d:IsA("ClickDetector") or d:IsA("Highlight") then d:Destroy() end
      if d:IsA("BasePart") then d.Anchored = true end
    end
    clonedModel.Parent = viewport
    if clonedModel.PrimaryPart then
      local cf = clonedModel:GetPivot()
      clonedModel:PivotTo(CFrame.new(0, 0, 0))
      vpCamera.CFrame = CFrame.new(Vector3.new(0, 2, 8), Vector3.new(0, 0, 0))
    end
  end

  screen.Enabled = true
  UIHelper.slideIn(frame, 0.5)

  -- effets spéciaux haute rareté
  if payload.rarityId >= 5 then
    viewport.BackgroundColor3 = Color3.fromRGB(40, 30, 60)
  else
    viewport.BackgroundColor3 = Color3.fromRGB(60, 90, 70)
  end

  -- barre de peur qui monte (20s)
  if fearConn then fearConn:Disconnect() end
  local last = tick()
  fearConn = RunService.Heartbeat:Connect(function()
    if not screen.Enabled then return end
    local dt = tick() - last
    last = tick()
    local rate = getState().SelectedBait and (100/35) or (100/20)
    fearValue = math.min(100, fearValue + rate * dt)
    setFear(fearValue / 100, true)
    -- rotation du capybara dans le viewport
    if clonedModel and clonedModel.PrimaryPart then
      clonedModel:PivotTo(CFrame.new(0, math.sin(tick()*2)*0.2, 0) * CFrame.Angles(0, tick(), 0))
    end
    if fearValue >= 100 then
      EncounterUI.close()
      if _G.CapyUI and _G.CapyUI.Notification then
        _G.CapyUI.Notification.show("Le capybara s'est enfui ! 💨", "info")
      end
    end
  end)
end

function EncounterUI.close()
  screen.Enabled = false
  if fearConn then fearConn:Disconnect() fearConn = nil end
  if clonedModel then clonedModel:Destroy() clonedModel = nil end
  current = nil
end

function EncounterUI.onResult(payload)
  if payload.success then
    msgBox.Text = "🎉 Capturé !"
    EncounterUI.close()
  else
    if payload.reason == "resist" then
      msgBox.Text = "Le capybara résiste ! Réessaie."
      -- secousse
      local orig = frame.Position
      TweenService:Create(frame, TweenInfo.new(0.05), { Position = orig + UDim2.new(0,8,0,0) }):Play()
      task.delay(0.05, function() frame.Position = orig end)
      refreshLabels()
    else
      EncounterUI.close()
    end
  end
end

-- ── BOUTONS ──────────────────────────────────────────────────────────────────
btnCapture.Activated:Connect(function()
  if not current then return end
  local state = getState()
  local inv = state.Inventory or {}
  RemoteEvents.AttemptCapture:FireServer({
    capyId = current.capyId,
    toolId = inv.equipped or "net_basic",
    baitId = state.SelectedBait,
  })
  state.SelectedBait = nil
  refreshLabels()
  msgBox.Text = "Lancer du filet..."
end)

btnFlee.Activated:Connect(function()
  EncounterUI.close()
end)

-- mini sélecteur d'appâts
local baitMenu = nil
btnBait.Activated:Connect(function()
  if baitMenu then baitMenu:Destroy() baitMenu = nil return end
  local state = getState()
  local inv = state.Inventory or {}
  baitMenu = Instance.new("Frame")
  baitMenu.Size = UDim2.new(0, 200, 0, 160)
  baitMenu.Position = UDim2.new(0.5, 10, 0, 160)
  baitMenu.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
  baitMenu.Parent = frame
  local c = Instance.new("UICorner") c.Parent = baitMenu
  local list = Instance.new("UIListLayout") list.Padding = UDim.new(0,4) list.Parent = baitMenu
  UIHelper.createButton(baitMenu, "none", "Aucun", UDim2.new(1,-8,0,28), nil, Color3.fromRGB(80,80,90), nil, function()
    state.SelectedBait = nil refreshLabels() baitMenu:Destroy() baitMenu = nil
  end)
  for _, b in ipairs(GameConfig.CaptureTools) do
    if b.consumable then
      local qty = (inv.baits and inv.baits[b.id]) or 0
      if qty > 0 then
        UIHelper.createButton(baitMenu, b.id, b.emoji.." "..b.name.." ("..qty..")", UDim2.new(1,-8,0,28), nil, Color3.fromRGB(180,130,60), nil, function()
          state.SelectedBait = b.id refreshLabels() baitMenu:Destroy() baitMenu = nil
        end)
      end
    end
  end
end)

_G.CapyUI = _G.CapyUI or {}
_G.CapyUI.Encounter = EncounterUI

return EncounterUI
