# NEXUS OMEGA X — Autonomous Intelligence Universe

> Production-oriented, multi-tenant MERN + AI platform combining living 3D digital twin worlds, multi-agent AI societies with memory, real-time cyber incident intelligence, parallel deterministic scenario simulations, and evidence-based cryptographic AI governance.

---

## 1. Monorepo Architecture

```
Mern/
├── apps/
│   ├── api/                   # Express REST API, RBAC, JWT Auth & Socket.IO Gateway
│   ├── web/                   # Cyberpunk React 18/19, Three.js & Tailwind Cockpit Shell
│   ├── worker/                # Background BullMQ event processor & reflection synthesis
│   └── simulator/             # Deterministic scenario simulation & PRNG tick engine
│
├── packages/
│   ├── shared/                # Foundation types, Zod schemas, error classes & RBAC matrix
│   ├── observability/         # Structured logging, system metrics & OpenTelemetry
│   ├── governance/            # Tamper-evident SHA-256 audit ledger & verification
│   ├── event-store/           # Idempotent event ledger & deduplication
│   ├── twin-graph/            # Digital twin topology & node-edge graph models
│   ├── world-engine/          # Three.js 3D spatial coordinate calculations
│   ├── agent-memory/          # Episodic vector memory & reflection retrieval
│   ├── agent-engine/          # Stateful agent society & tool allowlists
│   ├── cyber-engine/          # MITRE ATT&CK telemetry triage & threat hunting
│   ├── simulation-engine/     # Seeded PRNG scenario simulation & replay
│   ├── learning-engine/       # Strategy policy optimizer & benchmark gates
│   ├── workflow-engine/       # State machines & dual-custody human approvals
│   └── ui/                    # Reusable HUD design system tokens
│
├── docs/                      # Architecture, Schemas, API Contracts & Phased Checklist
├── docker-compose.yml         # Container orchestration (MongoDB 7, Redis 7, API, Web)
└── pnpm-workspace.yaml        # Workspace configuration
```

---

## 2. Core Security & Governance Invariants

1. **Logical Tenant Isolation**: Every collection, query, cache entry, and agent memory vector requires a verified `tenantId`. Cross-tenant data leakage is strictly blocked by middleware.
2. **Deterministic Replay**: Scenario simulations employ seeded Pseudo-Random Number Generators (PRNG) guaranteeing 100% reproducible world states and bit-exact event logs.
3. **Zero Arbitrary Code Execution**: AI agents are strictly restricted to predefined, typed tool allowlists. The platform rejects any execution of dynamic generated code.
4. **Controlled Strategy Self-Improvement**: AI self-improvement is implemented exclusively via versioned policy evaluation against deterministic benchmarks with human promotion gates.
5. **Tamper-Evident Audit Ledger**: Every mutation is signed into a recursive SHA-256 hash chain:
   $$\text{Hash}_n = \text{SHA256}(\text{Seq}_n + \text{Hash}_{n-1} + \text{Timestamp} + \text{Actor} + \text{Payload})$$
6. **Human-in-the-Loop (HITL)**: High-impact actions and remediations require dual-custody human sign-offs before execution.

---

## 3. Local Development Setup (Windows PowerShell)

### Prerequisites
- Node.js >= 22 (tested on Node v26)
- pnpm >= 10
- (Optional for containers) Docker Desktop

### 3.1 Install Dependencies
```powershell
pnpm install
```

### 3.2 Build All Foundation Packages
```powershell
pnpm build
```

### 3.3 Run Automated Tests
```powershell
pnpm test
```

### 3.4 Seed Sample Database & Cryptographic Audit Ledger
```powershell
pnpm --filter @nexus/api seed
```

This seeds 3 sample tenants:
- `CyberDyne Orbital` (`cyberdyne-orbital`)
- `Aegis Defense Grid` (`aegis-defense`)
- `Synthetix Labs` (`synthetix-labs`)

And demo accounts:
| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@nexus.ai` | `NexusSuperPass2026!` |
| Org Admin | `admin@cyberdyne.ai` | `NexusPass2026!` |
| Security Analyst | `analyst@cyberdyne.ai` | `NexusPass2026!` |
| Simulation Engineer | `sim.engineer@cyberdyne.ai` | `NexusPass2026!` |
| Auditor | `auditor@cyberdyne.ai` | `NexusPass2026!` |

### 3.5 Launch Development Servers
To run the Express API:
```powershell
pnpm --filter @nexus/api dev
```
API runs on `http://localhost:4000`.

To run the React Web Cockpit:
```powershell
pnpm --filter @nexus/web dev
```
Web runs on `http://localhost:5173`.

---

## 4. Docker Compose Deployment

To run the entire ecosystem (MongoDB, Redis, API, and Web) in Docker:
```powershell
docker compose up --build -d
```
Inspect logs:
```powershell
docker compose logs -f api
```

---

## 5. API Endpoints Reference

### Health & Telemetry
- `GET /health` -> Liveness probe.
- `GET /health/ready` -> Readiness probe checking database and cache health.
- `GET /health/live` -> Process uptime and heap metrics.

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register` -> Register user & organization.
- `POST /api/v1/auth/login` -> Authenticate and obtain JWT access + refresh token.
- `POST /api/v1/auth/refresh` -> Rotate refresh tokens.
- `GET /api/v1/auth/me` -> Fetch profile, tenant context, and active permissions.

### Tenant Administration (`/api/v1/organizations`)
- `GET /api/v1/organizations` -> List accessible tenants for authenticated user.
- `POST /api/v1/organizations` -> Create new tenant (`tenant:create` permission required).
- `POST /api/v1/organizations/switch` -> Switch active tenant token.

### Audit Ledger (`/api/v1/audit`)
- `GET /api/v1/audit` -> Query tenant audit records with pagination.
- `GET /api/v1/audit/verify` -> Cryptographically traverse and verify SHA-256 chain integrity.
- `POST /api/v1/audit/tamper-test` -> Simulates a payload alteration and proves verification failure.

---

## 6. Phased Implementation Roadmap
- [x] **Phase 1**: Monorepo Setup, Express API, Auth, Organizations, RBAC, React HUD Shell, Audit Ledger, Tests.
- [ ] **Phase 2**: Living 3D Digital Twin Worlds with Three.js & Twin Graph.
- [ ] **Phase 3**: Multi-Agent AI Society with LangGraph & Vector Memory.
- [ ] **Phase 4**: Real-Time Event Ingestion & Cyber Incident Intelligence.
- [ ] **Phase 5**: Parallel Scenario Simulation & Deterministic Replay.
- [ ] **Phase 6**: Strategy Evaluation & Controlled Self-Improvement.
- [ ] **Phase 7**: Natural-Language World Creation & HITL Workflows.
- [ ] **Phase 8**: Evidence-Based AI Governance & Audit Vault Compliance Export.


# P-NEXA
