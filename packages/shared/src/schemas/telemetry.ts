import { z } from 'zod';

export type TelemetrySourceType =
  | 'system_agent'
  | 'iot_sensor'
  | 'network_probe'
  | 'auth_gateway'
  | 'simulator'
  | 'synthetic_demo';

export type TelemetryMode = 'demo' | 'connected';

export type TelemetryCategory =
  | 'system_metrics'
  | 'auth_access'
  | 'network_traffic'
  | 'entity_status'
  | 'iot_sensor';

export type EntityOperationalState =
  | 'healthy'
  | 'degraded'
  | 'compromised'
  | 'isolated'
  | 'offline';

export const TelemetryMetricsSchema = z.object({
  cpu: z.number().min(0).max(100).optional(),
  memory: z.number().min(0).max(100).optional(),
  disk: z.number().min(0).max(100).optional(),
  networkInKbps: z.number().min(0).optional(),
  networkOutKbps: z.number().min(0).optional(),
  activeConnections: z.number().min(0).optional(),
  authFailures: z.number().min(0).optional(),
  temperature: z.number().optional(),
  voltage: z.number().optional(),
  custom: z.record(z.unknown()).optional()
}).default({});

export const TelemetryEventSchema = z.object({
  id: z.string().min(1).default(() => `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
  tenantId: z.string().min(1, 'tenantId is required'),
  source: z.enum([
    'system_agent',
    'iot_sensor',
    'network_probe',
    'auth_gateway',
    'simulator',
    'synthetic_demo'
  ]),
  mode: z.enum(['demo', 'connected']).default('demo'),
  category: z.enum([
    'system_metrics',
    'auth_access',
    'network_traffic',
    'entity_status',
    'iot_sensor'
  ]),
  entityId: z.string().min(1, 'entityId is required'),
  worldId: z.string().optional().default('world-default'),
  timestamp: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? val : val.toISOString()))
    .default(() => new Date().toISOString()),
  metrics: TelemetryMetricsSchema,
  status: z
    .enum(['healthy', 'degraded', 'compromised', 'isolated', 'offline'])
    .default('healthy'),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const TelemetryBatchSchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  mode: z.enum(['demo', 'connected']).default('demo'),
  events: z.array(TelemetryEventSchema).min(1, 'Batch must contain at least 1 event').max(1000, 'Batch maximum is 1000 events')
});

export const TelemetryQuerySchema = z.object({
  tenantId: z.string().optional(),
  entityId: z.string().optional(),
  category: z.enum([
    'system_metrics',
    'auth_access',
    'network_traffic',
    'entity_status',
    'iot_sensor'
  ]).optional(),
  mode: z.enum(['demo', 'connected', 'all']).optional().default('all'),
  since: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).optional().default(100)
});

export const TelemetryReplaySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  entityId: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  speedMultiplier: z.number().min(0.1).max(100).default(1),
  targetRoom: z.string().optional()
});

export const AnomalyFindingSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  entityId: z.string(),
  metric: z.string(),
  currentValue: z.number(),
  baselineMean: z.number(),
  baselineStdDev: z.number(),
  zScore: z.number(),
  anomalyScore: z.number().min(0).max(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  isAnomaly: z.boolean(),
  evidence: z.string(),
  ruleOrModelVersion: z.string(),
  uncertaintyInterval: z.object({
    confidence: z.number(),
    lowerBound: z.number(),
    upperBound: z.number()
  }),
  timestamp: z.string()
});

export const ForecastPointSchema = z.object({
  step: z.number(),
  timestamp: z.string(),
  projectedValue: z.number(),
  lowerBound: z.number(),
  upperBound: z.number()
});

export const ForecastRequestSchema = z.object({
  tenantId: z.string().min(1),
  entityId: z.string().min(1),
  metric: z.string().min(1),
  horizonSteps: z.number().min(1).max(60).default(10),
  stepIntervalSec: z.number().min(1).max(3600).default(10),
  historicalValues: z.array(z.number()).min(3).optional()
});

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;
export type TelemetryBatch = z.infer<typeof TelemetryBatchSchema>;
export type TelemetryQuery = z.infer<typeof TelemetryQuerySchema>;
export type TelemetryReplay = z.infer<typeof TelemetryReplaySchema>;
export type AnomalyFinding = z.infer<typeof AnomalyFindingSchema>;
export type ForecastPoint = z.infer<typeof ForecastPointSchema>;
export type ForecastRequest = z.infer<typeof ForecastRequestSchema>;

