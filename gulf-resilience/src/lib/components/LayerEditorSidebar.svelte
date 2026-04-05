<script lang="ts">
  import { infraStore } from '../stores/infra.svelte';
  import { editModeStore } from '../stores/editMode.svelte';
  import type { InfraNode, InfraEdge } from '../types';

  interface Props {
    onFlyTo?: (nodeId: string) => void;
  }
  let { onFlyTo }: Props = $props();

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

  // Add-node form state (new or edit)
  let addNodeForm = $state<Partial<InfraNode>>({ type: 'dc' });
  let showAddNode = $state(false);
  let editingNodeId = $state<string | null>(null);

  // Add-edge form state
  let addEdgeForm = $state<Partial<InfraEdge>>({ type: 'terrestrial' });
  let showAddEdge = $state(false);

  // Sync: when page sets pendingNode (from map click), open add form
  $effect(() => {
    if (editModeStore.pendingNode && editModeStore.activeTab === 'nodes') {
      const p = editModeStore.pendingNode as Partial<InfraNode>;
      addNodeForm = { type: 'dc', ...p };
      showAddNode = true;
      editingNodeId = null;
    }
  });

  // Sync: when selectedNodeId changes, switch to edit form for that node
  $effect(() => {
    const id = editModeStore.selectedNodeId;
    if (id) {
      const node = infraStore.nodes.find(n => n.id === id);
      if (node) {
        addNodeForm = { ...node };
        editingNodeId = id;
        showAddNode = true;
        editModeStore.activeTab = 'nodes';
      }
    } else {
      if (editingNodeId) {
        editingNodeId = null;
        if (!editModeStore.pendingNode) {
          showAddNode = false;
          addNodeForm = { type: 'dc' };
        }
      }
    }
  });

  function saveNode() {
    if (!addNodeForm.name || addNodeForm.lat === undefined || addNodeForm.lng === undefined) return;
    if (editingNodeId) {
      // Update existing
      infraStore.updateNode(editingNodeId, addNodeForm);
      infraStore.rebuildGraph();
      editingNodeId = null;
      editModeStore.selectedNodeId = null;
    } else {
      // Create new — auto-generate id if empty
      const id = addNodeForm.id?.trim() ||
        `node-${addNodeForm.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      infraStore.addNode({ ...(addNodeForm as InfraNode), id });
      infraStore.rebuildGraph();
    }
    addNodeForm = { type: 'dc' };
    showAddNode = false;
    editModeStore.pendingNode = null;
  }

  function cancelNode() {
    addNodeForm = { type: 'dc' };
    showAddNode = false;
    editingNodeId = null;
    editModeStore.selectedNodeId = null;
    editModeStore.pendingNode = null;
  }

  function deleteNode(id: string) {
    const connectedCount = infraStore.edges.filter(e => e.source === id || e.target === id).length;
    if (connectedCount > 0) {
      if (!confirm(`Delete node and its ${connectedCount} connected edge(s)?`)) return;
    }
    infraStore.deleteNode(id);
    infraStore.rebuildGraph();
    if (editModeStore.selectedNodeId === id) {
      editModeStore.selectedNodeId = null;
      showAddNode = false;
      editingNodeId = null;
    }
  }

  function saveEdge() {
    if (!addEdgeForm.source || !addEdgeForm.target) return;
    const id = addEdgeForm.id?.trim() || `edge-${Date.now()}`;
    infraStore.addEdge({ ...(addEdgeForm as InfraEdge), id });
    infraStore.rebuildGraph();
    addEdgeForm = { type: 'terrestrial' };
    showAddEdge = false;
  }

  function toggleEdgeDrawMode() {
    if (editModeStore.edgeDrawMode) {
      editModeStore.edgeDrawMode = false;
      editModeStore.edgeDrawSource = null;
    } else {
      editModeStore.edgeDrawMode = true;
      editModeStore.edgeDrawSource = null;
    }
  }

  const NODE_TYPES = ['dc', 'ixp', 'cable_landing', 'pop'] as const;
  const EDGE_TYPES = ['terrestrial', 'submarine'] as const;

  const inputCls = 'w-full bg-[#070A0E] border border-[#1E2A38] text-[#C8D6E5] px-2 py-1 text-[10px] focus:border-[#D4820A] outline-none font-mono';
  const selectCls = inputCls + ' cursor-pointer';
</script>

<div class="w-[260px] bg-[#0A0F14] border-r border-[#1E2A38] flex flex-col text-xs font-mono shrink-0">
  <!-- Tabs -->
  <div class="flex border-b border-[#1E2A38]">
    {#each (['nodes', 'edges', 'scenarios'] as const) as tab}
      <button
        onclick={() => editModeStore.activeTab = tab}
        class="flex-1 py-2 label text-[10px] border-b-2 cursor-pointer {editModeStore.activeTab === tab ? 'border-[#D4820A] text-[#D4820A]' : 'border-transparent text-[#4A5568] hover:text-[#C8D6E5]'}"
      >{tab.toUpperCase()}</button>
    {/each}
  </div>

  <!-- Undo/Redo + Apply bar -->
  <div class="flex items-center gap-1 p-2 border-b border-[#1E2A38]">
    <button onclick={() => { infraStore.undo(); infraStore.rebuildGraph(); }}
      disabled={infraStore.undoStack.length === 0}
      class="label text-[9px] px-2 py-0.5 border border-[#1E2A38] text-[#4A5568] hover:border-[#D4820A] hover:text-[#D4820A] disabled:opacity-30 cursor-pointer">↩</button>
    <button onclick={() => { infraStore.redo(); infraStore.rebuildGraph(); }}
      disabled={infraStore.redoStack.length === 0}
      class="label text-[9px] px-2 py-0.5 border border-[#1E2A38] text-[#4A5568] hover:border-[#D4820A] hover:text-[#D4820A] disabled:opacity-30 cursor-pointer">↪</button>
    <span class="text-[#3A4558] text-[9px] ml-1">{infraStore.undoStack.length}/{infraStore.redoStack.length}</span>
    <div class="flex-1"></div>
    {#if infraStore.isDirty}
      <span class="text-[#D4820A] text-[9px] blink mr-1">●</span>
    {/if}
    <button onclick={() => infraStore.applyChanges()}
      class="label text-[9px] px-2 py-0.5 border border-[#1A7A4A] text-[#1A7A4A] hover:bg-[#1A7A4A]/10 cursor-pointer">✓ APPLY</button>
  </div>

  <!-- Search -->
  <div class="px-2 py-1.5 border-b border-[#1E2A38]">
    <input type="text" placeholder="SEARCH..." bind:value={searchTerm}
      class="w-full bg-[#070A0E] border border-[#1E2A38] text-[#C8D6E5] px-2 py-0.5 text-[10px] font-mono focus:border-[#D4820A] outline-none" />
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto">

    {#if editModeStore.activeTab === 'nodes'}

      <!-- Add / Edit node form -->
      <div class="p-2 border-b border-[#1E2A38]">
        <div class="flex items-center gap-1 mb-1.5">
          <button onclick={() => { if (showAddNode) cancelNode(); else { showAddNode = true; editingNodeId = null; addNodeForm = { type: 'dc' }; } }}
            class="flex-1 label text-[10px] border py-1 cursor-pointer {showAddNode && !editingNodeId ? 'border-[#C4302B] text-[#C4302B]' : 'border-[#1A7A4A] text-[#1A7A4A] hover:bg-[#1A7A4A]/10'}">
            {showAddNode && !editingNodeId ? '✕ CANCEL' : '+ ADD NODE'}
          </button>
          <button onclick={() => editModeStore.clickToPlaceMode = !editModeStore.clickToPlaceMode}
            class="label text-[9px] px-2 py-1 border cursor-pointer {editModeStore.clickToPlaceMode ? 'border-[#D4820A] text-[#D4820A] blink' : 'border-[#1E2A38] text-[#4A5568]'}">
            📍
          </button>
        </div>

        {#if showAddNode}
          <div class="space-y-1">
            <div class="label text-[9px] text-[#D4820A] mb-1">
              {editingNodeId ? `EDITING: ${editingNodeId}` : 'NEW NODE'}
            </div>
            {#if !editingNodeId}
              <input placeholder="id (auto if empty)" bind:value={addNodeForm.id} class={inputCls} />
            {/if}
            <input placeholder="name *" bind:value={addNodeForm.name} class={inputCls} />
            <select bind:value={addNodeForm.type} class={selectCls}>
              {#each NODE_TYPES as t}<option value={t}>{t}</option>{/each}
            </select>
            <div class="flex gap-1">
              <input type="number" step="0.001" placeholder="lat *"
                value={addNodeForm.lat ?? ''}
                oninput={(e) => addNodeForm = { ...addNodeForm, lat: e.currentTarget.value ? +e.currentTarget.value : undefined }}
                class="flex-1 bg-[#070A0E] border border-[#1E2A38] text-[#00D4FF] px-1.5 py-1 text-[10px] focus:border-[#D4820A] outline-none font-mono" />
              <input type="number" step="0.001" placeholder="lng *"
                value={addNodeForm.lng ?? ''}
                oninput={(e) => addNodeForm = { ...addNodeForm, lng: e.currentTarget.value ? +e.currentTarget.value : undefined }}
                class="flex-1 bg-[#070A0E] border border-[#1E2A38] text-[#00D4FF] px-1.5 py-1 text-[10px] focus:border-[#D4820A] outline-none font-mono" />
            </div>
            <input placeholder="city" bind:value={addNodeForm.city} class={inputCls} />
            <input placeholder="country" bind:value={addNodeForm.country} class={inputCls} />
            <input placeholder="operator" bind:value={addNodeForm.operator} class={inputCls} />
            <div class="flex gap-1 mt-1">
              <button onclick={saveNode}
                class="flex-1 label text-[10px] border border-[#1A7A4A] text-[#1A7A4A] py-1 hover:bg-[#1A7A4A]/10 cursor-pointer">
                {editingNodeId ? 'UPDATE' : 'CREATE'}
              </button>
              <button onclick={cancelNode}
                class="label text-[10px] border border-[#1E2A38] text-[#4A5568] px-2 py-1 hover:border-[#4A5568] cursor-pointer">
                ✕
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Node list -->
      <div class="text-[#4A5568] text-[9px] px-2 py-1 label">{filteredNodes.length} NODES</div>
      {#each filteredNodes as node}
        {@const isSelected = editModeStore.selectedNodeId === node.id}
        <div
          class="flex items-center gap-1.5 px-2 py-1.5 border-b border-[#0D1117] cursor-pointer group {isSelected ? 'bg-[#1A1200] border-[#D4820A]' : 'hover:bg-[#0D1117]'}"
          onclick={() => {
            editModeStore.selectedNodeId = isSelected ? null : node.id;
            if (!isSelected && onFlyTo) onFlyTo(node.id);
          }}
        >
          <div class="w-2 h-2 rounded-full flex-shrink-0 {node.type === 'dc' ? 'bg-blue-500' : node.type === 'ixp' ? 'bg-[#D4820A]' : node.type === 'cable_landing' ? 'bg-[#00D4FF]' : 'bg-purple-500'}"></div>
          <div class="flex-1 min-w-0">
            <div class="text-[10px] truncate {isSelected ? 'text-[#D4820A]' : 'text-[#C8D6E5]'}">{node.name}</div>
            <div class="text-[9px] text-[#3A4558]">{node.id} · {node.country ?? ''}</div>
          </div>
          <button
            onclick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
            class="opacity-0 group-hover:opacity-100 text-[#C4302B] text-[11px] hover:text-[#FF6B6B] cursor-pointer px-1 flex-shrink-0"
          >✕</button>
        </div>
      {/each}

    {:else if editModeStore.activeTab === 'edges'}

      <!-- Edge draw mode + add edge form -->
      <div class="p-2 border-b border-[#1E2A38] space-y-1.5">
        <!-- Draw mode button -->
        <button onclick={toggleEdgeDrawMode}
          class="w-full label text-[10px] border py-1.5 cursor-pointer {editModeStore.edgeDrawMode ? 'border-[#D4820A] text-[#D4820A] bg-[#D4820A]/10' : 'border-[#1A7A4A] text-[#1A7A4A] hover:bg-[#1A7A4A]/10'}">
          {#if editModeStore.edgeDrawMode}
            {editModeStore.edgeDrawSource
              ? `● CLICK TARGET NODE  (src: ${editModeStore.edgeDrawSource})`
              : '● CLICK SOURCE NODE ON MAP'}
          {:else}
            + DRAW EDGE ON MAP
          {/if}
        </button>
        {#if editModeStore.edgeDrawMode && editModeStore.edgeDrawSource}
          <button onclick={() => editModeStore.edgeDrawSource = null}
            class="w-full label text-[9px] border border-[#1E2A38] text-[#4A5568] py-1 hover:border-[#C4302B] hover:text-[#C4302B] cursor-pointer">
            ✕ CLEAR SOURCE
          </button>
        {/if}

        <!-- Manual add form -->
        <button onclick={() => showAddEdge = !showAddEdge}
          class="w-full label text-[10px] border border-[#1E2A38] text-[#4A5568] py-1 hover:border-[#4A5568] cursor-pointer">
          {showAddEdge ? '✕ CANCEL' : '+ ADD EDGE MANUALLY'}
        </button>
        {#if showAddEdge}
          <div class="space-y-1 mt-1">
            <input placeholder="id (auto if empty)" bind:value={addEdgeForm.id} class={inputCls} />
            <input placeholder="source node id *" bind:value={addEdgeForm.source} class={inputCls} />
            <input placeholder="target node id *" bind:value={addEdgeForm.target} class={inputCls} />
            <select bind:value={addEdgeForm.type} class={selectCls}>
              {#each EDGE_TYPES as t}<option value={t}>{t}</option>{/each}
            </select>
            <input placeholder="name" bind:value={addEdgeForm.name} class={inputCls} />
            <button onclick={saveEdge}
              class="w-full label text-[10px] border border-[#1A7A4A] text-[#1A7A4A] py-1 hover:bg-[#1A7A4A]/10 cursor-pointer">
              CREATE EDGE
            </button>
          </div>
        {/if}
      </div>

      <!-- Edge list -->
      <div class="text-[#4A5568] text-[9px] px-2 py-1 label">{filteredEdges.length} EDGES</div>
      {#each filteredEdges as edge}
        <div class="flex items-center gap-1.5 px-2 py-1.5 border-b border-[#0D1117] hover:bg-[#0D1117] group">
          <div class="w-4 h-0.5 flex-shrink-0 {edge.type === 'submarine' ? 'bg-[#00D4FF]/70' : 'bg-[#D4820A]/70'}"></div>
          <div class="flex-1 min-w-0">
            <div class="text-[10px] text-[#C8D6E5] truncate">{edge.source} → {edge.target}</div>
            <div class="text-[9px] text-[#3A4558]">{edge.id} · {edge.type}{edge.name ? ` · ${edge.name}` : ''}</div>
          </div>
          <button
            onclick={() => { infraStore.deleteEdge(edge.id); infraStore.rebuildGraph(); }}
            class="opacity-0 group-hover:opacity-100 text-[#C4302B] text-[11px] hover:text-[#FF6B6B] cursor-pointer px-1 flex-shrink-0"
          >✕</button>
        </div>
      {/each}

    {:else}
      <!-- Scenarios tab -->
      <div class="p-2 border-b border-[#1E2A38]">
        <div class="label text-[10px] text-[#D4820A]">SAVED SCENARIOS</div>
        <div class="text-[9px] text-[#4A5568] mt-0.5">Load scenarios to set strike origin + radius.</div>
      </div>
      {#each infraStore.scenarios as scenario}
        <div class="px-2 py-2 border-b border-[#0D1117] hover:bg-[#0D1117] group">
          <div class="flex items-center justify-between">
            <div class="text-[#C8D6E5] text-[10px]">{scenario.name}</div>
            <button onclick={() => infraStore.deleteScenario(scenario.id)}
              class="opacity-0 group-hover:opacity-100 text-[#C4302B] text-[10px] cursor-pointer px-1">✕</button>
          </div>
          <div class="text-[#3A4558] text-[9px] mt-0.5">
            {scenario.originLat.toFixed(3)}°  {scenario.originLng.toFixed(3)}°  ·  r={scenario.radiusKm} km
          </div>
          {#if scenario.notes}
            <div class="text-[#4A5568] text-[9px] mt-0.5">{scenario.notes}</div>
          {/if}
        </div>
      {/each}
      {#if infraStore.scenarios.length === 0}
        <div class="p-4 text-[#3A4558] text-[10px] text-center">NO SAVED SCENARIOS</div>
      {/if}
    {/if}

  </div>
</div>
