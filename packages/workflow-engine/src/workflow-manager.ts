import { computeWorkflowAuditHash, WorkflowStateMachine } from './workflow-state-machine.js';
import {
  WorkflowApprovalSignoff,
  WorkflowInstance,
  WorkflowStep
} from './types.js';

export class WorkflowManager {
  private workflows = new Map<string, WorkflowInstance>();
  private stateMachine = new WorkflowStateMachine();

  public createWorkflow(data: {
    tenantId: string;
    title: string;
    description: string;
    steps: WorkflowStep[];
    context?: Record<string, any>;
  }): WorkflowInstance {
    const id = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const instance: WorkflowInstance = {
      id,
      tenantId: data.tenantId,
      title: data.title,
      description: data.description,
      status: 'IDLE',
      currentStepIndex: 0,
      steps: data.steps.map((s) => ({
        ...s,
        status: 'PENDING',
        approvals: []
      })),
      context: data.context || {},
      auditProofHash: '',
      createdAt: now,
      updatedAt: now
    };

    instance.auditProofHash = computeWorkflowAuditHash(instance);
    this.workflows.set(id, instance);
    return instance;
  }

  public getWorkflow(tenantId: string, id: string): WorkflowInstance | undefined {
    const wf = this.workflows.get(id);
    if (!wf || wf.tenantId !== tenantId) return undefined;
    return wf;
  }

  public listWorkflows(tenantId: string): WorkflowInstance[] {
    const list: WorkflowInstance[] = [];
    for (const wf of this.workflows.values()) {
      if (wf.tenantId === tenantId) {
        list.push(wf);
      }
    }
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public startWorkflow(
    tenantId: string,
    id: string
  ): { instance: WorkflowInstance; haltedAtGate: boolean } {
    const wf = this.getWorkflow(tenantId, id);
    if (!wf) throw new Error(`Workflow not found: ${id}`);

    const result = this.stateMachine.advance(wf);
    return result;
  }

  public submitApproval(
    tenantId: string,
    id: string,
    signoff: WorkflowApprovalSignoff
  ): { instance: WorkflowInstance; haltedAtGate: boolean } {
    const wf = this.getWorkflow(tenantId, id);
    if (!wf) throw new Error(`Workflow not found: ${id}`);

    const result = this.stateMachine.advance(wf, signoff);
    return result;
  }

  public abortWorkflow(
    tenantId: string,
    id: string,
    reason: string
  ): WorkflowInstance {
    const wf = this.getWorkflow(tenantId, id);
    if (!wf) throw new Error(`Workflow not found: ${id}`);

    wf.status = 'ABORTED';
    wf.updatedAt = new Date().toISOString();
    const currentStep = wf.steps[wf.currentStepIndex];
    if (currentStep) {
      currentStep.status = 'FAILED';
      currentStep.error = reason;
    }
    wf.auditProofHash = computeWorkflowAuditHash(wf);
    return wf;
  }

  public createRansomwareContainmentPlaybook(
    tenantId: string,
    targetNodeId: string,
    edgeId?: string
  ): WorkflowInstance {
    const steps: WorkflowStep[] = [
      {
        id: 'step-1-triage',
        name: 'Automated Alert Triage & Correlation',
        type: 'ANALYZE_ALERT',
        riskLevel: 'LOW',
        status: 'PENDING',
        payload: { targetNodeId }
      },
      {
        id: 'step-2-diagnostics',
        name: 'In-Depth Host Diagnostic Scan',
        type: 'RUN_DIAGNOSTICS',
        riskLevel: 'LOW',
        status: 'PENDING',
        payload: { targetNodeId }
      },
      {
        id: 'step-3-blast-radius',
        name: 'Downstream Blast Radius Estimation',
        type: 'COMPUTE_BLAST_RADIUS',
        riskLevel: 'LOW',
        status: 'PENDING',
        payload: { targetNodeId }
      },
      {
        id: 'step-4-dual-approval',
        name: 'Dual-Custody Human Authorization Gate',
        type: 'HUMAN_APPROVAL_GATE',
        riskLevel: 'CRITICAL',
        status: 'PENDING',
        requiresDualApproval: true
      },
      {
        id: 'step-5-isolate',
        name: 'Automated Host Quarantine Isolation',
        type: 'ISOLATE_HOST',
        riskLevel: 'HIGH',
        status: 'PENDING',
        payload: { targetNodeId }
      },
      {
        id: 'step-6-sever-edge',
        name: 'Perimeter Network Severance',
        type: 'SEVER_NETWORK_LINK',
        riskLevel: 'HIGH',
        status: 'PENDING',
        payload: { edgeId }
      },
      {
        id: 'step-7-notify',
        name: 'SOC War Room Real-Time Notification',
        type: 'NOTIFY_TEAM',
        riskLevel: 'LOW',
        status: 'PENDING'
      }
    ];

    return this.createWorkflow({
      tenantId,
      title: `Emergency Ransomware Containment Playbook (${targetNodeId})`,
      description: `Automated 7-step response pipeline with dual-custody approval gating.`,
      steps,
      context: { targetNodeId, edgeId }
    });
  }

  public clear(): void {
    this.workflows.clear();
  }
}

export const defaultWorkflowManager = new WorkflowManager();
