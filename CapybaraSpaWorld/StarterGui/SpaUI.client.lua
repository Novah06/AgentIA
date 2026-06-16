-- SpaUI : gestion des spas (Mes Spas + Construire)
-- Type : LocalScript

local Players      = game:GetService("Players")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local UIHelper      = require(game.ReplicatedStorage.Modules.UIHelper)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screen = Instance.new("ScreenGui")
screen.Name = "SpaUI"
screen.ResetOnSpawn = false
screen.DisplayOrder = 10
screen.Enabled = false
screen.Parent = playerGui

local frame = UIHelper.createFrame(screen, "Main", UDim2.new(0, 560, 0, 600),
  UDim2.new(0.5, 0, 0.5, 0), Color3.fromRGB(28, 30, 42), 0.03)
frame.AnchorPoint = Vector2.new(0.5, 0.5)
UIHelper.addStroke(frame, Color3.fromRGB(70, 130, 160), 3)

local title = UIHelper.createLabel(frame, "Title", "🏊 Mes Spas", UDim2.new(1, 0, 0, 40), UDim2.new(0, 0, 0, 8), Color3.fromRGB(255,255,255), 24, true)

local closeBtn = UIHelper.createButton(frame, "Close", "✕", UDim2.new(0, 36, 0, 36), UDim2.new(1, -44, 0, 8), Color3.fromRGB(180, 60, 60), nil, function()
  screen.Enabled = false
end)

-- Onglets
local tabBar = Instance.new("Frame")
tabBar.Size = UDim2.new(1, -20, 0, 40)
tabBar.Position = UDim2.new(0, 10, 0, 52)
tabBar.BackgroundTransparency = 1
tabBar.Parent = frame
local tabLayout = Instance.new("UIListLayout")
tabLayout.FillDirection = Enum.FillDirection.Horizontal
tabLayout.Padding = UDim.new(0, 8)
tabLayout.Parent = tabBar

local content = Instance.new("ScrollingFrame")
content.Size = UDim2.new(1, -20, 1, -110)
content.Position = UDim2.new(0, 10, 0, 100)
content.BackgroundTransparency = 1
content.BorderSizePixel = 0
content.ScrollBarThickness = 6
content.CanvasSize = UDim2.new(0, 0, 0, 0)
content.AutomaticCanvasSize = Enum.AutomaticSize.Y
content.Parent = frame
local cLayout = Instance.new("UIListLayout")
cLayout.Padding = UDim.new(0, 8)
cLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
cLayout.Parent = content

local SpaUI = {}
local currentTab = "spas"
local inventory = nil

local function getState() _G.CapyState = _G.CapyState or {} return _G.CapyState end

local function clearContent()
  for _, c in ipairs(content:GetChildren()) do
    if not c:IsA("UIListLayout") then c:Destroy() end
  end
end

local function fetchInventory()
  local ok, inv = pcall(function() return RemoteEvents.GetInventory:InvokeServer() end)
  if ok and inv then inventory = inv getState().Inventory = inv end
  return inventory
end

-- ── ONGLET MES SPAS ──────────────────────────────────────────────────────────
local function renderMySpas()
  clearContent()
  local inv = inventory or {}
  local spas = inv.spas or {}
  if #spas == 0 then
    UIHelper.createLabel(content, "Empty", "Aucun spa construit. Va dans l'onglet Construire !", UDim2.new(1, -20, 0, 40), nil, Color3.fromRGB(200,200,200), 16, false)
    return
  end
  for _, spa in ipairs(spas) do
    local cfg = GameConfig.SpaLevels[spa.level]
    local card = UIHelper.createFrame(content, "Spa_"..spa.id, UDim2.new(1, -10, 0, 120), nil, Color3.fromRGB(40, 44, 58), 0)
    UIHelper.createLabel(card, "T", cfg.emoji.." "..cfg.name.." (Niv."..spa.level..")", UDim2.new(1, -16, 0, 26), UDim2.new(0, 8, 0, 6), Color3.fromRGB(255,255,255), 18, true).TextXAlignment = Enum.TextXAlignment.Left
    UIHelper.createLabel(card, "C", "🐾 "..#spa.capyIds.."/"..(cfg.maxCapybaras + ((inv.upgrades and inv.upgrades.spaCapacity) or 0)).." capybaras", UDim2.new(1, -16, 0, 20), UDim2.new(0, 8, 0, 34), Color3.fromRGB(200,220,255), 14, false).TextXAlignment = Enum.TextXAlignment.Left

    -- bouton améliorer
    if cfg.upgradeCost then
      UIHelper.createButton(card, "Up", "⬆️ Améliorer ("..UIHelper.formatCompact(cfg.upgradeCost)..")", UDim2.new(0, 240, 0, 32), UDim2.new(0, 8, 1, -40), Color3.fromRGB(60, 160, 90), nil, function()
        RemoteEvents.UpgradeSpa:FireServer({ spaId = spa.id })
        task.delay(0.4, function() if currentTab == "spas" then fetchInventory() renderMySpas() end end)
      end)
    else
      UIHelper.createLabel(card, "Max", "⭐ Niveau MAX", UDim2.new(0, 200, 0, 32), UDim2.new(0, 8, 1, -40), Color3.fromRGB(255, 215, 0), 14, true).TextXAlignment = Enum.TextXAlignment.Left
    end

    UIHelper.createButton(card, "Manage", "Gérer", UDim2.new(0, 120, 0, 32), UDim2.new(1, -130, 1, -40), Color3.fromRGB(70, 110, 200), nil, function()
      SpaUI.openSpaDetail(spa)
    end)
  end
end

-- ── PANEL DÉTAIL ─────────────────────────────────────────────────────────────
local detailScreen = Instance.new("ScreenGui")
detailScreen.Name = "SpaDetail"
detailScreen.ResetOnSpawn = false
detailScreen.DisplayOrder = 11
detailScreen.Enabled = false
detailScreen.Parent = playerGui
local detailFrame = UIHelper.createFrame(detailScreen, "DMain", UDim2.new(0, 480, 0, 560), UDim2.new(0.5,0,0.5,0), Color3.fromRGB(26,28,40), 0.03)
detailFrame.AnchorPoint = Vector2.new(0.5,0.5)
UIHelper.addStroke(detailFrame, Color3.fromRGB(70,130,160), 3)
local detailTitle = UIHelper.createLabel(detailFrame, "DT", "Spa", UDim2.new(1,0,0,36), UDim2.new(0,0,0,8), Color3.fromRGB(255,255,255), 22, true)
UIHelper.createButton(detailFrame, "DClose", "✕", UDim2.new(0,34,0,34), UDim2.new(1,-42,0,8), Color3.fromRGB(180,60,60), nil, function() detailScreen.Enabled = false end)
local detailScroll = Instance.new("ScrollingFrame")
detailScroll.Size = UDim2.new(1, -20, 1, -56)
detailScroll.Position = UDim2.new(0, 10, 0, 50)
detailScroll.BackgroundTransparency = 1
detailScroll.BorderSizePixel = 0
detailScroll.ScrollBarThickness = 6
detailScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
detailScroll.CanvasSize = UDim2.new(0,0,0,0)
detailScroll.Parent = detailFrame
local dLayout = Instance.new("UIListLayout") dLayout.Padding = UDim.new(0,8) dLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center dLayout.Parent = detailScroll

function SpaUI.openSpaDetail(spa)
  fetchInventory()
  local inv = inventory or {}
  local cfg = GameConfig.SpaLevels[spa.level]
  detailTitle.Text = cfg.emoji.." "..cfg.name
  for _, c in ipairs(detailScroll:GetChildren()) do if not c:IsA("UIListLayout") then c:Destroy() end end

  -- capybaras présents
  local inSpa = {}
  for _, id in ipairs(spa.capyIds) do inSpa[id] = true end

  UIHelper.createLabel(detailScroll, "H1", "🐾 Capybaras dans le spa", UDim2.new(1,-10,0,24), nil, Color3.fromRGB(180,220,255), 16, true)
  for _, id in ipairs(spa.capyIds) do
    local capy
    for _, c in ipairs(inv.capybaras or {}) do if c.id == id then capy = c break end end
    if capy then
      local rarity = GameConfig.Rarities[capy.rarityId]
      local card = UIHelper.createFrame(detailScroll, "In_"..id, UDim2.new(1,-10,0,80), nil, Color3.fromRGB(40,44,58), 0)
      UIHelper.createLabel(card, "N", rarity.emoji.." "..capy.name, UDim2.new(1,-16,0,22), UDim2.new(0,8,0,6), UIHelper.getRarityColor(capy.rarityId), 16, true).TextXAlignment = Enum.TextXAlignment.Left
      local _, setHappy = UIHelper.createProgressBar(card, "Happy", UDim2.new(0.5,-16,0,12), UDim2.new(0,8,0,32), Color3.fromRGB(255,200,80))
      setHappy((capy.happiness or 50)/100, true)
      UIHelper.createLabel(card, "HpTxt", "😊 "..math.floor(capy.happiness or 50).."%", UDim2.new(0.3,0,0,16), UDim2.new(0,8,0,48), Color3.fromRGB(255,220,150), 12, false).TextXAlignment = Enum.TextXAlignment.Left
      -- interactions
      local ix = 0
      for _, inter in ipairs(GameConfig.Interactions) do
        UIHelper.createButton(card, inter.id, inter.label, UDim2.new(0, 90, 0, 22), UDim2.new(0.5, ix*94, 0, 8), Color3.fromRGB(80,130,90), nil, function()
          RemoteEvents.InteractCapybara:FireServer({ capyId = id, interactionId = inter.id })
        end)
        ix = ix + 1
        if ix >= 2 then ix = 0 end
      end
      UIHelper.createButton(card, "Rem", "Retirer", UDim2.new(0, 90, 0, 22), UDim2.new(1, -98, 1, -30), Color3.fromRGB(180,80,80), nil, function()
        RemoteEvents.RemoveCapyFromSpa:FireServer({ capyId = id })
        task.delay(0.4, function() fetchInventory() SpaUI.refreshSpaDetail(spa.id) end)
      end)
    end
  end

  -- capybaras libres à ajouter
  UIHelper.createLabel(detailScroll, "H2", "➕ Ajouter un capybara", UDim2.new(1,-10,0,24), nil, Color3.fromRGB(180,255,200), 16, true)
  local capacity = cfg.maxCapybaras + ((inv.upgrades and inv.upgrades.spaCapacity) or 0)
  for _, capy in ipairs(inv.capybaras or {}) do
    if not capy.inSpaId and not capy.inBreedId and not inSpa[capy.id] then
      local rarity = GameConfig.Rarities[capy.rarityId]
      local row = UIHelper.createFrame(detailScroll, "Free_"..capy.id, UDim2.new(1,-10,0,40), nil, Color3.fromRGB(36,40,52), 0)
      UIHelper.createLabel(row, "N", rarity.emoji.." "..capy.name, UDim2.new(0.6,0,1,0), UDim2.new(0,8,0,0), UIHelper.getRarityColor(capy.rarityId), 14, true).TextXAlignment = Enum.TextXAlignment.Left
      UIHelper.createButton(row, "Add", "Ajouter +", UDim2.new(0, 110, 0, 28), UDim2.new(1, -118, 0.5, -14), Color3.fromRGB(60,160,90), nil, function()
        if #spa.capyIds >= capacity then
          if _G.CapyUI.Notification then _G.CapyUI.Notification.show("Spa plein.", "error") end
          return
        end
        RemoteEvents.AssignCapyToSpa:FireServer({ capyId = capy.id, spaId = spa.id })
        task.delay(0.4, function() fetchInventory() SpaUI.refreshSpaDetail(spa.id) end)
      end)
    end
  end

  detailScreen.Enabled = true
end

function SpaUI.refreshSpaDetail(spaId)
  fetchInventory()
  for _, spa in ipairs((inventory or {}).spas or {}) do
    if spa.id == spaId then SpaUI.openSpaDetail(spa) return end
  end
  detailScreen.Enabled = false
end

-- ── ONGLET CONSTRUIRE ────────────────────────────────────────────────────────
local function renderBuild()
  clearContent()
  local inv = inventory or {}
  local unlocked = {}
  for _, p in ipairs(inv.unlockedPlots or {1}) do unlocked[p] = true end
  local occupied = {}
  for _, s in ipairs(inv.spas or {}) do occupied[s.plotId] = "spa" end
  for _, b in ipairs(inv.breedingPlots or {}) do if not b.collected then occupied[b.plotId] = "breed" end end

  UIHelper.createLabel(content, "Info", "Plots de construction (Spa niv.1 = "..GameConfig.SpaLevels[1].buildCost.." 🪙)", UDim2.new(1,-10,0,24), nil, Color3.fromRGB(200,220,255), 14, true)

  for plotId = 1, GameConfig.MaxPlots do
    local card = UIHelper.createFrame(content, "Plot_"..plotId, UDim2.new(1,-10,0,56), nil, Color3.fromRGB(40,44,58), 0)
    local status
    if not unlocked[plotId] then
      status = "🔒 Verrouillé ("..(GameConfig.PlotUnlockCosts[plotId] or 0).." 🪙)"
    elseif occupied[plotId] then
      status = occupied[plotId] == "spa" and "🏊 Spa construit" or "🐾 Élevage"
    else
      status = "✅ Libre"
    end
    UIHelper.createLabel(card, "T", "Plot "..plotId.." — "..status, UDim2.new(0.55,0,1,0), UDim2.new(0,8,0,0), Color3.fromRGB(255,255,255), 15, true).TextXAlignment = Enum.TextXAlignment.Left

    if not unlocked[plotId] then
      UIHelper.createButton(card, "Unlock", "Débloquer", UDim2.new(0, 130, 0, 34), UDim2.new(1, -138, 0.5, -17), Color3.fromRGB(200, 160, 50), nil, function()
        RemoteEvents.UnlockPlot:FireServer({ plotId = plotId })
        task.delay(0.4, function() if currentTab == "build" then fetchInventory() renderBuild() end end)
      end)
    elseif not occupied[plotId] then
      UIHelper.createButton(card, "BuildSpa", "🏊 Spa", UDim2.new(0, 90, 0, 34), UDim2.new(1, -230, 0.5, -17), Color3.fromRGB(60, 160, 200), nil, function()
        RemoteEvents.PlaceSpa:FireServer({ plotId = plotId, spaLevel = 1 })
        task.delay(0.4, function() if currentTab == "build" then fetchInventory() renderBuild() end end)
      end)
      UIHelper.createButton(card, "BuildBreed", "🐾 Élevage", UDim2.new(0, 120, 0, 34), UDim2.new(1, -130, 0.5, -17), Color3.fromRGB(200, 110, 160), nil, function()
        if _G.CapyUI and _G.CapyUI.Breeding then
          getState().BreedingPlotId = plotId
          _G.CapyUI.Breeding.openForPlot(plotId)
          screen.Enabled = false
        end
      end)
    end
  end
end

-- ── TABS ─────────────────────────────────────────────────────────────────────
local tabButtons = {}
local function setTab(tab)
  currentTab = tab
  for id, btn in pairs(tabButtons) do
    btn.BackgroundColor3 = id == tab and Color3.fromRGB(70, 130, 200) or Color3.fromRGB(50, 54, 70)
  end
  if tab == "spas" then title.Text = "🏊 Mes Spas" renderMySpas()
  else title.Text = "🏗️ Construire" renderBuild() end
end

tabButtons.spas = UIHelper.createButton(tabBar, "TabSpas", "Mes Spas", UDim2.new(0, 160, 1, 0), nil, Color3.fromRGB(70,130,200), nil, function() setTab("spas") end)
tabButtons.build = UIHelper.createButton(tabBar, "TabBuild", "Construire", UDim2.new(0, 160, 1, 0), nil, Color3.fromRGB(50,54,70), nil, function() setTab("build") end)

-- ── API ──────────────────────────────────────────────────────────────────────
function SpaUI.toggle()
  if screen.Enabled then screen.Enabled = false return end
  if _G.CapyUI then for n, ui in pairs(_G.CapyUI) do if ui.forceClose and n ~= "Spa" then ui.forceClose() end end end
  fetchInventory()
  setTab(currentTab)
  screen.Enabled = true
end
function SpaUI.forceClose() screen.Enabled = false detailScreen.Enabled = false end
function SpaUI.updateSpa(payload)
  -- rafraîchit si l'onglet concerné est ouvert
  if screen.Enabled and currentTab == "spas" then
    fetchInventory() renderMySpas()
  end
  if detailScreen.Enabled and payload and payload.spaId then
    -- refresh handled lazily
  end
end

_G.CapyUI = _G.CapyUI or {}
_G.CapyUI.Spa = SpaUI

return SpaUI
