import type { ResilienceMetrics } from '../types';
import { analyzeGraph } from '../graph/analyzeGraph';
import { computeBetweenness } from '../graph/betweennessCentrality';
import { rawNodesToCells, cellsToRawNodes } from '../graph/h3Aggregation';
import type UndirectedGraph from 'graphology';

class AnalysisStore {
  baseline = $state<ResilienceMetrics | null>(null);
  postStrike = $state<ResilienceMetrics | null>(null);
  isComputing = $state(false);
  /**
   * Betweenness scores indexed by BOTH raw node IDs and H3 cell IDs.
   * Raw nodes get their parent cell's score. Cells get their own score.
   * This lets map layers work whether they render raw nodes or cell aggregates.
   */
  betweennessScores = $state<Record<string, number>>({});
  /** Raw node IDs that are articulation points (mapped from H3 cell APs) */
  articulationNodeIds = $state<Set<string>>(new Set());
  /** H3 cell IDs that are articulation points (for cell-level display) */
  articulationCellIds = $state<Set<string>>(new Set());
  private version = 0;

  async runAnalysis(
    h3Graph: UndirectedGraph,
    removedNodeIds: Set<string>,
    nodeToCell: Map<string, string>,
    extraRemovedCellIds: Set<string> = new Set()
  ) {
    const v = ++this.version;
    this.isComputing = true;

    await new Promise(r => setTimeout(r, 0));
    if (v !== this.version) return;

    const baseCells = rawNodesToCells(removedNodeIds, nodeToCell);
    const removedCellIds = extraRemovedCellIds.size > 0
      ? new Set([...baseCells, ...extraRemovedCellIds])
      : baseCells;

    const bl = analyzeGraph(h3Graph, new Set());
    if (v !== this.version) return;

    const ps = analyzeGraph(h3Graph, removedCellIds);
    if (v !== this.version) return;

    this.baseline = bl;
    this.postStrike = ps;

    // Cell betweenness on full graph
    const cellBetweenness = computeBetweenness(h3Graph);
    if (v !== this.version) return;

    // Index by cell ID AND by raw node ID (same score propagated to all members)
    const scores: Record<string, number> = {};
    for (const [cellId, score] of Object.entries(cellBetweenness)) {
      scores[cellId] = score;
    }
    for (const [nodeId, cellId] of nodeToCell) {
      scores[nodeId] = cellBetweenness[cellId] ?? 0;
    }
    this.betweennessScores = scores;

    // Articulation points: cell IDs from post-strike analysis
    const apCells = new Set(ps.articulationPoints);
    this.articulationCellIds = apCells;
    this.articulationNodeIds = cellsToRawNodes(apCells, nodeToCell);

    this.isComputing = false;
  }
}

export const analysisStore = new AnalysisStore();
