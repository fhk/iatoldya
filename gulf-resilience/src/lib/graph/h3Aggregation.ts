import { latLngToCell, cellToLatLng } from 'h3-js';
import UndirectedGraph from 'graphology';
import type { InfraNode, InfraEdge } from '../types';

// Resolution 7 ≈ 5 km edge length — district scale, good granularity for infra clustering
export const H3_RESOLUTION = 7;

export interface H3Cell {
  id: string;
  lat: number;
  lng: number;
  nodeIds: string[];
  types: string[];
  countries: string[];
  nodeCount: number;
}

export interface H3Aggregation {
  graph: UndirectedGraph;
  cells: Map<string, H3Cell>;
  /** raw nodeId → h3 cellId */
  nodeToCell: Map<string, string>;
}

export function buildH3Aggregation(
  nodes: InfraNode[],
  edges: InfraEdge[],
  resolution = H3_RESOLUTION
): H3Aggregation {
  const cells = new Map<string, H3Cell>();
  const nodeToCell = new Map<string, string>();

  // Assign each node to its H3 cell
  for (const node of nodes) {
    const cellId = latLngToCell(node.lat, node.lng, resolution);
    nodeToCell.set(node.id, cellId);

    if (!cells.has(cellId)) {
      const [lat, lng] = cellToLatLng(cellId);
      cells.set(cellId, {
        id: cellId,
        lat,
        lng,
        nodeIds: [],
        types: [],
        countries: [],
        nodeCount: 0
      });
    }
    const cell = cells.get(cellId)!;
    cell.nodeIds.push(node.id);
    cell.nodeCount++;
    if (node.type && !cell.types.includes(node.type)) cell.types.push(node.type);
    if (node.country && !cell.countries.includes(node.country)) cell.countries.push(node.country);
  }

  // Build graphology graph of H3 cells
  const graph = new UndirectedGraph();
  for (const [cellId, cell] of cells) {
    graph.addNode(cellId, { ...cell });
  }

  // An edge between two cells exists if any original edge crosses cell boundaries
  for (const edge of edges) {
    const srcCell = nodeToCell.get(edge.source);
    const tgtCell = nodeToCell.get(edge.target);
    if (!srcCell || !tgtCell) continue;
    if (srcCell === tgtCell) continue; // intra-cell, skip
    if (!graph.hasNode(srcCell) || !graph.hasNode(tgtCell)) continue;
    if (!graph.hasEdge(srcCell, tgtCell)) {
      graph.addEdge(srcCell, tgtCell, { type: edge.type });
    }
  }

  return { graph, cells, nodeToCell };
}

/** Map a set of raw node IDs to the H3 cells that contain them */
export function rawNodesToCells(
  removedNodeIds: Set<string>,
  nodeToCell: Map<string, string>
): Set<string> {
  const cellIds = new Set<string>();
  for (const nodeId of removedNodeIds) {
    const cellId = nodeToCell.get(nodeId);
    if (cellId) cellIds.add(cellId);
  }
  return cellIds;
}

/** Map a set of H3 cell IDs back to the raw node IDs they contain */
export function cellsToRawNodes(
  cellIds: Set<string>,
  nodeToCell: Map<string, string>
): Set<string> {
  const nodeIds = new Set<string>();
  for (const [nodeId, cellId] of nodeToCell) {
    if (cellIds.has(cellId)) nodeIds.add(nodeId);
  }
  return nodeIds;
}
