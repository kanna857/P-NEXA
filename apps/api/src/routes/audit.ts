import { Router } from 'express';
import { z } from 'zod';
import { Permissions, auditQuerySchema, NotFoundError, ValidationError } from '@nexus/shared';
import {
  verifyAuditChain,
  MerkleTree,
  generateComplianceReport,
  ComplianceFramework
} from '@nexus/governance';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';
import { validateQuery, validateBody } from '../middlewares/validate.js';
import { DataStore } from '../db/store.js';

export const auditRouter = Router();

auditRouter.use(authMiddleware);
auditRouter.use(tenantMiddleware);

const verifyProofSchema = z.object({
  leaf: z.string().length(64, 'Leaf must be a 64-character SHA-256 hash'),
  index: z.number().int().min(0),
  proof: z.array(
    z.object({
      hash: z.string().length(64),
      position: z.enum(['left', 'right'])
    })
  ),
  root: z.string().length(64, 'Root must be a 64-character SHA-256 hash')
});

// ── 1. Query Paginated Audit Trail ──────────────────────────────────────────
auditRouter.get(
  '/',
  requirePermission(Permissions.AUDIT_READ),
  validateQuery(auditQuerySchema),
  async (req, res, next) => {
    try {
      const { page, limit, action } = req.query as any;
      const { logs, total } = await DataStore.getAuditLogs(req.tenantId!, {
        page,
        limit,
        action
      });

      res.json({
        success: true,
        data: logs.map((l: any) => ({
          sequenceNumber: l.sequenceNumber,
          previousHash: l.previousHash,
          currentHash: l.currentHash,
          action: l.action,
          actor: l.actor,
          targetResource: l.targetResource,
          payload: l.payload,
          timestamp: l.timestamp
        })),
        meta: {
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 2. Full Hash-Chain Cryptographic Verification ───────────────────────────
auditRouter.get('/verify', requirePermission(Permissions.AUDIT_VERIFY), async (req, res, next) => {
  try {
    const records = await DataStore.getAllAuditLogsForTenant(req.tenantId!);
    const result = verifyAuditChain(records as any);

    res.json({
      success: true,
      data: {
        tenantId: req.tenantId,
        chainIntegrityStatus: result.isValid ? 'VERIFIED' : 'TAMPERED',
        totalBlocksAudited: result.totalRecordsChecked,
        details: result
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── 3. Merkle Tree Root for Tenant ──────────────────────────────────────────
auditRouter.get('/merkle-root', requirePermission(Permissions.AUDIT_READ), async (req, res, next) => {
  try {
    const records = await DataStore.getAllAuditLogsForTenant(req.tenantId!);
    const leaves = records.map((r: any) => r.currentHash);
    const tree = new MerkleTree(leaves);

    res.json({
      success: true,
      data: {
        tenantId: req.tenantId,
        merkleRoot: tree.getRoot(),
        totalLeaves: leaves.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── 4. Generate Merkle Inclusion Proof for Sequence Number ──────────────────
auditRouter.get(
  '/merkle-proof/:sequenceNumber',
  requirePermission(Permissions.AUDIT_READ),
  async (req, res, next) => {
    try {
      const seq = parseInt(req.params.sequenceNumber!, 10);
      if (isNaN(seq)) {
        throw new ValidationError('Invalid sequence number');
      }

      const records = await DataStore.getAllAuditLogsForTenant(req.tenantId!);
      const leafIndex = records.findIndex((r: any) => r.sequenceNumber === seq);

      if (leafIndex === -1) {
        throw new NotFoundError(`Audit log with sequence number ${seq} not found`);
      }

      const leaves = records.map((r: any) => r.currentHash);
      const tree = new MerkleTree(leaves);
      const proof = tree.getProof(leafIndex);
      const record = records[leafIndex]!;

      res.json({
        success: true,
        data: {
          sequenceNumber: seq,
          record: {
            sequenceNumber: record.sequenceNumber,
            action: record.action,
            currentHash: record.currentHash,
            timestamp: record.timestamp
          },
          proof
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 5. Standalone Merkle Proof Verification ─────────────────────────────────
auditRouter.post(
  '/verify-proof',
  requirePermission(Permissions.AUDIT_VERIFY),
  validateBody(verifyProofSchema),
  async (req, res, next) => {
    try {
      const { leaf, index, proof, root } = req.body;
      const isValid = MerkleTree.verifyProof({ leaf, index, proof, root });

      res.json({
        success: true,
        data: {
          isValid,
          leaf,
          root
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 6. Export Signed Compliance Report (SOC2, ISO27001, NIST_AI_RMF, HIPAA) ─
auditRouter.get(
  '/compliance-report',
  requirePermission(Permissions.AUDIT_EXPORT),
  async (req, res, next) => {
    try {
      const rawFramework = (req.query.framework as string) || 'SOC2';
      const framework = rawFramework.toUpperCase() as ComplianceFramework;

      const records = await DataStore.getAllAuditLogsForTenant(req.tenantId!);
      const report = generateComplianceReport(req.tenantId!, records as any, framework);

      res.json({
        success: true,
        data: report
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 7. Tamper Detection Simulation Endpoint ─────────────────────────────────
auditRouter.post('/tamper-test', requirePermission(Permissions.AUDIT_VERIFY), async (req, res, next) => {
  try {
    const records = await DataStore.getAllAuditLogsForTenant(req.tenantId!);
    if (records.length === 0) {
      res.json({ success: true, message: 'No records to tamper with' });
      return;
    }

    // Clone records and deliberately alter one payload
    const tampered = JSON.parse(JSON.stringify(records));
    const targetIdx = Math.floor(tampered.length / 2);
    tampered[targetIdx].payload = { ...tampered[targetIdx].payload, _fraudulent_injection: 'TAMPERED_VALUE' };

    const result = verifyAuditChain(tampered);

    res.json({
      success: true,
      simulation: {
        tamperedSequenceIndex: tampered[targetIdx].sequenceNumber,
        detectedTamper: !result.isValid,
        verificationResult: result
      }
    });
  } catch (err) {
    next(err);
  }
});
