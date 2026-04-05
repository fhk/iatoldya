import type UndirectedGraph from 'graphology';

export function computeNetworkEfficiency(graph: UndirectedGraph): number {
  const nodes = graph.nodes();
  const n = nodes.length;
  if (n < 2) return 0;

  let total = 0;
  for (const s of nodes) {
    const dist: Record<string, number> = {};
    const queue: string[] = [s];
    dist[s] = 0;
    while (queue.length > 0) {
      const v = queue.shift()!;
      for (const w of graph.neighbors(v)) {
        if (!(w in dist)) { dist[w] = dist[v] + 1; queue.push(w); }
      }
    }
    for (const t of nodes) {
      if (t !== s && t in dist && dist[t] > 0) total += 1 / dist[t];
    }
  }
  return total / (n * (n - 1));
}
