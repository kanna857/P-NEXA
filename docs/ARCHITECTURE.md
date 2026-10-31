# NEXUS OMEGA X — Autonomous Intelligence Universe
## High-Level System Architecture Specification

### 1. Executive Summary
NEXUS OMEGA X is an enterprise-grade, multi-tenant MERN + AI platform engineered for living 3D digital twin worlds, multi-agent AI societies, real-time cyber incident intelligence, parallel deterministic scenario simulations, and evidence-based AI governance.

### 2. Core Pillars & Architectural Principles
1. **Tenant Isolation**: Strict logical data and execution partitioning enforced at database query, cache key, queue message, and agent memory layers.
2. **Deterministic Replay**: Simulation engines use seeded pseudo-random number generators (PRNG) and immutable event snapshotting to guarantee 100% reproducible world states.
3. **Controlled AI Self-Improvement**: AI agents do not execute arbitrary code or self-modify runtime logic. Self-improvement is strictly achieved through versioned, evaluated strategy policies with benchmark gates.
4. **Human-in-the-Loop (HITL) Governance**: Any high-impact automated response or tool invocation requires cryptographic sign-off or dual-custody human approvals.
5. **Tamper-Evident Audit Trails**: Every state mutation and agent decision is recorded into a cryptographically chained SHA-256 event ledger.
6. **Zero Circular Monorepo Topology**: Clear layered architecture where domain engines depend only on shared interfaces and foundation layers.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|               apps/web (React 18/19, Three.js 3D Viewport, React Flow)             |
+-----------------------------------------------------------------------------------+
                                        | (HTTPS / WSS / Socket.IO)
+-----------------------------------------------------------------------------------+
|                                  API GATEWAY                                      |
|              apps/api (Express, Zod Validation, Tenant Context, RBAC)             |
+-----------------------------------------------------------------------------------+
     |                             |                          |
     v                             v                          v
+---------------+        +--------------------+      +--------------------+
|  Event Store  |        |    Redis / BullMQ  |      |  Mongo Vector DB   |
| (Hash Chained)|        | (Idempotent Queues)|      | (Mongoose/Search)  |
+---------------+        +--------------------+      +--------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
+-------------------------------+           +-------------------------------+
|     apps/worker (Node.js)     |           |   apps/simulator (Node.js)    |
| - Cyber Incident Pipeline     |           | - Parallel Scenario Ticks     |
| - Agent Memory & Reflection   |           | - Deterministic World Physics |
| - Workflow Orchestration      |           | - Strategy Benchmark Evaluator|
+-------------------------------+           +-------------------------------+
```

### 3. Layered Package Architecture
* **Foundation Layer**:
  - `packages/shared`: Shared types, Zod schemas, constants, RBAC permissions, error classes.
  - `packages/observability`: OpenTelemetry tracing stubs, structured logging, health checks.
  - `packages/governance`: Cryptographic hash chaining, tamper detection, HITL approvals.
* **Domain Engines**:
  - `packages/event-store`: Append-only event store with idempotency deduplication.
  - `packages/twin-graph`: Graph model of nodes (systems, containers, routers, sensors) and edges (data flows, trust boundaries).
  - `packages/world-engine`: Three.js procedural spatial layout and physics coordinate mapping.
  - `packages/agent-memory`: Vector search embeddings, episodic memory, and reflection synthesis.
  - `packages/agent-engine`: LangGraph-driven stateful agent society with role allowlists and structured outputs.
  - `packages/cyber-engine`: MITRE ATT&CK telemetry ingestion, anomaly detection, incident triage.
  - `packages/simulation-engine`: Parallel scenario simulation runner, seed managers, and state checkpoints.
  - `packages/learning-engine`: Versioned strategy policy optimizer with counterfactual evaluation.
  - `packages/workflow-engine`: Declarative state machine workflows with human gate checkpoints.
* **Presentation Layer**:
  - `packages/ui`: Reusable design system tokens, HUD cyber cards, badges, and controls.
  - `apps/web`: Single-page cockpit dashboard.

### 4. Security & Isolation Model
1. **Tenant Isolation**: Every database collection contains `tenantId`. Mongoose middleware automatically injects tenant constraints into queries.
2. **RBAC & ABAC**: Granular permissions (e.g., `sim:execute`, `agent:policy_promote`, `world:write`, `audit:read`).
3. **Tool Sandboxing**: Agent tools operate on strict allowlists with schema validation. Zero shell or `eval()` access.
4. **Data Encryption**: Secrets encrypted using AES-256-GCM; tenant-level key derivation supported.

