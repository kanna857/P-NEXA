import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import {
  defaultCouncilOrchestrator,
  CouncilInvestigationDossier,
  CouncilLifecycleEvent
} from '@nexus/agent-engine';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { recordAuditEvent } from '../services/auditService.js';
import { ValidationError, NotFoundError, ForbiddenError } from '@nexus/shared';
import { WorldStore } from '../db/worldStore.js';

export const councilRouter = Router();

councilRouter.use(authMiddleware);
councilRouter.use(tenantMiddleware);

function getAuditActor(req: Request) {
  const user = (req as any).user;
  const userId = user?.userId;
  return {
    ...(userId && typeof userId === 'string' && Types.ObjectId.isValid(userId) ? { userId } : {}),
    agentId: user?.email || 'operator@p-nexa.internal',
    systemService: 'council-orchestrator',
    ipAddress: req.ip
  };
}

const createInvestigationSchema = z.object({
  entityId: z.string().min(1, 'entityId is required'),
  entityName: z.string().optional(),
  worldId: z.string().default('world-default'),
  alertHint: z.string().optional(),
  customTelemetry: z.record(z.unknown()).optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional()
});

const approvalSchema = z.object({
  comments: z.string().optional(),
  secondaryApprover: z.string().optional()
});

const rejectionSchema = z.object({
  reason: z.string().min(1, 'Reason for rejection is required')
});

// ── 1. Create and Execute Council Investigation ─────────────────────────────
councilRouter.post('/investigations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = createInvestigationSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ValidationError(parse.error.errors.map((e) => e.message).join(', '));
    }

    const { entityId, entityName, worldId, alertHint, customTelemetry, nodes, edges } = parse.data;
    const tenantId = req.tenantId!;
    const userEmail = (req as any).user?.email || 'operator@p-nexa.internal';

    // Attempt to load live digital twin nodes/edges if not provided in payload
    let resolvedNodes = nodes;
    let resolvedEdges = edges;
    if (!resolvedNodes || resolvedNodes.length === 0) {
      try {
        const world = await WorldStore.findWorldByIdAndTenant(worldId, tenantId);
        if (world) {
          resolvedNodes = (world.nodes || []).map((n: any) => ({
            ...n,
            id: n.nodeId || n.id
          }));
          resolvedEdges = (world.edges || []).map((e: any) => ({
            ...e,
            id: e.edgeId || e.id
          }));
        }
      } catch {
        // Fall back to target node construction
      }
    }

    const io = (req as any).io;
    const onEvent = (evt: CouncilLifecycleEvent) => {
      if (io) {
        io.to(`tenant:${tenantId}`).emit('council:event', evt);
      }
    };

    const dossier: CouncilInvestigationDossier = await defaultCouncilOrchestrator.executeInvestigation(
      {
        entityId,
        entityName,
        tenantId,
        worldId,
        nodes: resolvedNodes,
        edges: resolvedEdges,
        requestedBy: userEmail,
        alertHint,
        customTelemetry
      },
      { onEvent }
    );

    // Record audit vault log entry
    await recordAuditEvent({
      tenantId,
      actor: getAuditActor(req),
      action: 'COUNCIL_INVESTIGATION_COMPLETED',
      targetResource: { type: 'node', id: entityId },
      payload: {
        investigationId: dossier.investigationId,
        severity: dossier.threatAssessment?.severity,
        riskScore: dossier.threatAssessment?.riskScore,
        recommendedAction: dossier.recommendedPlan?.action,
        sha256Proof: dossier.cryptographicProof?.sha256Hash
      }
    });

    res.status(201).json({
      success: true,
      dossier
    });
  } catch (err) {
    next(err);
  }
});

// ── 2. List Council Investigations for Tenant ───────────────────────────────
councilRouter.get('/investigations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const investigations = defaultCouncilOrchestrator.listInvestigations(tenantId);
    res.json({
      success: true,
      total: investigations.length,
      investigations
    });
  } catch (err) {
    next(err);
  }
});

// ── 3. Get Single Investigation by ID ───────────────────────────────────────
councilRouter.get('/investigations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const dossier = defaultCouncilOrchestrator.getInvestigation(id!);
    if (!dossier) {
      throw new NotFoundError(`Investigation '${id}'`);
    }

    if (dossier.tenantId !== req.tenantId) {
      throw new ForbiddenError('Cross-tenant investigation access prohibited');
    }

    res.json({
      success: true,
      dossier
    });
  } catch (err) {
    next(err);
  }
});

// ── 4. Get Investigation Event Timeline ─────────────────────────────────────
councilRouter.get('/investigations/:id/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const dossier = defaultCouncilOrchestrator.getInvestigation(id!);
    if (!dossier) {
      throw new NotFoundError(`Investigation '${id}'`);
    }

    if (dossier.tenantId !== req.tenantId) {
      throw new ForbiddenError('Cross-tenant investigation access prohibited');
    }

    res.json({
      success: true,
      events: dossier.events,
      total: dossier.events.length
    });
  } catch (err) {
    next(err);
  }
});

// ── 5. Cancel Investigation ─────────────────────────────────────────────────
councilRouter.post('/investigations/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason = 'User requested cancellation' } = req.body;
    const tenantId = req.tenantId!;

    const cancelled = defaultCouncilOrchestrator.cancelInvestigation(id!, reason);
    if (!cancelled) {
      throw new NotFoundError(`Active investigation '${id}' to cancel`);
    }

    await recordAuditEvent({
      tenantId,
      actor: getAuditActor(req),
      action: 'COUNCIL_INVESTIGATION_CANCELLED',
      targetResource: { type: 'investigation', id: id! },
      payload: { reason }
    });

    const io = (req as any).io;
    if (io) {
      io.to(`tenant:${tenantId}`).emit('council:cancelled', { investigationId: id, reason });
    }

    res.json({
      success: true,
      message: `Investigation '${id}' successfully cancelled.`,
      investigationId: id
    });
  } catch (err) {
    next(err);
  }
});

// ── 6. Human Authorization: Approve Recommended Plan ────────────────────────
councilRouter.post('/investigations/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parse = approvalSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ValidationError(parse.error.errors.map((e) => e.message).join(', '));
    }

    const role = (req as any).user?.role;
    const isAdmin =
      role === 'admin' ||
      role === 'SUPER_ADMIN' ||
      role === 'ORG_ADMIN' ||
      role === 'commander' ||
      role === 'ADMINISTRATOR';

    if (!isAdmin) {
      throw new ForbiddenError('Approval requires Administrator or Commander role.');
    }

    const tenantId = req.tenantId!;
    const userEmail = (req as any).user?.email || 'admin@p-nexa.internal';

    if (parse.data.secondaryApprover && parse.data.secondaryApprover.trim().toLowerCase() === userEmail.trim().toLowerCase()) {
      throw new ValidationError('Dual-custody policy violation: Primary and secondary approver must be two distinct identities.');
    }

    let approvedDossier: CouncilInvestigationDossier;
    try {
      approvedDossier = defaultCouncilOrchestrator.approveInvestigation(
        id!,
        userEmail,
        parse.data.comments,
        parse.data.secondaryApprover
      );
    } catch (err: any) {
      if (err.message?.includes('Dual-custody policy violation')) {
        throw new ForbiddenError(err.message);
      }
      throw err;
    }

    const isFullyApproved = approvedDossier.status === 'APPROVED';

    await recordAuditEvent({
      tenantId,
      actor: getAuditActor(req),
      action: isFullyApproved ? 'COUNCIL_ACTION_APPROVED' : 'COUNCIL_APPROVAL_RECORDED',
      targetResource: { type: 'node', id: approvedDossier.targetEntity.id },
      payload: {
        investigationId: id,
        action: approvedDossier.recommendedPlan.action,
        comments: parse.data.comments,
        status: approvedDossier.status,
        requiresDualCustody: approvedDossier.recommendedPlan.requiresDualCustody,
        approvers: approvedDossier.humanApproval.approvals?.map((a) => a.approvedBy),
        sha256Proof: approvedDossier.cryptographicProof.sha256Hash
      }
    });

    const io = (req as any).io;
    if (io) {
      io.to(`tenant:${tenantId}`).emit('council:approved', {
        investigationId: id,
        approvedBy: userEmail,
        status: approvedDossier.status,
        action: approvedDossier.recommendedPlan.action
      });
    }

    res.json({
      success: true,
      message: isFullyApproved
        ? `Action '${approvedDossier.recommendedPlan.action}' approved and queued for safe tool execution.`
        : `First approval recorded for '${approvedDossier.recommendedPlan.action}'. Dual-custody policy requires a second distinct authorized Commander.`,
      dossier: approvedDossier
    });
  } catch (err) {
    next(err);
  }
});

// ── 7. Human Authorization: Reject Recommended Plan ─────────────────────────
councilRouter.post('/investigations/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parse = rejectionSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ValidationError(parse.error.errors.map((e) => e.message).join(', '));
    }

    const tenantId = req.tenantId!;
    const userEmail = (req as any).user?.email || 'analyst@p-nexa.internal';

    const rejectedDossier = defaultCouncilOrchestrator.rejectInvestigation(
      id!,
      userEmail,
      parse.data.reason
    );

    await recordAuditEvent({
      tenantId,
      actor: getAuditActor(req),
      action: 'COUNCIL_ACTION_REJECTED',
      targetResource: { type: 'node', id: rejectedDossier.targetEntity.id },
      payload: {
        investigationId: id,
        reason: parse.data.reason
      }
    });

    const io = (req as any).io;
    if (io) {
      io.to(`tenant:${tenantId}`).emit('council:rejected', {
        investigationId: id,
        rejectedBy: userEmail,
        reason: parse.data.reason
      });
    }

    res.json({
      success: true,
      message: `Action rejected by operator. Reason: ${parse.data.reason}`,
      dossier: rejectedDossier
    });
  } catch (err) {
    next(err);
  }
});

// ── 8. Entity History ───────────────────────────────────────────────────────
councilRouter.get('/entities/:entityId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId } = req.params;
    const history = defaultCouncilOrchestrator.getEntityHistory(entityId!);
    res.json({
      success: true,
      entityId,
      total: history.length,
      history
    });
  } catch (err) {
    next(err);
  }
});
