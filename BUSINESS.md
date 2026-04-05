# Building a network resilience tool for kinetic threat analysis in the Gulf

**A geographic threat-radius model overlaid on data center and POP infrastructure graphs is both technically feasible and fills a genuine gap in publicly available tools.** The Neumayer/Modiano body of work (MIT/Columbia, 2009–2015) provides the theoretical foundation—modeling disasters as circular disk failures on geographically-embedded network graphs—but no unified open-source tool exists that combines configurable weapon-range radii, real infrastructure topology, and automated graph connectivity analysis. Iranian strike systems range from **1,000 km to 3,000 km** depending on platform, covering the entire Gulf region from launch sites in western Iran. The Gulf's infrastructure is acutely vulnerable: data centers cluster in just a handful of cities, submarine cables funnel through two contested chokepoints (Strait of Hormuz, Red Sea), and the region's primary IXP (UAE-IX in Dubai) is a single aggregation point for most Middle East peering traffic.

---

## Iranian strike ranges form natural preset tiers for radius analysis

Iran's arsenal spans three categories with distinct range profiles ideal for mapping tool presets. For a radius-selection UI, the data clusters into **five practical tiers** based on weapon capability.

**Tier 1 — 700–1,000 km (short-range cruise missiles and small drones):** The Ya Ali air-launched cruise missile (**700 km**), Quds-1 ground-launched cruise missile (**700–800 km**), Shahed-131 one-way attack drone (**700–900 km**), and Abu Mahdi naval/land-attack cruise missile (**1,000 km**) define this band. These systems would cover targets within the immediate Persian Gulf littoral from Iranian territory—reaching Bahrain, Qatar, Kuwait, and eastern Saudi Arabia.

**Tier 2 — 1,300–1,500 km (core ballistic missile force):** This is Iran's workhorse range. The Shahab-3 (**~1,300 km**), Fattah-1 (**1,400 km**), Haj Qasem (**1,400 km**), Kheibar Shekan (**1,450 km**), and Fattah-2 (**1,400–1,500 km**) all cluster here. From western Iran, this radius covers all Gulf states including the UAE's Dubai/Abu Dhabi data center clusters and reaches into Oman's northern coast.

**Tier 3 — 1,650–2,000 km (extended ballistic and cruise missiles):** The Emad (**1,700 km**), Ghadr variants (**1,600–1,950 km**), Paveh cruise missile (**1,650 km**), Hoveyzeh cruise missile (**1,350 km**), Sejjil-2 solid-fuel MRBM (**2,000 km**), and Khorramshahr with standard warhead (**2,000 km**) define this tier. This radius encompasses the entire Arabian Peninsula, reaching Oman's southern coast (Salalah), Jeddah on the Red Sea, and Jordan's Aqaba—all critical cable landing hubs.

**Tier 4 — 2,000–2,500 km (long-range drones and extended missiles):** The Shahed-136 one-way attack drone (**2,000–2,500 km**), Shahed-149 Gaza HALE drone (**2,500 km radius**), and Arash-2 loitering munition (**1,000–2,000 km**) provide persistent-threat coverage. Drones are slower (~180 km/h for Shahed-136) but cheaper ($20,000–50,000 each) and launched in swarms, making them relevant for sustained infrastructure harassment.

**Tier 5 — 3,000+ km (maximum theoretical range):** The Khorramshahr with a reduced ~750 kg warhead reaches an estimated **3,000 km** per European intelligence assessments. The Soumar cruise missile claims **2,500–3,000 km** though independent analysts consider this disputed. Iran's self-imposed 2,000 km range cap appears to have been exceeded in recent operations. The Shahed-149 Gaza drone's updated variant claims **7,000 km total range**. These figures should be included as maximum-threat presets.

### Consolidated range reference table

| System          | Type                 | Range (km)                  | Notes                           |
| --------------- | -------------------- | --------------------------- | ------------------------------- |
| Ya Ali          | ALCM                 | 700                         | Air-launched                    |
| Quds-1          | GLCM                 | 700–800                     | Houthi variant of Paveh         |
| Shahed-131      | OWA drone            | 700–900                     | 15 kg warhead                   |
| Abu Mahdi       | Cruise missile       | 1,000                       | Anti-ship + land attack         |
| Dezful          | Solid MRBM           | 1,000                       | Extended Zolfaghar              |
| Shahab-3        | Liquid MRBM          | ~1,300                      | Being replaced; CEP ~2,500 m    |
| Hoveyzeh        | GLCM                 | 1,350                       | Tested to 1,200 km              |
| Fattah-1        | Solid MRBM (MaRV)    | 1,400                       | "Hypersonic" claim disputed     |
| Haj Qasem       | Solid MRBM           | 1,400                       | Two-stage                       |
| Fattah-2        | Solid MRBM (HGV)     | 1,400–1,500                 | Largely unproven                |
| Kheibar Shekan  | Solid MRBM           | 1,450                       | Compact; combat-proven Oct 2024 |
| Paveh           | GLCM                 | 1,650                       | Longest confirmed Iranian CM    |
| Emad            | Liquid MRBM          | 1,700                       | CEP ~500 m; guided MaRV         |
| Ghadr-F         | Liquid MRBM          | 1,950                       | CEP ~300 m; combat-proven       |
| Shahed-136      | OWA drone            | 2,000–2,500                 | ~40 kg warhead; $20–50K each    |
| Khorramshahr    | Liquid MRBM          | 2,000 (std) / 3,000 (light) | Nuclear-capable design          |
| Sejjil-2        | Solid MRBM (2-stage) | 2,000                       | Fast-launch solid fuel          |
| Shahed-149 Gaza | HALE UCAV            | 2,500 (radius)              | 500 kg payload; MQ-9 class      |
| Soumar          | GLCM                 | 700–3,000 (disputed)        | Kh-55 copy; range uncertain     |
| Arash-2         | Loitering munition   | 1,000–2,000                 | Up to 260 kg warhead            |

**Key implementation note:** Reusable drones (Mohajer-6, Shahed-129) have airframe ranges of 2,000+ km but effective operational radii of only **200–500 km** due to datalink limitations. One-way attack drones (Shahed-136, Arash) use GPS/INS guidance and fly their full range autonomously. For threat modeling, use full range for OWA drones and ballistic/cruise missiles; use datalink range for reusable ISR platforms.

---

## Six graph metrics form the core resilience scoring engine

The tool needs a computationally tractable set of metrics that together capture different dimensions of network robustness. Based on the academic literature—particularly the survey by Oehlers & Fabian (2021) in _Mathematics_ and the IEEE Access survey by Wan et al. (2021)—here are the essential metrics ordered by implementation priority.

**Articulation points (cut vertices)** should be computed first because they are the cheapest and most immediately actionable metric. Tarjan's DFS-based algorithm runs in **O(V+E)** time. A vertex u is an articulation point if: (a) it is the DFS root with two or more children, or (b) it has a child v where `low[v] ≥ disc[u]`, meaning no back-edge from v's subtree reaches above u. In physical terms, any data center or POP that is an articulation point represents a **single point of failure**—its destruction disconnects the network. Zero articulation points means the network is biconnected (κ(G) ≥ 2). The algorithm requires two arrays (`disc[]` and `low[]`), a parent tracker, and a DFS timer.

**Betweenness centrality** identifies critical bottleneck nodes even when no single-point failures exist. Brandes' algorithm (2001) computes all-node betweenness in **O(VE)** for unweighted graphs using a BFS forward pass to accumulate shortest-path counts (σ values), followed by a backward dependency accumulation pass using a stack. Nodes with betweenness significantly above the mean are disproportionately important to routing. For the tool, **normalize betweenness to [0,1]** by dividing by (n-1)(n-2)/2, and flag nodes above the 90th percentile as high-criticality targets.

**Vertex connectivity κ(G)** answers the question: how many nodes must an attacker destroy to disconnect the network? Computed via max-flow on an auxiliary graph where each vertex v splits into v_in and v_out connected by a unit-capacity edge, with original edges mapped to infinite-capacity directed edges. Global κ(G) requires O(V) max-flow computations using Even's optimization (fix the minimum-degree vertex as source). **Complexity is O(V²E)** with Edmonds-Karp, which is acceptable for networks under ~500 nodes. Whitney's theorem guarantees κ(G) ≤ λ(G) ≤ δ(G), so minimum degree provides a quick upper bound.

**Algebraic connectivity (Fiedler value λ₂)** is the second-smallest eigenvalue of the graph Laplacian matrix L = D − A. It provides a continuous measure of connectivity strength: λ₂ > 0 iff the graph is connected, and higher values indicate greater robustness to partitioning. Construct L as an n×n matrix where L[i][i] = degree(i) and L[i][j] = −1 for edges. Use `numeric.js` (`numeric.eig()`) for eigenvalue decomposition. **Interpretation thresholds**: λ₂ < 0.1 is poorly connected; λ₂ ≥ 1.0 is well-connected. The corresponding Fiedler eigenvector reveals the network's natural bisection—where it would split most easily—which can be visualized on the map.

**Network efficiency** (Latora & Marchiori, 2001) handles disconnected subgraphs gracefully, which matters after simulated node removal. Global efficiency E = [1/(n(n-1))] × Σ 1/d(i,j), where disconnected pairs contribute 0. Values range from 0 to 1. Compute via all-pairs BFS: **O(V(V+E))**. This metric is ideal for measuring degradation: compute E_before and E_after removing nodes within the threat radius, then report the percentage drop.

**R-value (largest connected component ratio)** after node removal is the most intuitive metric for the tool's primary use case. After removing all nodes within a strike radius, R = |LCC| / |V|. Plot this for different strike positions or as a function of radius to generate a resilience curve. The area under the R-curve across all possible attack positions provides a single resilience score. **This is the metric to display most prominently** in the UI.

### JavaScript implementation architecture

Use **Graphology** as the core graph data structure (npm: `graphology` + `graphology-library`), which provides adjacency list representation, BFS/DFS traversal, shortest paths, and betweenness centrality out of the box. Implement articulation points via custom Tarjan's algorithm (straightforward ~60 lines). For vertex/edge connectivity, implement Edmonds-Karp max-flow (~100 lines). For algebraic connectivity, use **numeric.js** for eigenvalue decomposition of the Laplacian. For visualization with geographic overlay, **Cytoscape.js** offers both graph algorithms and rendering, or pair Graphology with **sigma.js** (WebGL) plus **Leaflet/Mapbox** for the geographic layer.

---

## Academic prior art validates the approach but reveals a tool gap

The most directly relevant body of work comes from Sebastian Neumayer and Eytan Modiano at MIT, whose 2009–2015 papers established the theoretical foundation for exactly this type of analysis. Their 2012 paper "Geographic Max-Flow and Min-Cut Under a Circular Disk Failure Model" models infrastructure destruction as a **circular disk of radius r** overlaid on a geographically-embedded network graph—precisely the blast-radius approach this tool would implement. They developed polynomial-time algorithms to find the worst-case disk placement that maximizes network disruption, applied to real submarine cable topology data. Their earlier 2009 paper introduced line-segment cuts (modeling linear disasters like earthquakes along fault lines), and the 2010 paper extended to random geographic failure probability distributions.

The **ENRN framework** (Alenazi, 2023, published in MDPI Mathematics) is the closest existing implementation to what the tool aims to be. Built in Python using NetworkX, GeoPandas, and Contextily, it overlays hurricane tracks onto U.S. backbone network topologies (AT&T, Sprint, Level3, Internet2) and computes resilience metrics including largest connected component and flow robustness as the storm crosses the network. It demonstrates the technical feasibility of real-time geographic-threat overlay on infrastructure graphs, though it targets natural disasters rather than kinetic strikes and uses simplified backbone topologies.

The **ResiliNets project** at the University of Kansas (Sterbenz et al., 2011) provides a comprehensive simulation framework built on ns-3 that models geographically-correlated failures on physical network topologies. It uses area-based challenge models decoupled from network models and has been applied to real carrier topologies. The framework and topology generator (KU-LoCGen) are open-source at resilinets.org.

From the defense sector, **RAND Corporation** published two 2024 reports (RR-A2397 series) analyzing kinetic and hybrid threats to critical infrastructure with cascading failure modeling, though the specific methodologies are not open-source. Oak Ridge National Laboratory built a **Neo4j graph database** of critical infrastructure using DHS HIFLD geospatial data, applying centrality-based vulnerability scoring—demonstrating the graph-database approach to infrastructure vulnerability. The Congressional EMP Commission provided physical threat-radius parameters: nuclear EMP affects areas "the size of Nebraska or larger" from high-altitude burst; ground-level 10 KT detonation EMP extends 2–5 miles; non-nuclear RF weapons reach tens of kilometers.

**The key gap this tool would fill**: no publicly available system combines (1) configurable kinetic threat models with specific weapon-system radii, (2) real or representative data center/POP infrastructure topology with geographic coordinates, (3) automated graph construction and connectivity impact computation, and (4) interactive visualization. The academic work uses synthetic or carrier-backbone topologies; defense tools are classified; and the ENRN framework targets natural disasters on U.S. networks. A Gulf-focused, kinetic-threat-aware tool with the weapon-range presets above would be novel.

---

## Gulf infrastructure concentrates in a handful of vulnerable clusters

The Gulf's data center geography creates a topology that is particularly amenable to threat-radius analysis because **infrastructure concentrates in a small number of cities with limited route diversity between them**.

**Dubai and Abu Dhabi** form the region's dominant cluster, hosting over **376 MW of live capacity** as of 2025 with Khazna Data Centers controlling approximately 70% of operational UAE capacity across both cities. Dubai hosts UAE-IX—the largest IXP in the Middle East with 110+ connected networks and 6+ Tbps capacity—making it the single most critical aggregation point for regional traffic. Equinix operates three facilities (DX1–DX3), alongside Gulf Data Hub, datamena, Moro Hub, and DAMAC's Edgnex. Abu Dhabi is the fastest-growing segment, anchored by the Microsoft-G42 partnership (200 MW expansion). The two cities sit roughly 130 km apart, meaning a single Tier 2 strike radius could potentially cover both clusters.

**Riyadh, Jeddah, and Dammam** form Saudi Arabia's three-point data center triangle with **222 MW total IT power** and 760 MW planned by 2030. Riyadh is the political and economic hub; Jeddah is the primary Red Sea submarine cable landing point (hosting JEDIX and Center3's MENA Gateway); Dammam/Al Khobar on the Gulf coast serves as the eastern connectivity node. Saudi Arabia's **East-West terrestrial fiber backbone** connecting these three cities is the only major overland data route bridging the Persian Gulf to the Red Sea/Mediterranean route to Europe—a critical single corridor.

**Bahrain** punches above its weight as the site of **AWS's first Middle East region** (operational since 2019), concentrated entirely around Manama on an island of just 780 km². Terrestrial connectivity to Saudi Arabia runs via the King Fahad Causeway. **Qatar's** infrastructure clusters in Doha, hosting Microsoft Azure and Google Cloud regions, with Doha-IX as the local exchange point. Both countries have essentially **single-city concentration** with no meaningful geographic diversity.

**Oman** is emerging as a strategic connectivity crossroads rather than a capacity hub. Fujairah (UAE) and Muscat/Barka (Oman) serve as the primary submarine cable landing stations on the Gulf of Oman coast, critically positioned **outside the Strait of Hormuz**. Equinix's SN1 facility in Salalah (opened November 2024) on Oman's southern Arabian Sea coast creates a new cable hub connecting Asia, Africa, Europe, and Australia. Omantel has invested over $1 billion in international networks across 20+ submarine cable systems.

### Connectivity chokepoints create compounding vulnerability

The Gulf's international connectivity funnels through **two contested maritime passages**. The Strait of Hormuz, roughly 50 km wide at its narrowest, carries all Persian Gulf submarine cables including FALCON, TGN-Gulf, and Qatar-UAE systems. The Red Sea carries approximately 17 submarine cables including SEA-ME-WE 3/4/5/6, 2Africa, and multiple regional systems, all passing through waters affected by Houthi operations. Cable damage in 2024–2025 took months to repair due to security constraints on repair vessels.

The planned Fibre in Gulf (FiG) submarine cable system (**720 Tbps**, connecting all GCC states plus Iraq, expected late 2027) and the Al Khaleej cable (SEA-ME-WE 6 branch, expected Q2 2026) would add intra-Gulf capacity but remain within the Strait of Hormuz vulnerability zone. Six competing terrestrial corridors through Iraq, Jordan, and Syria to Turkey/Europe are under development—including stc's SilkLink, Ooredoo's Iraq-Turkey routes, and the Blue-Raman cable's Saudi terrestrial crossing—but none are fully operational.

**DE-CIX dominates regional peering**: it operates the four leading IXPs in the Middle East (UAE-IX, IRAQ-IXP, Doha-IX, Aqaba IX). Saudi Arabia, Bahrain, Kuwait, and Oman lack major independent carrier-neutral IXPs, creating dependence on UAE-IX for inter-network traffic exchange. This IXP concentration is a resilience concern that graph analysis would surface immediately through high betweenness centrality scores for Dubai-based nodes.

---

## Practical implementation roadmap

The research supports a three-layer architecture: a **geographic layer** (Leaflet/Mapbox with threat-radius circles), a **graph layer** (Graphology for topology and metrics), and a **simulation layer** (node removal within radius → recompute metrics → display impact).

For the threat-radius presets, implement five buttons corresponding to the weapon tiers: 1,000 km (short-range cruise/drone), 1,400 km (core ballistic), 1,700 km (extended ballistic), 2,000 km (long-range drone/MRBM), and 3,000 km (maximum theoretical). Allow custom radius entry. The strike origin should default to western Iran (the most likely launch zone for Gulf-directed strikes) but be draggable.

For the graph metrics panel, compute and display in this order: (1) R-value showing what percentage of the network remains in the largest connected component, (2) number of articulation points created by the strike, (3) change in algebraic connectivity (Fiedler value), (4) top-5 nodes by betweenness centrality in the surviving network, and (5) vertex connectivity of the surviving graph. Pre-compute baseline values and show deltas.

The Neumayer/Modiano circular-disk algorithm can be adapted to find the **worst-case strike position** within a given range from a launch point—the disk placement that maximizes disconnection. This is a compelling feature: rather than just showing the impact of a user-placed strike, the tool could compute the optimal adversarial targeting strategy, revealing the network's true vulnerability floor.

## Conclusion

This tool sits at a well-defined intersection of established academic work and a genuine capability gap. The circular-disk failure model is mathematically mature (Neumayer/Modiano, 2009–2015), the graph resilience metrics have standard algorithms with reasonable computational complexity for networks of the relevant scale (dozens to hundreds of nodes), and the Gulf's infrastructure topology—with its extreme geographic concentration, maritime chokepoint dependencies, and single-IXP dominance—is precisely the kind of network where spatial threat analysis reveals non-obvious vulnerabilities. The most novel contribution would be combining weapon-specific range presets with automated worst-case positioning and multi-metric resilience scoring, a combination that does not exist in any publicly available tool today.
