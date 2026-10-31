import { TwinNode, TwinEdge } from '@nexus/twin-graph';

export type WorkflowStepType =
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
  | 'SKIPPED';

export type WorkflowInstanceStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'WAITING_FOR_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABORTED';

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
}

export interface WorkflowInstance {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: WorkflowInstanceStatus;
  currentStepIndex: number;
  steps: WorkflowStep[];
  context: Record<string, any>;
  auditProofHash: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
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
