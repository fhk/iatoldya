import UndirectedGraph from 'graphology';
import type { InfraNode, InfraEdge } from '../types';

export function buildGraph(nodes: InfraNode[], edges: InfraEdge[]): UndirectedGraph {
  const g = new UndirectedGraph();
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const n of nodes) {
    g.addNode(n.id, { ...n });
  }
  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
      console.warn(`Edge ${e.id}: missing node ${e.source} or ${e.target}`);
      continue;
    }
    if (!g.hasEdge(e.source, e.target)) {
      g.addEdge(e.source, e.target, { ...e });
    }
  }
  return g;
}
