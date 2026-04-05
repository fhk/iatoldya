export type NodeType = 'dc' | 'ixp' | 'cable_landing' | 'pop';
export type EdgeType = 'submarine' | 'terrestrial';
export type MergeMode = 'replace' | 'add' | 'update';

export interface InfraNode {
  id: string;
  name: string;
  type: NodeType;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  operator?: string;
  capacity_mw?: number;
}

export interface InfraEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  name?: string;
  capacity_tbps?: number;
  length_km?: number;
}

export interface StrikeState {
  originLat: number;
  originLng: number;
  radiusKm: number;
  weaponTier: 1 | 2 | 3 | 4 | 5 | 'custom';
}

export interface ResilienceMetrics {
  rValue: number;
  removedCount: number;
  totalNodes: number;
  articulationPoints: string[];
  fiedlerValue: number;
  fiedlerVector: number[];
  networkEfficiency: number;
  vertexConnectivity: number;
  topBetweenness: Array<{ nodeId: string; score: number }>;
  components: string[][];
}

export interface ThreatScenario {
  id: string;
  name: string;
  originLat: number;
  originLng: number;
  radiusKm: number;
  notes?: string;
  isComputed?: boolean;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export type EditOp = { type: string; payload: unknown; inverse: unknown };
