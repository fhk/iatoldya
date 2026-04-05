import { ScatterplotLayer, PolygonLayer } from '@deck.gl/layers';
import polygonClipping from 'polygon-clipping';
import type { InfraNode } from '../types';
import type { LaunchSite } from '../stores/strike';

// Generate a circle polygon as a ring of [lng, lat] pairs
function circleRing(lat: number, lng: number, radiusKm: number, n = 64): [number, number][] {
  const R = 6371;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const angle = (i / n) * 2 * Math.PI;
    const dLat = (radiusKm / R) * Math.cos(angle) * (180 / Math.PI);
    const dLng = (radiusKm / R) * Math.sin(angle) / Math.cos(lat * Math.PI / 180) * (180 / Math.PI);
    pts.push([lng + dLng, lat + dLat]);
  }
  return pts;
}

// Compute union polygon from multiple (lat,lng) origins at the same radius.
// Returns an array of polygons (each polygon = array of rings = array of [lng,lat][]).
// Falls back to single circle if only one origin or union fails.
export function unionStrikePolygons(
  origins: Array<{ lat: number; lng: number }>,
  radiusKm: number
): [number, number][][][] {
  if (origins.length === 0) return [];
  if (origins.length === 1) {
    return [[circleRing(origins[0].lat, origins[0].lng, radiusKm)]];
  }

  // polygon-clipping expects MultiPolygon: [Polygon, ...] where Polygon = Ring[]
  // Ring = [number, number][]
  const polys = origins.map(o =>
    [circleRing(o.lat, o.lng, radiusKm)] as [number, number][][]
  );

  try {
    // union returns MultiPolygon coords: [number,number][][][]
    const result = polygonClipping.union(polys[0], ...polys.slice(1));
    // result is MultiPolygon: array of Polygons, each Polygon is array of Rings
    return result as [number, number][][][];
  } catch {
    // Fallback: return individual circles
    return polys;
  }
}

export function buildStrikeLayers(
  originLat: number,
  originLng: number,
  radiusKm: number,
  selectedSites: LaunchSite[],
  removedNodes: InfraNode[],
  pulseScale: number,
  onOriginDrag: (lat: number, lng: number) => void,
  onOriginDragEnd: (lat: number, lng: number) => void
) {
  // Build union of all selected site circles; fall back to active origin if none selected
  const origins: Array<{ lat: number; lng: number }> =
    selectedSites.length > 0
      ? selectedSites.map(s => ({ lat: s.lat, lng: s.lng }))
      : [{ lat: originLat, lng: originLng }];

  const unionPolygons = unionStrikePolygons(origins, radiusKm);

  // deck.gl PolygonLayer expects each datum to have a `polygon` key
  // For a MultiPolygon union result, each entry is one contiguous polygon (with possible holes)
  const polygonData = unionPolygons.map((poly, i) => ({ id: i, polygon: poly }));

  const threatCircle = new PolygonLayer({
    id: 'threat-radius',
    data: polygonData,
    getPolygon: (d: { polygon: [number,number][][] }) => d.polygon,
    getFillColor: [196, 48, 43, 38],
    getLineColor: [212, 130, 10, 200],
    getLineWidth: 2000,
    lineWidthMinPixels: 1,
    stroked: true,
    filled: true
  });

  const removedLayer = new ScatterplotLayer({
    id: 'removed-nodes',
    data: removedNodes,
    getPosition: (n: InfraNode) => [n.lng, n.lat],
    getRadius: 12000 * pulseScale,
    getFillColor: [220, 38, 38, 200],
    getLineColor: [255, 100, 100, 255],
    getLineWidth: 1000,
    stroked: true,
    updateTriggers: { getRadius: pulseScale }
  });

  // Draggable strike origin crosshair (active single origin)
  const originMarker = new ScatterplotLayer({
    id: 'strike-origin',
    data: [{ lat: originLat, lng: originLng }],
    getPosition: (d: { lat: number; lng: number }) => [d.lng, d.lat],
    getRadius: 8000,
    getFillColor: [212, 130, 10, 255],
    getLineColor: [255, 200, 50, 255],
    getLineWidth: 2500,
    stroked: true,
    pickable: true,
    onDragStart: (_info: unknown, _event: unknown) => {
      return true;
    },
    onDrag: (info: { coordinate?: number[] }, _event: unknown) => {
      if (info.coordinate) {
        onOriginDrag(info.coordinate[1], info.coordinate[0]);
      }
      return true;
    },
    onDragEnd: (info: { coordinate?: number[] }, _event: unknown) => {
      if (info.coordinate) {
        onOriginDragEnd(info.coordinate[1], info.coordinate[0]);
      }
      return true;
    }
  });

  return [threatCircle, removedLayer, originMarker];
}
