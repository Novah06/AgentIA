-- ShopUI : boutique 4 onglets (Outils, Upgrades, Décorations, Game Passes)
-- Type : LocalScript

local Players      = game:GetService("Players")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local UIHelper      = require(game.ReplicatedStorage.Modules.UIHelper)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screen = Instance.new("ScreenGui")
screen.Name = "ShopUI"
screen.ResetOnSpawn = false
screen.DisplayOrder = 10
screen.Enabled = false
screen.Parent = playerGui

local frame = UIHelper.createFrame(screen, "Main", UDim2.new(0, 600, 0, 640), UDim2.new(0.5,0,0.5,0), Color3.fromRGB(26, 30, 40), 0.03)
frame.AnchorPoint = Vector2.new(0.5, 0.5)
UIHelper.addStroke(frame, Color3.fromRGB(60, 140, 220), 3)

UIHelper.createLabel(frame, "Title", "🛒 Boutique", UDim2.new(1,0,0,40), UDim2.new(0,0,0,8), Color3.fromRGB(255,255,255), 24, true)
UIHelper.createButton(frame, "Close", "✕", UDim2.new(0,36,0,36), UDim2.new(1,-44,0,8), Color3.fromRGB(180,60,60), nil, function() screen.Enabled = false end)

local tabBar = Instance.new("Frame")
tabBar.Size = UDim2.new(1, -20, 0, 38)
tabBar.Position = UDim2.new(0, 10, 0, 52)
tabBar.BackgroundTransparency = 1
tabBar.Parent = frame
local tabLayout = Instance.new("UIListLayout")
tabLayout.FillDirection = Enum.FillDirection.Horizontal
tabLayout.Padding = UDim.new(0, 6)
tabLayout.Parent = tabBar

local content = Instance.new("ScrollingFrame")
content.Size = UDim2.new(1, -20, 1, -104)
content.Position = UDim2.new(0, 10, 0, 96)
content.BackgroundTransparency = 1
content.BorderSizePixel = 0
content.ScrollBarThickness = 6
content.AutomaticCanvasSize = Enum.AutomaticSize.Y
content.CanvasSize = UDim2.new(0,0,0,0)
content.Parent = frame
local cLayout = Instance.new("UIListLayout") cLayout.Padding = UDim.new(0,6) cLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center cLayout.Parent = content

local ShopUI = {}
local inventory = nil
local currentTab = "tools"
local catFilter = "plante"

local function getState() _G.CapyState = _G.CapyState or {} return _G.CapyState end
local function getGold()
  local d = getState().PlayerData
  return d and d.gold or 0
end
local function fetchInventory()
  local ok, inv = pcall(function() return RemoteEvents.GetInventory:InvokeServer() end)
  if ok and inv then inventory = inv getState().Inventory = inv end
  return inventory
end
local function clearContent()
  for _, c in ipairs(content:GetChildren()) do if not c:IsA("UIListLayout") then c:Destroy() end end
end

-- carte générique : titre, sous-titre, bouton
local function makeCard(name, titleTxt, subTxt, color)
  local card = UIHelper.createFrame(content, name, UDim2.new(1, -10, 0, 66), nil, Color3.fromRGB(40,44,58), 0)
  if color then UIHelper.addStroke(card, color, 2, 0.4) end
  local t = UIHelper.createLabel(card, "T", titleTxt, UDim2.new(0.65, 0, 0, 24), UDim2.new(0, 10, 0, 8), Color3.fromRGB(255,255,255), 16, true)
  t.TextXAlignment = Enum.TextXAlignment.Left
  local s = UIHelper.createLabel(card, "S", subTxt, UDim2.new(0.65, 0, 0, 32), UDim2.new(0, 10, 0, 30), Color3.fromRGB(190,200,220), 13, false)
  s.TextXAlignment = Enum.TextXAlignment.Left
  s.TextWrapped = true
  return card
end

-- ── ONGLET OUTILS ────────────────────────────────────────────────────────────
local function renderTools()
  clearContent()
  local inv = inventory or {}
  UIHelper.createLabel(content, "H1", "🎯 Filets de capture", UDim2.new(1,-10,0,24), nil, Color3.fromRGB(150,200,255), 16, true)
  for _, tool in ipairs(GameConfig.CaptureTools) do
    if not tool.consumable then
      local owned = inv.tools and inv.tools[tool.id]
      local equipped = inv.equipped == tool.id
      local card = makeCard("Tool_"..tool.id, tool.emoji.." "..tool.name, tool.description.." | +"..tool.bonusChance.."%", nil)
      if owned then
        UIHelper.createButton(card, "Eq", equipped and "✓ Équipé" or "Équiper", UDim2.new(0, 130, 0, 36), UDim2.new(1, -140, 0.5, -18), equipped and Color3.fromRGB(60,160,90) or Color3.fromRGB(70,110,200), nil, function()
          RemoteEvents.EquipTool:FireServer({ toolId = tool.id })
          task.delay(0.3, function() fetchInventory() renderTools() end)
        end)
      else
        UIHelper.createButton(card, "Buy", UIHelper.formatCompact(tool.cost).." 🪙", UDim2.new(0, 130, 0, 36), UDim2.new(1, -140, 0.5, -18), Color3.fromRGB(60,160,90), nil, function()
          RemoteEvents.BuyItem:FireServer({ itemType = "tool", itemId = tool.id })
          task.delay(0.3, function() fetchInventory() renderTools() end)
        end)
      end
    end
  end
  UIHelper.createLabel(content, "H2", "🍑 Appâts (consommables)", UDim2.new(1,-10,0,24), nil, Color3.fromRGB(255,200,120), 16, true)
  for _, bait in ipairs(GameConfig.CaptureTools) do
    if bait.consumable then
      local qty = (inv.baits and inv.baits[bait.id]) or 0
      local card = makeCard("Bait_"..bait.id, bait.emoji.." "..bait.name.." (x"..qty..")", bait.description, nil)
      UIHelper.createButton(card, "Buy", "Acheter "..bait.cost.." 🪙", UDim2.new(0, 150, 0, 36), UDim2.new(1, -160, 0.5, -18), Color3.fromRGB(200,140,60), nil, function()
        RemoteEvents.BuyItem:FireServer({ itemType = "bait", itemId = bait.id })
        task.delay(0.3, function() fetchInventory() renderTools() end)
      end)
    end
  end
end

-- ── ONGLET UPGRADES ──────────────────────────────────────────────────────────
local function renderUpgrades()
  clearContent()
  local inv = inventory or {}
  for _, up in ipairs(GameConfig.Upgrades) do
    local lvl = (inv.upgrades and inv.upgrades[up.id]) or 0
    local isMax = lvl >= up.max
    local cost = math.floor(up.baseCost * (up.mult ^ lvl))
    local card = makeCard("Up_"..up.id, up.label.."  (Niv. "..lvl.."/"..up.max..")", up.desc, nil)
    local _, setP = UIHelper.createProgressBar(card, "P", UDim2.new(0.6, 0, 0, 8), UDim2.new(0, 10, 1, -14), Color3.fromRGB(120, 200, 255))
    setP(lvl / up.max, true)
    if isMax then
      local m = UIHelper.createLabel(card, "Max", "⭐ MAX", UDim2.new(0, 130, 0, 36), UDim2.new(1, -140, 0.5, -18), Color3.fromRGB(255,215,0), 16, true)
      m.TextXAlignment = Enum.TextXAlignment.Center
    else
      UIHelper.createButton(card, "Buy", UIHelper.formatCompact(cost).." 🪙", UDim2.new(0, 130, 0, 36), UDim2.new(1, -140, 0.5, -18), Color3.fromRGB(60,160,90), nil, function()
        RemoteEvents.BuyUpgrade:FireServer({ upgradeId = up.id })
        task.delay(0.3, function() fetchInventory() renderUpgrades() end)
      end)
    end
  end
end

-- ── ONGLET DÉCORATIONS ───────────────────────────────────────────────────────
local function renderDecos()
  clearContent()
  local inv = inventory or {}
  -- filtres catégories
  local filterRow = Instance.new("Frame")
  filterRow.Size = UDim2.new(1, -10, 0, 30)
  filterRow.BackgroundTransparency = 1
  filterRow.Parent = content
  local fl = Instance.new("UIListLayout") fl.FillDirection = Enum.FillDirection.Horizontal fl.Padding = UDim.new(0,4) fl.Parent = filterRow
  local cats = {"plante","eau","confort","lumiere","nourriture","premium"}
  for _, cat in ipairs(cats) do
    UIHelper.createButton(filterRow, cat, cat, UDim2.new(0, 90, 1, 0), nil, catFilter == cat and Color3.fromRGB(70,130,200) or Color3.fromRGB(50,54,70), nil, function()
      catFilter = cat renderDecos()
    end)
  end
  for _, deco in ipairs(GameConfig.Decorations) do
    if deco.category == catFilter then
      local qty = (inv.decos and inv.decos[deco.id]) or 0
      local card = makeCard("Deco_"..deco.id, deco.emoji.." "..deco.name.." (x"..qty..")",
        "✨ Beauté +"..deco.beautyScore.."  💰 +"..math.floor(deco.goldBonus*100).."%", nil)
      UIHelper.createButton(card, "Buy", UIHelper.formatCompact(deco.cost).." 🪙", UDim2.new(0, 110, 0, 30), UDim2.new(1, -120, 0, 8), Color3.fromRGB(60,160,90), nil, function()
        RemoteEvents.BuyItem:FireServer({ itemType = "deco", itemId = deco.id })
        task.delay(0.3, function() fetchInventory() renderDecos() end)
      end)
      if qty > 0 then
        UIHelper.createButton(card, "Place", "📍 Placer", UDim2.new(0, 110, 0, 28), UDim2.new(1, -120, 1, -34), Color3.fromRGB(200, 130, 60), nil, function()
          if _G.CapyUI and _G.CapyUI.SpaBuilder then
            _G.CapyUI.SpaBuilder.enterDecoPlacementMode(deco.id)
            screen.Enabled = false
          end
        end)
      end
    end
  end
end

-- ── ONGLET GAME PASSES ───────────────────────────────────────────────────────
local function renderPasses()
  clearContent()
  local inv = inventory or {}
  for passName, pass in pairs(GameConfig.GamePasses) do
    local owned = inv.gamePasses and inv.gamePasses[passName]
    local card = makeCard("GP_"..passName, pass.name, pass.desc, Color3.fromRGB(255, 215, 0))
    card.Size = UDim2.new(1, -10, 0, 70)
    if owned then
      local b = UIHelper.createLabel(card, "Own", "✓ Actif", UDim2.new(0, 130, 0, 36), UDim2.new(1, -140, 0.5, -18), Color3.fromRGB(60,200,100), 16, true)
      b.TextXAlignment = Enum.TextXAlignment.Center
    else
      UIHelper.createButton(card, "Buy", pass.price.." Robux", UDim2.new(0, 130, 0, 36), UDim2.new(1, -140, 0.5, -18), Color3.fromRGB(200, 170, 40), Color3.fromRGB(40,40,40), function()
        RemoteEvents.BuyGamePass:FireServer({ passName = passName })
      end)
    end
  end
end

-- ── TABS ─────────────────────────────────────────────────────────────────────
local tabButtons = {}
local function setTab(tab)
  currentTab = tab
  for id, btn in pairs(tabButtons) do
    btn.BackgroundColor3 = id == tab and Color3.fromRGB(70,130,200) or Color3.fromRGB(50,54,70)
  end
  if tab == "tools" then renderTools()
  elseif tab == "upgrades" then renderUpgrades()
  elseif tab == "decos" then renderDecos()
  else renderPasses() end
end

tabButtons.tools    = UIHelper.createButton(tabBar, "T1", "🎯 Outils", UDim2.new(0, 138, 1, 0), nil, Color3.fromRGB(70,130,200), nil, function() setTab("tools") end)
tabButtons.upgrades = UIHelper.createButton(tabBar, "T2", "📈 Upgrades", UDim2.new(0, 138, 1, 0), nil, Color3.fromRGB(50,54,70), nil, function() setTab("upgrades") end)
tabButtons.decos    = UIHelper.createButton(tabBar, "T3", "🌺 Décos", UDim2.new(0, 138, 1, 0), nil, Color3.fromRGB(50,54,70), nil, function() setTab("decos") end)
tabButtons.passes   = UIHelper.createButton(tabBar, "T4", "🌟 Passes", UDim2.new(0, 138, 1, 0), nil, Color3.fromRGB(50,54,70), nil, function() setTab("passes") end)

-- ── API ──────────────────────────────────────────────────────────────────────
function ShopUI.toggle()
  if screen.Enabled then screen.Enabled = false return end
  if _G.CapyUI then for n, ui in pairs(_G.CapyUI) do if ui.forceClose and n ~= "Shop" then ui.forceClose() end end end
  fetchInventory()
  setTab(currentTab)
  screen.Enabled = true
end
function ShopUI.forceClose() screen.Enabled = false end
function ShopUI.refresh()
  if screen.Enabled then fetchInventory() setTab(currentTab) end
end

_G.CapyUI = _G.CapyUI or {}
_G.CapyUI.Shop = ShopUI

return ShopUI
