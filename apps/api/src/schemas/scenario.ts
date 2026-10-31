import { z } from 'zod';

export const createScenarioSchema = z.object({
  worldId: z.string().min(1, 'worldId is required'),
  name: z.string().min(1, 'name is required').max(100),
  description: z.string().optional(),
  seed: z.number().int().optional(),
  maxTicks: z.number().int().min(1).max(100).optional(),
  tickRateMs: z.number().int().min(10).max(10000).optional(),
  initialThreats: z
    .array(
      z.object({
        name: z.string().min(1),
        targetNodeId: z.string().min(1),
        spreadProbability: z.number().min(0).max(1).optional(),
        threatActor: z.string().optional(),
        techniqueId: z.string().optional()
      })
    )
    .optional(),
  initialActions: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.enum([
          'ISOLATE_NODE',
          'SEVER_EDGE',
          'RESTORE_NODE',
          'RESTORE_EDGE',
          'APPLY_PATCH',
          'DEPLOY_DECOY',
          'THREAT_INJECT'
        ]),
        targetId: z.string().min(1),
        scheduledTick: z.number().int().min(1),
        payload: z.record(z.any()).optional()
      })
    )
    .optional()
});

export const stepScenarioSchema = z.object({
  steps: z.number().int().min(1).max(50).default(1)
});

export const runScenarioSchema = z.object({
  targetTick: z.number().int().min(1).max(100).optional()
});

export const addActionSchema = z.object({
  type: z.enum([
    'ISOLATE_NODE',
    'SEVER_EDGE',
    'RESTORE_NODE',
    'RESTORE_EDGE',
    'APPLY_PATCH',
    'DEPLOY_DECOY',
    'THREAT_INJECT'
  ]),
  targetId: z.string().min(1, 'targetId is required'),
  scheduledTick: z.number().int().min(1, 'scheduledTick must be >= 1'),
  payload: z.record(z.any()).optional()
});

export const branchScenarioSchema = z.object({
  branchTick: z.number().int().min(0, 'branchTick must be >= 0'),
  name: z.string().optional(),
  description: z.string().optional(),
  actions: z.array(addActionSchema).optional()
});

export const compareScenariosSchema = z.object({
  scenarioAId: z.string().min(1, 'scenarioAId is required'),
  scenarioBId: z.string().min(1, 'scenarioBId is required')
});

