import { BUILT_IN_NODES, BUILT_IN_EDGES } from '../data/infrastructure';
import type { InfraNode, InfraEdge, ThreatScenario, MergeMode, EditOp } from '../types';
import { buildGraph } from '../graph/buildGraph';
import { buildH3Aggregation, type H3Aggregation } from '../graph/h3Aggregation';
import type UndirectedGraph from 'graphology';

function loadScenarios(): ThreatScenario[] {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('gulf-resilience-scenarios') : null;
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

class InfraStore {
  nodes = $state<InfraNode[]>([...BUILT_IN_NODES]);
  edges = $state<InfraEdge[]>([...BUILT_IN_EDGES]);
  scenarios = $state<ThreatScenario[]>([]);
  graph = $state<UndirectedGraph>(buildGraph(BUILT_IN_NODES, BUILT_IN_EDGES));
  h3 = $state<H3Aggregation>(buildH3Aggregation(BUILT_IN_NODES, BUILT_IN_EDGES));

  private snapshot: { nodes: InfraNode[]; edges: InfraEdge[] } = {
    nodes: [...BUILT_IN_NODES], edges: [...BUILT_IN_EDGES]
  };
  undoStack = $state<EditOp[]>([]);
  redoStack = $state<EditOp[]>([]);
  isDirty = $derived(
    JSON.stringify(this.nodes) !== JSON.stringify(this.snapshot.nodes) ||
    JSON.stringify(this.edges) !== JSON.stringify(this.snapshot.edges)
  );

  init() {
    this.scenarios = loadScenarios();
  }

  applyChanges() {
    this.snapshot = { nodes: [...this.nodes], edges: [...this.edges] };
    this.graph = buildGraph(this.nodes, this.edges);
    this.h3 = buildH3Aggregation(this.nodes, this.edges);
    this.undoStack = [];
    this.redoStack = [];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gulf-resilience-scenarios', JSON.stringify(this.scenarios));
      }
    } catch {}
  }

  rebuildGraph() {
    this.graph = buildGraph(this.nodes, this.edges);
    this.h3 = buildH3Aggregation(this.nodes, this.edges);
  }

  revert() {
    this.nodes = [...this.snapshot.nodes];
    this.edges = [...this.snapshot.edges];
    this.undoStack = [];
    this.redoStack = [];
  }

  private pushOp(op: EditOp) {
    this.undoStack = [...this.undoStack.slice(-19), op];
    this.redoStack = [];
  }

  addNode(node: InfraNode) {
    const op: EditOp = { type: 'addNode', payload: node, inverse: { type: 'deleteNode', id: node.id } };
    this.nodes = [...this.nodes, node];
    this.pushOp(op);
  }

  updateNode(id: string, updates: Partial<InfraNode>) {
    const old = this.nodes.find(n => n.id === id);
    if (!old) return;
    const op: EditOp = { type: 'updateNode', payload: { id, updates }, inverse: { type: 'updateNode', payload: { id, updates: old } } };
    this.nodes = this.nodes.map(n => n.id === id ? { ...n, ...updates } : n);
    this.pushOp(op);
  }

  deleteNode(id: string) {
    const node = this.nodes.find(n => n.id === id);
    const connectedEdges = this.edges.filter(e => e.source === id || e.target === id);
    if (!node) return;
    const op: EditOp = {
      type: 'deleteNode',
      payload: { id },
      inverse: { type: 'restoreNode', node, edges: connectedEdges }
    };
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
    this.pushOp(op);
  }

  addEdge(edge: InfraEdge) {
    const op: EditOp = { type: 'addEdge', payload: edge, inverse: { type: 'deleteEdge', id: edge.id } };
    this.edges = [...this.edges, edge];
    this.pushOp(op);
  }

  deleteEdge(id: string) {
    const edge = this.edges.find(e => e.id === id);
    if (!edge) return;
    const op: EditOp = { type: 'deleteEdge', payload: { id }, inverse: { type: 'addEdge', edge } };
    this.edges = this.edges.filter(e => e.id !== id);
    this.pushOp(op);
  }

  mergeNodes(incoming: InfraNode[], mode: MergeMode) {
    if (mode === 'replace') { this.nodes = incoming; return; }
    if (mode === 'add') {
      const existing = new Set(this.nodes.map(n => n.id));
      this.nodes = [...this.nodes, ...incoming.filter(n => !existing.has(n.id))];
    } else {
      const map = new Map(this.nodes.map(n => [n.id, n]));
      for (const n of incoming) map.set(n.id, n);
      this.nodes = Array.from(map.values());
    }
  }

  mergeEdges(incoming: InfraEdge[], mode: MergeMode) {
    const nodeIds = new Set(this.nodes.map(n => n.id));
    const valid = incoming.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    if (mode === 'replace') { this.edges = valid; return; }
    if (mode === 'add') {
      const existing = new Set(this.edges.map(e => e.id));
      this.edges = [...this.edges, ...valid.filter(e => !existing.has(e.id))];
    } else {
      const map = new Map(this.edges.map(e => [e.id, e]));
      for (const e of valid) map.set(e.id, e);
      this.edges = Array.from(map.values());
    }
  }

  undo() {
    const op = this.undoStack[this.undoStack.length - 1];
    if (!op) return;
    this.undoStack = this.undoStack.slice(0, -1);
    this.applyOp(op.inverse as EditOp);
    this.redoStack = [...this.redoStack, op];
  }

  redo() {
    const op = this.redoStack[this.redoStack.length - 1];
    if (!op) return;
    this.redoStack = this.redoStack.slice(0, -1);
    this.applyOp(op);
    this.undoStack = [...this.undoStack, op];
  }

  private applyOp(op: EditOp) {
    if (op.type === 'addNode') this.nodes = [...this.nodes, op.payload as InfraNode];
    else if (op.type === 'deleteNode') this.nodes = this.nodes.filter(n => n.id !== (op.payload as { id: string }).id);
    else if (op.type === 'updateNode') {
      const { id, updates } = op.payload as { id: string; updates: Partial<InfraNode> };
      this.nodes = this.nodes.map(n => n.id === id ? { ...n, ...updates } : n);
    }
    else if (op.type === 'addEdge') this.edges = [...this.edges, op.payload as InfraEdge];
    else if (op.type === 'deleteEdge') this.edges = this.edges.filter(e => e.id !== (op.payload as { id: string }).id);
    else if (op.type === 'restoreNode') {
      const { node, edges } = op as unknown as { node: InfraNode; edges: InfraEdge[] };
      this.nodes = [...this.nodes, node];
      this.edges = [...this.edges, ...edges];
    }
  }

  saveScenario(scenario: ThreatScenario) {
    this.scenarios = [...this.scenarios.filter(s => s.id !== scenario.id), scenario];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gulf-resilience-scenarios', JSON.stringify(this.scenarios));
      }
    } catch {}
  }

  deleteScenario(id: string) {
    this.scenarios = this.scenarios.filter(s => s.id !== id);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gulf-resilience-scenarios', JSON.stringify(this.scenarios));
      }
    } catch {}
  }
}

export const infraStore = new InfraStore();
