-- SpaBuilderClient : mode construction (placement décos / spas)
-- Type : LocalScript

local Players           = game:GetService("Players")
local RunService        = game:GetService("RunService")
local UserInputService  = game:GetService("UserInputService")
local Workspace         = game:GetService("Workspace")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local player = Players.LocalPlayer
local mouse = player:GetMouse()
local camera = Workspace.CurrentCamera

local SpaBuilder = {}

local buildMode = false
local currentItem = nil   -- { type, id, ghost }
local renderConn = nil
local inputConn = nil
local currentRotation = 0

local categoryColor = {
  plante     = Color3.fromRGB(80, 200, 80),
  eau        = Color3.fromRGB(80, 180, 230),
  confort    = Color3.fromRGB(230, 180, 120),
  lumiere    = Color3.fromRGB(255, 220, 120),
  nourriture = Color3.fromRGB(255, 160, 80),
  premium    = Color3.fromRGB(255, 215, 0),
}

local function findOwnedPlot(part)
  local node = part
  while node and node ~= Workspace do
    if node:IsA("BasePart") and node.Name:match("^Plot%d") then
      local owner = node:FindFirstChild("OwnerUserId")
      local pid = node:FindFirstChild("PlotId")
      if owner and owner.Value == player.UserId and pid then
        return node, pid.Value
      end
    end
    node = node.Parent
  end
  return nil
end

local function makeGhost(deco)
  local part = Instance.new("Part")
  part.Anchored = true
  part.CanCollide = false
  part.Transparency = 0.5
  part.Size = Vector3.new(3, math.clamp(deco.beautyScore / 10, 2, 12), 3)
  part.Color = categoryColor[deco.category] or Color3.fromRGB(200,200,200)
  part.Material = Enum.Material.ForceField
  part.Parent = Workspace
  local bb = Instance.new("BillboardGui")
  bb.Size = UDim2.new(0, 50, 0, 50)
  bb.StudsOffset = Vector3.new(0, part.Size.Y/2 + 2, 0)
  bb.AlwaysOnTop = true
  bb.Adornee = part
  bb.Parent = part
  local l = Instance.new("TextLabel")
  l.Size = UDim2.new(1,0,1,0) l.BackgroundTransparency = 1 l.Text = deco.emoji l.TextScaled = true l.Parent = bb
  return part
end

local function exitBuildMode()
  buildMode = false
  if renderConn then renderConn:Disconnect() renderConn = nil end
  if inputConn then inputConn:Disconnect() inputConn = nil end
  if currentItem and currentItem.ghost then currentItem.ghost:Destroy() end
  currentItem = nil
end
SpaBuilder.exit = exitBuildMode

local function raycastFromMouse()
  local unitRay = camera:ScreenPointToRay(mouse.X, mouse.Y)
  local params = RaycastParams.new()
  params.FilterType = Enum.RaycastFilterType.Exclude
  local filter = { camera }
  if currentItem and currentItem.ghost then table.insert(filter, currentItem.ghost) end
  if player.Character then table.insert(filter, player.Character) end
  params.FilterDescendantsInstances = filter
  return Workspace:Raycast(unitRay.Origin, unitRay.Direction * 1000, params)
end

function SpaBuilder.enterDecoPlacementMode(decoId)
  exitBuildMode()
  local deco = GameConfig.getDecoById(decoId)
  if not deco then return end
  buildMode = true
  currentRotation = 0
  currentItem = { type = "deco", id = decoId, ghost = makeGhost(deco) }

  if _G.CapyUI and _G.CapyUI.Notification then
    _G.CapyUI.Notification.show("Clic gauche = placer | clic droit / Échap = annuler | R = pivoter", "info")
  end

  RemoteEvents.PlacementMode:FireServer({ active = true, itemType = "deco", itemId = decoId })

  renderConn = RunService.RenderStepped:Connect(function()
    local result = raycastFromMouse()
    if result and result.Position then
      local plot, plotId = findOwnedPlot(result.Instance)
      local g = currentItem.ghost
      g.CFrame = CFrame.new(result.Position + Vector3.new(0, g.Size.Y/2, 0)) * CFrame.Angles(0, math.rad(currentRotation), 0)
      if plot then
        g.Color = Color3.fromRGB(120, 255, 120)
        currentItem.validPlot = plotId
        currentItem.validPos = result.Position
      else
        g.Color = Color3.fromRGB(255, 100, 100)
        currentItem.validPlot = nil
      end
    end
  end)

  inputConn = UserInputService.InputBegan:Connect(function(input, gp)
    if gp then return end
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
      if currentItem.validPlot and currentItem.validPos then
        local pos = currentItem.validPos
        RemoteEvents.PlaceDecoration:FireServer({
          decoId = currentItem.id,
          plotId = currentItem.validPlot,
          position = { x = pos.X, y = pos.Y, z = pos.Z },
          rotation = currentRotation,
        })
        exitBuildMode()
      else
        if _G.CapyUI and _G.CapyUI.Notification then
          _G.CapyUI.Notification.show("Place sur un de tes plots débloqués !", "error")
        end
      end
    elseif input.UserInputType == Enum.UserInputType.MouseButton2 or input.KeyCode == Enum.KeyCode.Escape then
      exitBuildMode()
    elseif input.KeyCode == Enum.KeyCode.R then
      currentRotation = (currentRotation + 45) % 360
    end
  end)
end

-- placement de spa via clic sur plot (alternative à SpaUI)
function SpaBuilder.enterSpaPlacementMode(spaLevel)
  exitBuildMode()
  buildMode = true
  if _G.CapyUI and _G.CapyUI.Notification then
    _G.CapyUI.Notification.show("Clique sur un plot libre pour bâtir un spa", "info")
  end
  inputConn = UserInputService.InputBegan:Connect(function(input, gp)
    if gp then return end
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
      local result = raycastFromMouse()
      if result then
        local plot, plotId = findOwnedPlot(result.Instance)
        if plotId then
          RemoteEvents.PlaceSpa:FireServer({ plotId = plotId, spaLevel = 1 })
          exitBuildMode()
        end
      end
    elseif input.UserInputType == Enum.UserInputType.MouseButton2 or input.KeyCode == Enum.KeyCode.Escape then
      exitBuildMode()
    end
  end)
end

function SpaBuilder.enterBreedingPlacementMode()
  if _G.CapyUI and _G.CapyUI.Breeding then
    _G.CapyUI.Breeding.toggle()
  end
end

-- réagit à un PlacementMode demandé par le serveur
RemoteEvents.PlacementMode.OnClientEvent:Connect(function(payload)
  if payload and payload.active == false then
    exitBuildMode()
  end
end)

_G.CapyUI = _G.CapyUI or {}
_G.CapyUI.SpaBuilder = SpaBuilder

return SpaBuilder
