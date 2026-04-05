<script lang="ts">
  import { infraStore } from '../stores/infra.svelte';
  import { analysisStore } from '../stores/analysis.svelte';
  import { simulationStore } from '../stores/simulation.svelte';

  interface Props {
    onImport: () => void;
    onExport: () => void;
  }
  let { onImport, onExport }: Props = $props();
</script>

<div class="h-12 bg-[#0A0F14] border-b border-[#1E2A38] flex items-center px-4 gap-4 z-50 shrink-0">
  <span class="label text-[11px] border border-[#D4820A] text-[#D4820A] px-2 py-0.5 glow-amber">
    UNCLASSIFIED // FOUO
  </span>

  <span class="label text-sm text-white tracking-widest">GULFNET RESILIENCE</span>

  <div class="flex-1 flex items-center justify-center gap-6 text-xs font-mono text-[#4A5568]">
    <span>{infraStore.nodes.length} <span class="text-[#6B7280]">NODES</span></span>
    <span class="text-[#1E2A38]">·</span>
    <span>{infraStore.edges.length} <span class="text-[#6B7280]">EDGES</span></span>
    {#if simulationStore.struckCellIds.size > 0}
      <span class="text-[#1E2A38]">·</span>
      <span class="text-[#C4302B]">{simulationStore.struckCellIds.size} <span class="opacity-70">STRUCK</span></span>
    {/if}
    <span class="text-[#1E2A38]">·</span>
    {#if analysisStore.isComputing}
      <span class="text-[#D4820A] blink">● COMPUTING</span>
    {:else}
      <span class="text-[#1A7A4A]">● READY</span>
    {/if}
  </div>

  <div class="flex items-center gap-2">
    <button onclick={onImport} class="label text-[11px] text-[#00D4FF] border border-[#00D4FF] px-2 py-0.5 hover:bg-[#00D4FF]/10 cursor-pointer">↑ IMPORT</button>
    <button onclick={onExport} class="label text-[11px] text-[#4A5568] border border-[#1E2A38] px-2 py-0.5 hover:border-[#4A5568] cursor-pointer">↓ EXPORT</button>
  </div>
</div>
