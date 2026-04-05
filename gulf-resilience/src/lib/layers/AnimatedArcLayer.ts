/**
 * Animated strike arc — no custom shader needed.
 *
 * Returns two deck.gl layers per arc:
 *   1. ArcLayer  — the trajectory trail (greatCircle: true)
 *   2. ScatterplotLayer — the warhead dot following the exact arc path in 3D
 *
 * Plus explosion layers when a strike lands:
 *   3. ScatterplotLayer — central flash (filled, expands + fades)
 *   4. ScatterplotLayer — inner shockwave ring (stroked, expands)
 *   5. ScatterplotLayer — outer shockwave ring (stroked, delayed, larger)
 *
 * The warhead position uses deck.gl's internal arc formula:
 *   - Great circle lat/lng via spherical interpolation (matching project_globe_ convention)
 *   - z via paraboloid(angularDist * EARTH_RADIUS, 0, 0, t) = sqrt(t*(1-t)) * dh
 */
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { Explosion } from '../stores/simulation.svelte';

interface Arc {
  id: string;
  sourceLat: number;
  sourceLng: number;
  targetLat: number;
  targetLng: number;
  coef: number;   // 0 → 1
  complete: boolean;
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const EARTH_RADIUS = 6370972; // metres, matches deck.gl

/** Haversine angular distance in radians */
function angularDist(srcLng: number, srcLat: number, tgtLng: number, tgtLat: number): number {
  const dlng = (tgtLng - srcLng) * DEG2RAD;
  const dlat = (tgtLat - srcLat) * DEG2RAD;
  const slat = Math.sin(dlat / 2);
  const slng = Math.sin(dlng / 2);
  const a = slat * slat + Math.cos(srcLat * DEG2RAD) * Math.cos(tgtLat * DEG2RAD) * slng * slng;
  return 2 * Math.asin(Math.sqrt(a));
}

/**
 * Returns [lng, lat, z] for parameter t along the arc, matching deck.gl ArcLayer
 * with greatCircle:true and getHeight:1 exactly.
 *
 * deck.gl project_globe_ convention: [sin(lng)*cos(lat), -cos(lng)*cos(lat), sin(lat)]
 * The .yxz swizzle used in the vertex shader gives:
 *   [-cos(lng)*cos(lat), sin(lng)*cos(lat), sin(lat)]
 */
function arcPosition(
  srcLng: number, srcLat: number,
  tgtLng: number, tgtLat: number,
  t: number
): [number, number, number] {
  const omega = angularDist(srcLng, srcLat, tgtLng, tgtLat);

  let wLng: number, wLat: number;

  if (Math.abs(omega - Math.PI) < 0.001) {
    // Antipodal: linear fallback
    wLng = (1 - t) * srcLng + t * tgtLng;
    wLat = (1 - t) * srcLat + t * tgtLat;
  } else {
    const srcCosLat = Math.cos(srcLat * DEG2RAD);
    const tgtCosLat = Math.cos(tgtLat * DEG2RAD);
    const srcX = Math.sin(srcLng * DEG2RAD) * srcCosLat;
    const srcY = -Math.cos(srcLng * DEG2RAD) * srcCosLat;
    const srcZ = Math.sin(srcLat * DEG2RAD);
    const tgtX = Math.sin(tgtLng * DEG2RAD) * tgtCosLat;
    const tgtY = -Math.cos(tgtLng * DEG2RAD) * tgtCosLat;
    const tgtZ = Math.sin(tgtLat * DEG2RAD);

    const a = Math.sin((1 - t) * omega);
    const b = Math.sin(t * omega);

    // p = src.yxz * a + tgt.yxz * b
    const px = srcY * a + tgtY * b;
    const py = srcX * a + tgtX * b;
    const pz = srcZ * a + tgtZ * b;

    wLng = Math.atan2(py, -px) * RAD2DEG;
    wLat = Math.atan2(pz, Math.sqrt(px * px + py * py)) * RAD2DEG;
  }

  // paraboloid(omega * EARTH_RADIUS, 0, 0, t) with deltaZ=0:
  // z = sqrt(t * (1-t)) * dh
  const dh = omega * EARTH_RADIUS;
  const wZ = Math.sqrt(t * (1 - t)) * dh;

  return [wLng, wLat, wZ];
}

// Easing: fast out (decelerate) — feels snappier for shockwave expansion
function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function buildSimulationLayers(arcs: Arc[], explosions: Explosion[]) {
  const now = Date.now();

  // ── Arc layers ──────────────────────────────────────────────────
  const arcLayers = arcs.flatMap(arc => {
    const srcPos: [number, number] = [arc.sourceLng, arc.sourceLat];
    const tgtPos: [number, number] = [arc.targetLng, arc.targetLat];

    const trailAlpha = Math.round(arc.coef * 220);
    const warheadAlpha = arc.complete ? 0 : 255;

    const [wLng, wLat, wZ] = arcPosition(
      arc.sourceLng, arc.sourceLat,
      arc.targetLng, arc.targetLat,
      arc.coef
    );

    const trail = new ArcLayer({
      id: `sim-trail-${arc.id}`,
      data: [{ source: srcPos, target: tgtPos }],
      getSourcePosition: (d: { source: [number, number] }) => d.source,
      getTargetPosition: (d: { target: [number, number] }) => d.target,
      getSourceColor: [255, 220, 60, trailAlpha],
      getTargetColor: [220, 38, 38, trailAlpha],
      getWidth: 2,
      widthMinPixels: 1.5,
      greatCircle: true,
      pickable: false
    });

    const warhead = new ScatterplotLayer({
      id: `sim-warhead-${arc.id}`,
      data: [{ position: [wLng, wLat, wZ] as [number, number, number] }],
      getPosition: (d: { position: [number, number, number] }) => d.position,
      getRadius: 25000,
      getFillColor: [255, 100, 40, warheadAlpha],
      getLineColor: [255, 220, 60, warheadAlpha],
      getLineWidth: 2000,
      stroked: true,
      pickable: false,
      updateTriggers: { getPosition: [wLng, wLat, wZ], getFillColor: warheadAlpha }
    });

    return [trail, warhead];
  });

  // ── Explosion layers ────────────────────────────────────────────
  if (explosions.length === 0) return arcLayers;

  type ExpData = Explosion & { t: number };
  const active: ExpData[] = explosions.map(e => ({
    ...e,
    t: Math.min((now - e.startTime) / e.duration, 1)
  }));

  // Layer A: central flash — filled circle, expands fast then fades
  const flashLayer = new ScatterplotLayer<ExpData>({
    id: 'explosion-flash',
    data: active,
    getPosition: e => [e.lng, e.lat],
    getRadius: e => easeOut(Math.min(e.t / 0.25, 1)) * 90000,
    getFillColor: e => {
      const fade = Math.max(0, 1 - e.t / 0.35);
      return [255, 230, 120, Math.round(fade * 240)];
    },
    filled: true,
    stroked: false,
    pickable: false,
    updateTriggers: { getRadius: now, getFillColor: now }
  });

  // Layer B: inner shockwave ring — expands, thickens briefly then fades
  const ring1Layer = new ScatterplotLayer<ExpData>({
    id: 'explosion-ring1',
    data: active,
    getPosition: e => [e.lng, e.lat],
    getRadius: e => easeOut(e.t) * 220000,
    getLineWidth: e => Math.max(1500, 18000 * Math.max(0, 1 - e.t * 2.5)),
    getFillColor: [0, 0, 0, 0],
    getLineColor: e => [255, 90, 20, Math.round(Math.max(0, 1 - e.t) * 210)],
    filled: false,
    stroked: true,
    pickable: false,
    updateTriggers: { getRadius: now, getLineWidth: now, getLineColor: now }
  });

  // Layer C: outer shockwave ring — delayed start, larger reach, red
  const ring2Layer = new ScatterplotLayer<ExpData>({
    id: 'explosion-ring2',
    data: active,
    getPosition: e => [e.lng, e.lat],
    getRadius: e => {
      const lt = Math.max(0, (e.t - 0.15) / 0.85);
      return easeOut(lt) * 420000;
    },
    getLineWidth: e => {
      const lt = Math.max(0, (e.t - 0.15) / 0.85);
      return Math.max(1000, 12000 * Math.max(0, 1 - lt * 2));
    },
    getFillColor: [0, 0, 0, 0],
    getLineColor: e => {
      const lt = Math.max(0, (e.t - 0.15) / 0.85);
      return [220, 38, 38, Math.round(Math.max(0, 1 - lt) * 160)];
    },
    filled: false,
    stroked: true,
    pickable: false,
    updateTriggers: { getRadius: now, getLineWidth: now, getLineColor: now }
  });

  // Layer D: persistent crater glow — dim circle that pulses slightly after impact
  const craterLayer = new ScatterplotLayer<ExpData>({
    id: 'explosion-crater',
    data: active,
    getPosition: e => [e.lng, e.lat],
    getRadius: _e => 45000,
    getFillColor: e => {
      // Appears after flash fades, lingers
      const phase = Math.max(0, (e.t - 0.2) / 0.8);
      const pulse = 0.6 + 0.4 * Math.sin(e.t * Math.PI * 6); // flicker
      return [180, 30, 10, Math.round(phase * (1 - phase * 0.6) * pulse * 180)];
    },
    filled: true,
    stroked: false,
    pickable: false,
    updateTriggers: { getFillColor: now }
  });

  return [...arcLayers, flashLayer, ring1Layer, ring2Layer, craterLayer];
}
