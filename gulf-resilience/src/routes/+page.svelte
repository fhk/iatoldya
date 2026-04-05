<script lang="ts">
  import { onMount } from 'svelte';
  import MapView from '$lib/components/Map.svelte';
  import TopBar from '$lib/components/TopBar.svelte';
  import LeftSidebar from '$lib/components/LeftSidebar.svelte';
  import MetricsPanel from '$lib/components/MetricsPanel.svelte';
  import NodeDetailBar from '$lib/components/NodeDetailBar.svelte';
  import NodeTooltip from '$lib/components/NodeTooltip.svelte';
  import DataImportModal from '$lib/components/DataImportModal.svelte';
  import H3CellPanel from '$lib/components/H3CellPanel.svelte';
  import { infraStore } from '$lib/stores/infra.svelte';
  import { analysisStore } from '$lib/stores/analysis.svelte';
  import { editModeStore } from '$lib/stores/editMode.svelte';
  import { WEAPON_PRESETS, nodesWithinRadius } from '$lib/stores/strike';
  import { buildInfraLayers } from '$lib/layers/infraLayers';
  import { buildStrikeLayers } from '$lib/layers/strikeLayers';
  import { buildSimulationLayers } from '$lib/layers/AnimatedArcLayer';
  import { simulationStore } from '$lib/stores/simulation.svelte';
  import { ScatterplotLayer } from '@deck.gl/layers';
  import { ALL_LAUNCH_SITES } from '$lib/stores/strike';
  import { findWorstCaseStrike } from '$lib/graph/worstCaseStrike';
  import { downloadAllAsZip } from '$lib/csv/export';
  import type { InfraNode, InfraEdge } from '$lib/types';

  // ── Strike state ──────────────────────────────────────────────
  let originLat = $state(32.5);
  let originLng = $state(48.0);
  let radiusKm = $state(1450);
  let weaponTier = $state<number | string>(2);

  // ── Filter state ──────────────────────────────────────────────
  let nodeTypeFilters = $state<Record<string, boolean>>({
    dc: true, ixp: true, cable_landing: true, pop: true
  });
  let countryFilters = $state<Record<string, boolean>>({});

  // ── Hover/tooltip ─────────────────────────────────────────────
  let hoveredNode = $state<InfraNode | null>(null);
  let tooltipX = $state(0);
  let tooltipY = $state(0);

  // ── Clicked H3 cell panel ─────────────────────────────────────
  let clickedCellId = $state<string | null>(null);
  let clickedPanelX = $state(0);
  let clickedPanelY = $state(0);
  const clickedCellNodes = $derived(
    clickedCellId
      ? (infraStore.h3.cells.get(clickedCellId)?.nodeIds
          .map(id => infraStore.nodes.find(n => n.id === id))
          .filter((n): n is InfraNode => n !== undefined) ?? [])
      : []
  );

  // ── Selected launch sites (multi-select) ─────────────────────
  let selectedSiteIds = $state<string[]>([]);

  // ── UI ────────────────────────────────────────────────────────
  let showImportModal = $state(false);
  let pulseScale = $state(1.0);
  let pulseDir = $state(1);
  let worstCaseResult = $state<{ lat: number; lng: number; rValue: number } | null>(null);
  let isComputingWorstCase = $state(false);

  let mapComponent: ReturnType<typeof MapView> | null = null;

  // ── Filtered nodes ────────────────────────────────────────────
  const filteredNodes = $derived(infraStore.nodes.filter(n => {
    if (!nodeTypeFilters[n.type]) return false;
    if (n.country && Object.keys(countryFilters).length > 0 && !(countryFilters[n.country] ?? true)) return false;
    return true;
  }));

  // ── H3 cell display nodes — always one point per cell ────────
  // Each unique H3 cell among filteredNodes becomes a single map point
  // at the cell centroid, keyed by cell ID.
  const displayNodes = $derived((() => {
    const seen = new Map<string, InfraNode>();
    for (const n of filteredNodes) {
      const cellId = infraStore.h3.nodeToCell.get(n.id);
      if (!cellId || seen.has(cellId)) continue;
      const cell = infraStore.h3.cells.get(cellId);
      if (!cell) continue;
      // Collect names of all filtered members in this cell
      const memberNames = cell.nodeIds
        .map(id => infraStore.nodes.find(x => x.id === id)?.name)
        .filter((name): name is string => !!name);
      seen.set(cellId, {
        id: cellId,
        name: memberNames.length === 1
          ? memberNames[0]
          : `${memberNames[0] ?? ''}  +${memberNames.length - 1}`,
        type: (cell.types[0] ?? 'dc') as InfraNode['type'],
        lat: cell.lat,
        lng: cell.lng,
        country: cell.countries[0],
        city: cell.countries[0]
      });
    }
    return Array.from(seen.values());
  })());

  // Edges between H3 cells (derived from H3 graph, not raw edges)
  const displayEdges = $derived((() => {
    const edges: InfraEdge[] = [];
    infraStore.h3.graph.forEachEdge((_eid, attrs, source, target) => {
      // Only include edges where both endpoint cells are in the current display set
      if (!displayNodes.some(n => n.id === source) || !displayNodes.some(n => n.id === target)) return;
      edges.push({
        id: `${source}-${target}`,
        source,
        target,
        type: (attrs as { type?: InfraEdge['type'] }).type ?? 'terrestrial'
      });
    });
    return edges;
  })());

  const strikeOrigins = $derived(
    selectedSites.length > 0
      ? selectedSites
      : [{ lat: originLat, lng: originLng, id: '_active', label: '', group: '' }]
  );

  // Nodes within the radius buffer — shown as potential targets in the sidebar,
  // but NOT removed from the graph (only explicit simulation strikes do that).
  const nodesInRange = $derived(
    new Set(strikeOrigins.flatMap(o => nodesWithinRadius(filteredNodes, o.lat, o.lng, radiusKm)))
  );

  // Only simulation-struck cells are actually removed from the graph / map.
  const removedCellIds = $derived(simulationStore.struckCellIds);

  // Raw nodes that have been explicitly struck (for provider impact chart)
  const struckNodes = $derived(
    infraStore.nodes.filter(n => {
      const cellId = infraStore.h3.nodeToCell.get(n.id);
      return cellId ? simulationStore.struckCellIds.has(cellId) : false;
    })
  );

  const removedDisplayNodes = $derived(
    displayNodes.filter(n => removedCellIds.has(n.id))
  );
  // Articulation points keyed by cell ID (display nodes use cell IDs)
  const articulationPointSet = $derived(analysisStore.articulationCellIds);

  // ── Analysis (debounced) — runs on H3 graph ───────────────────
  $effect(() => {
    const _struck = simulationStore.struckCellIds;
    const _h3 = infraStore.h3;
    const timer = setTimeout(() => {
      // Pass empty rawNodeIds — only struck cells affect the graph
      analysisStore.runAnalysis(
        infraStore.h3.graph, new Set(),
        infraStore.h3.nodeToCell, simulationStore.struckCellIds
      );
    }, 300);
    return () => clearTimeout(timer);
  });

  // ── Pulse + simulation tick ───────────────────────────────────
  onMount(() => {
    infraStore.init();
    analysisStore.runAnalysis(infraStore.h3.graph, new Set(), infraStore.h3.nodeToCell);
    const iv = setInterval(() => {
      pulseScale += 0.05 * pulseDir;
      if (pulseScale > 1.3) pulseDir = -1;
      if (pulseScale < 0.8) pulseDir = 1;
      simulationStore.tick();
    }, 50);
    return () => clearInterval(iv);
  });

  // ── Map: node click ───────────────────────────────────────────
  // node.id is always an H3 cell ID (we always render cell aggregates)
  function handleNodeClick(node: InfraNode, x: number, y: number) {
    const { sidebarTab, layerSubTab } = editModeStore;
    const cellId = node.id; // always a cell ID

    if (sidebarTab === 'layers' && layerSubTab === 'edges') {
      // Edge draw between cells: use first raw node in each cell as the endpoint
      const firstRaw = (cid: string) => infraStore.h3.cells.get(cid)?.nodeIds[0];
      if (!editModeStore.edgeDrawSource) {
        editModeStore.edgeDrawSource = cellId;
      } else if (editModeStore.edgeDrawSource !== cellId) {
        const src = firstRaw(editModeStore.edgeDrawSource);
        const tgt = firstRaw(cellId);
        if (src && tgt) {
          const exists = infraStore.edges.some(
            e => (e.source === src && e.target === tgt) || (e.source === tgt && e.target === src)
          );
          if (!exists) {
            infraStore.addEdge({ id: `edge-${Date.now()}`, source: src, target: tgt, type: 'terrestrial' });
            infraStore.rebuildGraph();
          }
        }
        editModeStore.edgeDrawSource = null;
      }
      return;
    }

    // NODES tab: select the cell (highlights it on map)
    if (sidebarTab === 'layers' && layerSubTab === 'nodes') {
      editModeStore.selectNode(editModeStore.selectedNodeId === cellId ? null : cellId);
    }

    // Simulation mode: fire from every selected origin simultaneously
    if (simulationStore.isActive) {
      const cell = infraStore.h3.cells.get(cellId);
      if (cell && !removedCellIds.has(cellId)) {
        for (const origin of strikeOrigins) {
          simulationStore.launch(origin.lat, origin.lng, cell.lat, cell.lng, cellId);
        }
      }
      return;
    }

    // Always: show H3 cell panel listing all member nodes
    if (clickedCellId === cellId) {
      clickedCellId = null;
    } else {
      clickedCellId = cellId;
      clickedPanelX = x;
      clickedPanelY = y;
    }
  }

  // ── Map: empty-space click ────────────────────────────────────
  function handleEmptyClick(lat: number, lng: number) {
    const { sidebarTab, layerSubTab } = editModeStore;

    if (sidebarTab === 'strike') {
      // Move strike origin
      originLat = lat;
      originLng = lng;
      return;
    }

    if (sidebarTab === 'layers' && layerSubTab === 'nodes') {
      // Create a new node at this location
      editModeStore.pendingNodeLocation = { lat, lng };
      editModeStore.selectedNodeId = null;
      return;
    }

    if (sidebarTab === 'layers' && layerSubTab === 'edges') {
      // Clicking empty space cancels the pending source
      editModeStore.edgeDrawSource = null;
    }

    // Dismiss cell panel on empty click
    clickedCellId = null;
  }

  // ── Strike origin drag ────────────────────────────────────────
  function handleOriginDrag(lat: number, lng: number) { originLat = lat; originLng = lng; }
  function handleOriginDragEnd(lat: number, lng: number) { originLat = lat; originLng = lng; }

  // ── Worst-case ────────────────────────────────────────────────
  async function handleWorstCase() {
    isComputingWorstCase = true;
    worstCaseResult = null;
    try {
      const result = await findWorstCaseStrike(
        originLat, originLng, radiusKm * 1.5, radiusKm,
        filteredNodes, infraStore.edges
      );
      originLat = result.lat;
      originLng = result.lng;
      worstCaseResult = { lat: result.lat, lng: result.lng, rValue: result.rValue };
    } finally {
      isComputingWorstCase = false;
    }
  }

  // ── FlyTo ─────────────────────────────────────────────────────
  function flyToNode(nodeId: string) {
    const node = infraStore.nodes.find(n => n.id === nodeId);
    if (node && mapComponent) mapComponent.flyTo(node.lng, node.lat, 9);
  }

  // ── Selected launch site markers ─────────────────────────────
  const selectedSites = $derived(
    ALL_LAUNCH_SITES.filter(s => selectedSiteIds.includes(s.id))
  );

  const launchSiteLayer = $derived(
    new ScatterplotLayer({
      id: 'launch-sites',
      data: selectedSites,
      getPosition: (s: (typeof selectedSites)[0]) => [s.lng, s.lat],
      getRadius: 5000,
      getFillColor: [212, 130, 10, 180],
      getLineColor: [255, 200, 50, 220],
      getLineWidth: 1500,
      stroked: true,
      pickable: false
    })
  );

  // ── Deck.gl layers ────────────────────────────────────────────
  const deckLayers = $derived([
    ...buildInfraLayers(
      displayNodes.filter(n => !removedCellIds.has(n.id)),
      displayEdges,
      analysisStore.betweennessScores,
      articulationPointSet,
      (node, x, y) => { hoveredNode = node; tooltipX = x; tooltipY = y; },
      handleNodeClick,
      editModeStore.selectedNodeId,
      editModeStore.edgeDrawSource
    ),
    launchSiteLayer,
    ...buildStrikeLayers(
      originLat, originLng, radiusKm,
      selectedSites, removedDisplayNodes, pulseScale,
      handleOriginDrag,
      handleOriginDragEnd
    ),
    // Animated arc + explosion layers
    ...buildSimulationLayers(simulationStore.arcs, simulationStore.explosions)
  ]);

  // Cursor: crosshair / targeting reticle in simulation mode
  const mapCursor = $derived(simulationStore.isActive ? 'crosshair' : 'crosshair');

  // ── Keyboard shortcuts ────────────────────────────────────────
  function handleKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

    if (!isInput) {
      if (e.key >= '1' && e.key <= '5') {
        const tier = +e.key as 1|2|3|4|5;
        radiusKm = WEAPON_PRESETS[tier];
        weaponTier = tier;
      }
      if (e.key === ' ') { e.preventDefault(); handleWorstCase(); }
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault(); infraStore.undo(); infraStore.rebuildGraph();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault(); infraStore.redo(); infraStore.rebuildGraph();
      }
      if (e.key === 'Delete' && editModeStore.selectedNodeId) {
        infraStore.deleteNode(editModeStore.selectedNodeId);
        infraStore.rebuildGraph();
        editModeStore.selectedNodeId = null;
      }
    }

    if (e.key === 'Escape') {
      editModeStore.reset();
      hoveredNode = null;
      clickedCellId = null;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="w-screen h-screen flex flex-col overflow-hidden bg-[#070A0E]">
  <TopBar
    onImport={() => showImportModal = true}
    onExport={() => downloadAllAsZip(infraStore.nodes, infraStore.edges, infraStore.scenarios)}
  />

  <div class="flex flex-1 overflow-hidden min-h-0">
    <LeftSidebar
      {originLat} {originLng} {radiusKm} {weaponTier}
      {nodeTypeFilters} {countryFilters}
      onOriginChange={(lat, lng) => { originLat = lat; originLng = lng; }}
      onRadiusChange={(km, tier) => { radiusKm = km; weaponTier = tier; }}
      onFiltersChange={(types, countries) => { nodeTypeFilters = types; countryFilters = countries; }}
      onWorstCase={handleWorstCase}
      {worstCaseResult}
      {isComputingWorstCase}
      onFlyTo={flyToNode}
      {selectedSiteIds}
      onSelectedSitesChange={(ids) => selectedSiteIds = ids}
    />

    <div class="flex-1 relative min-w-0">
      <MapView
        layers={deckLayers}
        cursor={mapCursor}
        pickingRadius={simulationStore.isActive ? 14 : 0}
        onEmptyClick={handleEmptyClick}
        bind:this={mapComponent}
      />
    </div>

    <MetricsPanel onFlyTo={flyToNode} removedNodes={filteredNodes.filter(n => nodesInRange.has(n.id))} {struckNodes} />
  </div>

  <NodeDetailBar
    {hoveredNode}
    betweennessScore={hoveredNode ? (analysisStore.betweennessScores[hoveredNode.id] ?? 0) : 0}
    isArticulationPoint={hoveredNode ? articulationPointSet.has(hoveredNode.id) : false}
  />

  <NodeTooltip
    node={hoveredNode}
    x={tooltipX}
    y={tooltipY}
    betweennessScore={hoveredNode ? (analysisStore.betweennessScores[hoveredNode.id] ?? 0) : 0}
    isArticulationPoint={hoveredNode ? articulationPointSet.has(hoveredNode.id) : false}
  />

  {#if clickedCellNodes.length > 0}
    <H3CellPanel
      nodes={clickedCellNodes}
      x={clickedPanelX}
      y={clickedPanelY}
      betweennessScores={analysisStore.betweennessScores}
      articulationNodeIds={articulationPointSet}
      onFlyTo={flyToNode}
      onClose={() => clickedCellId = null}
    />
  {/if}

  {#if showImportModal}
    <DataImportModal onClose={() => showImportModal = false} />
  {/if}
</div>
