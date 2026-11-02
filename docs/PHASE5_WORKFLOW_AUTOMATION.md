# P-NEXA — Phase 5 Workflow Automation Engine
## Visual DAG Playbook Builder & Dual-Custody Safeguards

### 1. Overview

Phase 5 replaces rigid linear runbooks with an interactive, graph-based automation engine. Operators and autonomous AI agents collaborate to build, inspect, and execute Directed Acyclic Graphs (DAGs) representing complex incident response playbooks.

---

### 2. Supported Node Types

The workflow engine standardizes 9 distinct functional node types:

| # | Node Type | Category | Functionality |
|---|---|---|---|
| 1 | `TELEMETRY_TRIGGER` | Ingress | Watches real-time telemetry streams for sustained thresholds or events. |
| 2 | `THRESHOLD_CONDITION` | Logic | Evaluates conditional logic (e.g., metric > value, environment == prod). |
| 3 | `ANOMALY_DETECTION` | Analytics | Invokes the Predictive Intelligence Engine for statistical Z-score checks. |
| 4 | `COUNCIL_INVESTIGATION` | Agentic | Dispatches autonomous AI Council agents (Investigator, Cyber, Sim, Planner, Reviewer). |
| 5 | `SIMULATION` | Digital Twin | Runs Monte Carlo counterfactual blast radius simulations on the digital twin. |
| 6 | `NOTIFICATION` | Communication | Dispatches real-time alerts to the operator dashboard and War Room channels. |
| 7 | `HUMAN_APPROVAL` | Governance | Mandatory dual-custody approval gate requiring two distinct cryptographic sign-offs. |
| 8 | `AUTHORIZED_REMEDIATION` | Execution | Safely performs node isolation, rate-limiting, or dynamic traffic rerouting. |
| 9 | `AUDIT_LOGGING` | Compliance | Seals the remediation record with SHA-256 cryptographic proof into the Audit Vault. |

---

### 3. Directed Acyclic Graph (DAG) Cycle Validation

#### 3.1 DFS Cycle Detection Algorithm
To guarantee that playbooks cannot deadlock in infinite execution loops, all workflows undergo preflight validation using a 3-state Depth First Search (DFS):
- State 0: Unvisited
- State 1: Currently Visiting (Active recursion stack)
- State 2: Completely Visited

If a traversal encounters a neighbor node in State 1, a directed cycle exists. The engine reports `isValid: false`, identifies the exact cycle path (e.g., `step-3 -> step-4 -> step-2 -> step-3`), and refuses to execute the workflow.

#### 3.2 Computational Complexity
- **Time Complexity:** $\mathcal{O}(V + E)$ where $V$ is the number of steps and $E$ is the number of transitions.
- **Space Complexity:** $\mathcal{O}(V)$ for tracking visitation state and call stack.
- Benchmarked validation speed: over **100,000 DAG checks per second**.

---

### 4. Safety Gates & Dual-Custody Controls

#### 4.1 Bounded Execution Limits
- Maximum steps per workflow run: default `50`.
- Execution timeout: 60 seconds per step.
- If step count exceeds limits, the workflow is aborted with `STEP_LIMIT_EXCEEDED` to prevent resource starvation.

#### 4.2 Dual-Custody Approval Gate
High-risk remediations (such as isolating an authentication server or severing backbone network routes) cannot be executed autonomously or by a single operator:
1. When execution reaches a `HUMAN_APPROVAL` node with `riskLevel: 'CRITICAL'`, execution transitions to `PAUSED` state.
2. Signer 1 (e.g., SecOps Lead) signs the proposal.
3. Signer 2 (e.g., Commander / Authorized Approver) must review the plan and provide the second signature.
4. **Self-Approval Prohibition:** The system verifies `signer1.id !== signer2.id`. The same user cannot sign twice.
5. Only upon dual cryptographic authorization does the engine unlock the `AUTHORIZED_REMEDIATION` node.

#### 4.3 Safe Cancellation
Active workflows can be cleanly aborted at any stage via the API or UI. All in-flight agent tasks are notified, temporary worktrees are cleaned up, and a cancellation event is appended to the audit log.
