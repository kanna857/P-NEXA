# NEXUS Ω X (P-NEXA) — Prioritized Development Roadmap

**Execution Order:** Phase 1 (Foundation) &rarr; Phase 2 (HUD Shell) &rarr; Phase 3 (3D Digital Twin Viewer) &rarr; Phase 4 (AI Assistant) &rarr; Phase 5 (Intelligence Grid)

---

## Phase 1 — Foundation Verification & Security Hardening (COMPLETED)
- [x] Run `pnpm test` (all 136 tests passing across 17 test suites).
- [x] Run `pnpm lint` (`tsc --noEmit` across all 17 workspace packages).
- [x] Fix unused variables and imports in `apps/web` for strict TypeScript compliance.
- [x] Sanitize `README.md` to remove cleartext demo passwords and add security cautions.
- [x] Verify production Vite build (`dist` created cleanly in 14.6s).
- [x] Commit and push verified foundation to GitHub repository (`kanna857/P-NEXA`).

---

## Phase 2 — Master HUD Shell & Header Redesign
**Objective:** Deliver the high-density futuristic top bar and navigation sidebar matching the reference.
- **Files to Modify:**
  - `apps/web/src/components/Header.tsx` (Add Live Clock, Weather, global search input, quick stats).
  - `apps/web/src/components/Sidebar.tsx` (Add Current World thumbnail, Quick Create menu, and System Status indicator).
  - `apps/web/src/App.tsx` (Layout orchestration and right-side assistant docking).
- **Verification:**
  - Check responsiveness on desktop (1920x1080 and 1440x900).
  - Verify `Ctrl+K` shortcuts still bind smoothly.

---

## Phase 3 — 3D Digital Twin Viewport & Holographic Beacons
**Objective:** Enhance the Three.js canvas with interactive beacons, overlay tool palettes, and timeline scrubber.
- **Files to Modify:**
  - `apps/web/src/components/DigitalTwinViewport.tsx`
  - `apps/web/src/hooks/useThreeViewport.ts`
- **Key Enhancements:**
  - Floating 3D holographic beacon markers over key structures (Main Server, Hostel, Academic Block, Sports Complex, Library).
  - Floating left-side Infrastructure Layer selector (Buildings, People, Vehicles, Servers, Network, Security, Weather).
  - Floating right-side Tool Palette (Select, Measure, Add Entity, Draw Zone, Zoom In/Out, Compass).
  - Bottom timeline scrubber with play/pause, hours markers (08:00 - 20:00), and speed multiplier.

---

## Phase 4 — Docked NEXUS AI Assistant Drawer
**Objective:** Build the interactive AI assistant sidebar visible on the right of the command center.
- **Files to Create / Modify:**
  - `apps/web/src/components/NexusAIAssistant.tsx` (New component)
  - `apps/web/src/App.tsx`
- **Key Enhancements:**
  - Glowing animated AI Orb avatar.
  - Quick action chips ("Analyze an incident", "Simulate a scenario", "Optimize resources", "Create a workflow", "Ask about graph", "Generate a report").
  - Suggested prompts list.
  - Streaming conversational interface connected to local assistant logic and backend agent routes.

---

## Phase 5 — Bottom Contextual Intelligence Grid
**Objective:** Recreate the 5 contextual widgets underneath the 3D viewport.
- **Components to Enhance / Create:**
  1. **AI Agent Council**: 5 persona cards with live activity states (Investigator, Security, Planner, Simulation, Reviewer).
  2. **Active Incident Center**: High-severity incident countdown timer, affected users count, 3D server hologram, and "Request Approval" action.
  3. **Simulation Lab**: Side-by-side comparison cards for Scenario A, Scenario B, and Scenario C with risk, cost, and downtime indicators.
  4. **Analytics Dashboard**: Event trendline and incident type distribution charts.
  5. **Events & Timeline**: Chronological event feed with high/medium/low severity badges.

---

## Phase 6 — Integration & Final Verification
- [ ] Connect Socket.IO client for live telemetry streaming.
- [ ] Run full test suite: `pnpm test`.
- [ ] Run production build: `pnpm build`.
- [ ] Commit and push to GitHub repository with detailed release notes.
