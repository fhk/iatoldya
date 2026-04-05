import type UndirectedGraph from 'graphology';

export function computeBetweenness(graph: UndirectedGraph): Record<string, number> {
  const nodes = graph.nodes();
  const n = nodes.length;
  const cb: Record<string, number> = {};
  for (const v of nodes) cb[v] = 0;

  for (const s of nodes) {
    const stack: string[] = [];
    const pred: Record<string, string[]> = {};
    const sigma: Record<string, number> = {};
    const dist: Record<string, number> = {};
    for (const v of nodes) { pred[v] = []; sigma[v] = 0; dist[v] = -1; }
    sigma[s] = 1; dist[s] = 0;
    const queue: string[] = [s];
    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of graph.neighbors(v)) {
        if (dist[w] < 0) { queue.push(w); dist[w] = dist[v] + 1; }
        if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; pred[w].push(v); }
      }
    }
    const delta: Record<string, number> = {};
    for (const v of nodes) delta[v] = 0;
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      }
      if (w !== s) cb[w] += delta[w];
    }
  }

  const norm = n > 2 ? (n - 1) * (n - 2) / 2 : 1;
  const result: Record<string, number> = {};
  for (const v of nodes) result[v] = cb[v] / norm;
  return result;
}

export function getTopBetweenness(scores: Record<string, number>, n = 10): Array<{ nodeId: string; score: number }> {
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([nodeId, score]) => ({ nodeId, score }));
}
