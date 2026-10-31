import { TwinNode, TwinEdge, BlastRadiusResult } from '@nexus/twin-graph';

export type AgentRole =
  | 'SOC_TRIAGE'
  | 'INCIDENT_RESPONDER'
  | 'THREAT_HUNTER'
  | 'RED_TEAM_ADVERSARY'
  | 'POLICY_AUDITOR';

export interface AgentIdentity {
  id: string;
  name: string;
  role: AgentRole;
  systemPrompt: string;
  toolAllowlist: string[];
}

export interface SecurityAlert {
  id: string;
  sourceNodeId: string;
  targetNodeId?: string;
  title: string;
  description: string;
  rawPayload: Record<string, unknown>;
  timestamp: Date;
}

export interface TriageReport {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0.0 to 1.0
  isFalsePositive: boolean;
  summary: string;
  recommendedAction: string;
  mitreTacticHint?: string;
}

export interface ThreatHuntReport {
  mitreTechnique: string;
  threatActorProfile: string;
  indicatorsOfCompromise: string[];
  hypothesizedVectors: string[];
  correlatedAssetIds: string[];
}

export interface ResponsePlan {
  action: 'ISOLATE_NODE' | 'SEVER_EDGE' | 'MONITOR' | 'NO_ACTION';
  targetId: string;
  targetType: 'NODE' | 'EDGE';
  rationale: string;
  estimatedRiskReduction: number; // 0 to 100
  blastRadius?: BlastRadiusResult;
  requiresHumanApproval: boolean;
}

export interface RedTeamReport {
  exploitFeasibility: 'LOW' | 'MEDIUM' | 'HIGH';
  simulatedAttackPath: string[] | null;
  defenseBypassPossible: boolean;
  adversaryAssessment: string;
}

export interface PolicyAuditVerdict {
  compliant: boolean;
  policyChecked: string;
  governanceRulePassed: boolean;
  auditProofHash?: string;
  reason?: string;
}

export type SocietyWorkflowStage =
  | 'TRIAGE'
  | 'THREAT_HUNT'
  | 'RESPONSE_PLAN'
  | 'RED_TEAM_VERIFY'
  | 'POLICY_AUDIT'
  | 'HITL_APPROVAL_GATE'
  | 'CONTAINMENT_EXECUTED'
  | 'COMPLETED'
  | 'FAILED';

export interface AgentLogEntry {
  role: AgentRole;
  stage: SocietyWorkflowStage;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

export interface SocietyWorkflowState {
  incidentId: string;
  tenantId: string;
  worldId: string;
  currentStage: SocietyWorkflowStage;
  alert: SecurityAlert;
  nodes: TwinNode[];
  edges: TwinEdge[];

  triageReport?: TriageReport;
  threatHuntReport?: ThreatHuntReport;
  responsePlan?: ResponsePlan;
  redTeamReport?: RedTeamReport;
  auditVerdict?: PolicyAuditVerdict;

  approvalId?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';

  containmentResult?: {
    success: boolean;
    appliedAction: string;
    targetId: string;
    timestamp: Date;
  };

  agentLogs: AgentLogEntry[];
}

