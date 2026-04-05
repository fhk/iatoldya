<script lang="ts">
  import { WEAPON_PRESETS, LAUNCH_SITES } from '../stores/strike';

  interface Props {
    originLat: number;
    originLng: number;
    radiusKm: number;
    weaponTier: number | string;
    nodeTypeFilters: Record<string, boolean>;
    countryFilters: Record<string, boolean>;
    onOriginChange: (lat: number, lng: number) => void;
    onRadiusChange: (km: number, tier: number | string) => void;
    onFiltersChange: (types: Record<string, boolean>, countries: Record<string, boolean>) => void;
    onWorstCase: () => void;
    worstCaseResult: { lat: number; lng: number; rValue: number } | null;
    isComputingWorstCase: boolean;
  }

  let {
    originLat, originLng, radiusKm, weaponTier,
    nodeTypeFilters, countryFilters,
    onOriginChange, onRadiusChange, onFiltersChange, onWorstCase,
    worstCaseResult, isComputingWorstCase
  }: Props = $props();

  const NODE_TYPES = ['dc', 'ixp', 'cable_landing', 'pop'];
  const COUNTRIES = ['UAE', 'KSA', 'QAT', 'BHR', 'OMN', 'IRQ', 'KWT', 'JOR'];

  const TIER_LABELS: Record<number, string> = {
    1: 'T1 · 700–1,000 km',
    2: 'T2 · 1,300–1,500 km',
    3: 'T3 · 1,650–2,000 km',
    4: 'T4 · 2,000–2,500 km',
    5: 'T5 · 3,000 km'
  };
  const TIER_SUB: Record<number, string> = {
    1: 'Ya Ali / Shahed-131',
    2: 'Kheibar Shekan / Fattah',
    3: 'Sejjil-2 / Emad',
    4: 'Shahed-136 / Arash-2',
    5: 'Khorramshahr / Soumar'
  };

  // Use a separate local state that syncs with prop
  let customRadius = $state(1450);
</script>

<div class="w-[260px] bg-[#0A0F14] border-r border-[#1E2A38] overflow-y-auto flex flex-col text-xs font-mono shrink-0">
  <!-- STRIKE ORIGIN -->
  <div class="p-3 border-b border-[#1E2A38]">
    <div class="label text-[10px] text-[#D4820A] mb-2">STRIKE ORIGIN</div>
    <div class="flex gap-1 mb-2">
      <div class="flex-1">
        <div class="text-[#4A5568] text-[9px] mb-0.5">LAT</div>
        <input type="number" value={originLat.toFixed(3)} step="0.1"
          oninput={(e) => onOriginChange(+e.currentTarget.value, originLng)}
          class="w-full bg-[#070A0E] border border-[#1E2A38] text-[#00D4FF] px-1.5 py-0.5 text-xs font-mono focus:border-[#D4820A] outline-none"/>
      </div>
      <div class="flex-1">
        <div class="text-[#4A5568] text-[9px] mb-0.5">LNG</div>
        <input type="number" value={originLng.toFixed(3)} step="0.1"
          oninput={(e) => onOriginChange(originLat, +e.currentTarget.value)}
          class="w-full bg-[#070A0E] border border-[#1E2A38] text-[#00D4FF] px-1.5 py-0.5 text-xs font-mono focus:border-[#D4820A] outline-none"/>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-1">
      {#each Object.entries(LAUNCH_SITES) as [key, site]}
        <button onclick={() => onOriginChange(site.lat, site.lng)}
          class="label text-[9px] text-[#4A5568] border border-[#1E2A38] px-1 py-0.5 hover:border-[#D4820A] hover:text-[#D4820A] text-left cursor-pointer">
          {site.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- WEAPON SYSTEM -->
  <div class="p-3 border-b border-[#1E2A38]">
    <div class="label text-[10px] text-[#D4820A] mb-2">WEAPON SYSTEM</div>
    <div class="flex flex-col gap-1">
      {#each [1,2,3,4,5] as tier}
        <button
          onclick={() => onRadiusChange(WEAPON_PRESETS[tier as keyof typeof WEAPON_PRESETS], tier)}
          class="text-left px-2 py-1.5 border cursor-pointer {weaponTier === tier ? 'border-[#D4820A] bg-[#D4820A]/10 text-[#D4820A]' : 'border-[#1E2A38] text-[#4A5568] hover:border-[#3A4558]'}"
        >
          <div class="label text-[10px]">{TIER_LABELS[tier]}</div>
          <div class="text-[9px] text-[#3A4558] mt-0.5">{TIER_SUB[tier]}</div>
        </button>
      {/each}
    </div>
    <div class="mt-2">
      <div class="text-[#4A5568] text-[9px] mb-1">CUSTOM RADIUS (km)</div>
      <input type="range" min="100" max="3500" step="50" bind:value={customRadius}
        oninput={() => onRadiusChange(customRadius, 'custom')}
        class="w-full accent-[#D4820A]"/>
      <div class="text-[#00D4FF] text-xs mt-0.5 text-center">{customRadius} km</div>
    </div>
  </div>

  <!-- WORST-CASE -->
  <div class="p-3 border-b border-[#1E2A38]">
    <div class="label text-[10px] text-[#D4820A] mb-2">WORST-CASE ANALYSIS</div>
    <button onclick={onWorstCase} disabled={isComputingWorstCase}
      class="w-full label text-[10px] border border-[#C4302B] text-[#C4302B] py-2 hover:bg-[#C4302B]/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer {isComputingWorstCase ? 'blink' : ''}">
      {isComputingWorstCase ? '● COMPUTING...' : '⚡ COMPUTE OPTIMAL STRIKE'}
    </button>
    {#if worstCaseResult}
      <div class="mt-2 text-[#00D4FF] text-[9px] space-y-0.5">
        <div>LAT: {worstCaseResult.lat.toFixed(3)} · LNG: {worstCaseResult.lng.toFixed(3)}</div>
        <div>R-VALUE: <span class="text-[#C4302B]">{(worstCaseResult.rValue * 100).toFixed(1)}%</span></div>
      </div>
    {/if}
  </div>

  <!-- INFRASTRUCTURE FILTERS -->
  <div class="p-3 border-b border-[#1E2A38]">
    <div class="label text-[10px] text-[#D4820A] mb-2">INFRASTRUCTURE</div>
    <div class="space-y-1">
      {#each NODE_TYPES as t}
        <label class="flex items-center gap-2 cursor-pointer text-[#4A5568] hover:text-[#C8D6E5]">
          <input type="checkbox" checked={nodeTypeFilters[t] ?? true}
            onchange={(e) => onFiltersChange({...nodeTypeFilters, [t]: e.currentTarget.checked}, countryFilters)}
            class="accent-[#D4820A]"/>
          <span class="label text-[9px]">{t.toUpperCase().replace('_', ' ')}</span>
        </label>
      {/each}
    </div>
    <div class="mt-2 label text-[10px] text-[#4A5568] mb-1">COUNTRY</div>
    <div class="flex flex-wrap gap-1">
      {#each COUNTRIES as c}
        <button onclick={() => onFiltersChange(nodeTypeFilters, {...countryFilters, [c]: !(countryFilters[c] ?? true)})}
          class="label text-[9px] px-1 py-0.5 border cursor-pointer {(countryFilters[c] ?? true) ? 'border-[#D4820A] text-[#D4820A]' : 'border-[#1E2A38] text-[#3A4558]'}">
          {c}
        </button>
      {/each}
    </div>
  </div>
</div>
