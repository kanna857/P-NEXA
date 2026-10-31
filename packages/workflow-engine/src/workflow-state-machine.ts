import { canonicalJsonStringify, computeSha256 } from '@nexus/governance';
import {
  WorkflowApprovalSignoff,
  WorkflowInstance
} from './types.js';

export function computeWorkflowAuditHash(instance: WorkflowInstance): string {
  const canonicalPayload = {
    id: instance.id,
    tenantId: instance.tenantId,
    title: instance.title,
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

export class WorkflowStateMachine {
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
      instance.status === 'ABORTED'
    ) {
      return { instance, haltedAtGate: false };
    }

    instance.status = 'RUNNING';

    while (instance.currentStepIndex < instance.steps.length) {
      const step = instance.steps[instance.currentStepIndex]!;

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

      // 2. Encountering a Gate or High-Risk Action
      const isGate = step.type === 'HUMAN_APPROVAL_GATE';
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

      switch (step.type) {
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

        case 'SIMULATE_SCENARIO':
          step.output = {
            simulationVerified: true,
            predictedContainmentTicks: 3,
            simulatedResilienceDelta: +25,
            simulatedAt: now
          };
          break;

        case 'ISOLATE_HOST':
          step.output = {
            action: 'ISOLATE_HOST',
            isolatedHostId: step.payload?.targetNodeId || 'app-01',
            networkTrafficSevered: true,
            quarantinedAt: now
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

        case 'NOTIFY_TEAM':
          step.output = {
            channel: 'SEC_OPS_WAR_ROOM',
            notificationDispatched: true,
            timestamp: now
          };
          break;
      }

      step.status = 'COMPLETED';
      instance.currentStepIndex++;
    }

    if (instance.currentStepIndex >= instance.steps.length) {
      instance.status = 'COMPLETED';
      instance.completedAt = new Date().toISOString();
    }

    instance.auditProofHash = computeWorkflowAuditHash(instance);
    instance.updatedAt = new Date().toISOString();
    return { instance, haltedAtGate: false };
  }
}
