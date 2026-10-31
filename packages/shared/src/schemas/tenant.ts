import { z } from 'zod';

export const tenantCreateSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and dashes'),
  plan: z.enum(['starter', 'enterprise', 'defense_grade']).default('enterprise'),
  quotas: z
    .object({
      maxAgents: z.number().int().positive().default(20),
      maxParallelScenarios: z.number().int().positive().default(8),
      maxEventStorageMb: z.number().int().positive().default(10240)
    })
    .default({
      maxAgents: 20,
      maxParallelScenarios: 8,
      maxEventStorageMb: 10240
    }),
  settings: z
    .object({
      mfaRequired: z.boolean().default(false),
      requireDualApprovalForWorkflows: z.boolean().default(true),
      retentionDays: z.number().int().positive().default(90)
    })
    .default({
      mfaRequired: false,
      requireDualApprovalForWorkflows: true,
      retentionDays: 90
    })
});

export type TenantCreateInput = z.infer<typeof tenantCreateSchema>;

export const tenantSwitchSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required')
});

export type TenantSwitchInput = z.infer<typeof tenantSwitchSchema>;

