# NEXUS Ω X — Master UI/UX Implementation Plan

**Objective:** Transform the existing frontend cockpit into a futuristic, enterprise-grade AI Command Center aligned with the reference dashboard architecture without breaking existing features or business logic.

---

## 1. Visual Design System Specification

### 1.1 Color Palette & Theme Tokens
```css
/* Background Surfaces */
--bg-command-void:     #050816;   /* Main viewport backdrop */
--bg-cockpit-surface:  #0B1224;   /* Navbars, sidebars & panel bases */
--bg-glass-card:       rgba(16, 26, 48, 0.75); /* Translucent cards */
--border-cyber-cyan:   rgba(6, 182, 212, 0.25);
--border-cyber-purple: rgba(124, 58, 237, 0.25);

/* Neon Accent Hues */
--neon-cyan:           #06B6D4;   /* Telemetry, active selections, primary info */
--neon-purple:         #7C3AED;   /* AI agents, neural pipelines, simulations */
--neon-blue:           #2563EB;   /* Ingress, network links, secondary actions */
--neon-matrix:         #10B981;   /* Healthy systems, verified benchmarks, approvals */
--neon-amber:          #F59E0B;   /* Warnings, moderate risks, pending HITL */
--neon-crimson:        #EF4444;   /* Critical incidents, quarantine, emergency sever */

/* Typography */
--font-mono:           'JetBrains Mono', 'Fira Code', monospace;
--font-sans:           'Inter', system-ui, -apple-system, sans-serif;
```

---

## 2. Layout Structure & Reference Alignment

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│  TOP BAR: NEXUS Ω X Branding · Global Search (Ctrl+K) · Date/Time · Weather · Alerts · User  │
├─────────────┬─────────────────────────────────────────────────────────────────┬───────────────┤
│ LEFT NAV    │ CENTER DIGITAL TWIN COMMAND CENTER                              │ RIGHT DOCKED  │
│             │ • World Selector Header & KPI Summary Bar                       │ NEXUS AI      │
│ • Dashboard │ • 3D WebGL Digital Twin Viewport                                │ ASSISTANT     │
│ • 3D Twin   │   - Interactive Three.js spatial view                           │ • Orb Avatar  │
│ • AI Agents │   - Floating Beacon Callouts (Hostel, Academic, Server, Library)│ • Quick Action│
│ • Simulate  │   - Floating Left Layers Menu (Tiers 0-4)                       │   Buttons     │
│ • Security  │   - Floating Right Tools (Select, Measure, Add Entity, Zoom)    │ • Conversa-   │
│ • Workflows │   - Bottom Simulation Timeline Scrub Bar (Play/Pause/Hours)     │   tional Input│
│ • Analytics ├─────────────────────────────────────────────────────────────────┤ • Suggested   │
│             │ BOTTOM INTELLIGENCE GRID                                        │   Prompts     │
│ • Current   │ ┌───────────────────────────┬─────────────────────────────────┐ │               │
│   World     │ │ AI Agent Council (5 cards)│ Active Incident Panel (Timer)   │ │               │
│ • Quick     │ ├───────────────────────────┼─────────────────────────────────┤ │               │
│   Actions   │ │ Simulation Lab (A/B/C)    │ Analytics Charts & Event Feed   │ │               │
│ • System OK │ └───────────────────────────┴─────────────────────────────────┘ │               │
└─────────────┴─────────────────────────────────────────────────────────────────┴───────────────┘
```

---

## 3. Component Transformation Roadmap

### 3.1 Top Navigation Bar (`Header.tsx`)
- Add **Live Clock & Date** widget (`Mon, 27 Oct 2025 | 10:24 AM`).
- Add **Weather Widget** (`28°C Clear`).
- Center the **Global Command Search Bar** with microphone icon and `<kbd>Ctrl K</kbd>` pill.
- Enhanced User Avatar with Administrator badge and notifications drawer.

### 3.2 Main Viewport (`DigitalTwinViewport.tsx` & `DigitalTwinWorldView.tsx`)
- Enhance the 3D scene with:
  - Holographic floating callout badges directly anchored to 3D node coordinates.
  - Floating Left Tool Palette: Infrastructure Layers (Tiers 0-4).
  - Floating Right Tool Palette: Select, Measure, Add Entity, Draw Zone, Compass.
  - Bottom Timeline Scrubber: Play, Pause, Speed (1x, 2x), and hour markers.

### 3.3 NEXUS AI Assistant Docked Sidebar
- Implement an expandable right-hand AI drawer:
  - Glowing animated AI Orb avatar.
  - One-click prompt action chips ("Analyze an incident", "Simulate a scenario", "Optimize resources").
  - Streaming conversational display.
  - Suggested prompts aligned with campus & enterprise digital twins.

### 3.4 Bottom Contextual Intelligence Grid
- **AI Agent Council**:
  - 5 interactive cards: Investigator (Blue), Security Agent (Crimson), Planner (Purple), Simulation Agent (Amber), Reviewer (Green).
- **Active Incident Card**:
  - Live elapsed timer countdown, 3D holographic server beacon, affected stats, and "Request Approval" dual-custody button.
- **Simulation Lab Comparison**:
  - Side-by-side cards for Scenario A (Backup Server - Recommended), Scenario B (Load Distribution - Moderate Risk), and Scenario C (Wait & Monitor - High Risk) with progress bars for cost, downtime, and success rate.
- **Analytics & Events Stream**:
  - Live event trends and chronological event log with severity badges.

---

## 4. Usability & Performance Invariants
1. **Zero Layout Shifts**: Use fixed-height flex containers and CSS Grid.
2. **Keyboard First**: Every major action accessible via `Ctrl+K` or keyboard accelerators.
3. **Graceful Fallbacks**: If WebGL context is lost, display graph topology view automatically.
4. **Preserved Features**: Existing RBAC, audit ledger, and policy views remain fully accessible via the left navigation.
