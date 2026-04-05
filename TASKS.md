# GulfResilience — Implementation Tasks

## Design Spec

### Concept: "SIGINT Terminal"

A cold-war-era signals intelligence terminal aesthetic applied to a modern threat dashboard. The interface should feel like it was designed for an underground operations center — not a SaaS product. Every element communicates weight, precision, and consequence.

**Aesthetic Direction**
- Background: near-black `#070A0E` with a subtle scanline CSS overlay
- Primary accent: amber `#D4820A` (radar/CRT glow)
- Threat/danger: `#C4302B` (nodes within strike radius pulse this)
- Safe/survived: `#1A7A4A`
- Data readout: `#00D4FF` cyan for live metrics
- Typography: `IBM Plex Mono` for all data/metrics (monospaced numerical readouts); `Barlow Condensed` bold/uppercase for section labels and UI chrome
- Atmosphere: scanline overlay (CSS repeating-linear-gradient), CRT glow on active elements (`text-shadow: 0 0 8px currentColor`), amber cursor blink on interactive items
- Map basemap: dark satellite (MapLibre `maptiler-satellite` or Stadia dark)
- Memorable moment: when "Find Worst-Case Strike" runs, a radar sweep animation radiates from the strike origin while metrics roll up/down with a typewriter counter effect

**Layout (full-screen, no scroll)**

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR (48px) — classification banner + app title + status│
├────────────┬────────────────────────────────┬───────────────┤
│            │                                │               │
│  STRIKE    │   MAP CANVAS                   │  METRICS      │
│  CONTROL   │   (full bleed, deck.gl         │  PANEL        │
│  SIDEBAR   │    + MapLibre)                 │  (320px)      │
│  (260px)   │                                │               │
│            │                                │               │
├────────────┴──────────────────┬─────────────┴───────────────┤
│  NODE DETAIL BAR (56px)       │  STATUS / COMPUTATION BAR   │
└───────────────────────────────┴─────────────────────────────┘
```

**Top Bar**
- Left: `[UNCLASSIFIED // FOUO]` pill in amber, app name `GULFNET RESILIENCE v0.1`
- Center: live node count / edge count / computation status
- Right: `BASELINE` vs `STRIKE MODE` toggle pill

**Left Sidebar — Strike Control (260px, dark glass panel)**
- Section: STRIKE ORIGIN
  - Coordinate display (lat/lng, editable inputs, monospace)
  - Launch site presets: `WESTERN IRAN`, `HORMUZ`, `YEMEN (HOUTHI)`, `CUSTOM`
  - Drag-to-reposition hint text
- Section: WEAPON SYSTEM
  - 5 tier buttons (full-width, stacked):
    - `T1 · 700–1,000 km` — Ya Ali / Shahed-131
    - `T2 · 1,300–1,500 km` — Kheibar Shekan / Fattah
    - `T3 · 1,650–2,000 km` — Sejjil-2 / Emad
    - `T4 · 2,000–2,500 km` — Shahed-136 / Arash-2
    - `T5 · 3,000 km` — Khorramshahr / Soumar
  - Custom radius: slider (100–3500 km) + numeric input
  - Active tier highlighted in amber with glow
- Section: WORST-CASE ANALYSIS
  - `[COMPUTE OPTIMAL STRIKE]` button — triggers Neumayer/Modiano sweep
  - Results: optimal lat/lng + max disruption score
- Section: INFRASTRUCTURE FILTERS
  - Toggle rows: Data Centers ■ · IXPs ■ · Cable Landings ■ · POPs ■
  - Country filter: UAE · KSA · QAT · BHR · OMN · IRQ · KWT

**Right Panel — Metrics Dashboard (320px)**
- Header: `NETWORK RESILIENCE ASSESSMENT`
- Subheader: `BASELINE → POST-STRIKE DELTA`
- PRIMARY METRIC — R-VALUE (large, center)
  - Large gauge/arc: "78.4% → 31.2%" with color transition green→red
  - Removed nodes: `N = 14 / 47`
- SECONDARY METRICS (card grid, 2-col):
  - Articulation Points: `3 → 11` (Δ+8)
  - Fiedler λ₂: `0.847 → 0.091` (Δ−0.756)
  - Network Efficiency E: `0.743 → 0.412` (Δ−44.5%)
  - Vertex κ(G): `4 → 1`
- TOP BETWEENNESS (table, post-strike):
  - Rank · Node Name · Centrality Score · Country
- DISCONNECTED COMPONENTS:
  - Visual list of isolated node groups post-strike

**Map Canvas**
- Basemap: dark satellite or Stadia Alidade Smooth Dark
- Layer stack (bottom → top):
  1. MapLibre basemap
  2. Submarine cable LineLayer (dim cyan, pulsing on hover)
  3. Terrestrial fiber LineLayer (dim amber, dashed)
  4. Infrastructure ScatterplotLayer (color by type, size by betweenness rank)
  5. Threat radius CircleLayer (amber outline, red fill at 15% opacity)
  6. Removed nodes overlay (red pulse, ScatterplotLayer)
  7. Strike origin marker (crosshair icon, draggable)
  8. Articulation point rings (white outer ring on surviving nodes)
  9. Fiedler bisection PathLayer (magenta dashed line through the graph split)

**Node Types & Colors**
- Data Center: `#2563EB` blue
- IXP: `#D97706` amber
- Cable Landing Station: `#06B6D4` cyan
- POP / Exchange: `#7C3AED` purple
- Within strike radius: override to `#DC2626` red with pulse animation

**Interactions**
- Drag strike origin → radius redraws, metrics recompute on `mouseup`
- Click weapon tier → radius snaps to preset km, metrics recompute
- Hover node → tooltip: name, type, city, betweenness rank, articulation point flag
- Click node → lock detail panel, highlight connected edges
- "Compute Optimal Strike" → 1.5s sweep animation, origin moves to worst-case position, metrics roll with typewriter animation
- Keyboard: `Escape` deselects, `1–5` selects weapon tier, `Space` runs worst-case

---

### CSV Data Import

Users may upload three CSV files to replace or augment the built-in Gulf dataset. Upload is triggered via a `[↑ IMPORT DATA]` button in the top bar, opening a modal overlay.

**infra.csv** — infrastructure nodes (replaces or merges with built-in):
```
id,name,type,lat,lng,city,country,operator,capacity_mw
uae-ix,UAE-IX,ixp,25.204,55.270,Dubai,UAE,DE-CIX,
eq-dx1,Equinix DX1,dc,25.197,55.274,Dubai,UAE,Equinix,18
```
Required columns: `id`, `name`, `type` (dc/ixp/cable_landing/pop), `lat`, `lng`
Optional: `city`, `country`, `operator`, `capacity_mw`

**links.csv** — edges between nodes (replaces or merges):
```
id,source,target,type,name,capacity_tbps,length_km
falcon-1,om-fujairah,uae-ix,submarine,FALCON,6.4,1423
ksa-bb,sa-riyadh,sa-jedix,terrestrial,KSA E-W Backbone,4.8,1100
```
Required: `id`, `source` (must match a node id), `target`, `type` (submarine/terrestrial)
Optional: `name`, `capacity_tbps`, `length_km`

**threats.csv** — named strike scenarios (saved configurations):
```
id,name,origin_lat,origin_lng,radius_km,notes
s1,T2 Gulf Strike,32.5,48.0,1450,Baseline Tier 2 from western Iran
s2,Yemen Drone,15.5,44.0,2500,Shahed-149 targeting Salalah
s3,Worst Case KSA,31.2,49.1,2000,Optimal computed position
```
Required: `id`, `name`, `origin_lat`, `origin_lng`, `radius_km`
Optional: `notes`

**Import modal UI:**
- Three drop zones side by side, each labeled with file name and format hint
- On drop/select: instant parse + validation, show row count + error list
- Merge options per file: `REPLACE ALL` | `ADD NEW (keep existing)` | `UPDATE MATCHING IDS`
- `[APPLY]` button: merges data into store, rebuilds graph, re-runs baseline analysis
- `[DOWNLOAD TEMPLATE]` links for each CSV schema
- Validation errors shown inline in monospace: `row 4: invalid type "data_center" — use dc|ixp|cable_landing|pop`

**Export:** `[↓ EXPORT DATA]` button downloads current state as three CSVs (zip). Includes any edits made via the layer editor.

---

### Layer Editor (Edit Mode)

Top bar has an `[EDIT MODE]` toggle pill. When active, the left sidebar switches from Strike Control to the Layer Editor. The map enters edit mode.

**Left Sidebar in Edit Mode — Layer Editor (260px)**
- Sub-tab row: `NODES` | `EDGES` | `SCENARIOS`
- **NODES tab:**
  - Searchable list of all nodes (filter by name/country/type)
  - Each row: type icon · name · city · `[✎]` edit · `[✕]` delete
  - `[+ ADD NODE]` button at top → opens inline form below list
  - Add/edit form fields: id (auto-generated slug), name, type selector, lat, lng, city, country, operator, capacity_mw
  - Lat/lng can be filled by clicking on map (click-to-place mode activated by `[📍 PICK ON MAP]` button)
- **EDGES tab:**
  - List of all edges: source → target · type · name · `[✎]` · `[✕]`
  - `[+ ADD EDGE]` → activates edge-draw mode on map (click node A then node B)
  - Add/edit form: id, source (searchable dropdown), target (searchable dropdown), type, name, capacity_tbps, length_km
- **SCENARIOS tab:**
  - List loaded from `threats.csv` + any computed worst-case results
  - Each row: scenario name · radius km · `[▶ LOAD]` · `[✎]` · `[✕]`
  - `[SAVE CURRENT]` button: saves current strike state as a named scenario
  - Scenarios survive page reload (stored in `localStorage`)

**Map in Edit Mode:**
- Cursor changes to crosshair
- Click empty area → opens "Add Node" form pre-filled with clicked lat/lng
- Click existing node → selects it, shows edit panel; `Delete` key removes it
- With edge-draw mode active: first click highlights source node (amber ring), second click completes edge; `Escape` cancels
- Drag existing node to reposition (updates lat/lng in store, rebuilds graph edges)
- Modified nodes get a `✎` badge on map until saved
- Deleted nodes shown as ghosted red × markers until `[APPLY CHANGES]` is confirmed

**Edit state management:**
- All edits held in a mutable `infraStore` (not the static built-in data)
- Undo/redo stack: up to 20 operations (keyboard `Ctrl+Z` / `Ctrl+Shift+Z`)
- Dirty state indicator in top bar: `● UNSAVED CHANGES` pill in amber when edits pending
- `[APPLY CHANGES]` rebuilds the graph and re-runs full baseline + post-strike analysis
- `[REVERT]` discards all edits since last apply, restores previous infraStore state

---

## Implementation Tasks

### Phase 0 — Project Bootstrap

- [ ] **T-001** Create new SvelteKit app `gulf-resilience/` at `/workspace/gulf-resilience/`
  - `npm create svelte@latest gulf-resilience` (skeleton, TypeScript, no extras)
  - Install: `tailwindcss postcss autoprefixer`
  - Install: `maplibre-gl @deck.gl/core @deck.gl/layers`
  - Install: `graphology graphology-metrics graphology-shortest-path graphology-traversal graphology-communities-louvain`
  - Install: `numeric` (eigenvalue decomposition for Fiedler value)
  - Configure: `@sveltejs/adapter-static`, Tailwind with custom theme (IBM Plex Mono, Barlow Condensed), `vite.config.ts`
  - Update CLAUDE.md with the new app description

- [ ] **T-002** Set up Tailwind design tokens
  - Colors: `threat`, `amber`, `cyan`, `safe`, `surface`, `border` CSS vars
  - Fonts: IBM Plex Mono (data), Barlow Condensed (labels)
  - Scanline utility class: `@layer utilities { .scanlines { ... } }`

---

### Phase 1 — Infrastructure Data

- [ ] **T-003** Define TypeScript types (`src/lib/types.ts`)
  ```ts
  interface InfraNode { id, name, type: NodeType, lat, lng, city, country, operator, capacity_mw? }
  interface InfraEdge { id, source, target, type: EdgeType, name, capacity_tbps?, length_km? }
  type NodeType = 'dc' | 'ixp' | 'cable_landing' | 'pop'
  type EdgeType = 'submarine' | 'terrestrial'
  interface StrikeState { originLat, originLng, radiusKm, weaponTier: 1|2|3|4|5|'custom' }
  interface ResilienceMetrics { rValue, removedNodes, articulationPoints, fiedlerValue, networkEfficiency, vertexConnectivity, topBetweenness: {nodeId, score}[] }
  interface ThreatScenario { id, name, originLat, originLng, radiusKm, notes? }
  interface ValidationError { row: number, field: string, message: string }
  type MergeMode = 'replace' | 'add' | 'update'
  type EditOp = { type: string, payload: unknown, inverse: unknown }
  ```

- [ ] **T-004** Create static built-in dataset (`src/lib/data/infrastructure.ts`)
  - This is the **default/fallback** data — loaded into `infraStore` on first launch if no user data present
  - ~47 nodes covering: UAE (Dubai DX1-3, UAE-IX, DWTC, Equinix DX, Abu Dhabi), KSA (Riyadh, Jeddah, Dammam, JEDIX), Qatar (Doha-IX, Azure/Google cloud regions), Bahrain (AWS ME-1), Oman (Fujairah cable landing, Muscat, Barka, Salalah SN1), Kuwait (Kuwait-IX), Iraq (IRAQ-IXP)
  - ~60 edges: FALCON cable system, TGN-Gulf, 2Africa, SEA-ME-WE series, Qatar-UAE submarine, Bahrain-KSA causeway fiber, KSA East-West backbone, UAE-Oman terrestrial
  - Also export as valid CSV text constants (`BUILTIN_INFRA_CSV`, `BUILTIN_LINKS_CSV`) so users can download them as templates via the import modal

- [ ] **T-005** Build Graphology graph from data (`src/lib/graph/buildGraph.ts`)
  - `buildGraph(nodes, edges)` → `UndirectedGraph` — called by `infraStore.applyChanges()`
  - Attach node attributes: lat, lng, type, name, country
  - Skip edges where source or target node id is not in the current node set (log warning)
  - No longer a singleton — re-built on demand whenever `applyChanges()` fires

---

### Phase 2 — Map Foundation

- [ ] **T-006** `Map.svelte` — MapLibre GL canvas with deck.gl overlay
  - MapLibre with dark basemap (Stadia Alidade Smooth Dark or equivalent free tile source)
  - deck.gl `Deck` instance in `useEffect`/`onMount` with `useDevicePixels: true`
  - ViewState store: initial center `[54.0, 24.5]` (Gulf region), zoom 5, pitch 30
  - Export `deckInstance` and `mapInstance` for layer components

- [ ] **T-007** `InfraLayer.svelte` — infrastructure nodes + edges
  - `ScatterplotLayer` for nodes, color-coded by `NodeType`
  - `LineLayer` for submarine cables (cyan, width 2)
  - `LineLayer` for terrestrial fiber (amber, dashed via dash extension)
  - Node radius scales with betweenness centrality rank
  - `onHover` → dispatch `nodeHover` event

- [ ] **T-008** Node hover tooltip component (`NodeTooltip.svelte`)
  - Follows cursor, monospace font
  - Fields: name, type badge, city/country, betweenness rank, "ARTICULATION POINT ⚠" flag

---

### Phase 3 — Strike Mechanics

- [ ] **T-009** Strike state store (`src/lib/stores/strike.ts`)
  - `$state`: `originLat`, `originLng`, `radiusKm`, `weaponTier`
  - `WEAPON_PRESETS`: `{ T1: 1000, T2: 1450, T3: 2000, T4: 2500, T5: 3000 }`
  - `LAUNCH_SITES`: `{ WESTERN_IRAN: [32.5, 48.0], HORMUZ: [26.5, 56.2], YEMEN: [15.5, 44.0] }`
  - Derived: `nodesWithinRadius(nodes, origin, radiusKm)` using haversine distance

- [ ] **T-010** `StrikeLayer.svelte` — deck.gl layers for threat radius + origin
  - `PolygonLayer` or `ScatterplotLayer` threat circle: generate circle polygon (360-point approximation), amber stroke + red fill at 15% opacity
  - Strike origin: custom `IconLayer` crosshair icon (SVG → data URL), draggable via `onDrag` handler
  - Highlight removed nodes: overlay `ScatterplotLayer` with red fill + pulse via `@keyframes` in CSS (size oscillation via JS timer updating `radiusScale`)

- [ ] **T-011** `StrikeControlSidebar.svelte` — left sidebar
  - Strike origin section: lat/lng inputs (monospace), launch site preset buttons
  - Weapon tier section: 5 stacked buttons, active highlighted, custom slider
  - Infrastructure filter toggles (checkboxes styled as terminal toggles)
  - Country filter pill group

---

### Phase 4 — Graph Analysis Engine

- [ ] **T-012** `articulationPoints.ts` — Tarjan's bridge-finding algorithm
  - Input: `UndirectedGraph` (graphology)
  - Output: `Set<nodeId>` of articulation points
  - Implementation: iterative DFS with `disc[]`, `low[]`, parent tracking (~70 lines)
  - Tested against known examples before integration

- [ ] **T-013** `betweennessCentrality.ts` — Brandes' algorithm
  - Use `graphology-metrics` `betweennessCentrality(graph)` if available, else implement Brandes
  - Output: `Record<nodeId, normalizedScore>` (normalized to [0,1])
  - Flag nodes above 90th percentile as HIGH_CRITICALITY
  - Returns sorted top-N list

- [ ] **T-014** `fiedlerValue.ts` — algebraic connectivity via Laplacian eigenvalue
  - Build n×n Laplacian matrix `L = D − A` as flat array
  - Use `numeric.eig(L)` → sort eigenvalues ascending → return λ₂ (second smallest)
  - Also return Fiedler vector (eigenvector of λ₂) for bisection visualization
  - Handle disconnected graph (λ₂ = 0) gracefully

- [ ] **T-015** `networkEfficiency.ts` — Latora & Marchiori global efficiency
  - All-pairs BFS on graph: `O(V(V+E))`
  - E = [1/(n(n-1))] × Σ 1/d(i,j), disconnected pairs contribute 0
  - Returns scalar 0–1

- [ ] **T-016** `rValue.ts` — largest connected component ratio
  - Use `graphology-components` `largestConnectedComponent(graph)` or custom BFS
  - R = `|LCC| / |V_total|` (ratio against original full graph, not post-strike graph)
  - Also return all components as `nodeId[][]` for visualization

- [ ] **T-017** `vertexConnectivity.ts` — min vertex cut via max-flow
  - Node splitting: v → v_in, v_out with capacity 1 edge
  - Original edges → infinite-capacity directed edges (both directions)
  - Edmonds-Karp BFS max-flow (~120 lines)
  - Global κ(G): iterate over all pairs involving minimum-degree vertex as source
  - Short-circuit: if articulation point exists, κ ≤ 1

- [ ] **T-018** `analyzeGraph.ts` — orchestrator
  - `analyzeGraph(fullGraph, removedNodeIds): ResilienceMetrics`
  - Build post-strike subgraph by copying graph and dropping removed nodes
  - Run all 5 metrics on post-strike subgraph
  - Also compute baseline metrics (cached on first run)
  - Returns `{ baseline: ResilienceMetrics, postStrike: ResilienceMetrics }`
  - Uses `Promise` with `setTimeout(0)` yields to avoid blocking UI during heavy computation

---

### Phase 5 — Worst-Case Strike Algorithm

- [ ] **T-019** `worstCaseStrike.ts` — Neumayer/Modiano circular disk optimization
  - Input: launch site (lat/lng), max range from launch site (weapon tier radius), strike radius `r`
  - Search space: grid of candidate strike centers within `max_range` of launch site
  - For each candidate center: count nodes within `r`, compute R-value, track minimum
  - Optimization: start with coarse grid (50km spacing), refine around top-3 candidates (10km spacing)
  - Output: `{ optimalLat, optimalLng, rValue, removedCount }`
  - Runs in Web Worker to avoid blocking (postMessage protocol)

- [ ] **T-020** `workerBridge.ts` — Web Worker wrapper for background analysis
  - Spawns `analysis.worker.ts`
  - Exposes `runAnalysis(removedIds): Promise<MetricsResult>`
  - Exposes `runWorstCase(launchSite, weaponRadius, strikeRadius): Promise<WorstCaseResult>`
  - Cancels in-flight computations when new request arrives (version counter)

---

### Phase 6 — Metrics UI

- [ ] **T-021** `MetricsPanel.svelte` — right sidebar dashboard
  - R-value arc gauge (SVG, amber→red transition): `r-value-gauge.ts` helper
  - "Removed N / Total M" node count display
  - Delta cards for all secondary metrics (2-col grid):
    - Each card: metric name, before value, arrow, after value, delta in red/green
    - CRT glow effect on changed values

- [ ] **T-022** `BetweennessTable.svelte` — top betweenness nodes post-strike
  - Sortable by rank, score, country
  - Highlight rows where node is also articulation point
  - Flag nodes that increased in criticality post-strike (new bottlenecks)

- [ ] **T-023** `ComponentList.svelte` — disconnected components panel
  - Shows isolated subgraphs post-strike
  - Each component: node count, names, total capacity if DC
  - Click to fly-to on map

- [ ] **T-024** Metrics animation system
  - Counter roll animation for numeric values (requestAnimationFrame, 600ms ease-out)
  - Applies to R-value arc, all delta numbers
  - Amber glow pulse on first render of post-strike values

---

### Phase 7 — App Shell & Integration

- [ ] **T-025** `+page.svelte` — main app shell
  - Full-screen layout with CSS grid: `260px map 320px`, rows: `48px 1fr 56px`
  - Wire all stores: strike state → analysis trigger → metrics display
  - `$effect` on `strikeState` changes → debounced `analyzeGraph` call (300ms)
  - Keyboard shortcuts: `1–5` weapon tiers, `Space` worst-case, `Escape` deselect

- [ ] **T-026** `TopBar.svelte`
  - Classification banner pill (amber: UNCLASSIFIED // FOUO)
  - App title in Barlow Condensed
  - Live stats: `47 NODES · 63 EDGES · [●] COMPUTING` / `[●] READY`
  - Baseline/Strike toggle pill

- [ ] **T-027** `NodeDetailBar.svelte` — bottom info strip (56px)
  - Displays hovered/selected node details
  - Monospace: `[DC]  Equinix DX1  ·  Dubai, UAE  ·  BETWEENNESS: 0.847  ·  ⚠ ARTICULATION POINT`
  - Slides up on node hover, slides down when no hover

- [ ] **T-028** Fiedler bisection layer in map
  - After analysis, extract Fiedler vector sign partition (positive vs negative nodes)
  - Compute convex hull boundary between the two partitions
  - Render as magenta dashed `PathLayer` showing the "weakest split" in the network

---

### Phase 8 — Polish & QA

- [ ] **T-029** Scanline + CRT atmosphere CSS
  - Global scanline overlay: `body::after` with `repeating-linear-gradient`
  - Amber glow on active sidebar sections: `box-shadow: 0 0 12px rgba(212,130,10,0.3)`
  - Subtle noise texture on sidebar backgrounds
  - Pulse keyframe animation for nodes within strike radius

- [ ] **T-030** Radar sweep animation for worst-case computation
  - While `worstCaseStrike` worker is running, render rotating arc on map centered on launch site
  - `deck.gl` custom `PolygonLayer` updated at 30fps with rotating wedge
  - Stops and snaps origin to result when complete

- [ ] **T-031** Responsiveness + edge cases
  - Handle graph with 0 removed nodes (all metrics show baseline, no deltas)
  - Handle fully disconnected graph (R=0, efficiency=0, κ=0)
  - Graceful loading state for first map tile render
  - Error boundary for numeric.js eigenvalue failures (matrix not converging)

- [ ] **T-032** Update `/workspace/CLAUDE.md` and memory
  - Document `gulf-resilience/` app in CLAUDE.md
  - Update `/home/node/.claude/projects/-workspace/memory/` with project context

---

### Phase 9 — CSV Import System

- [ ] **T-033** Define CSV schemas and validation rules (`src/lib/csv/schemas.ts`)
  - `INFRA_REQUIRED = ['id','name','type','lat','lng']`
  - `LINKS_REQUIRED = ['id','source','target','type']`
  - `THREATS_REQUIRED = ['id','name','origin_lat','origin_lng','radius_km']`
  - `VALID_NODE_TYPES = ['dc','ixp','cable_landing','pop']`
  - `VALID_EDGE_TYPES = ['submarine','terrestrial']`
  - `validateInfraRow(row): ValidationError[]` — type check, lat/lng range, id uniqueness
  - `validateLinksRow(row, nodeIds): ValidationError[]` — source/target must exist in known ids
  - `validateThreatsRow(row): ValidationError[]` — lat/lng range, radius 10–5000 km

- [ ] **T-034** `csvParser.ts` — lightweight CSV parser + typed output
  - `parseCSV(text: string): string[][]` — handles quoted fields, newlines in values, CRLF
  - `parseInfraCSV(text): { rows: InfraNode[], errors: ValidationError[] }`
  - `parseLinksCSV(text, existingNodeIds): { rows: InfraEdge[], errors: ValidationError[] }`
  - `parseThreatsCSV(text): { rows: ThreatScenario[], errors: ValidationError[] }`
  - `generateTemplateCSV(type: 'infra'|'links'|'threats'): string` — returns example CSV with header + 2 sample rows
  - No external CSV library — keep it ~80 lines, handle only the supported schema

- [ ] **T-035** `infraStore.ts` — reactive store replacing static singleton (`src/lib/stores/infra.ts`)
  - `$state nodes: InfraNode[]` — initialized from built-in data, can be replaced
  - `$state edges: InfraEdge[]` — initialized from built-in data
  - `$state scenarios: ThreatScenario[]` — loaded from localStorage on init
  - `mergeNodes(incoming, mode: 'replace'|'add'|'update')` — handles all three import modes
  - `mergeEdges(incoming, mode)` — validates source/target exist before merging
  - `isDirty: boolean` — true when store differs from last-applied state
  - `applyChanges()` — snapshots current state, triggers graph rebuild, saves scenarios to localStorage
  - `revert()` — restores to last snapshot
  - `undoStack / redoStack` — up to 20 operations each; push on every mutation

- [ ] **T-036** `DataImportModal.svelte` — import UI overlay
  - Opens from top bar `[↑ IMPORT DATA]` button, full-screen modal with dark overlay
  - Three column layout: `infra.csv` | `links.csv` | `threats.csv`
  - Each column:
    - Drop zone (dashed amber border, file icon, drag-over highlight)
    - `[DOWNLOAD TEMPLATE]` link (triggers `generateTemplateCSV` download)
    - On file loaded: show `✓ 47 rows parsed` or error list in monospace red
    - Merge mode radio: `REPLACE ALL` / `ADD NEW` / `UPDATE MATCHING`
  - `[APPLY IMPORT]` button (disabled until at least one file loaded with no errors)
  - Error display: scrollable, monospace, `row N: <field>: <message>` format

- [ ] **T-037** CSV export (`src/lib/csv/export.ts`)
  - `exportInfraCSV(nodes): string` — serializes current nodes to CSV
  - `exportLinksCSV(edges): string`
  - `exportThreatsCSV(scenarios): string`
  - `downloadAllAsZip()` — uses JSZip to bundle all three as `gulfnet-data.zip`
  - Top bar `[↓ EXPORT DATA]` button triggers `downloadAllAsZip()`

---

### Phase 10 — Layer Editor (Edit Mode)

- [ ] **T-038** Edit mode store (`src/lib/stores/editMode.ts`)
  - `$state isEditMode: boolean`
  - `$state activeTab: 'nodes'|'edges'|'scenarios'`
  - `$state edgeDrawMode: boolean` — when true, map clicks complete edges
  - `$state edgeDrawSource: string | null` — first node id selected for edge
  - `$state clickToPlaceMode: boolean` — when true, map click fills lat/lng in add-node form
  - `$state pendingNode: Partial<InfraNode> | null` — form state for add/edit
  - `$state pendingEdge: Partial<InfraEdge> | null`
  - `$state selectedNodeId: string | null`
  - `$state selectedEdgeId: string | null`

- [ ] **T-039** `LayerEditorSidebar.svelte` — replaces StrikeControlSidebar when edit mode active
  - Sub-tab row: `NODES` | `EDGES` | `SCENARIOS` (styled as terminal tabs with amber underline on active)
  - **Nodes tab:**
    - Search input (filters list in real-time by name/city/country)
    - Type filter pills: ALL · DC · IXP · CLS · POP
    - Scrollable node list: `[type-icon] name · city · [✎] [✕]`
    - Inline `[+ ADD NODE]` form (collapsible, opens below list):
      - Fields: name, type dropdown, lat (number), lng (number), city, country, operator, capacity_mw
      - `[📍 PICK ON MAP]` activates `clickToPlaceMode`, fills lat/lng on click
      - `[SAVE]` / `[CANCEL]`
    - Click `[✎]` → same form pre-filled with node data, shows `[UPDATE]` / `[CANCEL]`
    - Click `[✕]` → inline confirmation: `DELETE Equinix DX1? This removes 4 connected edges. [CONFIRM] [CANCEL]`
  - **Edges tab:**
    - Scrollable edge list: `[type-icon] source → target · name · [✎] [✕]`
    - `[+ ADD EDGE]` button → activates `edgeDrawMode` with instruction text
    - Inline edge form: source (searchable select, populated from node ids), target (same), type dropdown, name, capacity_tbps, length_km
    - While `edgeDrawMode` active: status text `CLICK NODE A ON MAP…` / `CLICK NODE B…`; `[CANCEL DRAW]` button
  - **Scenarios tab:**
    - List from `infraStore.scenarios`: `name · radius km · [▶] [✎] [✕]`
    - `[▶ LOAD]` sets strike origin + radius from scenario, exits edit mode
    - `[SAVE CURRENT STRIKE]` → opens mini-form (name, notes) → saves to scenarios
    - Displays which scenarios came from uploaded threats.csv vs were saved in-session

- [ ] **T-040** Map edit interactions (`Map.svelte` additions)
  - When `isEditMode`:
    - Map cursor: `crosshair`
    - Click empty area: if `clickToPlaceMode` → fill pendingNode lat/lng and exit clickToPlaceMode; else open quick-add popover at click position
    - Click node: if `edgeDrawMode` → handle edge draw flow (set source → set target → validate no duplicate → create edge); else select node (set selectedNodeId, open edit form)
    - Drag node: update node lat/lng in infraStore (debounced 200ms), mark dirty
  - Node drag: `onDrag` on ScatterplotLayer, only active when `isEditMode`
  - Visual states in edit mode:
    - Selected node: amber outer ring
    - Edge-draw source node: pulsing amber ring
    - Modified-but-unapplied nodes: small `✎` icon via `TextLayer`
    - Deleted-but-unapplied nodes: ghosted red, `×` icon

- [ ] **T-041** Undo/redo system (`src/lib/stores/infra.ts` additions)
  - Every mutation to nodes/edges pushes a `{ type, payload, inverse }` op to `undoStack`
  - `undo()`: pops from undoStack, applies inverse op, pushes to redoStack
  - `redo()`: pops redoStack, re-applies op
  - Stack capped at 20; clears redoStack on any new mutation
  - Keyboard handler in `+page.svelte`: `Ctrl+Z` → `undo()`, `Ctrl+Shift+Z` → `redo()`
  - Top bar shows `↩ N` (undo count) in muted text when stack non-empty

- [ ] **T-042** `EditModeTopBarControls.svelte` — top bar additions when edit mode active
  - `● UNSAVED CHANGES` amber pill (shown when `isDirty`)
  - `[↩ APPLY CHANGES]` button → calls `infraStore.applyChanges()`, rebuilds graph
  - `[REVERT]` button → calls `infraStore.revert()`, restores last snapshot
  - Undo/redo buttons: `← N` / `→ N` with count badges
  - `[✕ EXIT EDIT MODE]` — prompts if dirty: `Unsaved changes will be lost. [DISCARD] [STAY]`

- [ ] **T-043** Update `T-025 +page.svelte` wiring for edit mode
  - When `isEditMode` toggled: swap left sidebar component (StrikeControlSidebar ↔ LayerEditorSidebar)
  - `$effect` on `infraStore.nodes` / `infraStore.edges` → rebuild graph → re-run analysis (only when `!isDirty`)
  - After `applyChanges()`: rebuild graph, recompute baseline metrics, re-run post-strike analysis
  - Bottom detail bar shows edit instructions when `isEditMode`: `CLICK MAP TO ADD NODE  ·  CLICK NODE TO EDIT  ·  DRAG NODE TO REPOSITION`

---

## Dependency Install Reference

```bash
cd /workspace/gulf-resilience

# Core framework
npm install

# Map + rendering
npm install maplibre-gl @deck.gl/core @deck.gl/layers @deck.gl/extensions

# Graph algorithms
npm install graphology graphology-types graphology-metrics \
  graphology-shortest-path graphology-traversal graphology-components

# Linear algebra (Fiedler/eigenvalue)
npm install numeric
npm install --save-dev @types/numeric

# Fonts (via Vite/CSS import from Google Fonts or self-hosted)
# IBM Plex Mono, Barlow Condensed
```

---

## Data Reference — Key Infrastructure Nodes (Seed for T-004)

| ID | Name | Type | Lat | Lng | City | Country |
|---|---|---|---|---|---|---|
| uae-ix | UAE-IX | ixp | 25.204 | 55.270 | Dubai | UAE |
| eq-dx1 | Equinix DX1 | dc | 25.197 | 55.274 | Dubai | UAE |
| eq-dx2 | Equinix DX2 | dc | 25.201 | 55.278 | Dubai | UAE |
| du-gdh | Gulf Data Hub | dc | 25.185 | 55.261 | Dubai | UAE |
| ad-khazna | Khazna AD | dc | 24.453 | 54.377 | Abu Dhabi | UAE |
| bh-aws | AWS ME-1 | dc | 26.215 | 50.586 | Manama | BHR |
| qa-msft | Azure QA | dc | 25.285 | 51.530 | Doha | QAT |
| qa-doha-ix | Doha-IX | ixp | 25.286 | 51.533 | Doha | QAT |
| sa-riyadh | Saudi DC Hub | dc | 24.688 | 46.722 | Riyadh | KSA |
| sa-jedix | JEDIX / Center3 | ixp | 21.543 | 39.173 | Jeddah | KSA |
| sa-dam | Dammam DC | dc | 26.432 | 50.106 | Dammam | KSA |
| om-fujairah | Fujairah CLS | cable_landing | 25.127 | 56.336 | Fujairah | OMN |
| om-muscat | Muscat CLS | cable_landing | 23.614 | 58.593 | Muscat | OMN |
| om-salalah | Equinix SN1 | dc | 17.015 | 54.090 | Salalah | OMN |
| iq-ixp | IRAQ-IXP | ixp | 33.312 | 44.361 | Baghdad | IRQ |
| kw-ix | Kuwait-IX | ixp | 29.369 | 47.978 | Kuwait City | KWT |

*(Full dataset of ~47 nodes to be created in T-004)*

---

## Weapon Preset Reference (for T-009)

| Tier | Radius (km) | Key Systems | Default Selected |
|---|---|---|---|
| T1 | 1,000 | Ya Ali 700, Shahed-131 900, Abu Mahdi 1000 | — |
| T2 | 1,450 | Kheibar Shekan 1450, Fattah-1 1400, Shahab-3 1300 | ✓ |
| T3 | 2,000 | Sejjil-2 2000, Emad 1700, Ghadr-F 1950 | — |
| T4 | 2,500 | Shahed-136 2500, Shahed-149 2500, Arash-2 2000 | — |
| T5 | 3,000 | Khorramshahr (light) 3000, Soumar 3000 | — |

Default launch site: Western Iran `[32.5, 48.0]`
