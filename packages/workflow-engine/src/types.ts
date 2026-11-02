import { TwinNode, TwinEdge } from '@nexus/twin-graph';

export type WorkflowStepType =
  // Phase 5 Enhanced Node Types
  | 'TELEMETRY_TRIGGER'
  | 'THRESHOLD_CONDITION'
  | 'ANOMALY_DETECTION'
  | 'COUNCIL_INVESTIGATION'
  | 'SIMULATION'
  | 'NOTIFICATION'
  | 'HUMAN_APPROVAL'
  | 'AUTHORIZED_REMEDIATION'
  | 'AUDIT_LOGGING'
  // Existing Step Types for Backward Compatibility
  | 'ANALYZE_ALERT'
  | 'RUN_DIAGNOSTICS'
  | 'COMPUTE_BLAST_RADIUS'
  | 'SIMULATE_SCENARIO'
  | 'ISOLATE_HOST'
  | 'SEVER_NETWORK_LINK'
  | 'APPLY_PATCH'
  | 'NOTIFY_TEAM'
  | 'HUMAN_APPROVAL_GATE';

export type WorkflowStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED'
  | 'RETRYING';

export type WorkflowInstanceStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'WAITING_FOR_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABORTED'
  | 'CANCELLED';

export type StepRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WorkflowApprovalSignoff {
  userId: string;
  role: string;
  decision: 'APPROVED' | 'REJECTED';
  comment?: string;
  timestamp: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  riskLevel: StepRiskLevel;
  status: WorkflowStepStatus;
  requiresDualApproval?: boolean;
  approvals?: WorkflowApprovalSignoff[];
  payload?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  nextStepIds?: string[];
  retries?: number;
  maxRetries?: number;
}

export interface WorkflowExecutionRecord {
  stepIndex: number;
  stepId: string;
  stepName: string;
  type: WorkflowStepType;
  status: WorkflowStepStatus;
  timestamp: string;
  durationMs?: number;
  output?: Record<string, any>;
  error?: string;
}

export interface WorkflowInstance {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  version?: string;
  status: WorkflowInstanceStatus;
  currentStepIndex: number;
  steps: WorkflowStep[];
  context: Record<string, any>;
  auditProofHash: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  maxExecutionSteps?: number;
  executionTimeoutMs?: number;
  executionHistory?: WorkflowExecutionRecord[];
}

export interface DAGValidationResult {
  isValid: boolean;
  hasCycle: boolean;
  cyclePath?: string[];
  orphanStepIds?: string[];
  totalSteps: number;
}

export interface NLWorldPrompt {
  prompt: string;
  tenantId: string;
  preferredEnvironment?: 'cloud' | 'enterprise_datacenter' | 'scada_ics' | 'satellite_mesh';
}

export interface GeneratedWorldResult {
  name: string;
  description: string;
  environmentType: 'cloud' | 'enterprise_datacenter' | 'scada_ics' | 'satellite_mesh';
  nodes: TwinNode[];
  edges: TwinEdge[];
  rationale: string[];
}
