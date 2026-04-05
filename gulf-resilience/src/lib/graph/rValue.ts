import type UndirectedGraph from 'graphology';

export function computeRValue(postStrikeGraph: UndirectedGraph, totalNodes: number): { rValue: number; components: string[][] } {
  const nodes = postStrikeGraph.nodes();
  if (nodes.length === 0) return { rValue: 0, components: [] };

  const visited = new Set<string>();
  const components: string[][] = [];

  for (const start of nodes) {
    if (visited.has(start)) continue;
    const component: string[] = [];
    const queue = [start];
    visited.add(start);
    while (queue.length > 0) {
      const v = queue.shift()!;
      component.push(v);
      for (const w of postStrikeGraph.neighbors(v)) {
        if (!visited.has(w)) { visited.add(w); queue.push(w); }
      }
    }
    components.push(component);
  }

  components.sort((a, b) => b.length - a.length);
  const lccSize = components[0]?.length ?? 0;
  return { rValue: lccSize / totalNodes, components };
}
