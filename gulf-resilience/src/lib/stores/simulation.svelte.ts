export interface StrikeArc {
  id: string;
  sourceLat: number;
  sourceLng: number;
  targetLat: number;
  targetLng: number;
  targetCellId: string;
  startTime: number;
  /** Duration of the arc animation in ms */
  duration: number;
  coef: number;     // 0 → 1, driven by tick()
  complete: boolean;
}

export interface Explosion {
  id: string;
  lat: number;
  lng: number;
  startTime: number;
  /** Duration of the explosion animation in ms */
  duration: number;
}

class SimulationStore {
  /** Whether "simulate strike" mode is active (click = fire missile) */
  isActive = $state(false);

  /** In-flight and recently completed arcs */
  arcs = $state<StrikeArc[]>([]);

  /** Active explosion animations */
  explosions = $state<Explosion[]>([]);

  /** Cell IDs permanently struck by a completed simulation */
  struckCellIds = $state<Set<string>>(new Set());

  toggle() {
    this.isActive = !this.isActive;
  }

  launch(sourceLat: number, sourceLng: number, targetLat: number, targetLng: number, targetCellId: string) {
    const arc: StrikeArc = {
      id: `arc-${Date.now()}-${Math.random()}`,
      sourceLat, sourceLng,
      targetLat, targetLng,
      targetCellId,
      startTime: Date.now(),
      duration: 1800,
      coef: 0,
      complete: false
    };
    this.arcs = [...this.arcs, arc];
  }

  /** Call every animation frame (or on the pulse interval) to advance arcs */
  tick() {
    const now = Date.now();

    const next = this.arcs.map(arc => {
      if (arc.complete) return arc;
      const coef = Math.min((now - arc.startTime) / arc.duration, 1);
      const complete = coef >= 1;
      if (complete && !arc.complete) {
        // Mark cell as permanently struck
        this.struckCellIds = new Set([...this.struckCellIds, arc.targetCellId]);
        // Spawn explosion at target
        this.explosions = [...this.explosions, {
          id: `exp-${arc.id}`,
          lat: arc.targetLat,
          lng: arc.targetLng,
          startTime: now,
          duration: 2200
        }];
      }
      return { ...arc, coef, complete };
    });

    // Keep arcs visible for 1.5s after completion, then discard
    this.arcs = next.filter(arc => !arc.complete || (now - arc.startTime) < arc.duration + 1500);

    // Expire finished explosions
    this.explosions = this.explosions.filter(e => (now - e.startTime) < e.duration);
  }

  clearStrikes() {
    this.struckCellIds = new Set();
    this.arcs = [];
    this.explosions = [];
  }
}

export const simulationStore = new SimulationStore();
