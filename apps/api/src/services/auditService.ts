import { computeAuditRecordHash, GENESIS_HASH } from '@nexus/governance';
import { DataStore } from '../db/store.js';

export interface RecordAuditEventParams {
  tenantId: string;
  action: string;
  actor: {
    userId?: string;
    agentId?: string;
    systemService?: string;
    ipAddress?: string;
  };
  targetResource: {
    type: string;
    id: string;
  };
  payload?: Record<string, unknown>;
  evidenceHash?: string;
}

export async function recordAuditEvent(params: RecordAuditEventParams) {
  const lastLog = await DataStore.getLastAuditLog(params.tenantId);

  const sequenceNumber = lastLog ? lastLog.sequenceNumber + 1 : 1;
  const previousHash = lastLog ? lastLog.currentHash : GENESIS_HASH;
  const timestamp = new Date();
  const payload = params.payload || {};

  const currentHash = computeAuditRecordHash({
    sequenceNumber,
    previousHash,
    tenantId: params.tenantId,
    action: params.action,
    actor: params.actor,
    targetResource: params.targetResource,
    payload,
    timestamp
  });

  return DataStore.appendAuditLog({
    tenantId: params.tenantId,
    sequenceNumber,
    previousHash,
    currentHash,
    actor: params.actor,
    action: params.action,
    targetResource: params.targetResource,
    payload,
    evidenceHash: params.evidenceHash,
    timestamp
  });
}

