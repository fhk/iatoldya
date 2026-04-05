import type { InfraNode, InfraEdge, ThreatScenario, ValidationError } from '../types';
import { validateInfraRow, validateLinksRow, validateThreatsRow } from './schemas';

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  while (i < text.length) {
    const row: string[] = [];
    while (i < text.length && text[i] !== '\n' && text[i] !== '\r') {
      if (text[i] === '"') {
        i++; let cell = '';
        while (i < text.length) {
          if (text[i] === '"' && text[i+1] === '"') { cell += '"'; i += 2; }
          else if (text[i] === '"') { i++; break; }
          else { cell += text[i++]; }
        }
        row.push(cell);
        if (text[i] === ',') i++;
      } else {
        let cell = '';
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') cell += text[i++];
        row.push(cell.trim());
        if (text[i] === ',') i++;
      }
    }
    if (text[i] === '\r') i++;
    if (text[i] === '\n') i++;
    if (row.length > 0 && !(row.length === 1 && row[0] === '')) rows.push(row);
  }
  return rows;
}

function rowsToObjects(rows: string[][]): Array<Record<string, string>> {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h.trim(), (row[i] ?? '').trim()])));
}

export function parseInfraCSV(text: string): { rows: InfraNode[], errors: ValidationError[] } {
  const raw = rowsToObjects(parseCSV(text));
  const errors: ValidationError[] = [];
  const rows: InfraNode[] = [];
  const seenIds = new Set<string>();
  raw.forEach((r, i) => {
    const errs = validateInfraRow(r, i + 2, seenIds);
    if (errs.length > 0) { errors.push(...errs); return; }
    seenIds.add(r.id);
    rows.push({
      id: r.id, name: r.name, type: r.type as InfraNode['type'],
      lat: +r.lat, lng: +r.lng, city: r.city || undefined,
      country: r.country || undefined, operator: r.operator || undefined,
      capacity_mw: r.capacity_mw ? +r.capacity_mw : undefined
    });
  });
  return { rows, errors };
}

export function parseLinksCSV(text: string, existingNodeIds: Set<string>): { rows: InfraEdge[], errors: ValidationError[] } {
  const raw = rowsToObjects(parseCSV(text));
  const errors: ValidationError[] = [];
  const rows: InfraEdge[] = [];
  raw.forEach((r, i) => {
    const errs = validateLinksRow(r, i + 2, existingNodeIds);
    if (errs.length > 0) { errors.push(...errs); return; }
    rows.push({
      id: r.id, source: r.source, target: r.target, type: r.type as InfraEdge['type'],
      name: r.name || undefined,
      capacity_tbps: r.capacity_tbps ? +r.capacity_tbps : undefined,
      length_km: r.length_km ? +r.length_km : undefined
    });
  });
  return { rows, errors };
}

export function parseThreatsCSV(text: string): { rows: ThreatScenario[], errors: ValidationError[] } {
  const raw = rowsToObjects(parseCSV(text));
  const errors: ValidationError[] = [];
  const rows: ThreatScenario[] = [];
  raw.forEach((r, i) => {
    const errs = validateThreatsRow(r, i + 2);
    if (errs.length > 0) { errors.push(...errs); return; }
    rows.push({
      id: r.id, name: r.name, originLat: +r.origin_lat,
      originLng: +r.origin_lng, radiusKm: +r.radius_km,
      notes: r.notes || undefined
    });
  });
  return { rows, errors };
}

export function generateTemplateCSV(type: 'infra' | 'links' | 'threats'): string {
  if (type === 'infra') return `id,name,type,lat,lng,city,country,operator,capacity_mw\nuae-ix,UAE-IX,ixp,25.204,55.270,Dubai,UAE,DE-CIX,\neq-dx1,Equinix DX1,dc,25.197,55.274,Dubai,UAE,Equinix,18\n`;
  if (type === 'links') return `id,source,target,type,name,capacity_tbps,length_km\nfalcon-1,om-fujairah,uae-ix,submarine,FALCON,6.4,1423\nksa-bb,sa-riyadh,sa-jedix,terrestrial,KSA E-W Backbone,4.8,1100\n`;
  return `id,name,origin_lat,origin_lng,radius_km,notes\ns1,T2 Gulf Strike,32.5,48.0,1450,Baseline Tier 2 from western Iran\ns2,Yemen Drone,15.5,44.0,2500,Shahed-149 targeting Salalah\n`;
}
