import { Router } from 'express';
import { Permissions, NotFoundError } from '@nexus/shared';
import {
  defaultWorkflowManager,
  generateWorldFromNL
} from '@nexus/workflow-engine';
import { WorldStore } from '../db/worldStore.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';
import { validateBody } from '../middlewares/validate.js';
import { recordAuditEvent } from '../services/auditService.js';
import {
  generateWorldNLSchema,
  createWorkflowSchema,
  approveWorkflowSchema,
  createPlaybookSchema
} from '../schemas/workflow.js';

export const workflowsRouter = Router();

workflowsRouter.use(authMiddleware);
workflowsRouter.use(tenantMiddleware);

// ── 1. Natural Language Prompt -> Validated 3D Digital Twin World ────────────
workflowsRouter.post(
  '/generate-world',
  requirePermission(Permissions.WORLD_WRITE),
  validateBody(generateWorldNLSchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const { prompt, preferredEnvironment } = req.body;

      const generated = generateWorldFromNL({
        prompt,
        tenantId,
        preferredEnvironment
      });

      // Persist the synthesized world in Digital Twin WorldStore
      const formattedNodes = generated.nodes.map((n) => ({
        ...n,
        nodeId: (n as any).nodeId || n.id
      }));
      const formattedEdges = generated.edges.map((e) => ({
        ...e,
        edgeId: (e as any).edgeId || e.id
      }));

      const createdWorld = await WorldStore.createWorld({
        tenantId,
        name: generated.name,
        description: generated.description,
        environmentType: generated.environmentType,
        nodes: formattedNodes,
        edges: formattedEdges
      });

      const worldId = createdWorld._id?.toString() || createdWorld.id;

      await recordAuditEvent({
        tenantId,
        action: 'WORLD_GENERATED_FROM_NL',
        actor: { userId: req.user?.userId },
        targetResource: { type: 'WORLD', id: worldId },
        payload: {
          prompt,
          name: generated.name,
          environmentType: generated.environmentType,
          nodesCount: generated.nodes.length,
          edgesCount: generated.edges.length
        }
      });

      const io = (req as any).io;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('world:created', {
          worldId,
          name: generated.name,
          generatedFromNL: true
        });
      }

      res.status(201).json({
        success: true,
        data: {
          world: createdWorld,
          generated
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 2. Create Standard Ransomware Containment Playbook ───────────────────────
workflowsRouter.post(
  '/playbooks/ransomware',
  requirePermission(Permissions.WORKFLOW_CREATE),
  validateBody(createPlaybookSchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const { targetNodeId, edgeId } = req.body;

      const playbook = defaultWorkflowManager.createRansomwareContainmentPlaybook(
        tenantId,
        targetNodeId,
        edgeId
      );

      await recordAuditEvent({
        tenantId,
        action: 'WORKFLOW_CREATED',
        actor: { userId: req.user?.userId },
        targetResource: { type: 'WORKFLOW', id: playbook.id },
        payload: {
          playbookType: 'RANSOMWARE_CONTAINMENT',
          targetNodeId,
          edgeId,
          stepsCount: playbook.steps.length
        }
      });

      res.status(201).json({
        success: true,
        data: playbook
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 3. Create Custom Multi-Step Workflow ────────────────────────────────────
workflowsRouter.post(
  '/',
  requirePermission(Permissions.WORKFLOW_CREATE),
  validateBody(createWorkflowSchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const { title, description, steps, context } = req.body;

      const workflow = defaultWorkflowManager.createWorkflow({
        tenantId,
        title,
        description,
        steps,
        context
      });

      res.status(201).json({
        success: true,
        data: workflow
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 4. List Tenant Workflows ────────────────────────────────────────────────
workflowsRouter.get(
  '/',
  requirePermission(Permissions.WORKFLOW_READ),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const workflows = defaultWorkflowManager.listWorkflows(tenantId);

      res.json({
        success: true,
        data: workflows
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 5. Get Single Workflow Details ──────────────────────────────────────────
workflowsRouter.get(
  '/:id',
  requirePermission(Permissions.WORKFLOW_READ),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const workflowId = req.params.id!;
      const workflow = defaultWorkflowManager.getWorkflow(tenantId, workflowId);

      if (!workflow) {
        throw new NotFoundError(`Workflow not found: ${workflowId}`);
      }

      res.json({
        success: true,
        data: workflow
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 6. Start Workflow Execution ─────────────────────────────────────────────
workflowsRouter.post(
  '/:id/start',
  requirePermission(Permissions.WORKFLOW_CREATE),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const workflowId = req.params.id!;

      const result = defaultWorkflowManager.startWorkflow(tenantId, workflowId);

      const io = (req as any).io;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('workflow:status_changed', {
          workflowId,
          status: result.instance.status,
          currentStepIndex: result.instance.currentStepIndex,
          haltedAtGate: result.haltedAtGate
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 7. Submit Human Approval / Dual-Custody Sign-off ────────────────────────
workflowsRouter.post(
  '/:id/approve',
  requirePermission(Permissions.WORKFLOW_APPROVE),
  validateBody(approveWorkflowSchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const workflowId = req.params.id!;
      const { decision, comment } = req.body;

      const signoff = {
        userId: req.user!.userId,
        role: req.user!.role,
        decision,
        comment,
        timestamp: new Date().toISOString()
      };

      const result = defaultWorkflowManager.submitApproval(
        tenantId,
        workflowId,
        signoff
      );

      await recordAuditEvent({
        tenantId,
        action: 'WORKFLOW_APPROVAL_SUBMITTED',
        actor: { userId: req.user?.userId },
        targetResource: { type: 'WORKFLOW', id: workflowId },
        payload: {
          decision,
          role: req.user!.role,
          comment,
          currentStatus: result.instance.status
        }
      });

      const io = (req as any).io;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('workflow:approval_decided', {
          workflowId,
          decision,
          signerRole: req.user!.role,
          status: result.instance.status,
          haltedAtGate: result.haltedAtGate
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 8. Abort Workflow ───────────────────────────────────────────────────────
workflowsRouter.post(
  '/:id/abort',
  requirePermission(Permissions.WORKFLOW_CREATE),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const workflowId = req.params.id!;
      const reason = req.body?.reason || 'Manually aborted by user';

      const aborted = defaultWorkflowManager.abortWorkflow(
        tenantId,
        workflowId,
        reason
      );

      res.json({
        success: true,
        data: aborted
      });
    } catch (err) {
      next(err);
    }
  }
);
