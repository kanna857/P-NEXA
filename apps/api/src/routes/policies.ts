import { Router } from 'express';
import { Permissions, NotFoundError } from '@nexus/shared';
import {
  defaultPolicyStore,
  runBenchmarkSuite,
  comparePoliciesAB,
  PromotionGateManager,
  PolicyOptimizer
} from '@nexus/learning-engine';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';
import { validateBody } from '../middlewares/validate.js';
import { recordAuditEvent } from '../services/auditService.js';
import {
  createPolicySchema,
  synthesizePolicySchema
} from '../schemas/policy.js';

export const policiesRouter = Router();

policiesRouter.use(authMiddleware);
policiesRouter.use(tenantMiddleware);

const promotionGateManager = new PromotionGateManager(defaultPolicyStore);
const policyOptimizer = new PolicyOptimizer(defaultPolicyStore);

// ── 1. List Policies for Tenant ─────────────────────────────────────────────
policiesRouter.get(
  '/',
  requirePermission(Permissions.AGENT_READ),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const status = req.query.status as any;
      const policies = defaultPolicyStore.listPolicies(tenantId, status);

      res.json({
        success: true,
        data: policies
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 2. Get Currently Active Policy ──────────────────────────────────────────
policiesRouter.get(
  '/active',
  requirePermission(Permissions.AGENT_READ),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const activePolicy = defaultPolicyStore.getActivePolicy(tenantId);

      if (!activePolicy) {
        throw new NotFoundError('No active defense policy configured for tenant');
      }

      res.json({
        success: true,
        data: activePolicy
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 3. Create Draft or Candidate Defense Policy ──────────────────────────────
policiesRouter.post(
  '/',
  requirePermission(Permissions.AGENT_WRITE),
  validateBody(createPolicySchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const { name, description, version, status, parameters, changelog } = req.body;

      const policy = defaultPolicyStore.createPolicy({
        tenantId,
        name,
        description,
        version,
        status,
        parameters,
        changelog
      });

      await recordAuditEvent({
        tenantId,
        action: 'POLICY_CREATED',
        actor: { userId: req.user?.userId },
        targetResource: { type: 'POLICY', id: policy.id },
        payload: {
          name: policy.name,
          version: policy.version,
          status: policy.status,
          hash: policy.immutableHash
        }
      });

      const io = (req as any).io;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('policy:created', {
          policyId: policy.id,
          name: policy.name,
          version: policy.version,
          status: policy.status
        });
      }

      res.status(201).json({
        success: true,
        data: policy
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 4. Get Policy Details ───────────────────────────────────────────────────
policiesRouter.get(
  '/:id',
  requirePermission(Permissions.AGENT_READ),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const policyId = req.params.id!;
      const policy = defaultPolicyStore.getPolicy(tenantId, policyId);

      if (!policy) {
        throw new NotFoundError(`Policy not found: ${policyId}`);
      }

      res.json({
        success: true,
        data: policy
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 5. Run Quantitative Benchmark Suite ─────────────────────────────────────
policiesRouter.post(
  '/:id/benchmark',
  requirePermission(Permissions.AGENT_READ),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const policyId = req.params.id!;
      const policy = defaultPolicyStore.getPolicy(tenantId, policyId);

      if (!policy) {
        throw new NotFoundError(`Policy not found: ${policyId}`);
      }

      const benchmarkResult = runBenchmarkSuite(policy);

      res.json({
        success: true,
        data: benchmarkResult
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 6. Compare Candidate Policy Against Active Baseline (A/B) ───────────────
policiesRouter.post(
  '/:id/compare-ab',
  requirePermission(Permissions.AGENT_READ),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const candidateId = req.params.id!;
      const candidate = defaultPolicyStore.getPolicy(tenantId, candidateId);

      if (!candidate) {
        throw new NotFoundError(`Candidate policy not found: ${candidateId}`);
      }

      const activePolicy = defaultPolicyStore.getActivePolicy(tenantId);
      if (!activePolicy) {
        throw new NotFoundError('No active baseline policy exists for comparison');
      }

      const comparison = comparePoliciesAB(activePolicy, candidate);

      res.json({
        success: true,
        data: comparison
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 7. Promote Policy to ACTIVE via Promotion Gate ──────────────────────────
policiesRouter.post(
  '/:id/promote',
  requirePermission(Permissions.AGENT_POLICY_PROMOTE),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const candidateId = req.params.id!;
      const promoterId = req.user?.userId || 'unknown';

      const gateResult = promotionGateManager.evaluateAndPromote(
        tenantId,
        candidateId,
        promoterId
      );

      await recordAuditEvent({
        tenantId,
        action: gateResult.promoted ? 'POLICY_PROMOTED' : 'POLICY_PROMOTION_REJECTED',
        actor: { userId: req.user?.userId },
        targetResource: { type: 'POLICY', id: candidateId },
        payload: {
          promoted: gateResult.promoted,
          reason: gateResult.reason,
          archivedPreviousPolicyId: gateResult.archivedPreviousPolicyId
        }
      });

      const io = (req as any).io;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('policy:promoted', {
          policyId: candidateId,
          promoted: gateResult.promoted,
          version: gateResult.policy.version,
          reason: gateResult.reason
        });
      }

      if (!gateResult.promoted) {
        res.status(422).json({
          success: false,
          error: {
            code: 'PROMOTION_GATE_FAILED',
            message: gateResult.reason,
            details: gateResult.policy
          }
        });
        return;
      }

      res.json({
        success: true,
        data: gateResult
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 8. Synthesize Controlled Optimization Proposal ──────────────────────────
policiesRouter.post(
  '/:id/optimize',
  requirePermission(Permissions.AGENT_WRITE),
  validateBody(synthesizePolicySchema),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const sourcePolicyId = req.params.id!;
      const metrics = req.body;

      const proposal = policyOptimizer.synthesizeOptimization(
        tenantId,
        sourcePolicyId,
        metrics
      );

      await recordAuditEvent({
        tenantId,
        action: 'POLICY_OPTIMIZATION_SYNTHESIZED',
        actor: { userId: req.user?.userId },
        targetResource: { type: 'POLICY', id: proposal.candidateDraft.id },
        payload: {
          sourcePolicyId,
          suggestedVersion: proposal.suggestedVersion,
          rationale: proposal.rationale
        }
      });

      res.status(201).json({
        success: true,
        data: proposal
      });
    } catch (err) {
      next(err);
    }
  }
);

