import { Router } from 'express';
import { z } from 'zod';
import {
  getAgentCount,
  getDivisionsSummary,
  searchAgents,
  getAgentById,
  loadAgentSkillInstructions
} from '@nexus/agent-registry';
import {
  loadHiveTasks,
  getPendingApprovals,
  loadBlackboardEntries,
  createDevelopmentTask,
  executeDevelopmentTask,
  handleApprovalDecision,
  ensureHiveStructure,
  validateCommandSafety,
  getTimelineEvents,
  cancelDevelopmentTask
} from '@nexus/agent-orchestrator';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { requireRole } from '../middlewares/rbacMiddleware.js';
import { validateBody } from '../middlewares/validate.js';
import { ValidationError, NotFoundError, SystemRoles } from '@nexus/shared';

export const developerRouter = Router();

// Enforce strict defense-in-depth: Auth -> Multi-tenant isolation -> RBAC guards
developerRouter.use(authMiddleware);
developerRouter.use(tenantMiddleware);
developerRouter.use(requireRole([SystemRoles.SUPER_ADMIN, SystemRoles.ORG_ADMIN]));

const createTaskSchema = z.object({
  prompt: z.string().min(5, 'Task prompt must be at least 5 characters').max(500),
  title: z.string().min(3).max(100).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional()
});

const approvalDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().max(500).optional()
});

const timelineQuerySchema = z.object({
  taskId: z.string().optional(),
  agentId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0)
});

const cancelTaskSchema = z.object({
  reason: z.string().max(300).optional()
});

// ── 1. Munder Difflin Hive Harness Health ────────────────────────────────────
developerRouter.get('/health', async (_req, res, next) => {
  try {
    const hivePath = ensureHiveStructure();
    const count = getAgentCount();
    const tasks = loadHiveTasks();
    const pending = getPendingApprovals();

    res.json({
      success: true,
      data: {
        status: 'OPERATIONAL',
        protocol: 'munder-difflin/hive@1',
        totalAgencyAgents: count,
        activeTasksCount: tasks.length,
        pendingApprovalsCount: pending.length,
        storagePath: hivePath,
        singleCommitterRails: true
      }
    });
  } catch (error) {
    next(error);
  }
});

// ── 2. Query Full Agency Agents Registry (283 Agents) ───────────────────────
developerRouter.get('/agents', async (req, res, next) => {
  try {
    const query = req.query.query ? String(req.query.query) : undefined;
    const division = req.query.division ? String(req.query.division) : undefined;
    const provider = req.query.provider ? String(req.query.provider) : undefined;

    const agents = searchAgents({ query, division, provider });
    const divisions = getDivisionsSummary();

    res.json({
      success: true,
      data: {
        total: agents.length,
        registryTotal: getAgentCount(),
        divisions,
        agents
      }
    });
  } catch (error) {
    next(error);
  }
});

// ── 3. Inspect Single Agent & Skill Instructions ────────────────────────────
developerRouter.get('/agents/:id', async (req, res, next) => {
  try {
    const agentId = req.params.id || '';
    const agent = getAgentById(agentId);
    if (!agent) {
      throw new NotFoundError(`Agent '${agentId}' not found in registry.`);
    }

    let skillInstructions = '';
    try {
      skillInstructions = loadAgentSkillInstructions(agent.id);
    } catch {
      skillInstructions = 'Instruction set loaded on demand from .agents/skills.';
    }

    res.json({
      success: true,
      data: {
        ...agent,
        skillInstructions
      }
    });
  } catch (error) {
    next(error);
  }
});

// ── 4. Query Tasks Ledger & Pending Approvals ────────────────────────────────
developerRouter.get('/tasks', async (_req, res, next) => {
  try {
    const tasks = loadHiveTasks();
    const pendingApprovals = getPendingApprovals();

    res.json({
      success: true,
      data: {
        tasks,
        pendingApprovals
      }
    });
  } catch (error) {
    next(error);
  }
});

// ── 5. Create New Multi-Agent Development Task ──────────────────────────────
developerRouter.post('/tasks', validateBody(createTaskSchema), async (req, res, next) => {
  try {
    const { prompt, title, priority } = req.body;

    // Block destructive command patterns if user attempted to pass raw destructive shell commands
    const safety = validateCommandSafety(prompt);
    if (safety.isDestructive) {
      throw new ValidationError(safety.reason || 'Blocked destructive operation.');
    }

    const task = createDevelopmentTask(prompt, { title, priority });

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// ── 6. Execute Multi-Agent Development Task ─────────────────────────────────
developerRouter.post('/tasks/:id/execute', async (req, res, next) => {
  try {
    const taskId = req.params.id || '';
    const task = await executeDevelopmentTask(taskId);

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// ── 7. Query Live Agent Execution Timeline ──────────────────────────────────
developerRouter.get('/timeline', async (req, res, next) => {
  try {
    const parseResult = timelineQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors.map((e) => e.message).join(', '));
    }

    const { taskId, agentId, status, limit, offset } = parseResult.data;
    const result = getTimelineEvents({
      taskId,
      agentId,
      status,
      limit,
      offset
    });

    res.json({
      success: true,
      data: {
        total: result.total,
        limit,
        offset,
        events: result.events
      }
    });
  } catch (error) {
    next(error);
  }
});

// ── 8. Cancel Development Task & Prune Worktree ─────────────────────────────
developerRouter.post('/tasks/:id/cancel', validateBody(cancelTaskSchema), async (req, res, next) => {
  try {
    const taskId = req.params.id || '';
    const reason = req.body.reason || 'Cancelled by administrative operator';
    const requestedBy = req.user?.email || 'admin@nexus-omega.ai';

    try {
      const cancelledTask = cancelDevelopmentTask(taskId, requestedBy, reason);
      res.json({
        success: true,
        data: cancelledTask
      });
    } catch (err: any) {
      if (err.message?.includes('not found')) {
        throw new NotFoundError(err.message);
      }
      throw new ValidationError(err.message);
    }
  } catch (error) {
    next(error);
  }
});

// ── 9. Record Human Approval Gate Decision ──────────────────────────────────
developerRouter.post('/tasks/:id/approval', validateBody(approvalDecisionSchema), async (req, res, next) => {
  try {
    const taskId = req.params.id || '';
    const { decision, comment } = req.body;
    const reviewerEmail = req.user?.email || 'admin@nexus-omega.ai';

    const updatedTask = handleApprovalDecision(taskId, decision, reviewerEmail, comment);

    res.json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
});

// ── 10. Query Hive Shared Blackboard Memory ─────────────────────────────────
developerRouter.get('/blackboard', async (_req, res, next) => {
  try {
    const entries = loadBlackboardEntries();

    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    next(error);
  }
});
