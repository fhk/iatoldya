import type UndirectedGraph from 'graphology';

export function findArticulationPoints(graph: UndirectedGraph): Set<string> {
  const nodes = graph.nodes();
  const n = nodes.length;
  if (n === 0) return new Set();

  const nodeIdx = new Map(nodes.map((id, i) => [id, i]));
  const disc = new Array(n).fill(-1);
  const low = new Array(n).fill(0);
  const parent = new Array(n).fill(-1);
  const ap = new Set<string>();
  let timer = 0;

  function dfs(u: number) {
    disc[u] = low[u] = timer++;
    let childCount = 0;
    const uId = nodes[u];
    for (const neighbor of graph.neighbors(uId)) {
      const v = nodeIdx.get(neighbor)!;
      if (disc[v] === -1) {
        childCount++;
        parent[v] = u;
        dfs(v);
        low[u] = Math.min(low[u], low[v]);
        if (parent[u] === -1 && childCount > 1) ap.add(uId);
        if (parent[u] !== -1 && low[v] >= disc[u]) ap.add(uId);
      } else if (v !== parent[u]) {
        low[u] = Math.min(low[u], disc[v]);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (disc[i] === -1) dfs(i);
  }
  return ap;
}
