import { canonicalJsonStringify, computeSha256 } from '@nexus/governance';
import {
  WorkflowApprovalSignoff,
  WorkflowInstance,
  WorkflowStep,
  DAGValidationResult
} from './types.js';

export function computeWorkflowAuditHash(instance: WorkflowInstance): string {
  const canonicalPayload = {
    id: instance.id,
    tenantId: instance.tenantId,
    title: instance.title,
    version: instance.version || '1.0.0',
    status: instance.status,
    currentStepIndex: instance.currentStepIndex,
    steps: instance.steps.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      status: s.status,
      riskLevel: s.riskLevel,
      approvals: (s.approvals || []).map((a) => ({
        userId: a.userId,
        role: a.role,
        decision: a.decision,
        timestamp: a.timestamp
      })),
      output: s.output
    }))
  };
  return computeSha256(canonicalJsonStringify(canonicalPayload));
}

/**
 * Validates that a workflow step graph is a directed acyclic graph (DAG)
 * and has no cycles or unbounded loops.
 */
export function validateWorkflowAcyclic(steps: WorkflowStep[]): DAGValidationResult {
  const stepMap = new Map<string, WorkflowStep>();
  steps.forEach((s) => stepMap.set(s.id, s));

  // Build adjacency list
  const adj = new Map<string, string[]>();
  steps.forEach((s) => {
    // If nextStepIds defined, use them; otherwise implicit sequential next
    const nexts = s.nextStepIds || [];
    adj.set(s.id, nexts);
  });

  // Cycle detection via DFS with 3 states: 0 = unvisited, 1 = visiting (in stack), 2 = visited
  const state = new Map<string, number>();
  const path: string[] = [];
  let cycleFound: string[] | null = null;

  function dfs(curr: string): boolean {
    state.set(curr, 1);
    path.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const nextId of neighbors) {
      if (!stepMap.has(nextId)) continue; // external/unknown step

      const s = state.get(nextId) || 0;
      if (s === 1) {
        // Cycle detected
        const cycleStartIndex = path.indexOf(nextId);
        cycleFound = path.slice(cycleStartIndex).concat(nextId);
        return true;
      }
      if (s === 0) {
        if (dfs(nextId)) return true;
      }
    }

    path.pop();
    state.set(curr, 2);
    return false;
  }

  for (const step of steps) {
    if ((state.get(step.id) || 0) === 0) {
      if (dfs(step.id)) {
        return {
          isValid: false,
          hasCycle: true,
          cyclePath: cycleFound || [],
          totalSteps: steps.length
        };
      }
    }
  }

  return {
    isValid: true,
    hasCycle: false,
    totalSteps: steps.length
  };
}

export class WorkflowStateMachine {
  private readonly defaultMaxExecutionSteps = 50;

  /**
   * Advances the workflow execution step-by-step.
   * If a human approval gate or high-risk action is encountered, execution pauses safely
   * until authorized dual-custody approval is submitted.
   */
  public advance(
    instance: WorkflowInstance,
    signoff?: WorkflowApprovalSignoff
  ): { instance: WorkflowInstance; haltedAtGate: boolean } {
    if (
      instance.status === 'COMPLETED' ||
      instance.status === 'FAILED' ||
      instance.status === 'ABORTED' ||
      instance.status === 'CANCELLED'
    ) {
      return { instance, haltedAtGate: false };
    }

    if (!instance.executionHistory) {
      instance.executionHistory = [];
    }

    const maxSteps = instance.maxExecutionSteps || this.defaultMaxExecutionSteps;
    let executionCycles = 0;

    instance.status = 'RUNNING';

    while (instance.currentStepIndex < instance.steps.length) {
      executionCycles++;
      if (executionCycles > maxSteps) {
        instance.status = 'FAILED';
        instance.context.error = 'EXECUTION_LIMIT_EXCEEDED: Workflow exceeded maximum bounded step limit.';
        instance.auditProofHash = computeWorkflowAuditHash(instance);
        return { instance, haltedAtGate: false };
      }

      const step = instance.steps[instance.currentStepIndex]!;
      const stepStartTime = Date.now();

      // 1. Handling Paused Step waiting for approval
      if (step.status === 'PAUSED') {
        if (!signoff) {
          instance.status = 'WAITING_FOR_APPROVAL';
          instance.auditProofHash = computeWorkflowAuditHash(instance);
          return { instance, haltedAtGate: true };
        }

        // Record signoff
        if (!step.approvals) step.approvals = [];
        step.approvals.push(signoff);

        if (signoff.decision === 'REJECTED') {
          step.status = 'FAILED';
          step.error = `Rejected by ${signoff.role} (${signoff.userId}): ${signoff.comment || 'No reason provided'}`;
          instance.status = 'ABORTED';
          this.recordHistory(instance, step, stepStartTime);
          instance.auditProofHash = computeWorkflowAuditHash(instance);
          return { instance, haltedAtGate: false };
        }

        // Check if dual approval is required
        const requiredApprovalsCount = step.requiresDualApproval ? 2 : 1;

        // Check unique approver identities
        const uniqueApprovers = new Set(
          step.approvals.filter((a) => a.decision === 'APPROVED').map((a) => a.userId)
        );

        if (uniqueApprovers.size >= requiredApprovalsCount) {
          step.status = 'COMPLETED';
          step.output = {
            approved: true,
            signers: Array.from(uniqueApprovers),
            authorizedAt: new Date().toISOString()
          };
          this.recordHistory(instance, step, stepStartTime);
          instance.currentStepIndex++;
          signoff = undefined; // Consumed
          continue;
        } else {
          // Waiting for second distinct signer in dual-custody gate
          instance.status = 'WAITING_FOR_APPROVAL';
          instance.auditProofHash = computeWorkflowAuditHash(instance);
          return { instance, haltedAtGate: true };
        }
      }

      // 2. Encountering an Approval Gate or Critical Action
      const isGate = step.type === 'HUMAN_APPROVAL' || step.type === 'HUMAN_APPROVAL_GATE';
      const isCriticalAction = step.riskLevel === 'CRITICAL' || step.requiresDualApproval;

      if (isGate || isCriticalAction) {
        step.status = 'PAUSED';
        instance.status = 'WAITING_FOR_APPROVAL';
        instance.auditProofHash = computeWorkflowAuditHash(instance);
        return { instance, haltedAtGate: true };
      }

      // 3. Automated Step Execution
      step.status = 'RUNNING';
      const now = new Date().toISOString();

      try {
        switch (step.type) {
          // Phase 5 Enhanced Node Types
          case 'TELEMETRY_TRIGGER':
            step.output = {
              triggered: true,
              metric: step.payload?.metric || 'cpu',
              observedValue: step.payload?.value ?? 94.2,
              threshold: step.payload?.threshold ?? 85.0,
              entityId: step.payload?.entityId || 'srv-auth',
              timestamp: now
            };
            break;

          case 'THRESHOLD_CONDITION':
            const observed = step.payload?.value ?? 90;
            const threshold = step.payload?.threshold ?? 80;
            const isExceeded = observed >= threshold;
            step.output = {
              conditionMet: isExceeded,
              metric: step.payload?.metric || 'cpu',
              observed,
              threshold,
              branchPath: isExceeded ? 'ESCALATE' : 'MONITOR'
            };
            break;

          case 'ANOMALY_DETECTION':
            step.output = {
              analyzed: true,
              anomalyScore: step.payload?.anomalyScore ?? 0.88,
              isAnomaly: true,
              zScore: 3.4,
              model: 'stat-hybrid-zscore-v1',
              evidence: 'Sustained metric breach outside 95% confidence boundary'
            };
            break;

          case 'COUNCIL_INVESTIGATION':
            step.output = {
              investigationTriggered: true,
              investigationId: `inv-${Date.now().toString(36)}`,
              entityId: step.payload?.entityId || 'srv-auth',
              status: 'APPROVED',
              threatVerdict: 'HIGH_RISK_CREDENTIAL_STUFFING'
            };
            break;

          case 'SIMULATION':
          case 'SIMULATE_SCENARIO':
            step.output = {
              simulationVerified: true,
              predictedContainmentTicks: 3,
              simulatedResilienceDelta: +25,
              blastRadiusNodes: ['srv-auth', 'srv-api'],
              simulatedAt: now
            };
            break;

          case 'NOTIFICATION':
          case 'NOTIFY_TEAM':
            step.output = {
              channel: step.payload?.channel || 'SEC_OPS_WAR_ROOM',
              notificationDispatched: true,
              recipientCount: 5,
              timestamp: now
            };
            break;

          case 'AUTHORIZED_REMEDIATION':
          case 'ISOLATE_HOST':
            step.output = {
              action: step.payload?.action || 'ISOLATE_HOST',
              targetId: step.payload?.targetNodeId || 'srv-auth',
              networkTrafficSevered: true,
              remediationStatus: 'EXECUTED_CLEANLY',
              timestamp: now
            };
            break;

          case 'AUDIT_LOGGING':
            step.output = {
              ledgerBlockSealed: true,
              sha256Proof: computeWorkflowAuditHash(instance),
              tamperEvident: true,
              timestamp: now
            };
            break;

          // Legacy Compatibility Handlers
          case 'ANALYZE_ALERT':
            step.output = {
              triageStatus: 'CONFIRMED_THREAT',
              severity: 'CRITICAL',
              confidence: 0.94,
              sourceNode: step.payload?.targetNodeId || 'app-01',
              analyzedAt: now
            };
            break;

          case 'RUN_DIAGNOSTICS':
            step.output = {
              openPortsScanned: [22, 80, 443, 445],
              anomalousTrafficDetected: true,
              integrityVerdict: 'SUSPICIOUS_BINARY_DETECTED',
              diagnosticsCompletedAt: now
            };
            break;

          case 'COMPUTE_BLAST_RADIUS':
            step.output = {
              impactedHops: 2,
              compromisedDownstreamCount: 3,
              blastRadiusScore: 82,
              computedAt: now
            };
            break;

          case 'SEVER_NETWORK_LINK':
            step.output = {
              action: 'SEVER_NETWORK_LINK',
              severedEdgeId: step.payload?.edgeId || 'e-app-db',
              packetFlowHalted: true,
              severedAt: now
            };
            break;

          case 'APPLY_PATCH':
            step.output = {
              action: 'APPLY_PATCH',
              vulnerabilityId: step.payload?.vulnerabilityId || 'CVE-2024-38077',
              patchInstalled: true,
              appliedAt: now
            };
            break;
        }

        step.status = 'COMPLETED';
        this.recordHistory(instance, step, stepStartTime);
        instance.currentStepIndex++;
      } catch (err: any) {
        step.status = 'FAILED';
        step.error = err?.message || 'Step execution encountered an error';
        this.recordHistory(instance, step, stepStartTime);

        // Check if retryable
        const maxRetries = step.maxRetries || 0;
        const currentRetries = step.retries || 0;
        if (currentRetries < maxRetries) {
          step.retries = currentRetries + 1;
          step.status = 'RETRYING';
          // Stay on current step for retry
          return { instance, haltedAtGate: false };
        } else {
          instance.status = 'FAILED';
          instance.auditProofHash = computeWorkflowAuditHash(instance);
          return { instance, haltedAtGate: false };
        }
      }
    }

    if (instance.currentStepIndex >= instance.steps.length) {
      instance.status = 'COMPLETED';
      instance.completedAt = new Date().toISOString();
    }

    instance.auditProofHash = computeWorkflowAuditHash(instance);
    instance.updatedAt = new Date().toISOString();
    return { instance, haltedAtGate: false };
  }

  /**
   * Safely cancels an active or paused workflow instance.
   */
  public cancel(instance: WorkflowInstance, reason: string = 'User requested cancellation'): WorkflowInstance {
    instance.status = 'CANCELLED';
    instance.context.cancellationReason = reason;
    instance.updatedAt = new Date().toISOString();
    instance.auditProofHash = computeWorkflowAuditHash(instance);
    return instance;
  }

  private recordHistory(instance: WorkflowInstance, step: WorkflowStep, startTime: number): void {
    if (!instance.executionHistory) instance.executionHistory = [];
    instance.executionHistory.push({
      stepIndex: instance.currentStepIndex,
      stepId: step.id,
      stepName: step.name,
      type: step.type,
      status: step.status,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      output: step.output,
      error: step.error
    });
  }
}
