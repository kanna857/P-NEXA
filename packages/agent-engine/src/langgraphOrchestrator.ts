import {
  SecurityAlert,
  TriageReport,
  ThreatHuntReport,
  ResponsePlan
} from './types.js';
import { ToolExecutionContext } from './tools.js';
import { defaultApprovalQueue, ApprovalQueueManager } from './approvalQueue.js';
import { VectorMemoryStore, defaultMemoryStore } from '@nexus/agent-memory';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';
import { createHash } from 'node:crypto';

// ── LangGraph Channels & State ─────────────────────────────────────────────
export interface AgentGraphState {
  incidentId: string;
  tenantId: string;
  worldId: string;
  alert: SecurityAlert;
  nodes: TwinNode[];
  edges: TwinEdge[];
  
  // Agent Artifacts produced across graph execution
  triageReport?: TriageReport;
  threatHuntReport?: ThreatHuntReport;
  responsePlan?: ResponsePlan;
  approvalTicketId?: string;
  isApproved: boolean;
  executionResult?: {
    action: string;
    targetId: string;
    success: boolean;
    timestamp: Date;
  };
  auditProof?: {
    sequenceNumber: number;
    sha256Proof: string;
    signedBy: string;
    timestamp: Date;
  };
  
  // Graph Execution Control
  currentNode: string;
  isInterrupted: boolean;
  interruptReason?: string;
  logs: string[];
}

export interface AgentGraphExecutionContext extends ToolExecutionContext {
  incidentId: string;
  memoryStore?: VectorMemoryStore;
  approvalQueue?: ApprovalQueueManager;
}

export type NodeHandler<TState = AgentGraphState> = (
  state: TState,
  context?: AgentGraphExecutionContext
) => Promise<Partial<TState>>;

export type ConditionalRouter<TState = AgentGraphState> = (
  state: TState
) => string;

// ── Checkpointer Pattern (LangGraph MemorySaver) ───────────────────────────
export interface IStateCheckpointer<TState = AgentGraphState> {
  save(checkpointId: string, state: TState): Promise<void>;
  get(checkpointId: string): Promise<TState | null>;
  list(incidentId: string): Promise<TState[]>;
}

export class InMemoryStateCheckpointer implements IStateCheckpointer<AgentGraphState> {
  private checkpoints = new Map<string, AgentGraphState>();

  async save(checkpointId: string, state: AgentGraphState): Promise<void> {
    this.checkpoints.set(checkpointId, JSON.parse(JSON.stringify(state)));
  }

  async get(checkpointId: string): Promise<AgentGraphState | null> {
    const found = this.checkpoints.get(checkpointId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async list(incidentId: string): Promise<AgentGraphState[]> {
    const matches: AgentGraphState[] = [];
    for (const [key, val] of this.checkpoints.entries()) {
      if (key.startsWith(incidentId)) {
        matches.push(JSON.parse(JSON.stringify(val)));
      }
    }
    return matches;
  }
}

export const defaultStateCheckpointer = new InMemoryStateCheckpointer();

// ── StateGraph Builder Pattern ─────────────────────────────────────────────
export const GRAPH_START = '__START__';
export const GRAPH_END = '__END__';

export class AgentStateGraph {
  private nodes = new Map<string, NodeHandler>();
  private staticEdges = new Map<string, string>();
  private conditionalEdges = new Map<string, { router: ConditionalRouter; branches: Record<string, string> }>();
  private entryPoint: string = '';
  private interruptNodes = new Set<string>();

  public addNode(name: string, handler: NodeHandler): this {
    this.nodes.set(name, handler);
    return this;
  }

  public addEdge(from: string, to: string): this {
    this.staticEdges.set(from, to);
    return this;
  }

  public addConditionalEdge(
    from: string,
    router: ConditionalRouter,
    branches: Record<string, string>
  ): this {
    this.conditionalEdges.set(from, { router, branches });
    return this;
  }

  public setEntryPoint(nodeName: string): this {
    this.entryPoint = nodeName;
    return this;
  }

  public addInterruptBefore(nodeName: string): this {
    this.interruptNodes.add(nodeName);
    return this;
  }

  /**
   * Compiles the graph into a runnable orchestrator
   */
  public compile(options: {
    checkpointer?: IStateCheckpointer;
    approvalQueue?: ApprovalQueueManager;
    memoryStore?: VectorMemoryStore;
  } = {}) {
    const checkpointer = options.checkpointer || defaultStateCheckpointer;
    const approvalQueue = options.approvalQueue || defaultApprovalQueue;
    const memoryStore = options.memoryStore || defaultMemoryStore;

    const runLoop = async (
      initialState: AgentGraphState,
      optionsOverrides: { resumeCheckpointId?: string } = {}
    ): Promise<AgentGraphState> => {
      let state: AgentGraphState = { ...initialState };
      let currentNode = optionsOverrides.resumeCheckpointId
        ? state.currentNode
        : this.entryPoint;

      state.isInterrupted = false;
      delete state.interruptReason;

      let stepCounter = 0;
      const MAX_STEPS = 50; // Guard against infinite cyclic loops

      while (currentNode !== GRAPH_END && stepCounter < MAX_STEPS) {
        stepCounter++;
        state.currentNode = currentNode;

        // 1. Human-In-The-Loop Interrupt Check (e.g. before destructive actions)
        if (this.interruptNodes.has(currentNode) && !state.isApproved) {
          state.isInterrupted = true;
          state.interruptReason = `Execution paused at Human-In-The-Loop gate [${currentNode}]. Requires dual-custody authorization.`;
          state.logs.push(`[HIL_GATE] Paused before '${currentNode}' for dual-custody approval.`);

          // Save checkpoint so supervisor can resume
          const cpId = `${state.incidentId}_step_${stepCounter}_${currentNode}`;
          await checkpointer.save(cpId, state);
          return state;
        }

        const handler = this.nodes.get(currentNode);
        if (!handler) {
          throw new Error(`Graph node '${currentNode}' not found in registry.`);
        }

        // 2. Prepare Sandboxed Tool Context
        const context: AgentGraphExecutionContext = {
          incidentId: state.incidentId,
          tenantId: state.tenantId,
          worldId: state.worldId,
          nodes: state.nodes,
          edges: state.edges,
          memoryStore,
          approvalQueue
        };

        // 3. Execute Node Step
        const partialUpdate = await handler(state, context);
        state = {
          ...state,
          ...partialUpdate,
          logs: [...state.logs, ...(partialUpdate.logs || [])]
        };

        // 4. Save Checkpoint Snapshot
        const checkpointId = `${state.incidentId}_step_${stepCounter}_${currentNode}`;
        await checkpointer.save(checkpointId, state);

        // 5. Compute Next Transition Edge
        if (this.conditionalEdges.has(currentNode)) {
          const { router, branches } = this.conditionalEdges.get(currentNode)!;
          const branchKey = router(state);
          const next = branches[branchKey];
          if (!next) {
            throw new Error(`Conditional router returned '${branchKey}' which has no matching branch.`);
          }
          currentNode = next;
        } else if (this.staticEdges.has(currentNode)) {
          currentNode = this.staticEdges.get(currentNode)!;
        } else {
          // No outbound edge -> Terminate
          currentNode = GRAPH_END;
        }
      }

      state.currentNode = GRAPH_END;
      return state;
    };

    return {
      invoke: (initialState: AgentGraphState) => runLoop(initialState),
      resume: async (checkpointId: string, stateUpdate: Partial<AgentGraphState>) => {
        const saved = await checkpointer.get(checkpointId);
        if (!saved) throw new Error(`Checkpoint '${checkpointId}' not found.`);
        const merged: AgentGraphState = {
          ...saved,
          ...stateUpdate,
          isApproved: stateUpdate.isApproved !== undefined ? stateUpdate.isApproved : saved.isApproved
        };
        return runLoop(merged, { resumeCheckpointId: checkpointId });
      }
    };
  }
}

// ── Standard NEXUS Multi-Agent StateGraph ──────────────────────────────────
export function createDefaultAgentSocietyGraph(): AgentStateGraph {
  const graph = new AgentStateGraph();

  // Node 1: SOC Triage (Aegis SOC Triage Unit)
  graph.addNode('triage', async (state) => {
    const alert = state.alert;
    const isFalsePositive = alert.description.toLowerCase().includes('authorized benchmark');
    const severity = alert.rawPayload.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';

    const report: TriageReport = {
      severity,
      confidence: 0.95,
      isFalsePositive,
      summary: `Triage evaluated: ${alert.title}. Identified active lateral threat pattern.`,
      recommendedAction: 'ISOLATE_NODE',
      mitreTacticHint: 'T1486'
    };

    return {
      triageReport: report,
      logs: [`[SOC_TRIAGE] Alert triaged as ${severity} (confidence: 95%). False positive: ${isFalsePositive}`]
    };
  });

  // Node 2: Threat Hunter (Spectre Threat Hunter)
  graph.addNode('threat_hunt', async (state) => {
    const report: ThreatHuntReport = {
      mitreTechnique: 'T1486 Data Encrypted for Impact',
      threatActorProfile: 'APT-29 Lateral Emulation',
      indicatorsOfCompromise: ['198.51.100.23', 'port:445', 'SMBv1_anomalous_header'],
      hypothesizedVectors: ['Lateral SMB spreading across app-cluster'],
      correlatedAssetIds: [state.alert.sourceNodeId, state.alert.targetNodeId || ''].filter(Boolean)
    };

    return {
      threatHuntReport: report,
      logs: [`[THREAT_HUNTER] Correlated IoCs: ${report.indicatorsOfCompromise.join(', ')}`]
    };
  });

  // Node 3: Containment Planning (Valkyrie Incident Responder)
  graph.addNode('containment_planning', async (state, ctx) => {
    const targetNodeId = state.alert.targetNodeId || state.alert.sourceNodeId;

    const plan: ResponsePlan = {
      action: 'ISOLATE_NODE',
      targetId: targetNodeId,
      targetType: 'NODE',
      rationale: 'Prevent lateral SMB propagation to adjacent database nodes.',
      estimatedRiskReduction: 85,
      requiresHumanApproval: true
    };

    let ticketId: string | undefined;
    if (ctx?.approvalQueue) {
      const ticket = ctx.approvalQueue.createRequest({
        tenantId: state.tenantId,
        incidentId: state.incidentId,
        worldId: state.worldId,
        agentRole: 'INCIDENT_RESPONDER',
        action: plan.action as any,
        targetId: plan.targetId,
        rationale: plan.rationale,
        riskScore: 90
      });
      ticketId = ticket.id;
    }

    return {
      responsePlan: plan,
      approvalTicketId: ticketId,
      logs: [
        `[INCIDENT_RESPONDER] Formulated containment plan: ${plan.action} on ${plan.targetId}`,
        ticketId ? `[APPROVAL_QUEUE] Created ticket ${ticketId} requiring 2 signers.` : ''
      ].filter(Boolean)
    };
  });

  // Node 4: Containment Execution
  graph.addNode('execute_containment', async (state) => {
    const plan = state.responsePlan!;
    const updatedNodes = state.nodes.map((n) =>
      n.id === plan.targetId ? { ...n, status: 'isolated' as const } : n
    );

    return {
      nodes: updatedNodes,
      executionResult: {
        action: plan.action,
        targetId: plan.targetId,
        success: true,
        timestamp: new Date()
      },
      logs: [`[CONTAINMENT_EXECUTION] Successfully isolated target node ${plan.targetId}.`]
    };
  });

  // Node 5: Policy Auditor (Cerberus Policy Auditor)
  graph.addNode('audit_ledger', async (state) => {
    const payload = JSON.stringify({
      incidentId: state.incidentId,
      execution: state.executionResult,
      triage: state.triageReport?.severity
    });
    const hash = createHash('sha256').update(payload).digest('hex');

    return {
      auditProof: {
        sequenceNumber: Date.now(),
        sha256Proof: hash,
        signedBy: 'agent_policy_auditor',
        timestamp: new Date()
      },
      logs: [`[POLICY_AUDITOR] Signed SHA-256 state proof: ${hash.slice(0, 16)}...`]
    };
  });

  // Set Graph Flow & Conditional Routing
  graph.setEntryPoint('triage');

  graph.addConditionalEdge('triage', (state) => {
    if (state.triageReport?.isFalsePositive) return 'false_positive';
    return 'threat_hunt';
  }, {
    false_positive: GRAPH_END,
    threat_hunt: 'threat_hunt'
  });

  graph.addEdge('threat_hunt', 'containment_planning');

  // Interrupt before executing containment until dual-custody approval is granted
  graph.addInterruptBefore('execute_containment');
  graph.addEdge('containment_planning', 'execute_containment');
  graph.addEdge('execute_containment', 'audit_ledger');
  graph.addEdge('audit_ledger', GRAPH_END);

  return graph;
}
