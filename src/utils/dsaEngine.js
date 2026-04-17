// src/utils/dsaEngine.js
// ─────────────────────────────────────────────────────
//  DSA Engine — mirrors C++ logic in JavaScript
//  Used to power smart features in the web app
// ─────────────────────────────────────────────────────

// ── BFS: Shortest path between two users ──
// Returns array of uids from src → dst
export function bfsShortestPath(adjList, src, dst) {
  if (src === dst) return [src]
  const visited = new Set([src])
  const parent = new Map([[src, null]])
  const queue = [src]

  while (queue.length) {
    const cur = queue.shift()
    if (cur === dst) break
    for (const nb of (adjList.get(cur) || [])) {
      if (!visited.has(nb)) {
        visited.add(nb)
        parent.set(nb, cur)
        queue.push(nb)
      }
    }
  }

  if (!parent.has(dst)) return [] // no path

  const path = []
  for (let cur = dst; cur !== null; cur = parent.get(cur))
    path.push(cur)
  return path.reverse()
}

// ── BFS: Degrees of separation ──
export function degreesOfSeparation(adjList, src, dst) {
  const path = bfsShortestPath(adjList, src, dst)
  return path.length === 0 ? -1 : path.length - 1
}

// ── BFS: Friend suggestions with mutual count ──
// Returns [{uid, mutualCount}] sorted by mutual desc
export function friendSuggestions(adjList, userId, existingFriends, topK = 8) {
  const myFriends = new Set(existingFriends)
  const score = new Map()

  for (const f of myFriends) {
    for (const fof of (adjList.get(f) || [])) {
      if (fof === userId || myFriends.has(fof)) continue
      score.set(fof, (score.get(fof) || 0) + 1)
    }
  }

  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([uid, mutualCount]) => ({ uid, mutualCount }))
}

// ── Degree centrality: Influence score ──
// Returns a score 0–100 based on connection count
export function influenceScore(friendCount, maxFriends = 50) {
  return Math.min(100, Math.round((friendCount / maxFriends) * 100))
}

// ── DFS: Community detection ──
// Returns array of communities (each = array of uids)
export function detectCommunities(adjList) {
  const visited = new Set()
  const communities = []

  for (const uid of adjList.keys()) {
    if (!visited.has(uid)) {
      const community = []
      const stack = [uid]
      visited.add(uid)

      while (stack.length) {
        const cur = stack.pop()
        community.push(cur)
        for (const nb of (adjList.get(cur) || [])) {
          if (!visited.has(nb)) {
            visited.add(nb)
            stack.push(nb)
          }
        }
      }
      communities.push(community)
    }
  }

  return communities.sort((a, b) => b.length - a.length)
}

// ── Build adjacency list from friends map ──
// friendsMap: Map<uid, string[]>
export function buildAdjList(friendsMap) {
  const adj = new Map()
  for (const [uid, friends] of friendsMap.entries()) {
    adj.set(uid, new Set(friends))
  }
  return adj
}
