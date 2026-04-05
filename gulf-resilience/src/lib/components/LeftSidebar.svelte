<script lang="ts">
  import { WEAPON_PRESETS, ALL_LAUNCH_SITES } from '../stores/strike';
  import LaunchSiteSelect from './LaunchSiteSelect.svelte';
  import type { LaunchSite } from '../stores/strike';
  import { infraStore } from '../stores/infra.svelte';
  import { editModeStore } from '../stores/editMode.svelte';
  import { simulationStore } from '../stores/simulation.svelte';
  import type { InfraNode, InfraEdge } from '../types';

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
    onFlyTo?: (nodeId: string) => void;
    selectedSiteIds?: string[];
    onSelectedSitesChange?: (ids: string[]) => void;
  }

  let {
    originLat, originLng, radiusKm, weaponTier,
    nodeTypeFilters, countryFilters,
    onOriginChange, onRadiusChange, onFiltersChange, onWorstCase,
    worstCaseResult, isComputingWorstCase,
    onFlyTo,
    selectedSiteIds = [],
    onSelectedSitesChange
  }: Props = $props();

  // ── Strike panel ──────────────────────────────────────────────
  const NODE_TYPE_LABELS = ['dc', 'ixp', 'cable_landing', 'pop'];
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
  let customRadius = $state(radiusKm);
  // Keep slider in sync when weapon tier is changed via keyboard shortcut
  $effect(() => { customRadius = radiusKm; });
  let selectedSiteId = $state('');

  // ── Layers panel ──────────────────────────────────────────────
  let searchTerm = $state('');

  const filteredNodes = $derived(
    infraStore.nodes.filter(n =>
      !searchTerm ||
      n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.country ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const filteredEdges = $derived(
    infraStore.edges.filter(e =>
      !searchTerm ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const NODE_TYPE_OPTIONS = ['dc', 'ixp', 'cable_landing', 'pop'] as const;
  const EDGE_TYPE_OPTIONS = ['terrestrial', 'submarine'] as const;
  const inputCls = 'w-full bg-[#070A0E] border border-[#1E2A38] text-[#C8D6E5] px-2 py-1 text-[10px] focus:border-[#D4820A] outline-none font-mono';

  // ── Node form ─────────────────────────────────────────────────
  let nodeForm = $state<Partial<InfraNode>>({ type: 'dc' });
  let showNodeForm = $state(false);
  let editingNodeId = $state<string | null>(null);

  // When page signals a map-click location → open add form pre-filled
  $effect(() => {
    const loc = editModeStore.pendingNodeLocation;
    if (loc && editModeStore.sidebarTab === 'layers' && editModeStore.layerSubTab === 'nodes') {
      nodeForm = { type: 'dc', lat: loc.lat, lng: loc.lng };
      editingNodeId = null;
      showNodeForm = true;
    }
  });

  // When a node is selected on the map → open its edit form
  $effect(() => {
    const id = editModeStore.selectedNodeId;
    if (id) {
      const node = infraStore.nodes.find(n => n.id === id);
      if (node) {
        nodeForm = { ...node };
        editingNodeId = id;
        showNodeForm = true;
      }
    } else if (!editModeStore.pendingNodeLocation) {
      if (editingNodeId) {
        editingNodeId = null;
        showNodeForm = false;
        nodeForm = { type: 'dc' };
      }
    }
  });

  function saveNode() {
    if (!nodeForm.name || nodeForm.lat === undefined || nodeForm.lng === undefined) return;
    if (editingNodeId) {
      infraStore.updateNode(editingNodeId, nodeForm);
      infraStore.rebuildGraph();
      editModeStore.selectedNodeId = null;
      editingNodeId = null;
    } else {
      const id = nodeForm.id?.trim() ||
        `node-${(nodeForm.name ?? 'new').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      infraStore.addNode({ ...(nodeForm as InfraNode), id });
      infraStore.rebuildGraph();
    }
    nodeForm = { type: 'dc' };
    showNodeForm = false;
    editModeStore.pendingNodeLocation = null;
  }

  function cancelNode() {
    nodeForm = { type: 'dc' };
    showNodeForm = false;
    editingNodeId = null;
    editModeStore.selectedNodeId = null;
    editModeStore.pendingNodeLocation = null;
  }

  function deleteNode(id: string) {
    const count = infraStore.edges.filter(e => e.source === id || e.target === id).length;
    if (count > 0 && !confirm(`Delete node and its ${count} connected edge(s)?`)) return;
    infraStore.deleteNode(id);
    infraStore.rebuildGraph();
    if (editModeStore.selectedNodeId === id) {
      editModeStore.selectedNodeId = null;
      showNodeForm = false;
      editingNodeId = null;
    }
  }

  // ── Edge form ─────────────────────────────────────────────────
  let edgeForm = $state<Partial<InfraEdge>>({ type: 'terrestrial' });
  let showEdgeForm = $state(false);

  function saveEdge() {
    if (!edgeForm.source || !edgeForm.target) return;
    const id = edgeForm.id?.trim() || `edge-${Date.now()}`;
    infraStore.addEdge({ ...(edgeForm as InfraEdge), id });
    infraStore.rebuildGraph();
    edgeForm = { type: 'terrestrial' };
    showEdgeForm = false;
  }
</script>

<div class="w-[260px] bg-[#0A0F14] border-r border-[#1E2A38] flex flex-col text-xs font-mono shrink-0 overflow-hidden">

  <!-- Top tab: STRIKE | LAYERS -->
  <div class="flex border-b border-[#1E2A38] shrink-0">
    <button
      onclick={() => editModeStore.sidebarTab = 'strike'}
      class="flex-1 py-2 label text-[11px] border-b-2 cursor-pointer {editModeStore.sidebarTab === 'strike' ? 'border-[#D4820A] text-[#D4820A]' : 'border-transparent text-[#4A5568] hover:text-[#C8D6E5]'}"
    >STRIKE</button>
    <button
      onclick={() => editModeStore.sidebarTab = 'layers'}
      class="flex-1 py-2 label text-[11px] border-b-2 cursor-pointer {editModeStore.sidebarTab === 'layers' ? 'border-[#D4820A] text-[#D4820A]' : 'border-transparent text-[#4A5568] hover:text-[#C8D6E5]'}"
    >LAYERS{#if infraStore.isDirty} <span class="text-[#D4820A]">●</span>{/if}</button>
  </div>

  <!-- ═══════════════ STRIKE PANEL ═══════════════ -->
  {#if editModeStore.sidebarTab === 'strike'}
  <div class="flex-1 overflow-y-auto">

    <!-- Click hint -->
    <div class="px-3 py-2 border-b border-[#1E2A38] text-[#4A5568] text-[9px]">
      CLICK MAP TO REPOSITION ORIGIN · DRAG MARKER TO MOVE
    </div>

    <!-- STRIKE ORIGIN -->
    <div class="p-3 border-b border-[#1E2A38]">
      <div class="label text-[10px] text-[#D4820A] mb-2">STRIKE ORIGIN</div>

      <!-- Searchable launch site multi-select dropdown -->
      <div class="mb-2">
        <div class="text-[#4A5568] text-[9px] mb-1">LAUNCH SITE PRESET</div>
        <LaunchSiteSelect
          activeId={selectedSiteId}
          selectedIds={selectedSiteIds}
          onActivate={(site: LaunchSite) => {
            selectedSiteId = site.id;
            onOriginChange(site.lat, site.lng);
          }}
          onSelectionChange={(ids: string[]) => onSelectedSitesChange?.(ids)}
        />
      </div>

      <!-- Manual lat/lng override -->
      <div class="flex gap-1">
        <div class="flex-1">
          <div class="text-[#4A5568] text-[9px] mb-0.5">LAT</div>
          <input type="number" value={originLat.toFixed(4)} step="0.01"
            oninput={(e) => { onOriginChange(+e.currentTarget.value, originLng); selectedSiteId = ''; }}
            class="w-full bg-[#070A0E] border border-[#1E2A38] text-[#00D4FF] px-1.5 py-1 text-[10px] font-mono focus:border-[#D4820A] outline-none"/>
        </div>
        <div class="flex-1">
          <div class="text-[#4A5568] text-[9px] mb-0.5">LNG</div>
          <input type="number" value={originLng.toFixed(4)} step="0.01"
            oninput={(e) => { onOriginChange(originLat, +e.currentTarget.value); selectedSiteId = ''; }}
            class="w-full bg-[#070A0E] border border-[#1E2A38] text-[#00D4FF] px-1.5 py-1 text-[10px] font-mono focus:border-[#D4820A] outline-none"/>
        </div>
      </div>
    </div>

    <!-- WEAPON SYSTEM -->
    <div class="p-3 border-b border-[#1E2A38]">
      <div class="label text-[10px] text-[#D4820A] mb-2">WEAPON SYSTEM</div>
      <div class="flex flex-col gap-1">
        {#each [1,2,3,4,5] as tier}
          <button
            onclick={() => {
              const km = WEAPON_PRESETS[tier as keyof typeof WEAPON_PRESETS];
              onRadiusChange(km, tier);
              customRadius = km;
            }}
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
        <div class="text-[#00D4FF] text-[10px] mt-0.5 text-center font-mono">{customRadius} km</div>
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
        <div class="mt-2 text-[#00D4FF] text-[9px] space-y-0.5 font-mono">
          <div>{worstCaseResult.lat.toFixed(4)}°  {worstCaseResult.lng.toFixed(4)}°</div>
          <div>R-VALUE FLOOR: <span class="text-[#C4302B]">{(worstCaseResult.rValue * 100).toFixed(1)}%</span></div>
        </div>
      {/if}
    </div>

    <!-- SIMULATE STRIKE -->
    <div class="p-3 border-b border-[#1E2A38]">
      <div class="label text-[10px] text-[#D4820A] mb-2">STRIKE SIMULATION</div>
      <button
        onclick={() => simulationStore.toggle()}
        class="w-full label text-[10px] border py-2 cursor-pointer transition-colors {simulationStore.isActive
          ? 'border-[#C4302B] bg-[#C4302B]/15 text-[#C4302B] blink'
          : 'border-[#1E2A38] text-[#4A5568] hover:border-[#C4302B] hover:text-[#C4302B]'}"
      >
        {simulationStore.isActive ? '◉ TARGETING — CLICK NODE TO FIRE' : '⊙ SIMULATE STRIKE'}
      </button>
      {#if simulationStore.struckCellIds.size > 0}
        <div class="mt-2 flex items-center justify-between">
          <span class="text-[9px] text-[#C4302B] font-mono">{simulationStore.struckCellIds.size} CELL{simulationStore.struckCellIds.size !== 1 ? 'S' : ''} DESTROYED</span>
          <button onclick={() => simulationStore.clearStrikes()} class="label text-[8px] text-[#4A5568] hover:text-[#C8D6E5] cursor-pointer">CLEAR</button>
        </div>
      {/if}
    </div>

    <!-- FILTER NODES -->
    <div class="p-3">
      <div class="label text-[10px] text-[#D4820A] mb-2">FILTER NODES</div>
      <div class="space-y-1">
        {#each NODE_TYPE_LABELS as t}
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

  <!-- ═══════════════ LAYERS PANEL ═══════════════ -->
  {:else}
  <div class="flex flex-col flex-1 overflow-hidden">

    <!-- Undo/Redo + Apply -->
    <div class="flex items-center gap-1 px-2 py-1.5 border-b border-[#1E2A38] shrink-0">
      <button onclick={() => { infraStore.undo(); infraStore.rebuildGraph(); }}
        disabled={infraStore.undoStack.length === 0}
        class="label text-[9px] px-1.5 py-1 border border-[#1E2A38] text-[#4A5568] hover:border-[#D4820A] hover:text-[#D4820A] disabled:opacity-30 cursor-pointer">↩ {infraStore.undoStack.length}</button>
      <button onclick={() => { infraStore.redo(); infraStore.rebuildGraph(); }}
        disabled={infraStore.redoStack.length === 0}
        class="label text-[9px] px-1.5 py-1 border border-[#1E2A38] text-[#4A5568] hover:border-[#D4820A] hover:text-[#D4820A] disabled:opacity-30 cursor-pointer">↪ {infraStore.redoStack.length}</button>
      <div class="flex-1"></div>
      <button onclick={() => infraStore.applyChanges()}
        class="label text-[9px] px-2 py-1 border border-[#1A7A4A] text-[#1A7A4A] hover:bg-[#1A7A4A]/10 cursor-pointer">✓ APPLY</button>
    </div>

    <!-- Sub-tabs: NODES | EDGES | SCENARIOS -->
    <div class="flex border-b border-[#1E2A38] shrink-0">
      {#each (['nodes', 'edges', 'scenarios'] as const) as tab}
        <button
          onclick={() => { editModeStore.layerSubTab = tab; editModeStore.edgeDrawSource = null; }}
          class="flex-1 py-1.5 label text-[9px] border-b-2 cursor-pointer {editModeStore.layerSubTab === tab ? 'border-[#D4820A] text-[#D4820A]' : 'border-transparent text-[#4A5568] hover:text-[#C8D6E5]'}"
        >{tab.toUpperCase()}</button>
      {/each}
    </div>

    <!-- Context hint bar -->
    <div class="px-2 py-1 border-b border-[#1E2A38] text-[#4A5568] text-[9px] shrink-0">
      {#if editModeStore.layerSubTab === 'nodes'}
        CLICK MAP TO ADD NODE · CLICK NODE TO EDIT · DEL TO REMOVE
      {:else if editModeStore.layerSubTab === 'edges'}
        {#if editModeStore.edgeDrawSource}
          <span class="text-[#D4820A]">● CLICK TARGET NODE  (from: {editModeStore.edgeDrawSource.slice(0,16)}…)</span>
          <button onclick={() => editModeStore.edgeDrawSource = null}
            class="ml-2 text-[#C4302B] cursor-pointer hover:text-[#FF6B6B]">✕</button>
        {:else}
          CLICK NODE A → NODE B TO CONNECT · CLICK EMPTY TO CANCEL
        {/if}
      {:else}
        LOAD SCENARIO TO SET STRIKE PARAMETERS
      {/if}
    </div>

    <!-- Search -->
    <div class="px-2 py-1.5 border-b border-[#1E2A38] shrink-0">
      <input type="text" placeholder="SEARCH..." bind:value={searchTerm}
        class="w-full bg-[#070A0E] border border-[#1E2A38] text-[#C8D6E5] px-2 py-0.5 text-[10px] font-mono focus:border-[#D4820A] outline-none" />
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto">

      {#if editModeStore.layerSubTab === 'nodes'}

        <!-- Add / edit form -->
        <div class="p-2 border-b border-[#1E2A38]">
          <button
            onclick={() => {
              if (showNodeForm && !editingNodeId) { cancelNode(); }
              else { cancelNode(); showNodeForm = true; nodeForm = { type: 'dc' }; }
            }}
            class="w-full label text-[10px] border py-1 cursor-pointer mb-1 {showNodeForm && !editingNodeId ? 'border-[#C4302B] text-[#C4302B]' : 'border-[#1A7A4A] text-[#1A7A4A] hover:bg-[#1A7A4A]/10'}">
            {showNodeForm && !editingNodeId ? '✕ CANCEL' : '+ ADD NODE (or click map)'}
          </button>

          {#if showNodeForm}
            <div class="space-y-1 mt-1">
              <div class="label text-[9px] text-[#D4820A]">
                {editingNodeId ? `EDITING: ${editingNodeId}` : 'NEW NODE'}
              </div>
              {#if !editingNodeId}
                <input placeholder="id (auto if empty)" bind:value={nodeForm.id} class={inputCls} />
              {/if}
              <input placeholder="name *" bind:value={nodeForm.name} class={inputCls} />
              <select bind:value={nodeForm.type} class={inputCls + ' cursor-pointer'}>
                {#each NODE_TYPE_OPTIONS as t}<option value={t}>{t}</option>{/each}
              </select>
              <div class="flex gap-1">
                <input type="number" step="0.001" placeholder="lat *"
                  value={nodeForm.lat ?? ''}
                  oninput={(e) => nodeForm = { ...nodeForm, lat: e.currentTarget.value ? +e.currentTarget.value : undefined }}
                  class="flex-1 bg-[#070A0E] border border-[#1E2A38] text-[#00D4FF] px-1.5 py-1 text-[10px] focus:border-[#D4820A] outline-none font-mono" />
                <input type="number" step="0.001" placeholder="lng *"
                  value={nodeForm.lng ?? ''}
                  oninput={(e) => nodeForm = { ...nodeForm, lng: e.currentTarget.value ? +e.currentTarget.value : undefined }}
                  class="flex-1 bg-[#070A0E] border border-[#1E2A38] text-[#00D4FF] px-1.5 py-1 text-[10px] focus:border-[#D4820A] outline-none font-mono" />
              </div>
              <input placeholder="city" bind:value={nodeForm.city} class={inputCls} />
              <input placeholder="country" bind:value={nodeForm.country} class={inputCls} />
              <div class="flex gap-1 mt-1">
                <button onclick={saveNode}
                  class="flex-1 label text-[10px] border border-[#1A7A4A] text-[#1A7A4A] py-1 hover:bg-[#1A7A4A]/10 cursor-pointer">
                  {editingNodeId ? 'UPDATE' : 'CREATE'}
                </button>
                <button onclick={cancelNode}
                  class="label text-[10px] border border-[#1E2A38] text-[#4A5568] px-2 py-1 hover:border-[#4A5568] cursor-pointer">✕</button>
              </div>
            </div>
          {/if}
        </div>

        <!-- Node list -->
        <div class="label text-[9px] text-[#4A5568] px-2 py-1">{filteredNodes.length} NODES</div>
        {#each filteredNodes as node}
          {@const isSelected = editModeStore.selectedNodeId === node.id}
          <div
            class="flex items-center gap-1.5 px-2 py-1.5 border-b border-[#0D1117] group {isSelected ? 'bg-[#140E00] border-l-2 border-l-[#D4820A]' : 'hover:bg-[#0D1117]'}"
          >
            <div class="w-2 h-2 rounded-full flex-shrink-0 {
              node.type === 'dc' ? 'bg-blue-500' :
              node.type === 'ixp' ? 'bg-[#D4820A]' :
              node.type === 'cable_landing' ? 'bg-[#00D4FF]' : 'bg-purple-500'
            }"></div>
            <!-- Clicking name/id area = fly to only, no edit form -->
            <div
              class="flex-1 min-w-0 cursor-pointer"
              onclick={() => onFlyTo?.(node.id)}
              title="Click to zoom to node"
            >
              <div class="text-[10px] truncate {isSelected ? 'text-[#D4820A]' : 'text-[#C8D6E5]'}">{node.name}</div>
              <div class="text-[9px] text-[#3A4558] truncate">{node.id} · {node.country ?? ''}</div>
            </div>
            <!-- Edit button = open form -->
            <button
              onclick={(e) => { e.stopPropagation(); if (isSelected) { editModeStore.selectedNodeId = null; } else { editModeStore.selectNode(node.id); } }}
              class="opacity-0 group-hover:opacity-100 text-[#4A5568] text-[10px] hover:text-[#D4820A] cursor-pointer px-1 flex-shrink-0"
              title="Edit node"
            >✎</button>
            <!-- Delete button -->
            <button
              onclick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
              class="opacity-0 group-hover:opacity-100 text-[#C4302B] text-[11px] hover:text-[#FF6B6B] cursor-pointer px-1 flex-shrink-0"
              title="Delete node"
            >✕</button>
          </div>
        {/each}

      {:else if editModeStore.layerSubTab === 'edges'}

        <!-- Manual add form -->
        <div class="p-2 border-b border-[#1E2A38]">
          <button onclick={() => showEdgeForm = !showEdgeForm}
            class="w-full label text-[10px] border border-[#1A7A4A] text-[#1A7A4A] py-1 hover:bg-[#1A7A4A]/10 cursor-pointer mb-1">
            {showEdgeForm ? '✕ CANCEL' : '+ ADD EDGE MANUALLY'}
          </button>
          {#if showEdgeForm}
            <div class="space-y-1">
              <input placeholder="id (auto if empty)" bind:value={edgeForm.id} class={inputCls} />
              <input placeholder="source node id *" bind:value={edgeForm.source} class={inputCls} />
              <input placeholder="target node id *" bind:value={edgeForm.target} class={inputCls} />
              <select bind:value={edgeForm.type} class={inputCls + ' cursor-pointer'}>
                {#each EDGE_TYPE_OPTIONS as t}<option value={t}>{t}</option>{/each}
              </select>
              <input placeholder="name (optional)" bind:value={edgeForm.name} class={inputCls} />
              <button onclick={saveEdge}
                class="w-full label text-[10px] border border-[#1A7A4A] text-[#1A7A4A] py-1 hover:bg-[#1A7A4A]/10 cursor-pointer">
                CREATE EDGE
              </button>
            </div>
          {/if}
        </div>

        <!-- Edge list -->
        <div class="label text-[9px] text-[#4A5568] px-2 py-1">{filteredEdges.length} EDGES</div>
        {#each filteredEdges as edge}
          <div class="flex items-center gap-1.5 px-2 py-1.5 border-b border-[#0D1117] hover:bg-[#0D1117] group">
            <div class="w-4 h-0.5 flex-shrink-0 {edge.type === 'submarine' ? 'bg-[#00D4FF]/70' : 'bg-[#D4820A]/70'}"></div>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] text-[#C8D6E5] truncate">{edge.source} → {edge.target}</div>
              <div class="text-[9px] text-[#3A4558] truncate">{edge.id}{edge.name ? ` · ${edge.name}` : ''} · {edge.type}</div>
            </div>
            <button
              onclick={() => { infraStore.deleteEdge(edge.id); infraStore.rebuildGraph(); }}
              class="opacity-0 group-hover:opacity-100 text-[#C4302B] text-[11px] hover:text-[#FF6B6B] cursor-pointer px-1 flex-shrink-0"
            >✕</button>
          </div>
        {/each}

      {:else}
        <!-- Scenarios -->
        <div class="p-2 border-b border-[#1E2A38]">
          <div class="label text-[10px] text-[#D4820A]">SAVED SCENARIOS</div>
        </div>
        {#each infraStore.scenarios as scenario}
          <div class="px-2 py-2 border-b border-[#0D1117] hover:bg-[#0D1117] group">
            <div class="flex items-center justify-between">
              <div class="text-[#C8D6E5] text-[10px]">{scenario.name}</div>
              <button onclick={() => infraStore.deleteScenario(scenario.id)}
                class="opacity-0 group-hover:opacity-100 text-[#C4302B] text-[10px] cursor-pointer px-1">✕</button>
            </div>
            <div class="text-[#3A4558] text-[9px] mt-0.5 font-mono">
              {scenario.originLat.toFixed(3)}°  {scenario.originLng.toFixed(3)}°  ·  r={scenario.radiusKm} km
            </div>
          </div>
        {/each}
        {#if infraStore.scenarios.length === 0}
          <div class="p-4 text-[#3A4558] text-[10px] text-center">NO SAVED SCENARIOS</div>
        {/if}
      {/if}

    </div>
  </div>
  {/if}

</div>
