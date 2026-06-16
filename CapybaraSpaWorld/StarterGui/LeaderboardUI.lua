-- LeaderboardUI : 3 classements en onglets
-- Type : LocalScript

local Players      = game:GetService("Players")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local UIHelper      = require(game.ReplicatedStorage.Modules.UIHelper)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screen = Instance.new("ScreenGui")
screen.Name = "LeaderboardUI"
screen.ResetOnSpawn = false
screen.DisplayOrder = 10
screen.Enabled = false
screen.Parent = playerGui

local frame = UIHelper.createFrame(screen, "Main", UDim2.new(0, 400, 0, 540), UDim2.new(0.5,0,0.5,0), Color3.fromRGB(30, 28, 20), 0.03)
frame.AnchorPoint = Vector2.new(0.5, 0.5)
UIHelper.addStroke(frame, Color3.fromRGB(230, 180, 60), 3)

UIHelper.createLabel(frame, "Title", "🏆 Classements", UDim2.new(1,0,0,40), UDim2.new(0,0,0,8), Color3.fromRGB(255,255,255), 24, true)
UIHelper.createButton(frame, "Close", "✕", UDim2.new(0,36,0,36), UDim2.new(1,-44,0,8), Color3.fromRGB(180,60,60), nil, function() screen.Enabled = false end)

local tabBar = Instance.new("Frame")
tabBar.Size = UDim2.new(1, -20, 0, 36)
tabBar.Position = UDim2.new(0, 10, 0, 52)
tabBar.BackgroundTransparency = 1
tabBar.Parent = frame
local tl = Instance.new("UIListLayout") tl.FillDirection = Enum.FillDirection.Horizontal tl.Padding = UDim.new(0,4) tl.Parent = tabBar

local content = Instance.new("ScrollingFrame")
content.Size = UDim2.new(1, -20, 1, -140)
content.Position = UDim2.new(0, 10, 0, 94)
content.BackgroundTransparency = 1
content.BorderSizePixel = 0
content.ScrollBarThickness = 6
content.AutomaticCanvasSize = Enum.AutomaticSize.Y
content.CanvasSize = UDim2.new(0,0,0,0)
content.Parent = frame
local cl = Instance.new("UIListLayout") cl.Padding = UDim.new(0,4) cl.HorizontalAlignment = Enum.HorizontalAlignment.Center cl.Parent = content

local myRankLabel = UIHelper.createLabel(frame, "MyRank", "Ton rang : --", UDim2.new(1, -20, 0, 24), UDim2.new(0, 10, 1, -76), Color3.fromRGB(255,220,120), 15, true)
local refreshBtn = UIHelper.createButton(frame, "Refresh", "🔄 Actualiser", UDim2.new(0, 160, 0, 36), UDim2.new(0.5, -80, 1, -46), Color3.fromRGB(70, 130, 200), nil, nil)

local LeaderboardUI = {}
local currentLb = GameConfig.Leaderboards[1].id

local medals = {"🥇","🥈","🥉"}

local function render(entries)
  for _, c in ipairs(content:GetChildren()) do if not c:IsA("UIListLayout") then c:Destroy() end end
  if not entries or #entries == 0 then
    UIHelper.createLabel(content, "Empty", "Pas encore de données.\n(Joue un peu !)", UDim2.new(1,-10,0,50), nil, Color3.fromRGB(200,200,200), 14, false)
    myRankLabel.Text = "Ton rang : --"
    return
  end
  local myRank = nil
  for _, e in ipairs(entries) do
    local isMe = e.userId == player.UserId
    if isMe then myRank = e.rank end
    local bg = isMe and Color3.fromRGB(40, 70, 130) or (e.rank <= 3 and Color3.fromRGB(70, 60, 30) or Color3.fromRGB(40,42,50))
    local row = UIHelper.createFrame(content, "R_"..e.rank, UDim2.new(1, -10, 0, 40), nil, bg, 0)
    local rankTxt = e.rank <= 3 and medals[e.rank] or ("#"..e.rank)
    UIHelper.createLabel(row, "Rank", rankTxt, UDim2.new(0, 50, 1, 0), UDim2.new(0, 6, 0, 0), Color3.fromRGB(255,255,255), 18, true)
    local nl = UIHelper.createLabel(row, "Name", e.name, UDim2.new(0.5, -20, 1, 0), UDim2.new(0, 56, 0, 0), isMe and Color3.fromRGB(150,220,255) or Color3.fromRGB(255,255,255), 15, true)
    nl.TextXAlignment = Enum.TextXAlignment.Left
    local sc = UIHelper.createLabel(row, "Score", UIHelper.formatCompact(e.score), UDim2.new(0.35, 0, 1, 0), UDim2.new(0.65, -10, 0, 0), Color3.fromRGB(255,220,120), 15, true)
    sc.TextXAlignment = Enum.TextXAlignment.Right
  end
  myRankLabel.Text = myRank and ("Ton rang : #"..myRank) or "Ton rang : hors top 10"
end

local function fetch()
  render(nil)
  task.spawn(function()
    local ok, entries = pcall(function()
      return RemoteEvents.GetLeaderboard:InvokeServer({ lbId = currentLb })
    end)
    if ok then render(entries) end
  end)
end

local tabButtons = {}
local function setTab(lbId)
  currentLb = lbId
  for id, btn in pairs(tabButtons) do
    btn.BackgroundColor3 = id == lbId and Color3.fromRGB(230,180,60) or Color3.fromRGB(60,54,40)
  end
  fetch()
end

for _, lb in ipairs(GameConfig.Leaderboards) do
  tabButtons[lb.id] = UIHelper.createButton(tabBar, lb.id, lb.name, UDim2.new(0, 120, 1, 0), nil, Color3.fromRGB(60,54,40), nil, function() setTab(lb.id) end)
  tabButtons[lb.id].TextSize = 12
end

refreshBtn.Activated:Connect(fetch)

-- auto-refresh toutes les 60s si ouvert
task.spawn(function()
  while true do
    task.wait(60)
    if screen.Enabled then fetch() end
  end
end)

function LeaderboardUI.toggle()
  if screen.Enabled then screen.Enabled = false return end
  if _G.CapyUI then for n, ui in pairs(_G.CapyUI) do if ui.forceClose and n ~= "Leaderboard" then ui.forceClose() end end end
  setTab(currentLb)
  screen.Enabled = true
end
function LeaderboardUI.forceClose() screen.Enabled = false end

_G.CapyUI = _G.CapyUI or {}
_G.CapyUI.Leaderboard = LeaderboardUI

return LeaderboardUI
