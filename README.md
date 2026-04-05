# GULFNET RESILIENCE

A browser-based network resilience assessment tool for critical cloud infrastructure. Visualises regional cloud provider nodes as a graph, computes graph-theoretic resilience metrics, and lets you simulate missile strike scenarios to analyse post-strike network degradation.

> **Vibe-coded** — this entire application was built in a single session using [Claude Code](https://claude.com/claude-code), Anthropic's agentic CLI. No pre-written boilerplate, no templates. The AI read the source data, designed the architecture, wrote every component, debugged shader failures, and iterated on UX — all from natural-language prompts.

---

## What It Does

### Network Graph
Cloud provider regions (AWS, Azure, GCP, Oracle, IBM, Huawei, Tencent, Alibaba, OVH) are loaded as nodes and connected by nearest-neighbour edges — terrestrial (<800 km) or submarine (>800 km). Nodes are spatially aggregated into **H3 hexagonal cells** (resolution 7, ~80 km edge) so co-located providers appear as a single point on the map.

### Resilience Metrics
Computed on every change using **Graphology**:

| Metric | Description |
|---|---|
| **R-value** | Ratio of largest connected component to total nodes |
| **Fiedler λ₂** | Algebraic connectivity — how well-connected the graph is overall |
| **Network efficiency** | Average inverse shortest-path length |
| **Vertex connectivity κ(G)** | Minimum nodes to remove to disconnect the graph |
| **Articulation points** | Nodes whose removal splits the network |
| **Betweenness centrality** | Brandes algorithm — nodes on the most critical shortest paths |

### Strike Planner
- Drag an origin marker or pick from a library of named launch sites
- Select weapon tier (T1–T5, modelled on real missile systems) which sets the strike radius
- Multi-site selection unions all radii into a single polygon
- **WORST-CASE** solver scans candidate positions to find the origin that minimises post-strike R-value

### Strike Simulator
Activate targeting mode and click any node to fire:
- Great-circle arc trajectories rendered with `deck.gl ArcLayer`
- Warhead dot follows the exact arc path in 3D (replicates deck.gl's internal `project_globe_` / `paraboloid` vertex shader formula)
- On impact: flash → inner shockwave ring → outer shockwave ring → lingering crater glow
- Struck nodes are removed from the graph and metrics update in real time
- **PROVIDER IMPACT** bar chart shows which cloud providers have taken the most hits

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 (runes) |
| 3D rendering | deck.gl 9 |
| Basemap | MapLibre GL 5 |
| Graph engine | Graphology |
| H3 spatial index | h3-js |
| Polygon union | polygon-clipping |
| Styling | Tailwind CSS 4 |
| Build | Vite + adapter-static |

Everything runs client-side. There is no backend.

---

## Getting Started

```bash
cd gulf-resilience
npm install
npm run dev        # dev server → http://localhost:5173
npm run build      # production build → build/
npm run preview    # preview production build
```

Deploy the `build/` directory to any static host (Netlify, Vercel, S3, Cloudflare Pages).

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `1` – `5` | Select weapon tier |
| `Space` | Run worst-case strike analysis |
| `Ctrl+Z` | Undo last graph edit |
| `Ctrl+Shift+Z` | Redo |
| `Delete` | Remove selected node |
| `Esc` | Cancel current action / close panels |

---

## Data

`/data/data.json` — structured list of cloud provider metro regions with lat/lon coordinates. Each `cloud_service_providers` entry becomes a node; the `name` field is the provider (e.g. `"Amazon Web Services"`). Edges are generated at build time using a 4-nearest-neighbour heuristic with a distance cap.

To swap the dataset, edit `src/lib/data/infrastructure.ts` or re-run the generation script against a new `data.json`.

---

## Architecture Notes

**H3 aggregation** — raw nodes are binned into H3 cells at resolution 7. All graph metrics run on the cell graph for stability. `betweennessScores` is dual-keyed (cell IDs + raw node IDs) so the sidebar can show individual node names while the map renders one dot per cell.

**Arc math** — deck.gl's `ArcLayer` with `greatCircle: true` uses a non-standard axis convention in its vertex shader (`project_globe_` returns `[sin(lng)·cos(lat), -cos(lng)·cos(lat), sin(lat)]`). The warhead `ScatterplotLayer` replicates this exactly in JavaScript — including the `.yxz` swizzle and `paraboloid(angularDist · EARTH_RADIUS, 0, 0, t)` elevation formula — so the dot stays precisely on the arc in 3D.

**No custom shaders** — an earlier attempt animated arc length via GLSL uniform injection. deck.gl v9 / luma.gl v9 replaced the old `model.setUniforms()` path with a module-based `shaderInputs` system, making ad-hoc injection unreliable. The final approach drives all animation from JavaScript by recomputing layer data every tick.

---

## How It Was Built

This project was vibe-coded from scratch using **Claude Code** (`claude-sonnet-4-6`) in a single extended conversation. The workflow was entirely prompt-driven:

1. **Describe the idea** — *"a SIGINT terminal-aesthetic resilience tool for Gulf cloud infrastructure"*
2. **Iterate on features** — each prompt added or refined a capability; Claude read the relevant files, proposed a plan, and wrote the code
3. **Debug in the loop** — runtime errors were pasted back; Claude diagnosed root causes (the luma.gl v9 uniform system change, an `import Map` shadowing the JS `Map` constructor, z-fighting between overlapping deck.gl layers) and fixed them
4. **Polish** — a final *"polish the app and tie off loose ends"* prompt produced the favicon, error page, status bar hints, attribution styling, and CSS fixes in one pass

The entire codebase — ~3,500 lines across 30+ files — was written by the model. No line was typed by hand.
