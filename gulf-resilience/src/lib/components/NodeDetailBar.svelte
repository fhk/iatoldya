<script lang="ts">
  import { editModeStore } from '../stores/editMode.svelte';
  import { simulationStore } from '../stores/simulation.svelte';
  import type { InfraNode } from '../types';

  interface Props {
    hoveredNode: InfraNode | null;
    betweennessScore: number;
    isArticulationPoint: boolean;
  }
  let { hoveredNode, betweennessScore, isArticulationPoint }: Props = $props();

  const TYPE_COLOR: Record<string, string> = {
    dc: 'border-blue-600 text-blue-500',
    ixp: 'border-[#D4820A] text-[#D4820A]',
    cable_landing: 'border-[#00D4FF] text-[#00D4FF]',
    pop: 'border-purple-600 text-purple-400'
  };
</script>

<div class="h-12 bg-[#0A0F14] border-t border-[#1E2A38] flex items-center px-4 text-[10px] font-mono shrink-0 gap-3">
  {#if hoveredNode}
    <span class="label text-[9px] border px-1 py-0.5 {TYPE_COLOR[hoveredNode.type] ?? ''}">
      {hoveredNode.type.toUpperCase().replace('_', ' ')}
    </span>
    <span class="text-[#C8D6E5]">{hoveredNode.name}</span>
    {#if hoveredNode.city}
      <span class="text-[#4A5568]">·</span>
      <span class="text-[#4A5568]">{hoveredNode.city}, {hoveredNode.country}</span>
    {/if}
    <span class="text-[#4A5568]">·</span>
    <span>BETWEENNESS: <span class="text-[#00D4FF]">{betweennessScore.toFixed(4)}</span></span>
    {#if isArticulationPoint}
      <span class="label text-[9px] border border-[#C4302B] text-[#C4302B] px-1 py-0.5 pulse-threat">⚠ ART. POINT</span>
    {/if}
  {:else if simulationStore.isActive}
    <span class="text-[#C4302B]">◉ TARGETING ACTIVE</span>
    <span class="text-[#1E2A38]">·</span>
    <span class="text-[#4A5568]">CLICK A NODE TO FIRE FROM ALL SELECTED ORIGINS · ESC TO CANCEL</span>
  {:else if editModeStore.sidebarTab === 'strike'}
    <span class="text-[#3A4558]">CLICK MAP TO MOVE STRIKE ORIGIN · DRAG AMBER MARKER · KEYS 1–5 SELECT TIER</span>
  {:else if editModeStore.layerSubTab === 'nodes'}
    <span class="text-[#3A4558]">CLICK EMPTY MAP TO ADD NODE · CLICK NODE TO EDIT · DEL KEY TO REMOVE SELECTED</span>
  {:else if editModeStore.layerSubTab === 'edges'}
    {#if editModeStore.edgeDrawSource}
      <span class="text-[#D4820A]">● SOURCE: {editModeStore.edgeDrawSource}</span>
      <span class="text-[#3A4558]">— NOW CLICK TARGET NODE · ESC TO CANCEL</span>
    {:else}
      <span class="text-[#3A4558]">CLICK NODE A THEN NODE B TO CONNECT · CLICK EMPTY SPACE TO CANCEL</span>
    {/if}
  {:else}
    <span class="text-[#3A4558]">HOVER A NODE FOR DETAILS</span>
  {/if}
</div>
