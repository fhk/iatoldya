import type UndirectedGraph from 'graphology';

function edmondsKarp(
  graph: Map<string, Map<string, number>>,
  source: string,
  sink: string
): number {
  function bfsPath(cap: Map<string, Map<string, number>>, s: string, t: string): string[] | null {
    const parent = new Map<string, string>();
    const visited = new Set([s]);
    const queue = [s];
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const [v, c] of (cap.get(u) ?? [])) {
        if (!visited.has(v) && c > 0) {
          visited.add(v); parent.set(v, u); queue.push(v);
          if (v === t) {
            const path: string[] = [];
            let cur = t;
            while (cur !== s) { path.unshift(cur); cur = parent.get(cur)!; }
            path.unshift(s);
            return path;
          }
        }
      }
    }
    return null;
  }

  const residual = new Map<string, Map<string, number>>();
  for (const [u, edges] of graph) {
    if (!residual.has(u)) residual.set(u, new Map());
    for (const [v, c] of edges) {
      residual.get(u)!.set(v, c);
      if (!residual.has(v)) residual.set(v, new Map());
      if (!residual.get(v)!.has(u)) residual.get(v)!.set(u, 0);
    }
  }

  let flow = 0;
  let path: string[] | null;
  while ((path = bfsPath(residual, source, sink)) !== null) {
    let bottleneck = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      bottleneck = Math.min(bottleneck, residual.get(path[i])!.get(path[i+1])!);
    }
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i], v = path[i+1];
      residual.get(u)!.set(v, residual.get(u)!.get(v)! - bottleneck);
      residual.get(v)!.set(u, (residual.get(v)!.get(u) ?? 0) + bottleneck);
    }
    flow += bottleneck;
  }
  return flow;
}

export function computeVertexConnectivity(graph: UndirectedGraph): number {
  const nodes = graph.nodes();
  const n = nodes.length;
  if (n < 2) return 0;

  const visited = new Set<string>();
  const queue = [nodes[0]];
  visited.add(nodes[0]);
  while (queue.length > 0) {
    const v = queue.shift()!;
    for (const w of graph.neighbors(v)) {
      if (!visited.has(w)) { visited.add(w); queue.push(w); }
    }
  }
  if (visited.size !== n) return 0;

  const INF = n + 1;

  const buildFlowGraph = (source: string) => {
    const flowGraph = new Map<string, Map<string, number>>();
    const addEdge = (u: string, v: string, c: number) => {
      if (!flowGraph.has(u)) flowGraph.set(u, new Map());
      flowGraph.get(u)!.set(v, (flowGraph.get(u)!.get(v) ?? 0) + c);
    };
    for (const v of nodes) {
      addEdge(`${v}_in`, `${v}_out`, v === source ? INF : 1);
    }
    graph.forEachEdge((_, __, u, v) => {
      addEdge(`${u}_out`, `${v}_in`, INF);
      addEdge(`${v}_out`, `${u}_in`, INF);
    });
    return flowGraph;
  };

  const minDegNode = nodes.reduce((best, v) =>
    graph.degree(v) < graph.degree(best) ? v : best, nodes[0]);

  let minCut = INF;
  for (const t of nodes) {
    if (t === minDegNode) continue;
    const fg = buildFlowGraph(minDegNode);
    const flow = edmondsKarp(fg, `${minDegNode}_in`, `${t}_out`);
    minCut = Math.min(minCut, flow);
    if (minCut <= 1) return minCut;
  }
  return minCut === INF ? n - 1 : minCut;
}
