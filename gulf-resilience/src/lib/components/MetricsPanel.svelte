<script lang="ts">
  import { analysisStore } from '../stores/analysis.svelte';
  import { infraStore } from '../stores/infra.svelte';

  import type { InfraNode } from '../types';

  interface Props {
    onFlyTo: (nodeId: string) => void;
    removedNodes: InfraNode[];
    struckNodes: InfraNode[];
  }
  let { onFlyTo, removedNodes, struckNodes = [] }: Props = $props();

  function fmt(n: number, d = 3) { return n.toFixed(d); }
  function pct(n: number) { return (n * 100).toFixed(1) + '%'; }

  function delta(base: number | undefined, post: number | undefined): string {
    if (base === undefined || post === undefined) return '—';
    const d = post - base;
    const sign = d > 0 ? '+' : '';
    return `${sign}${fmt(d, 3)}`;
  }

  function deltaColor(base: number | undefined, post: number | undefined, higherIsBetter = true) {
    if (base === undefined || post === undefined) return 'text-[#4A5568]';
    const d = post - base;
    if (Math.abs(d) < 0.001) return 'text-[#4A5568]';
    const better = higherIsBetter ? d > 0 : d < 0;
    return better ? 'text-[#1A7A4A]' : 'text-[#C4302B]';
  }

  const bl = $derived(analysisStore.baseline);
  const ps = $derived(analysisStore.postStrike);

  // Targets in strike range, ranked by baseline betweenness (most critical first)
  const rankedTargets = $derived(
    [...removedNodes]
      .map(n => ({ node: n, score: analysisStore.betweennessScores[n.id] ?? 0 }))
      .sort((a, b) => b.score - a.score)
  );

  // Expand component cell arrays to raw node IDs
  const expandedComponents = $derived(
    ps ? ps.components.map(comp =>
      comp.flatMap(cellId => infraStore.h3.cells.get(cellId)?.nodeIds ?? [])
    ) : []
  );

  function arcPath(fraction: number, r = 54): string {
    const start = -Math.PI * 0.75;
    const end = start + (fraction * Math.PI * 1.5);
    const x1 = 64 + r * Math.cos(start);
    const y1 = 72 + r * Math.sin(start);
    const x2 = 64 + r * Math.cos(end);
    const y2 = 72 + r * Math.sin(end);
    const large = fraction > 0.667 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  // Short display names for known providers
  const PROVIDER_SHORT: Record<string, string> = {
    'Amazon Web Services': 'AWS',
    'Microsoft Azure': 'Azure',
    'Google Cloud': 'GCP',
    'Oracle Cloud': 'Oracle',
    'IBM Cloud': 'IBM',
    'Huawei Cloud': 'Huawei',
    'Tencent Cloud': 'Tencent',
    'Alibaba Cloud': 'Alibaba',
    'OVH': 'OVH',
  };

  // Count struck nodes per provider, sorted descending
  const providerHits = $derived((() => {
    const counts = new Map<string, number>();
    for (const n of struckNodes) {
      const op = n.operator ?? 'Unknown';
      counts.set(op, (counts.get(op) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([op, count]) => ({ op, short: PROVIDER_SHORT[op] ?? op, count }))
      .sort((a, b) => b.count - a.count);
  })());

  let targetsOpen = $state(true);
  let targetsExpanded = $state(false);

  const rColor = $derived(() => {
    const r = ps?.rValue ?? 1;
    if (r > 0.7) return '#1A7A4A';
    if (r > 0.4) return '#D4820A';
    return '#C4302B';
  });
</script>

<div class="w-[320px] bg-[#0A0F14] border-l border-[#1E2A38] overflow-y-auto text-xs font-mono flex flex-col shrink-0">
  <div class="p-3 border-b border-[#1E2A38]">
    <div class="label text-[10px] text-[#D4820A]">NETWORK RESILIENCE ASSESSMENT</div>
    <div class="text-[#4A5568] text-[9px] mt-0.5">BASELINE → POST-STRIKE DELTA</div>
  </div>

  {#if !bl || !ps}
    <div class="flex-1 flex items-center justify-center text-[#4A5568]">
      <span class="blink">COMPUTING BASELINE...</span>
    </div>
  {:else}
    <!-- R-VALUE ARC -->
    <div class="p-4 border-b border-[#1E2A38] text-center">
      <div class="label text-[10px] text-[#4A5568] mb-2">NETWORK CONNECTIVITY (R-VALUE)</div>
      <svg width="128" height="80" class="mx-auto overflow-visible">
        <path d={arcPath(1)} fill="none" stroke="#1E2A38" stroke-width="8" stroke-linecap="round"/>
        <path d={arcPath(bl.rValue)} fill="none" stroke="#1A7A4A" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
        <path d={arcPath(ps.rValue)} fill="none" stroke={rColor()} stroke-width="8" stroke-linecap="round"/>
        <text x="64" y="68" text-anchor="middle" fill={rColor()} font-size="18" font-family="IBM Plex Mono" font-weight="700">
          {pct(ps.rValue)}
        </text>
        <text x="64" y="80" text-anchor="middle" fill="#4A5568" font-size="8" font-family="IBM Plex Mono">
          WAS {pct(bl.rValue)}
        </text>
      </svg>
      <div class="text-[#C4302B] text-xs mt-1">
        {ps.removedCount} / {ps.totalNodes} NODES REMOVED
      </div>
    </div>

    <!-- SECONDARY METRICS -->
    <div class="p-3 border-b border-[#1E2A38]">
      <div class="label text-[10px] text-[#4A5568] mb-2">SECONDARY METRICS</div>
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-[#070A0E] border border-[#1E2A38] p-2">
          <div class="label text-[9px] text-[#4A5568]">ART. POINTS</div>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-sm text-[#C8D6E5]">{ps.articulationPoints.length}</span>
            <span class="text-[#4A5568]">←</span>
            <span class="text-[#4A5568] text-[10px]">{bl.articulationPoints.length}</span>
            <span class="{deltaColor(bl.articulationPoints.length, ps.articulationPoints.length, false)} text-[9px]">
              ({delta(bl.articulationPoints.length, ps.articulationPoints.length)})
            </span>
          </div>
        </div>
        <div class="bg-[#070A0E] border border-[#1E2A38] p-2">
          <div class="label text-[9px] text-[#4A5568]">FIEDLER λ₂</div>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-sm text-[#C8D6E5]">{fmt(ps.fiedlerValue, 3)}</span>
            <span class="text-[#4A5568]">←</span>
            <span class="text-[#4A5568] text-[10px]">{fmt(bl.fiedlerValue, 3)}</span>
            <span class="{deltaColor(bl.fiedlerValue, ps.fiedlerValue)} text-[9px]">
              ({delta(bl.fiedlerValue, ps.fiedlerValue)})
            </span>
          </div>
        </div>
        <div class="bg-[#070A0E] border border-[#1E2A38] p-2">
          <div class="label text-[9px] text-[#4A5568]">NET. EFFICIENCY</div>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-sm text-[#C8D6E5]">{fmt(ps.networkEfficiency)}</span>
            <span class="text-[#4A5568]">←</span>
            <span class="text-[#4A5568] text-[10px]">{fmt(bl.networkEfficiency)}</span>
            <span class="{deltaColor(bl.networkEfficiency, ps.networkEfficiency)} text-[9px]">
              ({delta(bl.networkEfficiency, ps.networkEfficiency)})
            </span>
          </div>
        </div>
        <div class="bg-[#070A0E] border border-[#1E2A38] p-2">
          <div class="label text-[9px] text-[#4A5568]">VERTEX κ(G)</div>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-sm text-[#C8D6E5]">{ps.vertexConnectivity}</span>
            <span class="text-[#4A5568]">←</span>
            <span class="text-[#4A5568] text-[10px]">{bl.vertexConnectivity}</span>
            <span class="{deltaColor(bl.vertexConnectivity, ps.vertexConnectivity)} text-[9px]">
              ({delta(bl.vertexConnectivity, ps.vertexConnectivity)})
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- PROVIDER IMPACT — struck nodes by cloud provider -->
    {#if providerHits.length > 0}
      {@const maxCount = providerHits[0].count}
      <div class="p-3 border-b border-[#1E2A38]">
        <div class="label text-[10px] text-[#4A5568] mb-2">PROVIDER IMPACT</div>
        {#each providerHits as { op, short, count }}
          <div class="mb-1.5">
            <div class="flex justify-between items-baseline mb-0.5">
              <span class="text-[#C8D6E5] text-[9px] truncate max-w-[200px]" title={op}>{short}</span>
              <span class="text-[#C4302B] text-[9px] ml-2 shrink-0">{count}</span>
            </div>
            <div class="h-[3px] bg-[#0D1117] rounded-sm overflow-hidden">
              <div
                class="h-full rounded-sm transition-all duration-300"
                style="width: {(count / maxCount) * 100}%; background: linear-gradient(90deg, #C4302B, #FF6B35)"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- TARGETS IN RANGE — ranked by betweenness -->
    <div class="border-b border-[#1E2A38]">
      <button
        onclick={() => targetsOpen = !targetsOpen}
        class="w-full flex items-center justify-between px-3 py-2 hover:bg-[#0D1117] cursor-pointer"
      >
        <div class="flex items-center gap-2">
          <span class="label text-[10px] text-[#C4302B]">TARGETS IN RANGE</span>
          {#if rankedTargets.length > 0}
            <span class="label text-[9px] border border-[#C4302B]/40 text-[#C4302B]/70 px-1">{rankedTargets.length}</span>
          {/if}
        </div>
        <span class="text-[#4A5568] text-[10px]">{targetsOpen ? '▲' : '▼'}</span>
      </button>

      {#if targetsOpen}
        <div class="px-3 pb-3">
          {#if rankedTargets.length === 0}
            <div class="text-[#3A4558] text-[10px] text-center py-3">NO TARGETS IN RANGE</div>
          {:else}
            <table class="w-full">
              <thead>
                <tr class="text-[#3A4558] text-[9px]">
                  <th class="label text-left pb-1">#</th>
                  <th class="label text-left pb-1">TARGET</th>
                  <th class="label text-right pb-1">BETWEENNESS</th>
                </tr>
              </thead>
              <tbody>
                {#each (targetsExpanded ? rankedTargets : rankedTargets.slice(0, 5)) as { node, score }, i}
                  <tr class="border-t border-[#0D1117] hover:bg-[#200808] cursor-pointer" onclick={() => onFlyTo(node.id)}>
                    <td class="py-0.5 text-[#C4302B]/60 text-[10px]">{i + 1}</td>
                    <td class="py-0.5">
                      <div class="text-[#C8D6E5] text-[10px]">{node.name}</div>
                      <div class="text-[#3A4558] text-[9px]">{node.city ? `${node.city}, ` : ''}{node.country ?? ''}</div>
                    </td>
                    <td class="py-0.5 text-right text-[#C4302B] text-[10px]">{score.toFixed(4)}</td>
                  </tr>
                {/each}
                {#if rankedTargets.length > 5}
                  <tr class="border-t border-[#0D1117]">
                    <td colspan="3">
                      <button
                        onclick={() => targetsExpanded = !targetsExpanded}
                        class="w-full py-1 text-center text-[#4A5568] hover:text-[#C8D6E5] text-[9px] cursor-pointer hover:bg-[#0D1117]"
                      >
                        {targetsExpanded ? '▲ show less' : `+${rankedTargets.length - 5} more ▼`}
                      </button>
                    </td>
                  </tr>
                {/if}
              </tbody>
            </table>
          {/if}
        </div>
      {/if}
    </div>

    <!-- COMPONENTS -->
    <div class="p-3">
      <div class="label text-[10px] text-[#4A5568] mb-2">NETWORK COMPONENTS ({expandedComponents.length})</div>
      {#each expandedComponents.slice(0, 5) as nodeIds, i}
        {@const firstName = nodeIds[0]}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="bg-[#070A0E] border border-[#1E2A38] p-2 mb-1 cursor-pointer hover:border-[#3A4558]" onclick={() => firstName && onFlyTo(firstName)}>
          <div class="flex justify-between">
            <span class="label text-[9px] {i === 0 ? 'text-[#1A7A4A]' : 'text-[#C4302B]'}">{i === 0 ? 'LCC' : `ISLAND ${i}`}</span>
            <span class="text-[#4A5568] text-[9px]">{nodeIds.length} nodes</span>
          </div>
          <div class="text-[#3A4558] text-[9px] mt-0.5 truncate">
            {nodeIds.slice(0, 3).map(id => infraStore.nodes.find(n => n.id === id)?.name ?? id).join(' · ')}
            {nodeIds.length > 3 ? ` +${nodeIds.length - 3}` : ''}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
