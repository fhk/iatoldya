import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import type { InfraNode, InfraEdge } from '../types';

const NODE_COLORS: Record<string, [number,number,number,number]> = {
  dc: [37, 99, 235, 255],
  ixp: [217, 119, 6, 255],
  cable_landing: [6, 182, 212, 255],
  pop: [124, 58, 237, 255]
};

export function buildInfraLayers(
  nodes: InfraNode[],
  edges: InfraEdge[],
  betweennessScores: Record<string, number>,
  articulationPoints: Set<string>,
  onHover: (node: InfraNode | null, x: number, y: number) => void,
  onClick: (node: InfraNode, x: number, y: number) => void,
  selectedNodeId: string | null = null,
  edgeDrawSource: string | null = null
) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const scoreValues = Object.values(betweennessScores);
  const maxBetweenness = scoreValues.length > 0 ? Math.max(...scoreValues, 0.001) : 0.001;

  const submarineLines = new LineLayer({
    id: 'submarine-cables',
    data: edges.filter(e => e.type === 'submarine'),
    getSourcePosition: (e: InfraEdge) => {
      const n = nodeMap.get(e.source);
      return n ? [n.lng, n.lat] : [0, 0];
    },
    getTargetPosition: (e: InfraEdge) => {
      const n = nodeMap.get(e.target);
      return n ? [n.lng, n.lat] : [0, 0];
    },
    getColor: [0, 180, 220, 80],
    getWidth: 2,
    widthMinPixels: 1
  });

  const terrestrialLines = new LineLayer({
    id: 'terrestrial-fiber',
    data: edges.filter(e => e.type === 'terrestrial'),
    getSourcePosition: (e: InfraEdge) => {
      const n = nodeMap.get(e.source);
      return n ? [n.lng, n.lat] : [0, 0];
    },
    getTargetPosition: (e: InfraEdge) => {
      const n = nodeMap.get(e.target);
      return n ? [n.lng, n.lat] : [0, 0];
    },
    getColor: [180, 100, 10, 80],
    getWidth: 1,
    widthMinPixels: 1
  });

  const nodeLayer = new ScatterplotLayer({
    id: 'infra-nodes',
    data: nodes,
    getPosition: (n: InfraNode) => [n.lng, n.lat],
    getRadius: (n: InfraNode) => {
      const b = betweennessScores[n.id] ?? 0;
      return 8000 + (b / maxBetweenness) * 24000;
    },
    getFillColor: (n: InfraNode) => NODE_COLORS[n.type] ?? [200, 200, 200, 255],
    getLineColor: (n: InfraNode) => {
      if (n.id === edgeDrawSource) return [212, 130, 10, 255];    // amber — edge draw source
      if (n.id === selectedNodeId) return [255, 255, 80, 255];    // yellow — selected
      if (articulationPoints.has(n.id)) return [255, 255, 255, 200]; // white — articulation
      return [0, 0, 0, 0];
    },
    getLineWidth: (n: InfraNode) => {
      if (n.id === edgeDrawSource) return 3000;
      if (n.id === selectedNodeId) return 2500;
      if (articulationPoints.has(n.id)) return 800;
      return 0;
    },
    stroked: true,
    pickable: true,
    onHover: (info: { object?: InfraNode | null; x: number; y: number }) => {
      onHover(info.object ?? null, info.x, info.y);
    },
    onClick: (info: { object?: InfraNode | null; x: number; y: number }) => {
      if (info.object) {
        onClick(info.object, info.x, info.y);
        return true; // mark event as handled
      }
    },
    updateTriggers: {
      getRadius: betweennessScores,
      getLineColor: [Array.from(articulationPoints).join(','), selectedNodeId, edgeDrawSource],
      getLineWidth: [Array.from(articulationPoints).join(','), selectedNodeId, edgeDrawSource]
    }
  });

  return [submarineLines, terrestrialLines, nodeLayer];
}
