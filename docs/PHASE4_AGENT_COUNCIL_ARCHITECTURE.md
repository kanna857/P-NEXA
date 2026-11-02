# P-NEXA — Phase 4: Autonomous Runtime AI Agent Council Architecture

**Version:** 4.0.0-PROD  
**Branch:** `feat/phase4-autonomous-ai-council`  
**Classification:** Restricted / Enterprise Operational Standard  

---

## 1. Executive Summary

Phase 4 establishes an operational, autonomous runtime multi-agent decision support platform within P-NEXA (NEXUS Ω X). The runtime council connects real-time 3D Digital Twin telemetry, knowledge graph topological dependencies (`@nexus/twin-graph`), episodic vector memory (`@nexus/agent-memory`), and Monte Carlo simulations (`@nexus/simulation-engine`) to investigate anomalies and formulate mitigation strategies.

Critically, **consequential actions require mandatory human authorization**. The system strictly enforces dual-custody verification before any remediation action can be queued or executed.

```
                                  ┌────────────────────────┐
                                  │   3D Digital Twin      │
                                  │   (Selected Entity)    │
                                  └───────────┬────────────┘
                                              │ Ingest Context
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        NEXUS Ω X RUNTIME AGENT COUNCIL                                 │
│                                                                                        │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐                  │
│  │   INVESTIGATOR   │───►│  CYBERSECURITY   │───►│    SIMULATION    │                  │
│  │   • Facts vs Hyp │    │  • MITRE TTPs    │    │  • What-If Blast │                  │
│  │   • SIEM & Logs  │    │  • Risk Scoring  │    │  • Uncertainty   │                  │
│  └──────────────────┘    └──────────────────┘    └─────────┬────────┘                  │
│                                                            │                           │
│                                                            ▼                           │
│                          ┌──────────────────┐    ┌──────────────────┐                  │
│                          │     REVIEWER     │◄───│     PLANNER      │                  │
│                          │  • Hallucination │    │  • Candidate Opts│                  │
│                          │  • Policy Check  │    │  • Tradeoffs     │                  │
│                          └─────────┬────────┘    └──────────────────┘                  │
└────────────────────────────────────┼───────────────────────────────────────────────────┘
                                     │
                                     ▼
                   ┌───────────────────────────────────┐
                   │    MANDATORY HUMAN AUTHORIZATION  │
                   │    • Commander / Admin Sign-off   │
                   │    • Dual-Custody Verification    │
                   │    • SHA-256 Tamper-Evident Audit │
                   └─────────────────┬─────────────────┘
                                     │ Approved
                                     ▼
                   ┌───────────────────────────────────┐
                   │     Automated Safe Execution      │
                   │     (SDN / Host Isolation / ACL)  │
                   └───────────────────────────────────┘
```

---

## 2. Architectural Separation: Development vs. Runtime Agents

A strict architectural boundary is maintained between **development agents** and **runtime agents**:

| Dimension | Development Agents | Runtime Council Agents |
| :--- | :--- | :--- |
| **System** | Agency Agents (283 specialists) + Munder Difflin | NEXUS Ω X Runtime Council (5 specialists) |
| **Location** | `.agents/registry.json`, `integrations/munder-difflin/` | `packages/agent-engine/src/council*.ts` |
| **Interface** | `/developer/agents` | `/ai-council`, Viewport Modal, REST API |
| **Purpose** | Code generation, linting, testing, Git worktree development | Telemetry analysis, threat triage, what-if simulations |
| **Lifecycle** | Background CLI subagent processes | Synchronous/asynchronous in-memory decision pipeline |
| **Authorization** | Pull Request reviews, Git branch protections | Dual-custody Commander sign-off in Audit Vault |

---

## 3. The Five Cooperating Runtime Specialists

### 3.1 Investigator Agent
- **Identity:** `INVESTIGATOR` (Lead Forensic Specialist)
- **Role & Responsibilities:**
  - Ingests empirical telemetry from digital twin nodes (`cpuUsage`, `memoryUsage`, network sockets, error rates).
  - Queries historical incident memory via `@nexus/agent-memory` to identify vector-similar prior outages.
  - Distinguishes between **empirical facts** (measured metrics) and **inferred hypotheses** (unproven assumptions).
  - Assigns confidence scores (0.0 – 1.0) and references specific telemetry sources for all claims.

### 3.2 Cybersecurity Agent
- **Identity:** `CYBERSECURITY` (Threat Intelligence Analyst)
- **Role & Responsibilities:**
  - Evaluates authentication anomalies, failed login patterns, and outbound socket destinations.
  - Maps attacker behaviors directly to the **MITRE ATT&CK taxonomy** (tactics and techniques).
  - Calculates an explainable risk score (0 to 100) using transparent, additive detection rules.
  - Generates Indicators of Compromise (IOCs) for egress beacons and rogue processes.

### 3.3 Simulation Agent
- **Identity:** `SIMULATION` (Predictive Systems Engineer)
- **Role & Responsibilities:**
  - Clones digital twin graph topology and runs deterministic Monte Carlo what-if projections via `@nexus/simulation-engine`.
  - Simulates lateral infection cascades across network hops (BFS blast radius).
  - Calculates uncertainty ranges (e.g. 82% to 94% risk reduction) and baseline vs. mitigated compromised counts.
  - **Crucial Requirement:** All outputs are strictly tagged `isSimulatedProjection: true` with visible badges to ensure operators never confuse simulated projections with physical reality.

### 3.4 Planner Agent
- **Identity:** `PLANNER` (Operational Strategy Architect)
- **Role & Responsibilities:**
  - Synthesizes findings from Investigator, Cybersecurity, and Simulation agents into an Executive Summary.
  - Formulates candidate containment options:
    1. `ISOLATE_NODE`: Complete SDN network quarantine with automated failover.
    2. `RATE_LIMIT_TRAFFIC`: Ingress throttling to 5% baseline to degrade brute-force without total downtime.
    3. `SEVER_EDGE`: Target specific malicious inter-tier network links.
    4. `MONITOR_ONLY`: Passive honeypot surveillance.
  - Evaluates operational tradeoffs, projected downtime, and defines step-by-step verified rollback procedures.

### 3.5 Reviewer Agent
- **Identity:** `REVIEWER` (Policy & Compliance Guardian)
- **Role & Responsibilities:**
  - Audits the Planner's recommendations against organizational policy baselines (NIST SP 800-61 Rev. 2).
  - Detects hallucinations or claims lacking supporting telemetry facts.
  - Issues a formal verdict: `APPROVED_FOR_PRESENTATION`, `REVISION_REQUIRED`, or `REJECTED`.
  - **Inviolable Invariant:** The Reviewer Agent **cannot** approve execution. It only verifies whether the plan is fit to present to human operators.

---

## 4. Multi-Agent Orchestration & State Machine

The orchestration lifecycle is managed by `CouncilOrchestrator` (`packages/agent-engine/src/councilOrchestrator.ts`):

```
[QUEUED] ──► [INVESTIGATING] ──► [AWAITING_APPROVAL] ──┬──► [APPROVED] (Human sign-off)
                                                      ├──► [REJECTED] (Operator rejection)
                                                      └──► [CANCELLED] (Aborted)
```

1. **State Hash Generation:**
   Every investigation state is cryptographically hashed using canonical JSON serialization and SHA-256 (`crypto.createHash('sha256')`).
2. **Audit Logging:**
   State transitions trigger immutable entries in MongoDB `AuditLog` records containing sequence numbers, actor identity, target resource, and cryptographic hashes.
3. **WebSockets:**
   Lifecycle events are emitted via Socket.IO room `tenant:${tenantId}` using event names:
   - `council:event`
   - `council:approved`
   - `council:rejected`
   - `council:cancelled`

---

## 5. Security & Verification Guarantees

1. **Mandatory Human Authorization:** Consequential actions cannot be executed autonomously. Only operators with `admin`, `SUPER_ADMIN`, `ORG_ADMIN`, `commander`, or `ADMINISTRATOR` roles can approve plans.
2. **Multi-Tenant Isolation:** Cross-tenant access is prohibited at both middleware and service layer. Accessing an investigation belonging to another tenant returns `403 Forbidden`.
3. **Audit Trail Integrity:** Every approved, rejected, or completed investigation produces an immutable audit record linked to the tenant's cryptographic ledger.

