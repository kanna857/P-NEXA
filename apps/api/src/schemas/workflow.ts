import { z } from 'zod';

export const generateWorldNLSchema = z.object({
  prompt: z.string().min(5, 'Prompt must be at least 5 characters'),
  preferredEnvironment: z
    .enum([
      'cloud',
      'enterprise_datacenter',
      'scada_ics',
      'satellite_mesh',
      'CLOUD',
      'ENTERPRISE_DATACENTER',
      'SCADA_ICS',
      'SATELLITE_MESH'
    ])
    .optional()
    .transform((val) =>
      val ? (val.toLowerCase() as 'cloud' | 'enterprise_datacenter' | 'scada_ics' | 'satellite_mesh') : undefined
    )
});

export const createWorkflowSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  steps: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum([
        'ANALYZE_ALERT',
        'RUN_DIAGNOSTICS',
        'COMPUTE_BLAST_RADIUS',
        'SIMULATE_SCENARIO',
        'ISOLATE_HOST',
        'SEVER_NETWORK_LINK',
        'APPLY_PATCH',
        'NOTIFY_TEAM',
        'HUMAN_APPROVAL_GATE'
      ]),
      riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      requiresDualApproval: z.boolean().optional(),
      payload: z.record(z.any()).optional()
    })
  ),
  context: z.record(z.any()).optional()
});

export const approveWorkflowSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional()
});

export const createPlaybookSchema = z.object({
  targetNodeId: z.string().min(1, 'targetNodeId is required'),
  edgeId: z.string().optional()
});
