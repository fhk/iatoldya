import type UndirectedGraph from 'graphology';
// @ts-ignore
import numeric from 'numeric';

export function computeFiedler(graph: UndirectedGraph): { lambda2: number; vector: number[] } {
  const nodes = graph.nodes();
  const n = nodes.length;
  if (n < 2) return { lambda2: 0, vector: [] };

  const idx = new Map(nodes.map((id, i) => [id, i]));
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  graph.forEachEdge((_, __, u, v) => {
    const i = idx.get(u)!;
    const j = idx.get(v)!;
    L[i][i]++; L[j][j]++; L[i][j]--; L[j][i]--;
  });

  try {
    const eig = numeric.eig(L);
    const eigenvalues: number[] = Array.from(eig.lambda.x as number[]);
    const eigenvectors: number[][] = eig.E.x as number[][];
    const pairs = eigenvalues.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const lambda2 = Math.max(0, pairs[1]?.v ?? 0);
    const vec2idx = pairs[1]?.i ?? 1;
    const vector = eigenvectors.map(row => row[vec2idx]);
    return { lambda2, vector };
  } catch {
    return { lambda2: 0, vector: new Array(n).fill(0) };
  }
}
