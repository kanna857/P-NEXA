import { SystemRole } from './roles.js';

export interface UserTokenPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: SystemRole;
  permissions: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuditRecordPayload {
  tenantId: string;
  sequenceNumber: number;
  previousHash: string;
  currentHash: string;
  actor: {
    userId?: string;
    agentId?: string;
    systemService?: string;
    ipAddress?: string;
  };
  action: string;
  targetResource: {
    type: string;
    id: string;
  };
  payload: Record<string, unknown>;
  evidenceHash?: string;
  timestamp: string | Date;
}

