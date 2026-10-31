export type AgentDivision =
  | 'engineering'
  | 'marketing'
  | 'game-development'
  | 'specialized'
  | 'gis'
  | 'security'
  | 'design'
  | 'sales'
  | 'testing'
  | 'paid-media'
  | 'project-management'
  | 'academic'
  | 'product'
  | 'support'
  | 'spatial-computing'
  | 'finance'
  | 'healthcare'
  | 'research'
  | string;

export type SupportedProvider =
  | 'antigravity'
  | 'claude-code'
  | 'gemini-cli'
  | 'codex'
  | 'cursor'
  | 'copilot';

export type AgentStatus = 'AVAILABLE' | 'ACTIVE' | 'ASSIGNED' | 'STANDBY';

export interface RawAgencyAgent {
  name: string;
  slug: string;
  division: string;
  file: string;
  description: string;
  status: string;
  workspaceSkillPath: string;
  globalSkillPath: string;
}

export interface RawAgencyRegistry {
  catalog: string;
  source: string;
  totalAgents: number;
  divisionsCount: number;
  divisionCounts: Record<string, number>;
  generatedAt: string;
  agents: RawAgencyAgent[];
}

export interface MunderDifflinHire {
  schema: 'munder-difflin/hire@1';
  id: string;
  name: string;
  role: string;
  division: AgentDivision;
  specialty: string;
  sprite: string;
  seat: {
    deskId: string;
    x: number;
    y: number;
    zone: string;
  };
  provider: SupportedProvider;
  model: string;
  systemPrompt: string;
  autonomyLevel: 'supervised' | 'autonomous' | 'strict-approval';
  budget: {
    maxTokens: number;
    velocityLimit: number;
  };
  allowedCommands: string[];
  requiresApprovalFor: string[];
  status: AgentStatus;
  assignedTasks: string[];
  executionHistoryCount: number;
  workspaceSkillPath: string;
}

export interface AgentSearchFilter {
  query?: string;
  division?: string;
  provider?: SupportedProvider | string;
  status?: AgentStatus | string;
}

export interface DivisionSummary {
  division: string;
  count: number;
  primaryZone: string;
}

