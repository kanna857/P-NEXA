# P-NEXA — Phase 4: Predictive Simulation & Cybersecurity Architecture

**Version:** 4.0.0-PROD  
**Branch:** `feat/phase4-autonomous-ai-council`  
**Classification:** Restricted / Enterprise Operational Standard  

---

## 1. Predictive "What-If" Simulation Engine

In high-consequence operational environments, actions cannot be taken blindly based on intuition. The **Simulation Agent** leverages `@nexus/simulation-engine` to execute deterministic Monte Carlo simulations before any remediation is presented to operators.

### 1.1 Deterministic PRNG Seeding
Every simulation run uses a seeded pseudorandom number generator (PRNG) to ensure that what-if scenarios are 100% reproducible:
```typescript
const seed = deriveDeterministicSeed(entityId, tenantId, worldId);
const simulationResult = runPropagationScenario({
  seed,
  ticks: 50,
  infectionRate: 0.45,
  nodes: digitalTwinGraph.nodes,
  edges: digitalTwinGraph.edges
});
```

### 1.2 Uncertainty Ranges & State Hashes
Rather than projecting false certainty, the simulation outputs an explicit uncertainty band:
- **Baseline Compromised Count:** Number of nodes projected to fail without intervention.
- **Mitigated Compromised Count:** Nodes affected under recommended containment.
- **Uncertainty Range:** Min and Max risk reduction percentages (e.g. `82%` to `94%`).
- **Cryptographic State Hash:** SHA-256 hash of the initial simulation state and parameters for tamper-evident reproducibility.

### 1.3 Inviolable Safety Policy: Explicit Simulated Projection Label
To prevent cognitive confusion between physical reality and predictive modeling, all simulation outputs across UI and API payloads are strictly tagged with:
```json
{
  "isSimulatedProjection": true
}
```
In the UI, this is visually rendered with a high-visibility, persistent badge:
`[SIMULATED PROJECTION]` (Amber border, uppercase monospace).

---

## 2. Cybersecurity Threat Triage & MITRE ATT&CK Mapping

The **Cybersecurity Agent** evaluates incoming telemetry, authentication logs, and network connection flows to produce an explainable threat assessment.

### 2.1 MITRE ATT&CK Taxonomy Mapping
Observed anomalies are classified under standardized MITRE ATT&CK tactics and techniques:
- **T1110.001 (Password Guessing):** Triggered by high-velocity PAM authentication failures.
- **T1021.002 (SMB/Windows Admin Shares):** Identified during lateral traversal attempts across internal subnets.
- **T1071.001 (Web Protocols / C2 Beaconing):** Outbound TCP sockets established on unauthorized high-range ports.

### 2.2 Transparent, Explainable Risk Scoring
Risk scores (0 to 100) are not opaque black-box numbers; they are built from transparent additive detection rules:
```
Total Risk Score = Σ (Rule Contribution)
  ├─ Rule SEC-R-101 (Brute-Force Velocity Exceeded):     +40 pts
  ├─ Rule SEC-R-204 (Unauthorized C2 Beaconing):          +35 pts
  └─ Rule SEC-R-305 (Proximity to Sensitive Standby DB):  +17 pts
-----------------------------------------------------------------
Total Calculated Risk Score:                               92 / 100 (CRITICAL)
```

---

## 3. Response Options, Tradeoffs, and Rollback Procedures

The **Planner Agent** produces multiple response options, detailing exact tradeoffs and rollback instructions:

### Option A: `ISOLATE_NODE` (Primary Recommendation)
- **Action:** Software-Defined Network (SDN) isolation of target node.
- **Risk Reduction:** +88%
- **Estimated Downtime:** < 3 minutes (failover active).
- **Tradeoff:** Untrusted sockets terminated immediately; active logins shifted to secondary bastion.
- **Rollback Procedure:**
  1. Restore SDN routing table entries via policy engine.
  2. Verify zero active listening beacons on port 4444.

### Option B: `RATE_LIMIT_TRAFFIC` (Secondary Alternative)
- **Action:** Ingress throttling to 5% baseline bandwidth.
- **Risk Reduction:** +62%
- **Estimated Downtime:** 0 minutes (degraded service).
- **Tradeoff:** Preserves connectivity but allows attacker sessions to persist on established links.
- **Rollback Procedure:** Clear iptables rate-limit rules on host router.

### Option C: `MONITOR_ONLY` (Passive Honeypot)
- **Action:** Collect telemetry without blocking connections.
- **Risk Reduction:** +15%
- **Estimated Downtime:** 0 minutes.
- **Tradeoff:** Extreme risk of data exfiltration and database tampering.
- **Rollback Procedure:** None required (read-only mode).

