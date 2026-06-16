-- BreedingUI : interface d'élevage
-- Type : LocalScript

local Players      = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local UIHelper      = require(game.ReplicatedStorage.Modules.UIHelper)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screen = Instance.new("ScreenGui")
screen.Name = "BreedingUI"
screen.ResetOnSpawn = false
screen.DisplayOrder = 10
screen.Enabled = false
screen.Parent = playerGui

local frame = UIHelper.createFrame(screen, "Main", UDim2.new(0, 520, 0, 580), UDim2.new(0.5,0,0.5,0), Color3.fromRGB(40, 28, 40), 0.03)
frame.AnchorPoint = Vector2.new(0.5, 0.5)
UIHelper.addStroke(frame, Color3.fromRGB(220, 110, 160), 3)

UIHelper.createLabel(frame, "Title", "🐾 Élevage", UDim2.new(1,0,0,40), UDim2.new(0,0,0,8), Color3.fromRGB(255,255,255), 24, true)
UIHelper.createButton(frame, "Close", "✕", UDim2.new(0,36,0,36), UDim2.new(1,-44,0,8), Color3.fromRGB(180,60,60), nil, function() screen.Enabled = false end)

-- Section parcs actifs
local activeScroll = Instance.new("ScrollingFrame")
activeScroll.Size = UDim2.new(1, -20, 0, 240)
activeScroll.Position = UDim2.new(0, 10, 0, 54)
activeScroll.BackgroundColor3 = Color3.fromRGB(30, 22, 30)
activeScroll.BackgroundTransparency = 0.3
activeScroll.BorderSizePixel = 0
activeScroll.ScrollBarThickness = 6
activeScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
activeScroll.CanvasSize = UDim2.new(0,0,0,0)
activeScroll.Parent = frame
local aCorner = Instance.new("UICorner") aCorner.Parent = activeScroll
local aLayout = Instance.new("UIListLayout") aLayout.Padding = UDim.new(0,6) aLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center aLayout.Parent = activeScroll

UIHelper.createLabel(frame, "NewLbl", "💕 Nouveau croisement", UDim2.new(1,-20,0,24), UDim2.new(0,10,0,302), Color3.fromRGB(255,200,220), 16, true)

-- Slots parents
local slotA = UIHelper.createButton(frame, "SlotA", "Parent A\n(choisir)", UDim2.new(0, 150, 0, 90), UDim2.new(0, 40, 0, 330), Color3.fromRGB(60, 50, 70), nil, nil)
slotA.TextWrapped = true
local heartLbl = UIHelper.createLabel(frame, "Heart", "💕", UDim2.new(0, 60, 0, 90), UDim2.new(0.5, -30, 0, 330), Color3.fromRGB(255,120,150), 40, true)
local slotB = UIHelper.createButton(frame, "SlotB", "Parent B\n(choisir)", UDim2.new(0, 150, 0, 90), UDim2.new(1, -190, 0, 330), Color3.fromRGB(60, 50, 70), nil, nil)
slotB.TextWrapped = true

local previewLbl = UIHelper.createLabel(frame, "Preview", "Sélectionne deux parents", UDim2.new(1,-20,0,40), UDim2.new(0,10,0,428), Color3.fromRGB(220,220,220), 14, false)
previewLbl.TextWrapped = true

local breedBtn = UIHelper.createButton(frame, "Breed", "Mettre en Élevage", UDim2.new(0, 240, 0, 44), UDim2.new(0.5, -120, 1, -56), Color3.fromRGB(120, 120, 130), nil, nil)

-- ── ÉTAT ─────────────────────────────────────────────────────────────────────
local BreedingUI = {}
local inventory = nil
local parentA, parentB = nil, nil
local selectedPlot = nil
local activeBreeds = {}  -- { [breedId] = { endTime, label } }

local function getState() _G.CapyState = _G.CapyState or {} return _G.CapyState end
local function fetchInventory()
  local ok, inv = pcall(function() return RemoteEvents.GetInventory:InvokeServer() end)
  if ok and inv then inventory = inv getState().Inventory = inv end
  return inventory
end

local function updatePreview()
  if parentA and parentB then
    local maxR = math.max(parentA.rarityId, parentB.rarityId)
    local rarity = GameConfig.Rarities[maxR]
    local baseTime = rarity.breedTimeSec
    previewLbl.Text = string.format("Chance enfant %s %s : %d%%\nTemps estimé : ~%s",
      rarity.emoji, rarity.name, rarity.breedInheritChance, UIHelper.formatTime(baseTime))
    breedBtn.BackgroundColor3 = Color3.fromRGB(220, 90, 150)
  else
    previewLbl.Text = "Sélectionne deux parents"
    breedBtn.BackgroundColor3 = Color3.fromRGB(120, 120, 130)
  end
end

local function setSlot(which, capy)
  if which == "A" then parentA = capy else parentB = capy end
  local btn = which == "A" and slotA or slotB
  if capy then
    local rarity = GameConfig.Rarities[capy.rarityId]
    btn.Text = rarity.emoji.."\n"..capy.name
    btn.TextColor3 = UIHelper.getRarityColor(capy.rarityId)
  else
    btn.Text = "Parent "..which.."\n(choisir)"
    btn.TextColor3 = Color3.fromRGB(255,255,255)
  end
  updatePreview()
end

-- ── MODAL DE SÉLECTION ───────────────────────────────────────────────────────
local modal = Instance.new("ScreenGui")
modal.Name = "SelectCapyModal"
modal.ResetOnSpawn = false
modal.DisplayOrder = 12
modal.Enabled = false
modal.Parent = playerGui
local modalFrame = UIHelper.createFrame(modal, "M", UDim2.new(0, 360, 0, 460), UDim2.new(0.5,0,0.5,0), Color3.fromRGB(26,26,38), 0.02)
modalFrame.AnchorPoint = Vector2.new(0.5,0.5)
UIHelper.addStroke(modalFrame, Color3.fromRGB(220,110,160), 2)
UIHelper.createLabel(modalFrame, "T", "Choisir un capybara", UDim2.new(1,0,0,32), UDim2.new(0,0,0,6), Color3.fromRGB(255,255,255), 18, true)
UIHelper.createButton(modalFrame, "C", "✕", UDim2.new(0,32,0,32), UDim2.new(1,-38,0,6), Color3.fromRGB(180,60,60), nil, function() modal.Enabled = false end)
local modalScroll = Instance.new("ScrollingFrame")
modalScroll.Size = UDim2.new(1,-16,1,-48)
modalScroll.Position = UDim2.new(0,8,0,42)
modalScroll.BackgroundTransparency = 1
modalScroll.BorderSizePixel = 0
modalScroll.ScrollBarThickness = 6
modalScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
modalScroll.CanvasSize = UDim2.new(0,0,0,0)
modalScroll.Parent = modalFrame
local mLayout = Instance.new("UIListLayout") mLayout.Padding = UDim.new(0,4) mLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center mLayout.Parent = modalScroll

local function openSelectModal(which)
  fetchInventory()
  for _, c in ipairs(modalScroll:GetChildren()) do if not c:IsA("UIListLayout") then c:Destroy() end end
  local other = which == "A" and parentB or parentA
  local count = 0
  for _, capy in ipairs((inventory or {}).capybaras or {}) do
    if not capy.inSpaId and not capy.inBreedId and (not other or other.id ~= capy.id) then
      count = count + 1
      local rarity = GameConfig.Rarities[capy.rarityId]
      UIHelper.createButton(modalScroll, capy.id, rarity.emoji.." "..capy.name.." ("..rarity.name..")", UDim2.new(1,-8,0,36), nil, Color3.fromRGB(50,46,62), UIHelper.getRarityColor(capy.rarityId), function()
        setSlot(which, capy)
        modal.Enabled = false
      end)
    end
  end
  if count == 0 then
    UIHelper.createLabel(modalScroll, "Empty", "Aucun capybara libre.", UDim2.new(1,-8,0,40), nil, Color3.fromRGB(200,200,200), 14, false)
  end
  modal.Enabled = true
end

slotA.Activated:Connect(function() openSelectModal("A") end)
slotB.Activated:Connect(function() openSelectModal("B") end)

breedBtn.Activated:Connect(function()
  if not (parentA and parentB) then return end
  local plot = selectedPlot or getState().BreedingPlotId
  if not plot then
    -- trouve un plot libre débloqué
    fetchInventory()
    local occupied = {}
    for _, s in ipairs((inventory or {}).spas or {}) do occupied[s.plotId] = true end
    for _, b in ipairs((inventory or {}).breedingPlots or {}) do if not b.collected then occupied[b.plotId] = true end end
    for _, p in ipairs((inventory or {}).unlockedPlots or {1}) do
      if not occupied[p] then plot = p break end
    end
  end
  if not plot then
    if _G.CapyUI.Notification then _G.CapyUI.Notification.show("Aucun plot libre. Débloque-en un.", "error") end
    return
  end
  RemoteEvents.StartBreeding:FireServer({ plotId = plot, capyIdA = parentA.id, capyIdB = parentB.id })
  setSlot("A", nil) setSlot("B", nil)
  selectedPlot = nil
  getState().BreedingPlotId = nil
end)

-- ── PARCS ACTIFS ─────────────────────────────────────────────────────────────
local function renderActive()
  for _, c in ipairs(activeScroll:GetChildren()) do if not c:IsA("UIListLayout") then c:Destroy() end end
  fetchInventory()
  local breeds = (inventory or {}).breedingPlots or {}
  local hasAny = false
  for _, breed in ipairs(breeds) do
    if not breed.collected then
      hasAny = true
      local card = UIHelper.createFrame(activeScroll, "B_"..breed.id, UDim2.new(1,-10,0,70), nil, Color3.fromRGB(48,34,48), 0)
      local ready = breed.ready
      local endTime = (breed.startTime or os.time()) + (breed.breedTimeSec or 0)
      activeBreeds[breed.id] = { endTime = endTime, card = card }
      local txt = UIHelper.createLabel(card, "T", "Élevage en cours...", UDim2.new(1,-16,0,22), UDim2.new(0,8,0,6), Color3.fromRGB(255,220,230), 15, true)
      txt.TextXAlignment = Enum.TextXAlignment.Left
      local timer = UIHelper.createLabel(card, "Time", "", UDim2.new(0.5,0,0,20), UDim2.new(0,8,0,34), Color3.fromRGB(255,255,255), 16, true)
      timer.TextXAlignment = Enum.TextXAlignment.Left
      activeBreeds[breed.id].timer = timer

      local collectBtn = UIHelper.createButton(card, "Col", "🍼 Collecter", UDim2.new(0, 130, 0, 32), UDim2.new(1, -138, 0.5, -16), Color3.fromRGB(80, 80, 90), nil, function()
        RemoteEvents.CollectOffspring:FireServer({ breedId = breed.id })
        task.delay(0.4, renderActive)
      end)
      activeBreeds[breed.id].collectBtn = collectBtn
      if ready then
        timer.Text = "✅ Prêt !"
        collectBtn.BackgroundColor3 = Color3.fromRGB(60, 180, 90)
      end
    end
  end
  if not hasAny then
    UIHelper.createLabel(activeScroll, "Empty", "Aucun élevage en cours.", UDim2.new(1,-10,0,40), nil, Color3.fromRGB(200,200,200), 14, false)
  end
end

-- boucle de mise à jour des timers (locale)
task.spawn(function()
  while true do
    task.wait(1)
    if screen.Enabled then
      for breedId, info in pairs(activeBreeds) do
        if info.timer and info.timer.Parent then
          local remaining = info.endTime - os.time()
          if remaining <= 0 then
            info.timer.Text = "✅ Prêt !"
            if info.collectBtn then info.collectBtn.BackgroundColor3 = Color3.fromRGB(60, 180, 90) end
          else
            info.timer.Text = "⏳ " .. UIHelper.formatTime(remaining)
          end
        end
      end
    end
  end
end)

-- ── API ──────────────────────────────────────────────────────────────────────
function BreedingUI.toggle()
  if screen.Enabled then screen.Enabled = false return end
  if _G.CapyUI then for n, ui in pairs(_G.CapyUI) do if ui.forceClose and n ~= "Breeding" then ui.forceClose() end end end
  renderActive()
  screen.Enabled = true
end
function BreedingUI.forceClose() screen.Enabled = false modal.Enabled = false end
function BreedingUI.openForPlot(plotId)
  selectedPlot = plotId
  BreedingUI.toggle()
end
function BreedingUI.updateTimer(payload)
  if payload and payload.breedId then
    activeBreeds[payload.breedId] = activeBreeds[payload.breedId] or {}
    activeBreeds[payload.breedId].endTime = os.time() + (payload.timeRemaining or 0)
  end
  if screen.Enabled then renderActive() end
end
function BreedingUI.onComplete(payload)
  -- effet célébration
  TweenService:Create(heartLbl, TweenInfo.new(0.3), { TextSize = 60 }):Play()
  task.delay(0.3, function() TweenService:Create(heartLbl, TweenInfo.new(0.3), { TextSize = 40 }):Play() end)
  if screen.Enabled then renderActive() end
end

_G.CapyUI = _G.CapyUI or {}
_G.CapyUI.Breeding = BreedingUI

return BreedingUI
