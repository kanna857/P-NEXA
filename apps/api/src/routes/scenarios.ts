import { Router } from 'express';
import { Permissions, NotFoundError } from '@nexus/shared';
import {
  defaultScenarioManager,
  SimulationAction
} from '@nexus/simulation-engine';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';
import { validateBody } from '../middlewares/validate.js';
import { WorldStore } from '../db/worldStore.js';
import { recordAuditEvent } from '../services/auditService.js';
import {
  createScenarioSchema,
  stepScenarioSchema,
  runScenarioSchema,
  addActionSchema,
  branchScenarioSchema,
  compareScenariosSchema
} from '../schemas/scenario.js';

export const scenariosRouter = Router();

scenariosRouter.use(authMiddleware);
scenariosRouter.use(tenantMiddleware);

// Helper to normalize DB nodes and edges
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

// ── 1. Create Simulation Scenario from World ────────────────────────────────
scenariosRouter.post(
  '/',
  requirePermission(Permissions.SIM_EXECUTE),
  validateBody(createScenarioSchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const {
        worldId,
        name,
        description,
        seed,
        maxTicks,
        tickRateMs,
        initialThreats,
        initialActions
      } = req.body;

      const world = await WorldStore.findWorldById(worldId);
      if (!world || world.tenantId.toString() !== tenantId) {
        throw new NotFoundError(`Digital twin world not found: ${worldId}`);
      }

      const worldNodes = normNodes(world.nodes);
      const worldEdges = normEdges(world.edges);

      const { scenario } = defaultScenarioManager.createScenario(
        {
          tenantId,
          worldId,
          name,
          description,
          seed,
          maxTicks,
          tickRateMs,
          initialThreats,
          initialActions: initialActions as SimulationAction[]
        },
        worldNodes,
        worldEdges
      );

      await recordAuditEvent({
        tenantId,
        action: 'SCENARIO_CREATED',
        actor: { userId: req.user?.userId },
        targetResource: { type: 'SCENARIO', id: scenario.id },
        payload: {
          worldId,
          name,
          seed: scenario.seed,
          threatsCount: scenario.activeThreats.length
        }
      });

      const io = (req as any).io;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('scenario:created', {
          scenarioId: scenario.id,
          worldId,
          name: scenario.name,
          seed: scenario.seed
        });
      }

      res.status(201).json({
        success: true,
        data: scenario
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 2. List Scenarios ───────────────────────────────────────────────────────
scenariosRouter.get(
  '/',
  requirePermission(Permissions.SIM_READ),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const worldId = req.query.worldId as string | undefined;

      const scenarios = defaultScenarioManager.listScenarios(tenantId, worldId);
      res.json({
        success: true,
        data: scenarios.map((s: any) => ({
          id: s.id,
          name: s.name,
          worldId: s.worldId,
          seed: s.seed,
          currentTick: s.currentTick,
          maxTicks: s.maxTicks,
          status: s.status,
          parentId: s.parentId,
          branchTick: s.branchTick,
          activeThreatsCount: s.activeThreats.length,
          snapshotsCount: s.snapshots.length,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        }))
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 3. Compare Scenarios (Divergence Detection) ─────────────────────────────
scenariosRouter.post(
  '/compare',
  requirePermission(Permissions.SIM_READ),
  validateBody(compareScenariosSchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const { scenarioAId, scenarioBId } = req.body;

      const divergence = defaultScenarioManager.compareScenarios(
        tenantId,
        scenarioAId,
        scenarioBId
      );

      res.json({
        success: true,
        data: divergence
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 4. Get Scenario Details & Current State ─────────────────────────────────
scenariosRouter.get(
  '/:id',
  requirePermission(Permissions.SIM_READ),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const scenarioId = req.params.id!;
      const scenario = defaultScenarioManager.getScenario(tenantId, scenarioId);

      if (!scenario) {
        throw new NotFoundError(`Scenario not found: ${scenarioId}`);
      }

      res.json({
        success: true,
        data: scenario
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 5. Step Simulation Forward by N Ticks ──────────────────────────────────
scenariosRouter.post(
  '/:id/tick',
  requirePermission(Permissions.SIM_EXECUTE),
  validateBody(stepScenarioSchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const scenarioId = req.params.id!;
      const { steps = 1 } = req.body;

      const snapshots = defaultScenarioManager.stepScenario(
        tenantId,
        scenarioId,
        steps
      );
      const scenario = defaultScenarioManager.getScenario(tenantId, scenarioId)!;
      const latestSnapshot = snapshots[snapshots.length - 1];

      const io = (req as any).io;
      if (io) {
        io.to(`sim:${scenario.id}`).emit('scenario:tick', {
          scenarioId: scenario.id,
          currentTick: scenario.currentTick,
          status: scenario.status,
          latestSnapshot
        });
        io.to(`tenant:${tenantId}`).emit('scenario:progress', {
          scenarioId: scenario.id,
          currentTick: scenario.currentTick,
          status: scenario.status
        });
      }

      res.json({
        success: true,
        data: {
          scenario,
          newSnapshots: snapshots
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 6. Run Simulation to Target Tick or Completion ──────────────────────────
scenariosRouter.post(
  '/:id/run',
  requirePermission(Permissions.SIM_EXECUTE),
  validateBody(runScenarioSchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const scenarioId = req.params.id!;
      const { targetTick } = req.body;

      const snapshots = defaultScenarioManager.runScenario(
        tenantId,
        scenarioId,
        targetTick
      );
      const scenario = defaultScenarioManager.getScenario(tenantId, scenarioId)!;

      const io = (req as any).io;
      if (io) {
        io.to(`sim:${scenario.id}`).emit('scenario:run_completed', {
          scenarioId: scenario.id,
          currentTick: scenario.currentTick,
          status: scenario.status,
          snapshotsCount: scenario.snapshots.length
        });
      }

      res.json({
        success: true,
        data: {
          scenario,
          newSnapshots: snapshots
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 7. Schedule or Add Intervention Action ──────────────────────────────────
scenariosRouter.post(
  '/:id/actions',
  requirePermission(Permissions.SIM_EXECUTE),
  validateBody(addActionSchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const scenarioId = req.params.id!;
      const actionData = req.body;

      const action = defaultScenarioManager.addAction(tenantId, scenarioId, {
        ...actionData,
        createdBy: req.user?.userId
      });

      await recordAuditEvent({
        tenantId,
        action: 'SCENARIO_ACTION_SCHEDULED',
        actor: { userId: req.user?.userId },
        targetResource: { type: 'SCENARIO', id: scenarioId },
        payload: {
          actionId: action.id,
          type: action.type,
          targetId: action.targetId,
          scheduledTick: action.scheduledTick
        }
      });

      const io = (req as any).io;
      if (io) {
        io.to(`sim:${scenarioId}`).emit('scenario:action_added', action);
      }

      res.status(201).json({
        success: true,
        data: action
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 8. Branch Scenario into Counterfactual Run ──────────────────────────────
scenariosRouter.post(
  '/:id/branch',
  requirePermission(Permissions.SIM_BRANCH),
  validateBody(branchScenarioSchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const scenarioId = req.params.id!;
      const { branchTick, name, description, actions } = req.body;

      const { branchScenario } = defaultScenarioManager.branchScenario(
        tenantId,
        scenarioId,
        branchTick,
        {
          name,
          description,
          branchTick,
          actions: actions as SimulationAction[]
        }
      );

      await recordAuditEvent({
        tenantId,
        action: 'SCENARIO_BRANCHED',
        actor: { userId: req.user?.userId },
        targetResource: { type: 'SCENARIO', id: branchScenario.id },
        payload: {
          parentScenarioId: scenarioId,
          branchTick,
          branchName: branchScenario.name
        }
      });

      const io = (req as any).io;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('scenario:branched', {
          parentScenarioId: scenarioId,
          branchScenarioId: branchScenario.id,
          branchTick
        });
      }

      res.status(201).json({
        success: true,
        data: branchScenario
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 9. Deterministic Replay Verification ────────────────────────────────────
scenariosRouter.get(
  '/:id/replay',
  requirePermission(Permissions.SIM_READ),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const scenarioId = req.params.id!;
      const verification = defaultScenarioManager.replayScenario(
        tenantId,
        scenarioId
      );

      res.json({
        success: true,
        data: verification
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 10. Delete Scenario ─────────────────────────────────────────────────────
scenariosRouter.delete(
  '/:id',
  requirePermission(Permissions.SIM_EXECUTE),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const scenarioId = req.params.id!;
      const deleted = defaultScenarioManager.deleteScenario(
        tenantId,
        scenarioId
      );

      if (!deleted) {
        throw new NotFoundError(`Scenario not found: ${scenarioId}`);
      }

      res.json({
        success: true,
        message: 'Scenario removed from simulation store'
      });
    } catch (err) {
      next(err);
    }
  }
);
