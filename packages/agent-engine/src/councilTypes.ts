import { TwinNode, TwinEdge } from '@nexus/twin-graph';

export type CouncilAgentRole =
  | 'INVESTIGATOR'
  | 'CYBERSECURITY'
  | 'SIMULATION'
  | 'PLANNER'
  | 'REVIEWER';

export type CouncilInvestigationStatus =
  | 'QUEUED'
  | 'INVESTIGATING'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED';

export interface ObservedFact {
  id: string;
  description: string;
  source: string;
  timestamp: string;
  confidence: number; // 0.0 to 1.0
  category: 'telemetry' | 'network' | 'auth' | 'system' | 'topology';
  verified: boolean;
}

export interface Hypothesis {
  id: string;
  statement: string;
  supportingFactIds: string[];
  opposingFactIds: string[];
  likelihoodScore: number; // 0.0 to 1.0
  testStrategy: string;
}

export interface InvestigationEvidence {
  entityId: string;
  entityName: string;
  entityType: string;
  observedFacts: ObservedFact[];
  hypotheses: Hypothesis[];
  relatedHistoricalIncidents: Array<{
    incidentId: string;
    title: string;
    similarity: number;
    resolvedAction: string;
  }>;
  telemetrySnapshot: {
    ip: string;
    cpu: number;
    memory: number;
    inboundConnections: number;
    outboundConnections: number;
    timestamp: string;
  };
}

export interface CyberThreatAssessment {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number; // 0 to 100
  mitreTechnique: string;
  mitreTactic: string;
  threatActor: string;
  failedLoginsDetected: number;
  anomalousAccessPatterns: string[];
  indicatorsOfCompromise: string[];
  explainableDetections: Array<{
    ruleId: string;
    ruleName: string;
    evidence: string;
    contributionToScore: number;
  }>;
}

export interface SimulationResult {
  scenarioId: string;
  scenarioName: string;
  seed: number;
  baselineCompromisedCount: number;
  mitigatedCompromisedCount: number;
  propagationTicks: number;
  blastRadiusNodeIds: string[];
  uncertaintyRange: {
    minRiskReduction: number;
    maxRiskReduction: number;
  };
  assumptions: string[];
  stateHash: string;
  simulatedAt: string;
  isSimulatedProjection: true; // Explicitly distinguishes from observed reality
}

export interface ResponseOption {
  id: string;
  title: string;
  action: 'ISOLATE_NODE' | 'SEVER_EDGE' | 'RATE_LIMIT_TRAFFIC' | 'ROLLBACK_CONFIG' | 'MONITOR_ONLY';
  targetId: string;
  isRecommended: boolean;
  riskReductionPercent: number; // 0 to 100
  estimatedDowntime: string;
  requiresDualCustody: boolean;
  rationale: string;
  consequences: string[];
  rollbackSteps: string[];
}

export interface ReviewerVerdict {
  status: 'APPROVED_FOR_PRESENTATION' | 'REVISION_REQUIRED' | 'REJECTED';
  policyViolations: string[];
  unsupportedClaims: string[];
  uncertaintyFlags: string[];
  complianceVerified: boolean;
  reviewNotes: string;
  reviewedAt: string;
}

export interface CouncilLifecycleEvent {
  id: string;
  investigationId: string;
  traceId: string;
  agentRole?: CouncilAgentRole;
  agentName?: string;
  stage: string;
  status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  message: string;
  timestamp: string;
  durationMs?: number;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface CouncilInvestigationDossier {
  investigationId: string;
  incidentId: string;
  traceId: string;
  tenantId: string;
  worldId: string;
  targetEntity: {
    id: string;
    name: string;
    type: string;
    status: string;
    ip: string;
  };
  status: CouncilInvestigationStatus;
  evidence: InvestigationEvidence;
  threatAssessment: CyberThreatAssessment;
  simulation: SimulationResult;
  candidatePlans: ResponseOption[];
  recommendedPlan: ResponseOption;
  reviewerVerdict: ReviewerVerdict;
  humanApproval: {
    required: true; // Crucial: Human approval is mandatory for consequential actions
    approvedBy?: string;
    rejectedBy?: string;
    decidedAt?: string;
    comments?: string;
  };
  cryptographicProof: {
    sequenceNumber: number;
    sha256Hash: string;
    signedAt: string;
    merkleRoot?: string;
  };
  events: CouncilLifecycleEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CouncilInvestigationRequest {
  entityId: string;
  entityName?: string;
  tenantId: string;
  worldId: string;
  nodes?: TwinNode[];
  edges?: TwinEdge[];
  requestedBy: string;
  alertHint?: string;
  customTelemetry?: Record<string, unknown>;
}

