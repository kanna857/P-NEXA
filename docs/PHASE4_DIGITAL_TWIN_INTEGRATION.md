# P-NEXA — Phase 4: Digital Twin Viewport & Council Integration

**Version:** 4.0.0-PROD  
**Branch:** `feat/phase4-autonomous-ai-council`  
**Classification:** Restricted / Enterprise Operational Standard  

---

## 1. Overview

The P-NEXA 3D Digital Twin Viewport acts as the primary operational surface for entity discovery, telemetry inspection, and incident triage. In Phase 4, the viewport seamlessly connects to the Autonomous AI Council, enabling operators to transition from observing high-risk entities directly into AI-guided multi-agent investigation and response formulation.

---

## 2. Interaction Flows & Trigger Mechanisms

### 2.1 Entity Selection in 3D Viewport
1. **Selection:**
   - Operators can click on any 3D node mesh directly within the WebGL Three.js canvas or use the quick entity selector dropdown (`[data-testid="entity-select-dropdown"]`).
   - The selected entity displays an animated cyber pulse beacon and triggers camera smooth interpolation (`focusNode(entity)`).
2. **Contextual Inspector Drawer (`[data-testid="entity-inspector"]`):**
   - Displays real-time telemetry (CPU load, memory utilization, network sockets, IP address).
   - Shows active status (`healthy`, `degraded`, `compromised`, `isolated`).
   - Renders action controls including "Investigate Incident with Agent Council" (`[data-testid="investigate-incident-btn"]`).

### 2.2 Viewport to Council Transition
When the operator clicks "Investigate Incident with Agent Council":
1. **Modal Trigger (`AgentInvestigationModal`):**
   - Captures the target entity's live attributes, current topology tier, and active world mode.
   - Dispatches a real-time investigation session.
   - Provides a direct deep-link button: `"Open in AI Council View"`, seamlessly shifting focus to the dedicated `/ai-council` Command Center.
2. **Direct Navigation (`/ai-council`):**
   - Accessible via the Left Sidebar navigation (`[data-testid="nav-ai-council"]`) or Global Command Palette (`Ctrl+K` -> "AI Council Command Center").
   - Preserves state across routes and allows selection from active digital twin entities.

---

## 3. Blast Radius Graph Traversal (`@nexus/twin-graph`)

To prevent localized anomalies from cascading into catastrophic cluster failures, the Digital Twin integrates Breadth-First Search (BFS) blast radius calculation:

```
[Compromised Entity: srv-auth]
           │
           ├──── (Hop 1) ────► [srv-db-replica] (Database Standby)
           │
           └──── (Hop 1) ────► [gw-campus-edge] (Perimeter Gateway)
                                      │
                                      └──── (Hop 2) ────► [edge-switch-01]
```

- **Algorithm:** `computeBlastRadius(graph, originNodeId, maxHops = 2)`
- **Impact Analysis:**
  - Evaluates topological vulnerability scores.
  - Highlights affected 3D nodes and edges with amber/crimson glowing shaders in the viewport.
  - Provides candidate edge-severing options to the Planner Agent.

---

## 4. Preservation of Core 3D Viewport Capabilities

All Phase 2 and Phase 3 viewport capabilities remain 100% intact:
1. **Camera Controls:**
   - Left-click drag: Orbital rotation
   - Shift + Left-click drag: Panning
   - Scroll wheel: Zoom in/out
   - Reset View (`R` key or `[data-testid="reset-camera-btn"]`): Restores default orbital coordinates.
2. **Preset Shortcuts:**
   - Key `1` / Orbital View: 45° angled isometric perspective.
   - Key `2` / Top-Down View: 90° overhead satellite overview.
   - Key `3` / Perimeter Ingress: Ground-level ingress angle.
3. **Accessibility:**
   - Live ARIA announcements on entity selection and camera mode changes.
   - Tab-focusable controls with visible focus rings.
   - Keyboard bypass when typing inside inputs, chat prompts, or modal forms.

