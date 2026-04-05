<script lang="ts">
  import type { InfraNode } from '../types';

  const TYPE_LABEL: Record<string, string> = {
    dc: 'DC', ixp: 'IXP', cable_landing: 'CLS', pop: 'PoP'
  };
  const TYPE_COLOR: Record<string, string> = {
    dc: 'text-blue-500',
    ixp: 'text-[#D4820A]',
    cable_landing: 'text-[#00D4FF]',
    pop: 'text-purple-400'
  };

  interface Props {
    nodes: InfraNode[];
    x: number;
    y: number;
    betweennessScores: Record<string, number>;
    articulationNodeIds: Set<string>;
    onFlyTo: (id: string) => void;
    onClose: () => void;
  }
  let { nodes, x, y, betweennessScores, articulationNodeIds, onFlyTo, onClose }: Props = $props();

  // Clamp position so panel stays on screen
  const panelX = $derived(Math.min(x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 290));
  const panelY = $derived(Math.max(y - 10, 8));

  // Sort by betweenness descending
  const sortedNodes = $derived(
    [...nodes].sort((a, b) => (betweennessScores[b.id] ?? 0) - (betweennessScores[a.id] ?? 0))
  );
</script>

{#if nodes.length > 0}
  <div
    class="fixed z-50 bg-[#0A0F14] border border-[#D4820A]/60 shadow-2xl shadow-black/80 font-mono text-[10px]"
    style="left: {panelX}px; top: {panelY}px; min-width: 248px; max-width: 290px;"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-2 py-1 bg-[#0D1117] border-b border-[#1E2A38]">
      <div>
        <span class="label text-[9px] text-[#D4820A]">H3 CELL</span>
        <span class="text-[#4A5568] mx-1">·</span>
        <span class="text-[#C8D6E5]">{nodes.length} NODE{nodes.length !== 1 ? 'S' : ''}</span>
      </div>
      <button onclick={onClose} class="text-[#4A5568] hover:text-[#C8D6E5] cursor-pointer text-[11px] leading-none ml-2">✕</button>
    </div>

    <!-- Node list -->
    <div class="overflow-y-auto" style="max-height: 260px;">
      {#each sortedNodes as node}
        <button
          onclick={() => { onFlyTo(node.id); onClose(); }}
          class="w-full text-left px-2 py-1.5 hover:bg-[#141A22] border-b border-[#070A0E] flex items-start gap-2 cursor-pointer"
        >
          <span class="label text-[8px] mt-0.5 shrink-0 w-6 {TYPE_COLOR[node.type] ?? 'text-[#4A5568]'}">
            {TYPE_LABEL[node.type] ?? '?'}
          </span>
          <div class="flex-1 min-w-0">
            <div class="text-[#C8D6E5] truncate leading-tight">{node.name}</div>
            {#if node.city || node.country}
              <div class="text-[#3A4558] text-[9px] leading-tight">
                {[node.city, node.country].filter(Boolean).join(', ')}
              </div>
            {/if}
          </div>
          <div class="shrink-0 text-right ml-1">
            <div class="text-[#00D4FF] text-[9px]">{(betweennessScores[node.id] ?? 0).toFixed(3)}</div>
            {#if articulationNodeIds.has(node.id)}
              <div class="label text-[8px] text-[#C4302B]">⚠ AP</div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </div>
{/if}
