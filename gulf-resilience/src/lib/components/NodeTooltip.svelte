<script lang="ts">
  import type { InfraNode } from '../types';

  interface Props {
    node: InfraNode | null;
    x: number;
    y: number;
    betweennessScore: number;
    isArticulationPoint: boolean;
  }
  let { node, x, y, betweennessScore, isArticulationPoint }: Props = $props();
</script>

{#if node}
  <div
    class="fixed pointer-events-none bg-[#0A0F14] border border-[#1E2A38] p-2 text-xs font-mono z-50"
    style="left: {x + 12}px; top: {y - 8}px; min-width: 160px;"
  >
    <div class="text-[#C8D6E5] font-bold">{node.name}</div>
    {#if node.city}<div class="text-[#4A5568] text-[10px]">{node.city}, {node.country}</div>{/if}
    <div class="label text-[9px] text-[#00D4FF] mt-1">BETWEENNESS: {betweennessScore.toFixed(4)}</div>
    {#if isArticulationPoint}
      <div class="label text-[9px] text-[#C4302B] mt-0.5">⚠ ARTICULATION POINT</div>
    {/if}
  </div>
{/if}
