import UndirectedGraph from 'graphology';
import type { ResilienceMetrics } from '../types';
import { findArticulationPoints } from './articulationPoints';
import { computeBetweenness, getTopBetweenness } from './betweennessCentrality';
import { computeFiedler } from './fiedlerValue';
import { computeNetworkEfficiency } from './networkEfficiency';
import { computeRValue } from './rValue';
import { computeVertexConnectivity } from './vertexConnectivity';

export function analyzeGraph(
  fullGraph: UndirectedGraph,
  removedNodeIds: Set<string>
): ResilienceMetrics {
  const totalNodes = fullGraph.order;

  const sub = new UndirectedGraph();
  fullGraph.forEachNode((id, attrs) => {
    if (!removedNodeIds.has(id)) sub.addNode(id, attrs);
  });
  fullGraph.forEachEdge((_, attrs, u, v) => {
    if (!removedNodeIds.has(u) && !removedNodeIds.has(v)) {
      if (!sub.hasEdge(u, v)) sub.addEdge(u, v, attrs);
    }
  });

  const ap = findArticulationPoints(sub);
  const betweenness = computeBetweenness(sub);
  const topBetweenness = getTopBetweenness(betweenness);
  const { lambda2: fiedlerValue, vector: fiedlerVector } = computeFiedler(sub);
  const networkEfficiency = computeNetworkEfficiency(sub);
  const { rValue, components } = computeRValue(sub, totalNodes);
  const vertexConnectivity = computeVertexConnectivity(sub);

  return {
    rValue,
    removedCount: removedNodeIds.size,
    totalNodes,
    articulationPoints: Array.from(ap),
    fiedlerValue,
    fiedlerVector,
    networkEfficiency,
    vertexConnectivity,
    topBetweenness,
    components
  };
}
