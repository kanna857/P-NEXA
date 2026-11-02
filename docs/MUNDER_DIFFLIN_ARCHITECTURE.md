# P-NEXA × Munder Difflin Architecture Specification
**Autonomous Multi-Agent Hive Coordination Engine & Agency Agents Integration**
**Classification:** Architectural Design & Governance Document  
**Status:** IMPLEMENTED & VERIFIED  
**Version:** 1.0.0  

---

## 1. Architectural Overview & Philosophy

Munder Difflin (`HarnessMD/munder-difflin`) is an open-source multi-agent desktop harness that wraps around terminal-based AI coding CLIs (Claude Code, OpenAI Codex, Gemini CLI, Antigravity `agy`, Cursor, and Copilot) to coordinate them into a cohesive development team.

Rather than running synthetic or unconstrained chat components, Munder Difflin establishes **The Hive Office Model**, where:
1. A supervisor agent named **"Michael" (Branch Manager / GOD Orchestrator)** acts as the singular point of contact.
2. 283 specialist **Agency Agents** (`.agents/registry.json`) across 18 divisions are mapped into the **Shareable Hires Schema (`munder-difflin/hire@1`)** with virtual desk seating coordinates.
3. Every coding task executes within an **isolated Git worktree** (`integrations/munder-difflin/hive/worktrees/<taskId>`) rather than on the `main` branch.
4. **Single-Committer Rails** prevent rogue agents from executing arbitrary commits or pushes.
5. A **Human-in-the-Loop (HITL) Approval Gate** requires explicit administrator authorization before merging changes.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        P-NEXA Monorepo Root                            │
├───────────────────────────────────┬────────────────────────────────────┤
│           Production Apps         │       Developer AI Harness         │
│  • apps/web (React 18 / Three.js) │  • packages/agent-registry         │
│  • apps/api (Express / MongoDB)   │  • packages/agent-orchestrator     │
│  • apps/worker (Telemetry)        │  • integrations/munder-difflin     │
│  • apps/simulator (Monte Carlo)   │  • .agents/registry.json (283)     │
└───────────────────────────────────┴────────────────────────────────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
     [Production Runtime AI]               [Munder Difflin Hive]
     • @nexus/agent-engine                 • Michael (Branch Manager)
     • Multi-Agent Incident Council        • Isolated Git Worktrees
     • Merkle Cryptographic Vault          • Atomic Mailboxes & Blackboard
```

---

## 2. Directory Layout & Storage Topology

```text
P-NEXA/
├── packages/
│   ├── agent-registry/
│   │   ├── src/types.ts                   # MunderDifflinHire, Division, Provider types
│   │   ├── src/registryService.ts         # Loads 283 agents, translates munder-difflin/hire@1
│   │   └── src/registry.test.ts           # 5 unit tests verifying agent count & schemas
│   └── agent-orchestrator/
│       ├── src/types.ts                   # Task, Squad, Plan, Approval, Worktree interfaces
│       ├── src/safetyValidator.ts         # Command allowlisting & destructive pattern guards
│       ├── src/hiveStorage.ts             # On-disk tasks.json, log.jsonl, mailboxes, blackboard
│       ├── src/worktreeManager.ts         # Git worktree add/prune/remove automation
│       ├── src/orchestratorService.ts     # 10-step multi-agent task lifecycle
│       └── src/orchestrator.test.ts       # 3 integration tests verifying full execution
├── integrations/
│   └── munder-difflin/
│       ├── config.json                    # Office layout, dimensions, budget & circuit breakers
│       ├── hires/                         # 283 JSON manifests in munder-difflin/hire@1 format
│       ├── hive/                          # Hive Protocol local on-disk storage
│       │   ├── registry.json              # Munder Difflin master roster (283 agents)
│       │   ├── tasks.json                 # Hive task ledger
│       │   ├── log.jsonl                  # Append-only activity stream
│       │   ├── mailboxes/<agentId>/       # Desk-to-desk inbox/outbox messaging
│       │   ├── blackboard/                # Markdown shared semantic memory (HIVE_BLACKBOARD.md)
│       │   └── worktrees/<taskId>/        # Isolated per-task Git working trees
│       ├── sync-hive.mjs                  # Roster synchronizer CLI
│       └── launcher.mjs                   # Cross-platform desktop/headless launcher & adapter
└── apps/
    ├── web/src/components/
    │   └── AgentControlCenterView.tsx     # Developer-only UI route (/developer/agents)
    └── api/src/routes/
        └── developer.ts                   # Admin-restricted REST endpoints (/api/v1/developer/*)
```

---

## 3. The 10-Step Development Task Lifecycle

1. **Task Parsing & Tokenization**: Request brief is decomposed into domain keywords and intent (UI/UX, 3D, Security, Backend, Testing).
2. **Specialist Selection**: Scores 283 agents using heuristic matching to select Lead Specialist, Peer Code Reviewer, Security Auditor, and Test Automation Engineer.
3. **Supervisor Assignment**: Michael Scott is assigned as Supervisor (`munder-michael-supervisor`) to adjudicate steps.
4. **Structured Task Plan**: Generates dependency DAG covering Planning, Implementation, Code Review, Security Review, and Automated Testing.
5. **Provider Allocation**: Binds specialists to compatible CLI environments (`antigravity`, `claude-code`, `gemini-cli`, `codex`).
6. **Git Worktree Isolation**: Executes `git worktree add -b feat/agent-task-<id> <path> HEAD`, guaranteeing parallel agents cannot collide or corrupt the index.
7. **Task Execution & Log Streaming**: Emits timestamped, color-coded execution logs into `tasks.json` and `log.jsonl`.
8. **Static Review & Security Audit**: Code reviewer validates AST/syntax; Security auditor verifies zero credential leaks and path containment.
9. **Automated Test Gating**: Runs `pnpm test` inside the sandbox to ensure zero regressions across all packages.
10. **Human-in-the-Loop Approval Gate**: Suspends merge until an authenticated Administrator clicks **Approve & Merge** or **Reject & Teardown**.

---

## 4. Shareable Hires Schema (`munder-difflin/hire@1`)

Every Agency Agent is automatically serialized to standard `munder-difflin/hire@1` specifications:

```json
{
  "schema": "munder-difflin/hire@1",
  "id": "agency-3d-scene-developer",
  "name": "3D Scene Developer",
  "role": "Specialist (spatial-computing)",
  "division": "spatial-computing",
  "specialty": "3D Scene Developer specialist within the spatial-computing domain",
  "sprite": "avatar-lead-m",
  "seat": {
    "deskId": "desk-spa-001",
    "x": 640,
    "y": 512,
    "zone": "Spatial 3D & Graphics Studio"
  },
  "provider": "antigravity",
  "model": "antigravity-hybrid",
  "systemPrompt": "You are 3D Scene Developer... Follow your specialized instructions loaded from .agents/skills/agency-3d-scene-developer/SKILL.md.",
  "autonomyLevel": "supervised",
  "budget": {
    "maxTokens": 150000,
    "velocityLimit": 8000
  },
  "allowedCommands": ["pnpm test", "pnpm build", "git status", "git diff", "git log", "vitest"],
  "requiresApprovalFor": ["git push", "git commit -a", "git merge", "rm -rf", "database drop"],
  "status": "AVAILABLE",
  "workspaceSkillPath": ".agents/skills/agency-3d-scene-developer/SKILL.md"
}
```

---

## 5. Security & Isolation Architecture

- **Single-Committer Git Rails**: Individual agents never call `git push` or write to `main`.
- **Command Allowlisting**: Strict whitelist (`pnpm test`, `git diff`, `vitest`). All dangerous patterns (`rm -rf /`, `drop database`, `format`, `git reset --hard`) are blocked with immediate process abort.
- **Zero-Trust Memory**: No API keys, JWT tokens, or credentials may be written to `mailboxes/`, `blackboard/`, or client-side storage.
- **Role-Based Access Control**: Web route `/developer/agents` and backend routes `/api/v1/developer/*` require `SUPER_ADMIN` or `ORG_ADMIN` privileges.
