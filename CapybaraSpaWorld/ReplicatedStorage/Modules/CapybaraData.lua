-- Gestion des objets capybara + système génétique

local CapybaraData = {}
local GameConfig = require(script.Parent.GameConfig)
local HttpService = game:GetService("HttpService")

-- ── CRÉATION ──────────────────────────────────────────────────────────────────

-- Crée un nouveau capybara
-- rarityId : 1-7 (index dans GameConfig.Rarities)
-- origin : "wild" | "bred" | "starter"
-- parentA, parentB : CapybaraData ou nil (pour bred)
function CapybaraData.new(rarityId, origin, parentA, parentB)
  rarityId = math.clamp(rarityId or 1, 1, #GameConfig.Rarities)
  return {
    id           = HttpService:GenerateGUID(false),
    rarityId     = rarityId,
    name         = CapybaraData.generateName(),
    origin       = origin or "wild",
    happiness    = 50,
    age          = 0,
    totalGoldGen = 0,
    inSpaId      = nil,
    inBreedId    = nil,
    parentAId    = parentA and parentA.id or nil,
    parentBId    = parentB and parentB.id or nil,
    traits       = CapybaraData.generateTraits(rarityId),
    createdAt    = os.time(),
    happinessLastUpdate = os.time(),
    -- bonus temporaire d'interaction
    bonusMult       = 1,
    bonusExpiresAt  = 0,
    -- cooldowns d'interactions { interactionId = nextAvailableTime }
    interactionCooldowns = {},
  }
end

-- Génère un nom procédural pour le capybara (combinaisons drôles)
function CapybaraData.generateName()
  local prefixes = {"Capy","Baron","Sir","Lord","Comtesse","Duchesse","Roi","Reine","Prince","Maestro","Capo"}
  local suffixes = {"Chou","Relax","Zen","Flaque","Dodu","Doux","Poilu","Orange","Splash","Mousse","Bulles","Vapeur"}
  local p = prefixes[math.random(#prefixes)]
  local s = suffixes[math.random(#suffixes)]
  return p .. " " .. s
end

-- Génère des traits cosmétiques selon la rareté
function CapybaraData.generateTraits(rarityId)
  local traits = {
    hasSpots = rarityId >= 2,
    spotColor = Color3.fromRGB(math.random(50,200), math.random(50,200), math.random(50,200)),
    hasAccessory = rarityId >= 3,
    bodySize = 1 + (rarityId - 1) * 0.08,
    glowEnabled = rarityId >= 6,
  }
  local accessories = {"none","none","hat","flowers","crown","halo","cosmic_ring"}
  traits.accessoryType = accessories[math.min(rarityId, #accessories)]
  return traits
end

-- ── HÉRÉDITÉ ─────────────────────────────────────────────────────────────────

-- Calcule la rareté d'un enfant selon les deux parents
function CapybaraData.calculateOffspringRarity(parentA, parentB)
  local maxRarity = math.max(parentA.rarityId, parentB.rarityId)
  local minRarity = math.min(parentA.rarityId, parentB.rarityId)
  local inheritChance = GameConfig.Rarities[maxRarity].breedInheritChance

  local roll = math.random(100)
  if roll <= inheritChance then
    return maxRarity
  else
    local range = maxRarity - minRarity
    if range <= 0 then return minRarity end
    local denom = math.max(1, 100 - inheritChance)
    local offset = math.floor((roll - inheritChance) / denom * range)
    return math.max(1, maxRarity - 1 - offset)
  end
end

-- ── BONHEUR ──────────────────────────────────────────────────────────────────

function CapybaraData.addHappiness(capy, amount)
  capy.happiness = math.min(100, capy.happiness + amount)
  capy.happinessLastUpdate = os.time()
end

-- Déclin naturel du bonheur (appelé périodiquement)
function CapybaraData.tickHappiness(capy)
  local now = os.time()
  local minutesPassed = (now - (capy.happinessLastUpdate or now)) / 60
  local decayRate = capy.inSpaId and 0.5 or 2
  capy.happiness = math.max(0, capy.happiness - (minutesPassed * decayRate))
  capy.happinessLastUpdate = now
end

-- Multiplicateur de production selon bonheur : 0→×0.5, 50→×1, 100→×1.5
function CapybaraData.getHappinessMultiplier(capy)
  return 0.5 + (capy.happiness / 100)
end

-- Multiplicateur temporaire d'interaction (expire automatiquement)
function CapybaraData.getInteractionMultiplier(capy)
  if capy.bonusExpiresAt and capy.bonusExpiresAt > os.time() then
    return capy.bonusMult or 1
  end
  return 1
end

function CapybaraData.applyInteractionBonus(capy, multiplier)
  capy.bonusMult = math.max(capy.bonusMult or 1, multiplier)
  capy.bonusExpiresAt = os.time() + GameConfig.InteractionBonusDuration
end

-- ── SÉRIALISATION ────────────────────────────────────────────────────────────

function CapybaraData.serialize(capy)
  local s = {}
  for k, v in pairs(capy) do
    if type(v) == "table" then
      local sub = {}
      for k2, v2 in pairs(v) do
        if typeof(v2) == "Color3" then
          sub[k2] = {r=v2.R, g=v2.G, b=v2.B}
        else
          sub[k2] = v2
        end
      end
      s[k] = sub
    else
      s[k] = v
    end
  end
  return s
end

function CapybaraData.deserialize(data)
  if data.traits and data.traits.spotColor and type(data.traits.spotColor) == "table" then
    local c = data.traits.spotColor
    data.traits.spotColor = Color3.new(c.r, c.g, c.b)
  end
  data.interactionCooldowns = data.interactionCooldowns or {}
  data.bonusMult = data.bonusMult or 1
  data.bonusExpiresAt = data.bonusExpiresAt or 0
  return data
end

-- ── UTILITAIRES ──────────────────────────────────────────────────────────────

-- Rareté aléatoire selon les spawnChance et un bonus de luck
function CapybaraData.rollRarity(luckBonus)
  luckBonus = luckBonus or 0
  local adjusted = {}
  local total = 0
  for i, r in ipairs(GameConfig.Rarities) do
    local chance = r.spawnChance
    if i >= 3 then
      chance = chance * (1 + luckBonus)
    elseif i <= 2 then
      chance = chance * (1 - luckBonus * 0.3)
    end
    adjusted[i] = math.max(0.1, chance)
    total = total + adjusted[i]
  end
  local roll = math.random() * total
  local cumul = 0
  for i, chance in ipairs(adjusted) do
    cumul = cumul + chance
    if roll <= cumul then return i end
  end
  return 1
end

return CapybaraData
