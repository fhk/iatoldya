import type { ValidationError } from '../types';

export function validateInfraRow(row: Record<string, string>, idx: number, knownIds: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];
  const required = ['id','name','type','lat','lng'];
  for (const f of required) {
    if (!row[f]?.trim()) errors.push({ row: idx, field: f, message: `required field missing` });
  }
  if (row.type && !['dc','ixp','cable_landing','pop'].includes(row.type))
    errors.push({ row: idx, field: 'type', message: `invalid type "${row.type}" — use dc|ixp|cable_landing|pop` });
  if (row.lat && (isNaN(+row.lat) || +row.lat < -90 || +row.lat > 90))
    errors.push({ row: idx, field: 'lat', message: `invalid latitude` });
  if (row.lng && (isNaN(+row.lng) || +row.lng < -180 || +row.lng > 180))
    errors.push({ row: idx, field: 'lng', message: `invalid longitude` });
  if (row.id && knownIds.has(row.id)) errors.push({ row: idx, field: 'id', message: `duplicate id "${row.id}"` });
  return errors;
}

export function validateLinksRow(row: Record<string, string>, idx: number, nodeIds: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const f of ['id','source','target','type']) {
    if (!row[f]?.trim()) errors.push({ row: idx, field: f, message: `required field missing` });
  }
  if (row.type && !['submarine','terrestrial'].includes(row.type))
    errors.push({ row: idx, field: 'type', message: `invalid type — use submarine|terrestrial` });
  if (row.source && !nodeIds.has(row.source)) errors.push({ row: idx, field: 'source', message: `unknown node id "${row.source}"` });
  if (row.target && !nodeIds.has(row.target)) errors.push({ row: idx, field: 'target', message: `unknown node id "${row.target}"` });
  return errors;
}

export function validateThreatsRow(row: Record<string, string>, idx: number): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const f of ['id','name','origin_lat','origin_lng','radius_km']) {
    if (!row[f]?.trim()) errors.push({ row: idx, field: f, message: `required field missing` });
  }
  const r = +row.radius_km;
  if (!isNaN(r) && (r < 10 || r > 5000)) errors.push({ row: idx, field: 'radius_km', message: `radius must be 10–5000 km` });
  return errors;
}
