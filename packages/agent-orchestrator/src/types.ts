import { SupportedProvider } from '@nexus/agent-registry';

export type TaskStatus =
  | 'PENDING'
  | 'PLANNING'
  | 'WORKTREE_CREATED'
  | 'EXECUTING'
  | 'IN_REVIEW'
  | 'TESTING'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type OrchestrationStage =
  | 'PARSE_AND_SELECT'
  | 'PLANNING'
  | 'WORKTREE_ALLOCATION'
  | 'IMPLEMENTATION'
  | 'CODE_REVIEW'
  | 'SECURITY_REVIEW'
  | 'TESTING'
  | 'APPROVAL_GATE';

export interface SquadMember {
  id: string;
  name: string;
  role: string;
  division: string;
  assignedRole: 'SUPERVISOR' | 'LEAD_SPECIALIST' | 'CODE_REVIEWER' | 'SECURITY_AUDITOR' | 'TEST_ENGINEER';
  provider: SupportedProvider;
  deskId: string;
}

export interface TaskPlanStep {
  id: string;
  title: string;
  assignedAgentId: string;
  assignedAgentName: string;
  provider: SupportedProvider;
  stage: 'PLANNING' | 'IMPLEMENTATION' | 'CODE_REVIEW' | 'SECURITY_REVIEW' | 'TESTING';
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  retryCount?: number;
  maxRetries?: number;
  error?: string;
  notes?: string;
}

export interface TaskExecutionLog {
  timestamp: string;
  agentId: string;
  agentName: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface TimelineEventError {
  message: string;
  retryCount: number;
  maxRetries: number;
  code?: string;
}

export interface TimelineEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  agentId: string;
  agentName: string;
  provider: SupportedProvider;
  stage: OrchestrationStage;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'CANCELLED';
  worktreeBranch: string;
  timestamp: string;
  durationMs: number;
  message: string;
  errorDetails?: TimelineEventError;
}

export interface TaskWorktree {
  branchName: string;
  worktreePath: string;
  isCleanedUp: boolean;
  createdAt: string;
}

export interface TestExecutionSummary {
  passed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  durationMs: number;
  commandExecuted: string;
  outputSnippet: string;
}

export interface SpecialistReviewReport {
  passed: boolean;
  specialistId: string;
  specialistName: string;
  specialistRole: string;
  findings: string[];
  recommendation: 'APPROVE' | 'REQUEST_CHANGES';
  timestamp: string;
}

export interface HumanApprovalState {
  required: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  decisionComment?: string;
  targetBranch: string;
}

export interface DevelopmentTask {
  id: string;
  title: string;
  prompt: string;
  priority: TaskPriority;
  status: TaskStatus;
  currentStage: OrchestrationStage;
  squad: SquadMember[];
  plan: TaskPlanStep[];
  worktree: TaskWorktree;
  executionLogs: TaskExecutionLog[];
  timeline: TimelineEvent[];
  codeReview?: SpecialistReviewReport;
  securityReview?: SpecialistReviewReport;
  testResults?: TestExecutionSummary;
  humanApproval: HumanApprovalState;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequestItem {
  taskId: string;
  taskTitle: string;
  targetBranch: string;
  sourceBranch: string;
  leadSpecialist: string;
  securityStatus: string;
  testStatus: string;
  diffSummary: string;
  createdAt: string;
}

export interface BlackboardMemoryEntry {
  topic: string;
  author: string;
  timestamp: string;
  content: string;
}
