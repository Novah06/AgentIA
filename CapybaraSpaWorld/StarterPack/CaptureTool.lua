-- CaptureTool : outil actif de capture de capybaras
-- Type : LocalScript (placé dans un Tool nommé "Filet Basique" dans StarterPack)
-- Le Tool doit contenir un Handle (Part) et un StringValue "ToolId" (ex: "net_basic").

local Players          = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService       = game:GetService("RunService")
local Workspace        = game:GetService("Workspace")
local TweenService     = game:GetService("TweenService")
local SoundService     = game:GetService("SoundService")

local GameConfig    = require(game.ReplicatedStorage.Modules.GameConfig)
local RemoteEvents  = require(game.ReplicatedStorage.Modules.RemoteEvents)

local tool = script.Parent
local player = Players.LocalPlayer
local mouse = player:GetMouse()
local camera = Workspace.CurrentCamera

-- ToolId depuis un StringValue (défaut net_basic)
local toolIdValue = tool:FindFirstChild("ToolId")
local toolId = toolIdValue and toolIdValue.Value or "net_basic"

local equipped = false
local cooldown = false
local rangeCircle = nil
local rangeConn = nil

local function getState() _G.CapyState = _G.CapyState or {} return _G.CapyState end

local function playSound(name)
  local snd = SoundService:FindFirstChild(name)
  if snd and snd:IsA("Sound") then
    local clone = snd:Clone()
    clone.Parent = SoundService
    clone:Play()
    clone.Ended:Connect(function() clone:Destroy() end)
    task.delay(5, function() if clone then clone:Destroy() end end)
  end
end

-- cercle de portée au sol
local function createRangeCircle()
  local part = Instance.new("Part")
  part.Name = "CaptureRange"
  part.Shape = Enum.PartType.Cylinder
  part.Size = Vector3.new(0.2, 24, 24) -- diamètre = 2*radius (12 studs)
  part.Anchored = true
  part.CanCollide = false
  part.Transparency = 0.7
  part.Color = Color3.fromRGB(120, 220, 255)
  part.Material = Enum.Material.Neon
  part.Parent = Workspace
  return part
end

tool.Equipped:Connect(function()
  equipped = true
  -- ToolId peut avoir été mis à jour
  toolIdValue = tool:FindFirstChild("ToolId")
  toolId = toolIdValue and toolIdValue.Value or "net_basic"

  rangeCircle = createRangeCircle()
  rangeConn = RunService.RenderStepped:Connect(function()
    local char = player.Character
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    if hrp and rangeCircle then
      rangeCircle.CFrame = CFrame.new(hrp.Position - Vector3.new(0, hrp.Size.Y/2 + 2, 0)) * CFrame.Angles(0, 0, math.rad(90))
    end
  end)
end)

tool.Unequipped:Connect(function()
  equipped = false
  if rangeConn then rangeConn:Disconnect() rangeConn = nil end
  if rangeCircle then rangeCircle:Destroy() rangeCircle = nil end
end)

tool.Activated:Connect(function()
  if cooldown then return end

  -- raycast depuis la souris / centre écran
  local rayOrigin, rayDir
  if UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled then
    local center = camera.ViewportSize / 2
    local r = camera:ScreenPointToRay(center.X, center.Y)
    rayOrigin, rayDir = r.Origin, r.Direction
  else
    local r = camera:ScreenPointToRay(mouse.X, mouse.Y)
    rayOrigin, rayDir = r.Origin, r.Direction
  end

  local params = RaycastParams.new()
  params.FilterType = Enum.RaycastFilterType.Exclude
  params.FilterDescendantsInstances = { player.Character, rangeCircle }
  local result = Workspace:Raycast(rayOrigin, rayDir * 1000, params)

  local hitCapy = nil
  if result and result.Instance then
    local node = result.Instance
    while node and node ~= Workspace do
      if node:IsA("Model") and node:FindFirstChild("CapyId") and node:GetAttribute("__skip") ~= true then
        if game:GetService("CollectionService"):HasTag(node, "WildCapybara") then
          hitCapy = node
          break
        end
      end
      node = node.Parent
    end
  end

  -- animation du tool (rotation lance-filet)
  local handle = tool:FindFirstChild("Handle")
  if handle then
    local orig = handle.CFrame
    pcall(function()
      TweenService:Create(handle, TweenInfo.new(0.15), { CFrame = orig * CFrame.Angles(math.rad(-40), 0, 0) }):Play()
    end)
  end

  if hitCapy then
    local body = hitCapy.PrimaryPart or hitCapy:FindFirstChild("Body")
    local char = player.Character
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    if body and hrp and (hrp.Position - body.Position).Magnitude <= 14 then
      local capyId = hitCapy:FindFirstChild("CapyId").Value
      local state = getState()
      RemoteEvents.AttemptCapture:FireServer({
        capyId = capyId,
        toolId = toolId,
        baitId = state.SelectedBait,
      })
      state.SelectedBait = nil
    else
      if _G.CapyUI and _G.CapyUI.Notification then
        _G.CapyUI.Notification.show("Trop loin ! Approche-toi.", "info")
      end
    end
  else
    playSound("CaptureFailSound")
  end

  cooldown = true
  task.delay(1, function() cooldown = false end)
end)

-- sélection d'appât avec la touche G
UserInputService.InputBegan:Connect(function(input, gp)
  if gp or not equipped then return end
  if input.KeyCode == Enum.KeyCode.G then
    -- cycle entre les appâts possédés
    local state = getState()
    local inv = state.Inventory or {}
    local available = {}
    for _, b in ipairs(GameConfig.CaptureTools) do
      if b.consumable and inv.baits and (inv.baits[b.id] or 0) > 0 then
        table.insert(available, b.id)
      end
    end
    if #available == 0 then
      if _G.CapyUI and _G.CapyUI.Notification then
        _G.CapyUI.Notification.show("Aucun appât. Achète-en à la boutique.", "info")
      end
      return
    end
    local cur = state.SelectedBait
    local idx = 0
    for i, id in ipairs(available) do if id == cur then idx = i break end end
    local nextBait = available[(idx % #available) + 1]
    state.SelectedBait = nextBait
    local cfg = GameConfig.getToolById(nextBait)
    if _G.CapyUI and _G.CapyUI.Notification then
      _G.CapyUI.Notification.show("Appât sélectionné : "..(cfg and cfg.emoji.." "..cfg.name or nextBait), "info")
    end
  end
end)
