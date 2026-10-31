import { z } from 'zod';

export const createPolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required').max(100),
  description: z.string().min(1, 'Policy description is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semver format e.g. 1.0.0').optional(),
  status: z.enum(['DRAFT', 'CANDIDATE', 'ACTIVE', 'ARCHIVED', 'REJECTED']).optional(),
  parameters: z.object({
    containmentThreshold: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    maxLateralHops: z.number().int().min(1).max(5),
    isolationStrategy: z.enum(['AGGRESSIVE_ISOLATE', 'SELECTIVE_SEVER', 'OBSERVE_AND_REPORT']),
    requireDualCustodyApproval: z.boolean(),
    confidenceThreshold: z.number().min(0).max(1),
    maxAutonomousSeverances: z.number().int().min(0).max(10)
  }),
  changelog: z.string().optional()
});

export const synthesizePolicySchema = z.object({
  meanMTTC: z.number().min(0, 'meanMTTC must be >= 0'),
  meanResilience: z.number().min(0).max(100, 'meanResilience must be between 0 and 100'),
  containmentFailureRate: z.number().min(0).max(1).optional(),
  overSeveranceRate: z.number().min(0).max(1).optional()
});

