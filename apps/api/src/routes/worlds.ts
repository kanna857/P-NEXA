import { Router } from 'express';
import { Permissions, NotFoundError } from '@nexus/shared';
import { computeBlastRadius, findAttackPath } from '@nexus/twin-graph';
import { computeHierarchicalClusterLayout } from '@nexus/world-engine';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { WorldStore } from '../db/worldStore.js';
import { recordAuditEvent } from '../services/auditService.js';
import {
  createWorldSchema,
  updateNodeStatusSchema,
  updateEdgeStatusSchema,
  blastRadiusSchema,
  attackPathSchema
} from '../schemas/world.js';

// Helper: normalise DB node/edge docs to TwinNode/TwinEdge shapes used by graph algorithms
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

export const worldsRouter = Router();

worldsRouter.use(authMiddleware);
worldsRouter.use(tenantMiddleware);

// ── List Worlds for Tenant ─────────────────────────────────────────────────
worldsRouter.get('/', requirePermission(Permissions.WORLD_READ), async (req, res, next) => {
  try {
    const worlds = await WorldStore.findWorldsByTenant(req.tenantId!);
    res.json({
      success: true,
      data: worlds.map((w: any) => ({
        id: w._id?.toString() || w.id,
        name: w.name,
        description: w.description,
        environmentType: w.environmentType,
        version: w.version,
        nodeCount: w.nodes?.length ?? 0,
        edgeCount: w.edges?.length ?? 0,
        updatedAt: w.updatedAt
      }))
    });
  } catch (err) {
    next(err);
  }
});

// ── Create New World ───────────────────────────────────────────────────────
worldsRouter.post(
  '/',
  requirePermission(Permissions.WORLD_WRITE),
  validateBody(createWorldSchema),
  async (req, res, next) => {
    try {
      const { name, description, environmentType, nodes, edges } = req.body;
      const tenantId = req.tenantId!;

      // Auto-layout hierarchical positions based on tier
      const positionedNodes = computeHierarchicalClusterLayout(nodes, edges);

      const world = await WorldStore.createWorld({
        tenantId,
        name,
        description,
        environmentType,
        nodes: positionedNodes,
        edges
      });

      const worldId = (world as any)._id?.toString() || (world as any).id;

      await recordAuditEvent({
        tenantId,
        action: 'DIGITAL_TWIN_WORLD_CREATED',
        actor: { userId: req.user!.userId, ipAddress: req.ip ?? undefined },
        targetResource: { type: 'DigitalTwinWorld', id: worldId },
        payload: { name, environmentType, nodeCount: nodes.length, edgeCount: edges.length }
      });

      res.status(201).json({ success: true, data: world });
    } catch (err) {
      next(err);
    }
  }
);

// ── Get World by ID ────────────────────────────────────────────────────────
worldsRouter.get('/:id', requirePermission(Permissions.WORLD_READ), async (req, res, next) => {
  try {
    const world = await WorldStore.findWorldByIdAndTenant(req.params.id!, req.tenantId!);
    if (!world) throw new NotFoundError('Digital Twin World');

    res.json({ success: true, data: world });
  } catch (err) {
    next(err);
  }
});

// ── Update Node Status (Isolate / Remediate / Compromise) ──────────────────
worldsRouter.patch(
  '/:id/nodes/:nodeId/status',
  requirePermission(Permissions.WORLD_WRITE),
  validateBody(updateNodeStatusSchema),
  async (req, res, next) => {
    try {
      const { id, nodeId } = req.params as { id: string; nodeId: string };
      const { status } = req.body;
      const tenantId = req.tenantId!;

      const world = await WorldStore.updateNodeStatus(id, tenantId, nodeId, status);
      if (!world) throw new NotFoundError('World or Node');

      // Broadcast real-time update via Socket.IO (injected via app)
      const io = (req as any).io;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('twin:node_status_changed', {
          worldId: id,
          nodeId,
          status,
          timestamp: new Date().toISOString()
        });
      }

      await recordAuditEvent({
        tenantId,
        action: 'TWIN_NODE_STATUS_CHANGED',
        actor: { userId: req.user!.userId, ipAddress: req.ip ?? undefined },
        targetResource: { type: 'TwinNode', id: nodeId },
        payload: { worldId: id, nodeId, newStatus: status }
      });

      res.json({ success: true, data: { worldId: id, nodeId, status } });
    } catch (err) {
      next(err);
    }
  }
);

// ── Update Edge Status (Sever / Restore) ──────────────────────────────────
worldsRouter.patch(
  '/:id/edges/:edgeId/status',
  requirePermission(Permissions.WORLD_WRITE),
  validateBody(updateEdgeStatusSchema),
  async (req, res, next) => {
    try {
      const { id, edgeId } = req.params as { id: string; edgeId: string };
      const { status } = req.body;
      const tenantId = req.tenantId!;

      const world = await WorldStore.updateEdgeStatus(id, tenantId, edgeId, status);
      if (!world) throw new NotFoundError('World or Edge');

      const io = (req as any).io;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('twin:edge_status_changed', {
          worldId: id,
          edgeId,
          status,
          timestamp: new Date().toISOString()
        });
      }

      await recordAuditEvent({
        tenantId,
        action: 'TWIN_EDGE_STATUS_CHANGED',
        actor: { userId: req.user!.userId, ipAddress: req.ip ?? undefined },
        targetResource: { type: 'TwinEdge', id: edgeId },
        payload: { worldId: id, edgeId, newStatus: status }
      });

      res.json({ success: true, data: { worldId: id, edgeId, status } });
    } catch (err) {
      next(err);
    }
  }
);

// ── Blast Radius Analysis ──────────────────────────────────────────────────
worldsRouter.get(
  '/:id/blast-radius',
  requirePermission(Permissions.WORLD_READ),
  validateQuery(blastRadiusSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const { nodeId, maxHops } = req.query as any;

      const world = await WorldStore.findWorldByIdAndTenant(id, req.tenantId!);
      if (!world) throw new NotFoundError('Digital Twin World');

      const result = computeBlastRadius(normNodes(world.nodes as any), normEdges(world.edges as any), nodeId, maxHops);

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ── Shortest Attack Path ───────────────────────────────────────────────────
worldsRouter.get(
  '/:id/attack-path',
  requirePermission(Permissions.WORLD_READ),
  validateQuery(attackPathSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const { sourceId, targetId } = req.query as any;

      const world = await WorldStore.findWorldByIdAndTenant(id, req.tenantId!);
      if (!world) throw new NotFoundError('Digital Twin World');

      const path = findAttackPath(normNodes(world.nodes as any), normEdges(world.edges as any), sourceId, targetId);

      res.json({
        success: true,
        data: {
          path,
          reachable: path !== null,
          hopCount: path ? path.length - 1 : null
        }
      });
    } catch (err) {
      next(err);
    }
  }
);
