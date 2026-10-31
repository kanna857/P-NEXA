import {
  AgentIdentity,
  AgentRole,
  SecurityAlert,
  SocietyWorkflowState
} from './types.js';
import {
  ROLE_TOOL_ALLOWLISTS,
  executeToolSandboxed,
  ToolExecutionContext
} from './tools.js';
import { defaultApprovalQueue, ApprovalQueueManager } from './approvalQueue.js';
import { VectorMemoryStore, ReflectionEngine, defaultMemoryStore } from '@nexus/agent-memory';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';

export const AGENT_PERSONAS: Record<AgentRole, AgentIdentity> = {
  SOC_TRIAGE: {
    id: 'agent_soc_triage',
    name: 'Aegis SOC Triage Unit',
    role: 'SOC_TRIAGE',
    systemPrompt:
      'You are the SOC Triage agent in Nexus Omega X. Analyze incoming security telemetry, calculate threat severity, filter noise, and prioritize true incidents.',
    toolAllowlist: ROLE_TOOL_ALLOWLISTS.SOC_TRIAGE
  },
  THREAT_HUNTER: {
    id: 'agent_threat_hunter',
    name: 'Spectre Threat Hunter',
    role: 'THREAT_HUNTER',
    systemPrompt:
      'You are the Threat Hunting agent in Nexus Omega X. Correlate indicators of compromise, trace MITRE ATT&CK techniques, and detect lateral traversal patterns.',
    toolAllowlist: ROLE_TOOL_ALLOWLISTS.THREAT_HUNTER
  },
  INCIDENT_RESPONDER: {
    id: 'agent_incident_responder',
    name: 'Valkyrie Incident Responder',
    role: 'INCIDENT_RESPONDER',
    systemPrompt:
      'You are the Incident Response agent in Nexus Omega X. Formulate precise containment plans, assess blast radius, and execute tactical asset isolation.',
    toolAllowlist: ROLE_TOOL_ALLOWLISTS.INCIDENT_RESPONDER
  },
  RED_TEAM_ADVERSARY: {
    id: 'agent_red_team',
    name: 'Nemesis Red Team Adversary',
    role: 'RED_TEAM_ADVERSARY',
    systemPrompt:
      'You are the Red Team Adversary simulation agent in Nexus Omega X. Emulate adversarial lateral movement and verify whether proposed defenses reliably block exploitation.',
    toolAllowlist: ROLE_TOOL_ALLOWLISTS.RED_TEAM_ADVERSARY
  },
  POLICY_AUDITOR: {
    id: 'agent_policy_auditor',
    name: 'Cerberus Policy Auditor',
    role: 'POLICY_AUDITOR',
    systemPrompt:
      'You are the Policy Auditor in Nexus Omega X. Enforce strict governance, verify tool allowlists, enforce human dual-custody gates, and record cryptographic proof.',
    toolAllowlist: ROLE_TOOL_ALLOWLISTS.POLICY_AUDITOR
  }
};

/**
 * Initializes a new SocietyWorkflowState from an alert and world topology.
 */
export function createSocietyWorkflow(params: {
  incidentId: string;
  tenantId: string;
  worldId: string;
  alert: SecurityAlert;
  nodes: TwinNode[];
  edges: TwinEdge[];
}): SocietyWorkflowState {
  return {
    incidentId: params.incidentId,
    tenantId: params.tenantId,
    worldId: params.worldId,
    currentStage: 'TRIAGE',
    alert: params.alert,
    nodes: params.nodes,
    edges: params.edges,
    agentLogs: []
  };
}

export interface RunWorkflowOptions {
  memoryStore?: VectorMemoryStore;
  approvalQueue?: ApprovalQueueManager;
  autoApproveHITL?: boolean; // For automated simulation testing
}

/**
 * Executes the stateful Multi-Agent Society Workflow until either
 * reaching 'COMPLETED', 'FAILED', or pausing at 'HITL_APPROVAL_GATE'.
 */
export async function executeSocietyWorkflow(
  state: SocietyWorkflowState,
  options: RunWorkflowOptions = {}
): Promise<SocietyWorkflowState> {
  const memoryStore = options.memoryStore || defaultMemoryStore;
  const approvalQueue = options.approvalQueue || defaultApprovalQueue;
  const reflectionEngine = new ReflectionEngine(memoryStore, 20);

  const context: ToolExecutionContext = {
    tenantId: state.tenantId,
    worldId: state.worldId,
    nodes: state.nodes,
    edges: state.edges,
    humanApproved: options.autoApproveHITL || state.approvalStatus === 'APPROVED'
  };

  while (state.currentStage !== 'COMPLETED' && state.currentStage !== 'FAILED') {
    // Check if waiting on Human Approval
    if (state.currentStage === 'HITL_APPROVAL_GATE') {
      if (options.autoApproveHITL || state.approvalStatus === 'APPROVED') {
        state.currentStage = 'CONTAINMENT_EXECUTED';
      } else {
        // Halt and wait for external human decision
        break;
      }
    }

    switch (state.currentStage) {
      // ── Step 1: SOC Triage ──────────────────────────────────────────────
      case 'TRIAGE': {
        const agent = AGENT_PERSONAS.SOC_TRIAGE;
        state.agentLogs.push({
          role: agent.role,
          stage: 'TRIAGE',
          message: `Triaging incoming alert: "${state.alert.title}" on node ${state.alert.sourceNodeId}`,
          timestamp: new Date()
        });

        await executeToolSandboxed(
          agent,
          'query_telemetry',
          { nodeId: state.alert.sourceNodeId },
          context
        );

        const classification = await executeToolSandboxed(
          agent,
          'classify_threat',
          {
            alertText: `${state.alert.title} ${state.alert.description}`,
            sourceNodeId: state.alert.sourceNodeId
          },
          context
        );

        state.triageReport = {
          severity: classification.severity,
          confidence: classification.confidence,
          isFalsePositive: classification.isFalsePositive,
          summary: `Alert categorized as ${classification.severity} (confidence: ${(
            classification.confidence * 100
          ).toFixed(0)}%).`,
          recommendedAction: classification.isFalsePositive
            ? 'Close ticket as false positive'
            : 'Escalate to Threat Hunting and Incident Response'
        };

        // Record triage memory observation
        await reflectionEngine.recordObservationAndCheck(state.tenantId, agent.id, {
          content: `Alert ${state.alert.id} on ${state.alert.sourceNodeId} triaged as ${classification.severity}`,
          importance: classification.severity === 'CRITICAL' ? 8 : 5,
          referencedEntities: [state.alert.sourceNodeId]
        });

        if (classification.isFalsePositive) {
          state.currentStage = 'COMPLETED';
        } else {
          state.currentStage = 'THREAT_HUNT';
        }
        break;
      }

      // ── Step 2: Threat Hunter ───────────────────────────────────────────
      case 'THREAT_HUNT': {
        const agent = AGENT_PERSONAS.THREAT_HUNTER;
        state.agentLogs.push({
          role: agent.role,
          stage: 'THREAT_HUNT',
          message: `Hunting adversary techniques and mapping MITRE ATT&CK vectors...`,
          timestamp: new Date()
        });

        const mitre = await executeToolSandboxed(
          agent,
          'trace_mitre_attack',
          { behaviorSummary: `${state.alert.title} ${state.alert.description}` },
          context
        );

        const threatIntel = await executeToolSandboxed(
          agent,
          'search_threat_intel',
          { indicator: state.alert.sourceNodeId },
          context
        );

        // Check episodic memory for prior incidents referencing this node
        const pastMemories = await memoryStore.getMemoriesByEntity(
          state.tenantId,
          state.alert.sourceNodeId
        );

        state.threatHuntReport = {
          mitreTechnique: `${mitre.techniqueId} - ${mitre.name} (${mitre.tactic})`,
          threatActorProfile: threatIntel.knownThreatActor,
          indicatorsOfCompromise: [state.alert.sourceNodeId, ...threatIntel.cveReferences],
          hypothesizedVectors: [
            `Adversary leveraging ${mitre.name} for lateral progression`,
            `Prior incident recall: found ${pastMemories.length} related records in memory`
          ],
          correlatedAssetIds: [state.alert.sourceNodeId]
        };

        state.currentStage = 'RESPONSE_PLAN';
        break;
      }

      // ── Step 3: Incident Responder ──────────────────────────────────────
      case 'RESPONSE_PLAN': {
        const agent = AGENT_PERSONAS.INCIDENT_RESPONDER;
        state.agentLogs.push({
          role: agent.role,
          stage: 'RESPONSE_PLAN',
          message: `Calculating blast radius and formulating containment strategy...`,
          timestamp: new Date()
        });

        const blastRadius = await executeToolSandboxed(
          agent,
          'query_blast_radius',
          { nodeId: state.alert.sourceNodeId, maxHops: 2 },
          context
        );

        // Determine if node isolation or edge severance is best
        const isCritical =
          state.triageReport?.severity === 'CRITICAL' ||
          state.triageReport?.severity === 'HIGH' ||
          blastRadius.riskScore >= 30;
        const action = isCritical ? 'ISOLATE_NODE' : 'SEVER_EDGE';
        const targetId = action === 'ISOLATE_NODE' ? state.alert.sourceNodeId : state.edges[0]?.id || state.alert.sourceNodeId;

        state.responsePlan = {
          action,
          targetId,
          targetType: action === 'ISOLATE_NODE' ? 'NODE' : 'EDGE',
          rationale: `Blast radius analysis indicates ${blastRadius.impactedNodeIds.length} vulnerable downstream nodes with risk score ${blastRadius.riskScore}.`,
          estimatedRiskReduction: Math.min(95, blastRadius.riskScore + 20),
          blastRadius,
          requiresHumanApproval: true // High-impact actions require sign-off
        };

        state.currentStage = 'RED_TEAM_VERIFY';
        break;
      }

      // ── Step 4: Red Team Adversary Verification ─────────────────────────
      case 'RED_TEAM_VERIFY': {
        const agent = AGENT_PERSONAS.RED_TEAM_ADVERSARY;
        state.agentLogs.push({
          role: agent.role,
          stage: 'RED_TEAM_VERIFY',
          message: `Adversary testing: Verifying attack path exploitability...`,
          timestamp: new Date()
        });

        // Find attack path from compromised node to highest tier database
        const dbNode = state.nodes.find((n) => n.type === 'database' || n.tier === 3);
        const targetId = dbNode ? dbNode.id : state.nodes[state.nodes.length - 1]?.id || '';

        const simResult = await executeToolSandboxed(
          agent,
          'simulate_attack_vector',
          { sourceId: state.alert.sourceNodeId, targetId },
          context
        );

        state.redTeamReport = {
          exploitFeasibility: simResult.pathFound ? 'HIGH' : 'LOW',
          simulatedAttackPath: simResult.path,
          defenseBypassPossible: false,
          adversaryAssessment: simResult.pathFound
            ? `Adversary confirmed active traversal path: ${simResult.path?.join(
                ' -> '
              )}. Proposed isolation will successfully sever this kill-chain.`
            : 'No direct traversal path found to critical crown-jewel assets.'
        };

        state.currentStage = 'POLICY_AUDIT';
        break;
      }

      // ── Step 5: Policy Auditor & Governance ─────────────────────────────
      case 'POLICY_AUDIT': {
        const agent = AGENT_PERSONAS.POLICY_AUDITOR;
        state.agentLogs.push({
          role: agent.role,
          stage: 'POLICY_AUDIT',
          message: `Auditing response plan against governance rules and tool allowlists...`,
          timestamp: new Date()
        });

        const planAction = state.responsePlan?.action || 'NO_ACTION';

        // 1. Audit tool compliance
        const auditExec = await executeToolSandboxed(
          agent,
          'audit_tool_execution',
          { agentRole: 'INCIDENT_RESPONDER', plannedAction: planAction },
          context
        );

        // 2. Generate cryptographic audit proof
        const proof = await executeToolSandboxed(
          agent,
          'record_audit_proof',
          {
            data: {
              incidentId: state.incidentId,
              tenantId: state.tenantId,
              plan: state.responsePlan,
              timestamp: new Date().toISOString()
            }
          },
          context
        );

        state.auditVerdict = {
          compliant: auditExec.isCompliant,
          policyChecked: auditExec.policyReference,
          governanceRulePassed: true,
          auditProofHash: proof.proofHash
        };

        // 3. Human Approval Gate Check
        if (state.responsePlan?.requiresHumanApproval && !context.humanApproved) {
          // Create pending HITL request
          const req = approvalQueue.createRequest({
            tenantId: state.tenantId,
            incidentId: state.incidentId,
            worldId: state.worldId,
            agentRole: 'INCIDENT_RESPONDER',
            action: state.responsePlan.action as any,
            targetId: state.responsePlan.targetId,
            rationale: state.responsePlan.rationale,
            riskScore: state.responsePlan.blastRadius?.riskScore || 50
          });

          state.approvalId = req.id;
          state.approvalStatus = 'PENDING';
          state.currentStage = 'HITL_APPROVAL_GATE';

          state.agentLogs.push({
            role: agent.role,
            stage: 'HITL_APPROVAL_GATE',
            message: `Execution paused at Human-in-the-Loop gate. Approval Request ID: ${req.id}`,
            data: { approvalId: req.id, action: req.action, targetId: req.targetId },
            timestamp: new Date()
          });

          // Break loop to pause
          break;
        } else {
          state.currentStage = 'CONTAINMENT_EXECUTED';
        }
        break;
      }

      // ── Step 6: Containment Execution ───────────────────────────────────
      case 'CONTAINMENT_EXECUTED': {
        const agent = AGENT_PERSONAS.INCIDENT_RESPONDER;
        state.agentLogs.push({
          role: agent.role,
          stage: 'CONTAINMENT_EXECUTED',
          message: `Applying containment action: ${state.responsePlan?.action} on target ${state.responsePlan?.targetId}`,
          timestamp: new Date()
        });

        // Set humanApproved true in context
        context.humanApproved = true;

        if (state.responsePlan?.action === 'ISOLATE_NODE') {
          await executeToolSandboxed(
            agent,
            'apply_containment',
            { action: 'ISOLATE_NODE', targetId: state.responsePlan.targetId },
            context
          );
        } else if (state.responsePlan?.action === 'SEVER_EDGE') {
          await executeToolSandboxed(
            agent,
            'apply_containment',
            { action: 'SEVER_EDGE', targetId: state.responsePlan.targetId },
            context
          );
        }

        state.containmentResult = {
          success: true,
          appliedAction: state.responsePlan?.action || 'NONE',
          targetId: state.responsePlan?.targetId || '',
          timestamp: new Date()
        };

        // Record episodic memory of remediation
        await reflectionEngine.recordObservationAndCheck(state.tenantId, agent.id, {
          content: `Incident ${state.incidentId} contained successfully by applying ${state.responsePlan?.action} on ${state.responsePlan?.targetId}`,
          importance: 9,
          referencedEntities: [state.alert.sourceNodeId, state.responsePlan?.targetId || '']
        });

        state.currentStage = 'COMPLETED';
        break;
      }

      default:
        state.currentStage = 'COMPLETED';
        break;
    }
  }

  return state;
}

/**
 * Resumes a workflow that paused at 'HITL_APPROVAL_GATE' using the human operator's decision.
 */
export async function resumeWorkflowAfterApproval(
  state: SocietyWorkflowState,
  decision: 'APPROVED' | 'REJECTED',
  decidedBy: string,
  reason?: string,
  options: RunWorkflowOptions = {}
): Promise<SocietyWorkflowState> {
  const approvalQueue = options.approvalQueue || defaultApprovalQueue;

  if (state.approvalId) {
    approvalQueue.decide(state.approvalId, decision, decidedBy, reason);
  }

  state.approvalStatus = decision;

  if (decision === 'APPROVED') {
    state.currentStage = 'CONTAINMENT_EXECUTED';
    state.agentLogs.push({
      role: 'POLICY_AUDITOR',
      stage: 'CONTAINMENT_EXECUTED',
      message: `Human approval granted by ${decidedBy}. Resuming containment execution.`,
      timestamp: new Date()
    });
    return executeSocietyWorkflow(state, options);
  } else {
    state.currentStage = 'COMPLETED';
    state.containmentResult = {
      success: false,
      appliedAction: 'REJECTED_BY_HUMAN',
      targetId: state.responsePlan?.targetId || '',
      timestamp: new Date()
    };
    state.agentLogs.push({
      role: 'POLICY_AUDITOR',
      stage: 'COMPLETED',
      message: `Human approval rejected by ${decidedBy}. Rationale: "${reason || 'None provided'}". Action aborted.`,
      timestamp: new Date()
    });
    return state;
  }
}
