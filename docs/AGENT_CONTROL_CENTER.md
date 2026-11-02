# P-NEXA Developer Agent Control Center (`/developer/agents`)
**Interactive Web Interface for Munder Difflin Hive & Agency Agents Governance**
**Author:** Principal Multi-Agent Systems Architect & Senior Frontend Engineer  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Overview & Route Information

The **Agent Control Center** provides a development-only graphical cockpit within the P-NEXA web application for inspecting, dispatching, and governing autonomous development agents.

- **URL Route:** `/developer/agents` (also accessible via `#developer-agents` and Command Palette `Ctrl+K`)
- **Navigation:** Left Sidebar &rarr; `Dev Harness` &rarr; `Munder Difflin`
- **Access Level:** Restricted to Administrator roles (`admin`, `commander`, `SUPER_ADMIN`, `ORG_ADMIN`). Non-administrators are presented with a zero-trust access denial banner.

---

## 2. Key Interface Modules

### Module 1: Top KPI & Health Banner
- **Hive Protocol Status:** Live pulsating indicator verifying active on-disk Hive layout.
- **Roster Counter:** Real-time verified count of **283 Specialists Enrolled** across 18 divisions.
- **Active Worktrees Indicator:** Real-time counter of un-merged isolated Git working trees.
- **Single-Committer Rails Badge:** Visual attestation that branches are protected against uncontrolled merges.
- **Launch Desktop Harness Button:** Emits `munderdifflin://open?path=...` deep link to spawn native desktop client or headless CLI supervisor.

### Module 2: Multi-Agent Task Pipeline & Worktrees (Default Tab)
- **Task Dispatch Input:** Allows administrators to input high-level development prompts, select priority (`LOW`, `NORMAL`, `HIGH`, `CRITICAL`), and dispatch tasks into the Hive.
- **Task Backlog:** Columnar view of ongoing and completed development tasks with status badges.
- **Active Squad Matrix:** Displays the assigned 5-agent squad (Supervisor Michael, Lead Specialist, Peer Code Reviewer, Security Auditor, Test Automation Engineer).
- **Embedded Real-Time Execution Stream:** Color-coded terminal logging agent-by-agent progression through Planning, Worktree creation, Implementation, Code Review, Security Review, and Testing.
- **Verification Gates Bar:** Visual status of Peer Code Review, Security Audit, and Automated Vitest suite (158/158 passed).

### Module 3: Human Approvals Gate
- **Purpose:** Protects the production `main` branch from automatic agent modifications.
- **Inspection Dossier:** Displays target branch (`main`), source worktree branch (`feat/agent-task-...`), lead specialist, code review verdict, and test attestation.
- **One-Click Authorize & Merge:** Records administrator approval, marks task `COMPLETED`, logs decision to Hive blackboard, and cleans up the Git worktree safely.
- **One-Click Reject & Teardown:** Rejects proposal, prunes worktree, and deletes the feature branch.

### Module 4: Munder Difflin 2D Virtual Office Floor
- Renders the gamified office floor across 5 designated zones:
  1. **Engineering Bay Alpha:** 66 specialists.
  2. **SOC & Hardened Security Vault:** 12 specialists.
  3. **QA & Automated Testing Lab:** 9 specialists.
  4. **Spatial 3D & Graphics Studio:** 27 specialists.
  5. **Product & Agile Command Deck:** 13 specialists.
- Virtual desks labeled with unique desk IDs (e.g. `desk-spa-001`, `desk-eng-004`).
- Interactive click-to-inspect reveals agent metadata and allows one-click task assignment.

### Module 5: Agency Agents Searchable Catalog (283 Agents)
- **Instant Search:** Queries name, ID, role, and specialty simultaneously.
- **Division Filter:** 18 divisions (Engineering, Marketing, Game Development, Specialized, GIS, Security, Design, Sales, Testing, Paid Media, Project Management, Academic, Product, Support, Spatial Computing, Finance, Healthcare, Research).
- **Provider Badges:** Highlights CLI provider compatibility (`antigravity`, `claude-code`, `gemini-cli`, `codex`).
- **Detail Drawer:** Slide-over modal showing full token budgets, velocity limits, allowlisted commands, and on-demand markdown skill instructions.

### Module 6: Shared Blackboard & Decision Log
- Reads semantic markdown memory files from `integrations/munder-difflin/hive/blackboard/`:
  - `HIVE_BLACKBOARD.md`: Core architectural constraints and invariants.
  - `DECISIONS.md`: Active directives and historical decisions.

---

## 3. Security & Safety Invariants

1. **No Client-Side Terminal Execution:** Browser inputs never execute raw shell commands directly; inputs are sent to the orchestrator service, which enforces strict tokenization and command allowlists.
2. **Zero Credentials in Memory:** No API secrets or tokens are ever displayed in task logs or stored in blackboard memory files.
3. **Graceful Fallback:** If the native Munder Difflin desktop binary is not present on the developer's workstation, the Control Center continues operating in Headless Hive Mode with 100% functionality.
