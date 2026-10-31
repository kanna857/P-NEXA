import { TwinNode, TwinEdge } from '@nexus/twin-graph';

export type SimulationStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export type SimulationActionType =
  | 'ISOLATE_NODE'
  | 'SEVER_EDGE'
  | 'RESTORE_NODE'
  | 'RESTORE_EDGE'
  | 'APPLY_PATCH'
  | 'DEPLOY_DECOY'
  | 'THREAT_INJECT';

export interface SimulationAction {
  id: string;
  type: SimulationActionType;
  targetId: string;
  scheduledTick: number;
  executedTick?: number;
  payload?: Record<string, any>;
  createdBy?: string;
}

export type ThreatStatus = 'ACTIVE' | 'CONTAINED' | 'ERADICATED';

export interface ActiveThreat {
  id: string;
  name: string;
  threatActor?: string;
  techniqueId?: string;
  currentNodeId: string;
  compromisedNodes: string[];
  spreadProbability: number; // 0 to 1
  stealthLevel: number; // 0 to 100
  impactLevel: number; // 0 to 100
  status: ThreatStatus;
}

export type SimulationEventType =
  | 'THREAT_SPREAD'
  | 'THREAT_BLOCKED'
  | 'NODE_COMPROMISED'
  | 'ACTION_EXECUTED'
  | 'CONTAINMENT_ACHIEVED'
  | 'STATUS_CHANGE';

export interface SimulationEvent {
  id: string;
  tick: number;
  type: SimulationEventType;
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ScenarioMetrics {
  totalNodes: number;
  compromisedNodesCount: number;
  isolatedNodesCount: number;
  severedEdgesCount: number;
  activeThreatsCount: number;
  systemResilienceScore: number; // 0 to 100
  containmentAchieved: boolean;
}

export interface ScenarioSnapshot {
  tick: number;
  stateHash: string; // SHA-256 canonical hash
  nodes: TwinNode[];
  edges: TwinEdge[];
  activeThreats: ActiveThreat[];
  metrics: ScenarioMetrics;
  events: SimulationEvent[];
}

export interface SimulationScenario {
  id: string;
  tenantId: string;
  worldId: string;
  name: string;
  description?: string;
  seed: number;
  currentTick: number;
  maxTicks: number;
  tickRateMs: number;
  status: SimulationStatus;
  parentId?: string;
  branchTick?: number;
  actions: SimulationAction[];
  activeThreats: ActiveThreat[];
  snapshots: ScenarioSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateScenarioParams {
  tenantId: string;
  worldId: string;
  name: string;
  description?: string;
  seed?: number;
  maxTicks?: number;
  tickRateMs?: number;
  initialThreats?: Array<{
    name: string;
    targetNodeId: string;
    spreadProbability?: number;
    threatActor?: string;
    techniqueId?: string;
  }>;
  initialActions?: SimulationAction[];
}

export interface BranchScenarioParams {
  branchTick?: number;
  name?: string;
  description?: string;
  actions?: SimulationAction[];
}

export interface TimelineTickComparison {
  tick: number;
  parentHash: string;
  branchHash: string;
  matched: boolean;
  deltaEvents: string[];
}

export interface DivergenceResult {
  diverged: boolean;
  divergenceTick?: number;
  parentScenarioId: string;
  branchScenarioId: string;
  blastRadiusDelta: number; // branch compromised - parent compromised
  resilienceDelta: number; // branch resilience - parent resilience
  containmentDelta: {
    parentAchieved: boolean;
    branchAchieved: boolean;
    parentTick?: number;
    branchTick?: number;
  };
  timelineComparison: TimelineTickComparison[];
}

export interface ReplayVerificationResult {
  verified: boolean;
  scenarioId: string;
  totalTicksVerified: number;
  finalStateHash: string;
  discrepancies: Array<{
    tick: number;
    expectedHash: string;
    actualHash: string;
  }>;
}
