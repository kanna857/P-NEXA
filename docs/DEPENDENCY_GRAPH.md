# NEXUS OMEGA X — Module Dependency Graph & Boundaries

### 1. Monorepo Structure
```
Mern/
├── apps/
│   ├── api/             # Express REST API & Socket.IO server
│   ├── web/             # React + Vite + Three.js + Tailwind client
│   ├── worker/          # BullMQ background task processor
│   └── simulator/       # Deterministic scenario simulation engine
└── packages/
    ├── shared/          # Foundation types, Zod schemas, constants, RBAC
    ├── observability/   # Tracing, structured logging, telemetry
    ├── governance/      # Cryptographic audit hash chaining, HITL approvals
    ├── event-store/     # Idempotent event ledger & deduplication
    ├── twin-graph/      # Digital twin topology & graph algorithms
    ├── world-engine/    # 3D spatial representations & physics coordinates
    ├── agent-memory/    # Episodic vector memory & reflection retrieval
    ├── agent-engine/    # Stateful agent orchestration & tool allowlists
    ├── cyber-engine/    # MITRE ATT&CK incident triage & threat hunting
    ├── simulation-engine/# Seeded PRNG scenario simulation & replay
    ├── learning-engine/ # Strategy policy optimizer & benchmark evaluation
    ├── workflow-engine/ # State machines & dual-custody human approvals
    └── ui/              # Reusable UI component primitives & HUD theme tokens
```

### 2. Dependency Hierarchy (Topological Order)

```
Level 0 (Zero Dependencies):
  └── packages/shared

Level 1 (Core Utilities):
  ├── packages/observability   (depends on: shared)
  ├── packages/governance      (depends on: shared)
  ├── packages/ui              (depends on: shared)
  └── packages/event-store     (depends on: shared, governance)

Level 2 (Domain Engine Models & Memory):
  ├── packages/twin-graph      (depends on: shared)
  ├── packages/agent-memory    (depends on: shared, event-store)
  └── packages/world-engine    (depends on: shared, twin-graph)

Level 3 (Simulation, Cyber & Orchestration Engines):
  ├── packages/cyber-engine    (depends on: shared, twin-graph, event-store)
  ├── packages/workflow-engine (depends on: shared, governance)
  ├── packages/agent-engine    (depends on: shared, agent-memory, governance)
  └── packages/simulation-engine (depends on: shared, world-engine, twin-graph)

Level 4 (Learning & Strategy Evaluation):
  └── packages/learning-engine (depends on: shared, agent-engine, simulation-engine)

Level 5 (Deployable Applications):
  ├── apps/api                 (depends on: shared, observability, governance, event-store)
  ├── apps/worker              (depends on: shared, cyber-engine, workflow-engine, agent-engine)
  ├── apps/simulator           (depends on: shared, simulation-engine, learning-engine)
  └── apps/web                 (depends on: shared, ui)
```

### 3. Boundary Rules & Linting Policies
1. `packages/shared` must never import from any other package or app.
2. Domain engines must never import from `apps/*`.
3. `apps/web` must never import backend packages like `governance` or `simulation-engine` directly; communication occurs exclusively via typed REST and Socket.IO contracts.
4. Circular dependencies are strictly forbidden and enforced by workspace boundary rules.

