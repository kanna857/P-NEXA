import { TwinNode, TwinEdge } from '@nexus/twin-graph';

export type PolicyStatus = 'DRAFT' | 'CANDIDATE' | 'ACTIVE' | 'ARCHIVED' | 'REJECTED';

export type ContainmentThreshold = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IsolationStrategy =
  | 'AGGRESSIVE_ISOLATE'
  | 'SELECTIVE_SEVER'
  | 'OBSERVE_AND_REPORT';

export interface DefensePolicyParameters {
  containmentThreshold: ContainmentThreshold;
  maxLateralHops: number; // 1 to 5
  isolationStrategy: IsolationStrategy;
  requireDualCustodyApproval: boolean;
  confidenceThreshold: number; // 0 to 1
  maxAutonomousSeverances: number;
}

export interface DefensePolicy {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  version: string; // Semantic version e.g. "1.0.0"
  status: PolicyStatus;
  parameters: DefensePolicyParameters;
  immutableHash: string; // SHA-256 canonical hash
  createdAt: string;
  updatedAt: string;
  promotedAt?: string;
  promotedBy?: string;
  changelog?: string;
}

export interface BenchmarkCase {
  id: string;
  name: string;
  description: string;
  worldNodes: TwinNode[];
  worldEdges: TwinEdge[];
  threats: Array<{
    name: string;
    targetNodeId: string;
    spreadProbability: number;
    threatActor?: string;
  }>;
  seed: number;
  maxTicks: number;
  targetMetrics: {
    minContainmentRate: number; // 0 to 1
    minResilience: number; // 0 to 100
    maxMTTC: number; // ticks
  };
}

export interface BenchmarkRunResult {
  caseId: string;
  caseName: string;
  passed: boolean;
  containmentAchieved: boolean;
  ticksToContainment: number;
  finalResilienceScore: number;
  compromisedNodesCount: number;
  isolatedNodesCount: number;
  severedEdgesCount: number;
}

export interface BenchmarkSuiteResult {
  policyId: string;
  policyVersion: string;
  totalCases: number;
  passedCases: number;
  passedAll: boolean;
  meanContainmentRate: number;
  meanMTTC: number;
  meanResilienceScore: number;
  compositeScore: number; // 0 to 100
  isEligibleForPromotion: boolean;
  results: BenchmarkRunResult[];
  evaluatedAt: string;
}

export interface ABComparisonResult {
  activePolicyId: string;
  activeVersion: string;
  candidatePolicyId: string;
  candidateVersion: string;
  activeCompositeScore: number;
  candidateCompositeScore: number;
  scoreDelta: number;
  resilienceDelta: number;
  mttcDelta: number;
  isRegression: boolean;
  recommendation: 'PROMOTE' | 'REVISE' | 'REJECT';
  summary: string;
}

export interface PromotionGateResult {
  promoted: boolean;
  reason: string;
  policy: DefensePolicy;
  archivedPreviousPolicyId?: string;
}

export interface OptimizationProposal {
  sourcePolicyId: string;
  suggestedVersion: string;
  suggestedParameters: DefensePolicyParameters;
  rationale: string[];
  expectedResilienceGain: number;
  candidateDraft: DefensePolicy;
}

