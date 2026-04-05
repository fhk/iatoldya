<script lang="ts">
  import { LAUNCH_SITE_GROUPS, ALL_LAUNCH_SITES, type LaunchSite } from '../stores/strike';

  interface Props {
    /** Single active origin (for analysis + threat circle) */
    activeId?: string;
    /** Multi-selected sites (shown as markers on map) */
    selectedIds?: string[];
    onActivate: (site: LaunchSite) => void;
    onSelectionChange: (ids: string[]) => void;
  }
  let {
    activeId = '',
    selectedIds = [],
    onActivate,
    onSelectionChange
  }: Props = $props();

  let open = $state(false);
  let search = $state('');
  let dropdownEl: HTMLDivElement;

  const active = $derived(ALL_LAUNCH_SITES.find(s => s.id === activeId) ?? null);
  const selectedSet = $derived(new Set(selectedIds));

  const filtered = $derived(() => {
    const q = search.toLowerCase().trim();
    if (!q) return LAUNCH_SITE_GROUPS;
    return LAUNCH_SITE_GROUPS
      .map(g => ({
        ...g,
        sites: g.sites.filter(s =>
          s.label.toLowerCase().includes(q) ||
          (s.sublabel ?? '').toLowerCase().includes(q) ||
          g.group.toLowerCase().includes(q)
        )
      }))
      .filter(g => g.sites.length > 0);
  });

  const filteredSiteIds = $derived(filtered().flatMap(g => g.sites.map(s => s.id)));
  const allFilteredSelected = $derived(
    filteredSiteIds.length > 0 && filteredSiteIds.every(id => selectedSet.has(id))
  );

  function toggleSite(id: string) {
    const next = selectedSet.has(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    onSelectionChange(next);
  }

  function selectAllFiltered() {
    const next = Array.from(new Set([...selectedIds, ...filteredSiteIds]));
    onSelectionChange(next);
  }

  function clearAllFiltered() {
    const filteredSet = new Set(filteredSiteIds);
    onSelectionChange(selectedIds.filter(id => !filteredSet.has(id)));
  }

  function clearAll() {
    onSelectionChange([]);
  }

  function activate(site: LaunchSite) {
    // Activating also selects the site
    if (!selectedSet.has(site.id)) {
      onSelectionChange([...selectedIds, site.id]);
    }
    onActivate(site);
    open = false;
    search = '';
  }

  function handleOutsideClick(e: MouseEvent) {
    if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
      open = false;
      search = '';
    }
  }

  const GROUP_COLOR: Record<string, string> = {
    'IRAN — MISSILE BELT (WEST)':          'text-[#C4302B]',
    'IRAN — GULF COAST':                    'text-[#C4302B]',
    'IRAN — INTERIOR':                      'text-[#C4302B]',
    'IRAQ — PMF / PRO-IRAN MILITIA':        'text-[#D4820A]',
    'SYRIA — IRGC / HEZBOLLAH POSITIONS':   'text-[#D97706]',
    'LEBANON — HEZBOLLAH':                  'text-[#A16207]',
    'YEMEN — HOUTHI (ANSARALLAH)':          'text-[#7C3AED]',
    'GAZA / WEST BANK':                     'text-[#4A5568]',
  };
</script>

<svelte:window onclick={handleOutsideClick} />

<div bind:this={dropdownEl} class="relative">
  <!-- Trigger row: dropdown button + SELECT ALL -->
  <div class="flex gap-1">
    <button
      onclick={(e) => { e.stopPropagation(); open = !open; }}
      class="flex-1 flex items-center justify-between bg-[#070A0E] border border-[#1E2A38] hover:border-[#D4820A] px-2 py-1.5 text-left cursor-pointer min-w-0 {open ? 'border-[#D4820A]' : ''}"
    >
      <div class="flex-1 min-w-0">
        {#if active}
          <div class="text-[10px] font-mono text-[#C8D6E5] truncate">{active.label}</div>
          <div class="text-[9px] text-[#4A5568] truncate">{active.group.split(' — ')[0]}</div>
        {:else}
          <span class="label text-[10px] text-[#4A5568]">SELECT LAUNCH SITE…</span>
        {/if}
      </div>
      <div class="flex items-center gap-1.5 ml-1 shrink-0">
        {#if selectedIds.length > 0}
          <span class="label text-[9px] text-[#D4820A] border border-[#D4820A]/50 px-1">{selectedIds.length}</span>
        {/if}
        <span class="text-[#4A5568] text-[10px]">{open ? '▲' : '▼'}</span>
      </div>
    </button>

    <!-- SELECT ALL button (outside dropdown) -->
    <button
      onclick={(e) => { e.stopPropagation(); allFilteredSelected ? clearAll() : selectAllFiltered(); }}
      title={allFilteredSelected ? 'Clear all' : 'Select all sites'}
      class="label text-[9px] px-2 py-1 border cursor-pointer shrink-0 {allFilteredSelected ? 'border-[#C4302B] text-[#C4302B] hover:bg-[#C4302B]/10' : 'border-[#1E2A38] text-[#4A5568] hover:border-[#D4820A] hover:text-[#D4820A]'}"
    >{allFilteredSelected ? 'CLEAR' : 'ALL'}</button>
  </div>

  <!-- Dropdown panel -->
  {#if open}
    <div
      class="absolute left-0 right-0 top-full z-50 bg-[#0A0F14] border border-[#D4820A] shadow-lg shadow-black/60 flex flex-col"
      style="max-height: 300px;"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Search + select-all-filtered -->
      <div class="p-1.5 border-b border-[#1E2A38] flex gap-1 shrink-0">
        <input
          type="text"
          placeholder="FILTER CITIES…"
          bind:value={search}
          autofocus
          class="flex-1 bg-[#070A0E] border border-[#1E2A38] text-[#C8D6E5] px-2 py-0.5 text-[10px] font-mono focus:border-[#D4820A] outline-none"
        />
        <button
          onclick={() => allFilteredSelected ? clearAllFiltered() : selectAllFiltered()}
          class="label text-[8px] px-1.5 border cursor-pointer shrink-0 {allFilteredSelected ? 'border-[#C4302B] text-[#C4302B]' : 'border-[#1E2A38] text-[#4A5568] hover:border-[#D4820A] hover:text-[#D4820A]'}"
        >{allFilteredSelected ? '−ALL' : '+ALL'}</button>
      </div>

      <!-- Groups list -->
      <div class="overflow-y-auto flex-1">
        {#each filtered() as group}
          <div class="px-2 py-0.5 sticky top-0 bg-[#0A0F14] border-b border-[#1E2A38]">
            <span class="label text-[8px] {GROUP_COLOR[group.group] ?? 'text-[#4A5568]'}">{group.group}</span>
          </div>
          {#each group.sites as site}
            {@const isActive = site.id === activeId}
            {@const isChecked = selectedSet.has(site.id)}
            <div class="flex items-center gap-1.5 px-2 py-1.5 hover:bg-[#141A22] border-b border-[#070A0E] {isActive ? 'bg-[#1A1200]' : ''}">
              <!-- Checkbox for multi-select -->
              <input
                type="checkbox"
                checked={isChecked}
                onchange={() => toggleSite(site.id)}
                class="accent-[#D4820A] cursor-pointer shrink-0"
              />
              <!-- Site name / activator -->
              <button
                onclick={() => activate(site)}
                class="flex-1 text-left cursor-pointer min-w-0"
              >
                <div class="flex items-center gap-1">
                  <span class="text-[10px] font-mono {isActive ? 'text-[#D4820A]' : 'text-[#C8D6E5]'} truncate">{site.label}</span>
                  {#if isActive}<span class="text-[#D4820A] text-[9px] shrink-0">◉</span>{/if}
                </div>
                {#if site.sublabel}
                  <div class="text-[9px] text-[#3A4558] mt-0.5 truncate">{site.sublabel}</div>
                {/if}
              </button>
            </div>
          {/each}
        {/each}
        {#if filtered().length === 0}
          <div class="px-3 py-4 text-[#4A5568] text-[10px] text-center">NO MATCHES</div>
        {/if}
      </div>

      <!-- Footer: active site coords -->
      {#if active}
        <div class="px-2 py-1 border-t border-[#1E2A38] text-[#4A5568] text-[9px] font-mono shrink-0">
          ◉ {active.label} — {active.lat.toFixed(4)}°N  {active.lng.toFixed(4)}°E
        </div>
      {/if}
    </div>
  {/if}
</div>
