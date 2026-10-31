import { randomUUID } from 'node:crypto';
import { AgentRole } from './types.js';

export interface ApprovalRequest {
  id: string;
  tenantId: string;
  incidentId: string;
  worldId: string;
  agentRole: AgentRole;
  action: 'ISOLATE_NODE' | 'SEVER_EDGE' | 'REVOKE_CREDENTIALS' | 'CUSTOM';
  targetId: string;
  rationale: string;
  riskScore: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: Date;
  decidedAt?: Date;
  decidedBy?: string;
  decisionReason?: string;
}

export class ApprovalQueueManager {
  private requests = new Map<string, ApprovalRequest>();

  public createRequest(params: {
    tenantId: string;
    incidentId: string;
    worldId: string;
    agentRole: AgentRole;
    action: 'ISOLATE_NODE' | 'SEVER_EDGE' | 'REVOKE_CREDENTIALS' | 'CUSTOM';
    targetId: string;
    rationale: string;
    riskScore: number;
  }): ApprovalRequest {
    const id = randomUUID();
    const req: ApprovalRequest = {
      id,
      tenantId: params.tenantId,
      incidentId: params.incidentId,
      worldId: params.worldId,
      agentRole: params.agentRole,
      action: params.action,
      targetId: params.targetId,
      rationale: params.rationale,
      riskScore: params.riskScore,
      status: 'PENDING',
      requestedAt: new Date()
    };
    this.requests.set(id, req);
    return req;
  }

  public getRequest(id: string): ApprovalRequest | null {
    return this.requests.get(id) || null;
  }

  public getPendingRequests(tenantId: string): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.tenantId === tenantId && r.status === 'PENDING'
    );
  }

  public getAllRequests(tenantId: string): ApprovalRequest[] {
    return Array.from(this.requests.values())
      .filter((r) => r.tenantId === tenantId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  public decide(
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    decidedBy: string,
    reason?: string
  ): ApprovalRequest {
    const req = this.requests.get(id);
    if (!req) {
      throw new Error(`Approval request with ID ${id} not found`);
    }
    if (req.status !== 'PENDING') {
      throw new Error(`Approval request ${id} is already ${req.status}`);
    }

    req.status = decision;
    req.decidedBy = decidedBy;
    req.decidedAt = new Date();
    req.decisionReason = reason;

    return req;
  }

  public clear(): void {
    this.requests.clear();
  }
}

export const defaultApprovalQueue = new ApprovalQueueManager();

