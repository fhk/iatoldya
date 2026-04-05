import type { InfraNode, InfraEdge, ThreatScenario } from '../types';
import JSZip from 'jszip';

const esc = (s: string | undefined) => s?.includes(',') ? `"${s}"` : (s ?? '');

export function exportInfraCSV(nodes: InfraNode[]): string {
  const h = 'id,name,type,lat,lng,city,country,operator,capacity_mw\n';
  return h + nodes.map(n => `${n.id},${esc(n.name)},${n.type},${n.lat},${n.lng},${esc(n.city)},${esc(n.country)},${esc(n.operator)},${n.capacity_mw ?? ''}`).join('\n');
}

export function exportLinksCSV(edges: InfraEdge[]): string {
  const h = 'id,source,target,type,name,capacity_tbps,length_km\n';
  return h + edges.map(e => `${e.id},${e.source},${e.target},${e.type},${esc(e.name)},${e.capacity_tbps ?? ''},${e.length_km ?? ''}`).join('\n');
}

export function exportThreatsCSV(scenarios: ThreatScenario[]): string {
  const h = 'id,name,origin_lat,origin_lng,radius_km,notes\n';
  return h + scenarios.map(s => `${s.id},${esc(s.name)},${s.originLat},${s.originLng},${s.radiusKm},${esc(s.notes)}`).join('\n');
}

export async function downloadAllAsZip(nodes: InfraNode[], edges: InfraEdge[], scenarios: ThreatScenario[]) {
  const zip = new JSZip();
  zip.file('infra.csv', exportInfraCSV(nodes));
  zip.file('links.csv', exportLinksCSV(edges));
  zip.file('threats.csv', exportThreatsCSV(scenarios));
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'gulfnet-data.zip'; a.click();
  URL.revokeObjectURL(url);
}
