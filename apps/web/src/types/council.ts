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
  confidence: number;
  category: 'telemetry' | 'network' | 'auth' | 'system' | 'topology';
  verified: boolean;
}

export interface Hypothesis {
  id: string;
  statement: string;
  supportingFactIds: string[];
  opposingFactIds: string[];
  likelihoodScore: number;
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
  riskScore: number;
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
  isSimulatedProjection: true;
}

export interface ResponseOption {
  id: string;
  title: string;
  action: 'ISOLATE_NODE' | 'SEVER_EDGE' | 'RATE_LIMIT_TRAFFIC' | 'ROLLBACK_CONFIG' | 'MONITOR_ONLY';
  targetId: string;
  isRecommended: boolean;
  riskReductionPercent: number;
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
    required: true;
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
