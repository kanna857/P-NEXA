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
  validateCommandSafety
} from '@nexus/agent-orchestrator';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/rbacMiddleware.js';
import { validateBody } from '../middlewares/validate.js';
import { ValidationError, NotFoundError, SystemRoles } from '@nexus/shared';

export const developerRouter = Router();

// Enforce strict administrative authorization for all developer harness endpoints
developerRouter.use(authMiddleware);
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

// ── 1. Munder Difflin Hive Harness Health ────────────────────────────────────
developerRouter.get('/health', async (_req, res) => {
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
});

// ── 2. Query Full Agency Agents Registry (283 Agents) ───────────────────────
developerRouter.get('/agents', async (req, res) => {
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
});

// ── 3. Inspect Single Agent & Skill Instructions ────────────────────────────
developerRouter.get('/agents/:id', async (req, res) => {
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
});

// ── 4. Query Tasks Ledger & Pending Approvals ────────────────────────────────
developerRouter.get('/tasks', async (_req, res) => {
  const tasks = loadHiveTasks();
  const pendingApprovals = getPendingApprovals();

  res.json({
    success: true,
    data: {
      tasks,
      pendingApprovals
    }
  });
});

// ── 5. Create New Multi-Agent Development Task ──────────────────────────────
developerRouter.post('/tasks', validateBody(createTaskSchema), async (req, res) => {
  const { prompt, title, priority } = req.body;

  const safety = validateCommandSafety(prompt);
  if (safety.isDestructive) {
    throw new ValidationError(safety.reason || 'Blocked destructive operation.');
  }

  const task = createDevelopmentTask(prompt, { title, priority });

  res.status(201).json({
    success: true,
    data: task
  });
});

// ── 6. Execute Multi-Agent Development Task ─────────────────────────────────
developerRouter.post('/tasks/:id/execute', async (req, res) => {
  const taskId = req.params.id || '';
  const task = await executeDevelopmentTask(taskId);

  res.json({
    success: true,
    data: task
  });
});

// ── 7. Record Human Approval Gate Decision ──────────────────────────────────
developerRouter.post('/tasks/:id/approval', validateBody(approvalDecisionSchema), async (req, res) => {
  const taskId = req.params.id || '';
  const { decision, comment } = req.body;
  const reviewerEmail = req.user?.email || 'admin@nexus-omega.ai';

  const updatedTask = handleApprovalDecision(taskId, decision, reviewerEmail, comment);

  res.json({
    success: true,
    data: updatedTask
  });
});

// ── 8. Query Hive Shared Blackboard Memory ──────────────────────────────────
developerRouter.get('/blackboard', async (_req, res) => {
  const entries = loadBlackboardEntries();

  res.json({
    success: true,
    data: entries
  });
});

