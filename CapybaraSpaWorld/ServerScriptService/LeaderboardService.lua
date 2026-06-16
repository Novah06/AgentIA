-- LeaderboardService : 3 leaderboards distincts via OrderedDataStore
-- Type : ModuleScript dans ServerScriptService

local LeaderboardService = {}

local Players          = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")

local GameConfig = require(game.ReplicatedStorage.Modules.GameConfig)

-- { [lbId] = OrderedDataStore }
local stores = {}
-- Cache top10 par lbId pour limiter les requêtes
local topCache = {}

function LeaderboardService.init()
  for _, lb in ipairs(GameConfig.Leaderboards) do
    local ok, ds = pcall(function()
      return DataStoreService:GetOrderedDataStore(lb.dsKey)
    end)
    if ok then
      stores[lb.id] = ds
    else
      warn("[LeaderboardService] impossible de créer le store "..lb.id)
    end
  end
end

-- Définit le score d'un joueur sur un leaderboard
function LeaderboardService.setScore(player, lbId, score)
  local ds = stores[lbId]
  if not ds then return end
  task.spawn(function()
    pcall(function()
      ds:SetAsync(tostring(player.UserId), math.floor(math.max(0, score)))
    end)
  end)
end

-- Incrémente le score d'un joueur (lit puis écrit)
function LeaderboardService.increment(player, lbId, amount)
  local ds = stores[lbId]
  if not ds then return end
  task.spawn(function()
    pcall(function()
      ds:UpdateAsync(tostring(player.UserId), function(old)
        return math.floor((old or 0) + amount)
      end)
    end)
  end)
end

-- Retourne le top 10 d'un leaderboard : {{rank, name, score, userId}, ...}
function LeaderboardService.getTop10(lbId)
  local ds = stores[lbId]
  if not ds then return topCache[lbId] or {} end

  local ok, pages = pcall(function()
    return ds:GetSortedAsync(false, 10)
  end)
  if not ok then
    return topCache[lbId] or {}
  end

  local result = {}
  local okPage, items = pcall(function()
    return pages:GetCurrentPage()
  end)
  if not okPage then return topCache[lbId] or {} end

  for rank, item in ipairs(items) do
    local userId = tonumber(item.key)
    local name = "Joueur"
    if userId then
      local okName, nm = pcall(function()
        return Players:GetNameFromUserIdAsync(userId)
      end)
      if okName and nm then name = nm end
    end
    table.insert(result, { rank = rank, name = name, score = item.value, userId = userId })
  end

  topCache[lbId] = result
  return result
end

-- Met à jour tous les leaderboards avec les valeurs courantes des joueurs connectés
function LeaderboardService.updateAll()
  local DataService = require(script.Parent.DataService)
  for _, player in ipairs(Players:GetPlayers()) do
    local data = DataService.getData(player)
    if data then
      LeaderboardService.setScore(player, "totalGold", data.totalGoldEarned or 0)
      LeaderboardService.setScore(player, "beautyScore", data.beautyScore or 0)
      -- capyCollect est incrémenté à la capture/naissance ; on resync sur le total possédé+élevés
      local collected = (data.totalCapyBred or 0) + #(data.capybaras or {})
      LeaderboardService.setScore(player, "capyCollect", math.max(collected, #(data.capybaras or {})))
    end
  end
  -- rafraîchit le cache top10
  for _, lb in ipairs(GameConfig.Leaderboards) do
    LeaderboardService.getTop10(lb.id)
  end
end

return LeaderboardService
