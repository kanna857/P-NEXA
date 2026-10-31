import { z } from 'zod';

export const twinNodeSchema = z.object({
  nodeId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum([
    'firewall',
    'router',
    'load_balancer',
    'server',
    'database',
    'agent_pod',
    'iot_sensor',
    'cloud_gateway'
  ]),
  tier: z.number().int().min(0).max(4).default(2),
  status: z
    .enum(['healthy', 'warning', 'compromised', 'isolated', 'offline'])
    .default('healthy'),
  position: z
    .object({ x: z.number(), y: z.number(), z: z.number() })
    .default({ x: 0, y: 0, z: 0 }),
  metadata: z
    .object({
      ipAddress: z.string().optional(),
      subnet: z.string().optional(),
      os: z.string().optional(),
      vulnerabilities: z.array(z.string()).optional(),
      cpuUsage: z.number().optional(),
      memoryUsage: z.number().optional(),
      trafficRateKbps: z.number().optional()
    })
    .default({})
});

export const twinEdgeSchema = z.object({
  edgeId: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  protocol: z.enum(['TCP', 'UDP', 'TLS', 'GRPC', 'INTERNAL_BUS']).default('TLS'),
  trafficRateKbps: z.number().default(100),
  isEncrypted: z.boolean().default(true),
  status: z.enum(['normal', 'anomalous', 'severed']).default('normal')
});

export const createWorldSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  environmentType: z
    .enum(['cloud', 'enterprise_datacenter', 'scada_ics', 'satellite_mesh'])
    .default('enterprise_datacenter'),
  nodes: z.array(twinNodeSchema).default([]),
  edges: z.array(twinEdgeSchema).default([])
});

export const updateNodeStatusSchema = z.object({
  status: z.enum(['healthy', 'warning', 'compromised', 'isolated', 'offline'])
});

export const updateEdgeStatusSchema = z.object({
  status: z.enum(['normal', 'anomalous', 'severed'])
});

export const blastRadiusSchema = z.object({
  nodeId: z.string().min(1),
  maxHops: z.coerce.number().int().min(1).max(10).default(3)
});

export const attackPathSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1)
});

export type CreateWorldInput = z.infer<typeof createWorldSchema>;
export type UpdateNodeStatusInput = z.infer<typeof updateNodeStatusSchema>;
export type BlastRadiusInput = z.infer<typeof blastRadiusSchema>;
export type AttackPathInput = z.infer<typeof attackPathSchema>;

