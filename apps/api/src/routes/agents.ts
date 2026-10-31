import { Router } from 'express';
import { Permissions, NotFoundError, ValidationError } from '@nexus/shared';
import {
  AGENT_PERSONAS,
  createSocietyWorkflow,
  executeSocietyWorkflow,
  defaultApprovalQueue,
  defaultMemoryStore
} from '@nexus/agent-engine';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';
import { WorldStore } from '../db/worldStore.js';
import { recordAuditEvent } from '../services/auditService.js';
import { randomUUID } from 'node:crypto';

export const agentsRouter = Router();

agentsRouter.use(authMiddleware);
agentsRouter.use(tenantMiddleware);

// Helper: normalize nodes & edges from DB
function normNodes(nodes: any[]): any[] {
  return (nodes || []).map((n) => {
    const raw = n && typeof n.toObject === 'function' ? n.toObject() : (n._doc || n);
    return { ...raw, id: raw.nodeId || raw.id };
  });
}
function normEdges(edges: any[]): any[] {
  return (edges || []).map((e) => {
    const raw = e && typeof e.toObject === 'function' ? e.toObject() : (e._doc || e);
    return { ...raw, id: raw.edgeId || raw.id };
  });
}

// ── 1. List Active Multi-Agent Society Units ─────────────────────────────
agentsRouter.get('/', requirePermission(Permissions.AGENT_READ), async (_req, res, next) => {
  try {
    const agents = Object.values(AGENT_PERSONAS).map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      systemPrompt: a.systemPrompt,
      toolAllowlist: a.toolAllowlist,
      status: 'idle'
    }));

    res.json({ success: true, data: agents });
  } catch (err) {
    next(err);
  }
});

// ── 2. Dispatch Incident to Multi-Agent Society Workflow ──────────────────
agentsRouter.post('/incident-workflow', requirePermission(Permissions.AGENT_COMMAND), async (req, res, next) => {
  try {
    const { worldId, alert, autoApproveHITL } = req.body;
    if (!worldId || !alert || !alert.sourceNodeId || !alert.title) {
      throw new ValidationError('Missing required fields: worldId, alert with title and sourceNodeId');
    }

    const tenantId = req.tenantId!;
    const world = await WorldStore.findWorldByIdAndTenant(worldId, tenantId);
    if (!world) throw new NotFoundError('Digital Twin World');

    const nodes = normNodes(world.nodes as any);
    const edges = normEdges(world.edges as any);

    const incidentId = alert.id || `inc-${randomUUID().slice(0, 8)}`;
    const workflow = createSocietyWorkflow({
      incidentId,
      tenantId,
      worldId,
      alert: {
        id: incidentId,
        sourceNodeId: alert.sourceNodeId,
        targetNodeId: alert.targetNodeId,
        title: alert.title,
        description: alert.description || '',
        rawPayload: alert.rawPayload || {},
        timestamp: new Date()
      },
      nodes,
      edges
    });

    // Execute stateful multi-agent society graph
    const finalState = await executeSocietyWorkflow(workflow, {
      autoApproveHITL: !!autoApproveHITL
    });

    // If containment was executed, persist mutation to world store
    if (finalState.containmentResult?.success) {
      if (finalState.responsePlan?.action === 'ISOLATE_NODE') {
        await WorldStore.updateNodeStatus(worldId, tenantId, finalState.responsePlan.targetId, 'isolated');
      } else if (finalState.responsePlan?.action === 'SEVER_EDGE') {
        await WorldStore.updateEdgeStatus(worldId, tenantId, finalState.responsePlan.targetId, 'severed');
      }
    }

    // Broadcast real-time Socket.IO update if active
    const io = (req as any).io;
    if (io) {
      io.to(`tenant:${tenantId}`).emit('agent:workflow_updated', {
        incidentId,
        stage: finalState.currentStage,
        responsePlan: finalState.responsePlan,
        triageReport: finalState.triageReport,
        approvalId: finalState.approvalId
      });

      if (finalState.currentStage === 'HITL_APPROVAL_GATE') {
        io.to(`tenant:${tenantId}`).emit('agent:approval_required', {
          approvalId: finalState.approvalId,
          incidentId,
          action: finalState.responsePlan?.action,
          targetId: finalState.responsePlan?.targetId,
          riskScore: finalState.responsePlan?.blastRadius?.riskScore || 50
        });
      }
    }

    await recordAuditEvent({
      tenantId,
      action: 'AGENT_SOCIETY_WORKFLOW_EXECUTED',
      actor: { userId: req.user!.userId, agentId: 'multi_agent_society' },
      targetResource: { type: 'IncidentWorkflow', id: incidentId },
      payload: {
        stage: finalState.currentStage,
        severity: finalState.triageReport?.severity,
        action: finalState.responsePlan?.action,
        approvalStatus: finalState.approvalStatus
      }
    });

    res.json({ success: true, data: finalState });
  } catch (err) {
    next(err);
  }
});

// ── 3. List Pending Human Approval Requests ──────────────────────────────
agentsRouter.get('/approvals', requirePermission(Permissions.WORKFLOW_READ), async (req, res, next) => {
  try {
    const pending = defaultApprovalQueue.getPendingRequests(req.tenantId!);
    res.json({ success: true, data: pending });
  } catch (err) {
    next(err);
  }
});

// ── 4. Decide on Pending Approval Request (Dual-Custody Sign-off) ────────
agentsRouter.post('/approvals/:id/decide', requirePermission(Permissions.WORKFLOW_APPROVE), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const { decision, reason } = req.body as { decision: 'APPROVED' | 'REJECTED'; reason?: string };

    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      throw new ValidationError('decision must be either APPROVED or REJECTED');
    }

    const decidedReq = defaultApprovalQueue.decide(id, decision, req.user!.userId, reason);

    // If approved, apply containment directly to the world
    if (decision === 'APPROVED') {
      if (decidedReq.action === 'ISOLATE_NODE') {
        await WorldStore.updateNodeStatus(decidedReq.worldId, req.tenantId!, decidedReq.targetId, 'isolated');
      } else if (decidedReq.action === 'SEVER_EDGE') {
        await WorldStore.updateEdgeStatus(decidedReq.worldId, req.tenantId!, decidedReq.targetId, 'severed');
      }
    }

    // Broadcast Socket.IO update
    const io = (req as any).io;
    if (io) {
      io.to(`tenant:${req.tenantId}`).emit('agent:approval_decided', {
        approvalId: id,
        decision,
        decidedBy: req.user!.userId,
        targetId: decidedReq.targetId
      });
    }

    await recordAuditEvent({
      tenantId: req.tenantId!,
      action: 'AGENT_APPROVAL_DECIDED',
      actor: { userId: req.user!.userId },
      targetResource: { type: 'ApprovalRequest', id },
      payload: { decision, reason, targetId: decidedReq.targetId }
    });

    res.json({ success: true, data: decidedReq });
  } catch (err) {
    next(err);
  }
});

// ── 5. Query Agent Episodic Vector Memories ──────────────────────────────
agentsRouter.get('/memories', requirePermission(Permissions.AGENT_READ), async (req, res, next) => {
  try {
    const { agentId, entityId, queryText } = req.query as {
      agentId?: string;
      entityId?: string;
      queryText?: string;
    };

    let memories: any[] = [];
    if (entityId) {
      memories = await defaultMemoryStore.getMemoriesByEntity(req.tenantId!, entityId);
    } else if (queryText && agentId) {
      const scored = await defaultMemoryStore.retrieve(req.tenantId!, agentId, {
        queryText,
        topK: 10
      });
      memories = scored.map((s) => ({ ...s.entry, score: s.score }));
    } else if (agentId) {
      memories = await defaultMemoryStore.getRecentMemories(req.tenantId!, agentId, 20);
    } else {
      memories = await defaultMemoryStore.getRecentMemories(req.tenantId!, 'agent_soc_triage', 20);
    }

    res.json({ success: true, data: memories });
  } catch (err) {
    next(err);
  }
});
