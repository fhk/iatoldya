import type { InfraNode, InfraEdge } from '../types';
import { haversineKm, nodesWithinRadius } from '../stores/strike';
import { buildGraph } from './buildGraph';
import { computeRValue } from './rValue';

export interface WorstCaseResult {
  lat: number;
  lng: number;
  rValue: number;
  removedCount: number;
}

export async function findWorstCaseStrike(
  launchLat: number,
  launchLng: number,
  maxRangeKm: number,
  strikeRadiusKm: number,
  nodes: InfraNode[],
  edges: InfraEdge[],
  onProgress?: (pct: number) => void
): Promise<WorstCaseResult> {
  const totalNodes = nodes.length;

  const gridStep = Math.max(100, maxRangeKm / 30);
  const latRange = maxRangeKm / 111;
  const cosLat = Math.cos(launchLat * Math.PI / 180);
  const lngRange = maxRangeKm / (111 * cosLat);

  let bestR = 1;
  let bestLat = launchLat;
  let bestLng = launchLng;
  let processed = 0;

  const latSteps: number[] = [];
  for (let dLat = -latRange; dLat <= latRange; dLat += gridStep / 111) latSteps.push(dLat);
  const lngSteps: number[] = [];
  for (let dLng = -lngRange; dLng <= lngRange; dLng += gridStep / (111 * cosLat)) lngSteps.push(dLng);
  const total = latSteps.length * lngSteps.length;

  for (const dLat of latSteps) {
    for (const dLng of lngSteps) {
      const cLat = launchLat + dLat;
      const cLng = launchLng + dLng;
      if (haversineKm(launchLat, launchLng, cLat, cLng) > maxRangeKm) continue;

      const removed = new Set(nodesWithinRadius(nodes, cLat, cLng, strikeRadiusKm));
      const subNodes = nodes.filter(n => !removed.has(n.id));
      const subEdges = edges.filter(e => !removed.has(e.source) && !removed.has(e.target));
      const g = buildGraph(subNodes, subEdges);
      const { rValue } = computeRValue(g, totalNodes);

      if (rValue < bestR) { bestR = rValue; bestLat = cLat; bestLng = cLng; }

      processed++;
      if (onProgress && processed % 10 === 0) {
        onProgress(Math.min(0.9, processed / total));
        await new Promise(r => setTimeout(r, 0));
      }
    }
  }

  // Refine around best candidate
  const refineLat = bestLat;
  const refineLng = bestLng;
  const refineStepLat = 25 / 111;
  const refineStepLng = 25 / (111 * cosLat);
  const refineRange = 2 * gridStep / 111;

  for (let dLat = -refineRange; dLat <= refineRange; dLat += refineStepLat) {
    for (let dLng = -refineRange; dLng <= refineRange; dLng += refineStepLng) {
      const cLat = refineLat + dLat;
      const cLng = refineLng + dLng;
      const removed = new Set(nodesWithinRadius(nodes, cLat, cLng, strikeRadiusKm));
      const subNodes = nodes.filter(n => !removed.has(n.id));
      const subEdges = edges.filter(e => !removed.has(e.source) && !removed.has(e.target));
      const g = buildGraph(subNodes, subEdges);
      const { rValue } = computeRValue(g, totalNodes);
      if (rValue < bestR) { bestR = rValue; bestLat = cLat; bestLng = cLng; }
    }
  }

  const finalRemoved = nodesWithinRadius(nodes, bestLat, bestLng, strikeRadiusKm);
  onProgress?.(1);
  return { lat: bestLat, lng: bestLng, rValue: bestR, removedCount: finalRemoved.length };
}
