import { createHash } from 'node:crypto';
import { AuditRecordPayload } from '@nexus/shared';

/**
 * Deterministically serialize any JavaScript object into canonical JSON format.
 * Sorts object keys recursively to ensure bit-level reproducibility of hashes.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  // Handle Mongoose / BSON ObjectId or instances with toHexString / toString
  if (typeof (obj as any).toHexString === 'function') {
    return JSON.stringify((obj as any).toHexString());
  }
  if ((obj as any)._bsontype === 'ObjectId') {
    return JSON.stringify((obj as any).toString());
  }
  if (typeof (obj as any).toObject === 'function') {
    return canonicalJsonStringify((obj as any).toObject());
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const entries: string[] = [];
  for (const key of sortedKeys) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== undefined) {
      entries.push(JSON.stringify(key) + ':' + canonicalJsonStringify(val));
    }
  }

  return '{' + entries.join(',') + '}';
}

export function computeSha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export interface AuditBlockInput {
  sequenceNumber: number;
  previousHash: string;
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
  payload: Record<string, unknown>;
  timestamp: string | Date;
}

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function computeAuditRecordHash(record: AuditBlockInput): string {
  const tsString = record.timestamp instanceof Date ? record.timestamp.toISOString() : record.timestamp;
  const canonicalPayload = canonicalJsonStringify(record.payload);
  const canonicalActor = canonicalJsonStringify(record.actor);
  const canonicalTarget = canonicalJsonStringify(record.targetResource);

  const rawData = [
    record.sequenceNumber.toString(),
    record.previousHash,
    record.tenantId,
    record.action,
    canonicalActor,
    canonicalTarget,
    canonicalPayload,
    tsString
  ].join('|');

  return computeSha256(rawData);
}

export interface VerificationResult {
  isValid: boolean;
  totalRecordsChecked: number;
  tamperedSequenceIndex?: number;
  error?: string;
}

export function verifyAuditChain(records: AuditRecordPayload[]): VerificationResult {
  if (!records || records.length === 0) {
    return { isValid: true, totalRecordsChecked: 0 };
  }

  // Convert mongoose documents to plain normalized objects if needed
  const normalizedRecords = records.map((r: any) => {
    const obj = r && typeof r.toObject === 'function' ? r.toObject() : r;
    const actor = obj.actor ? { ...obj.actor } : {};
    if (actor.userId) {
      actor.userId = actor.userId.toString();
    }
    const targetResource = obj.targetResource ? { ...obj.targetResource } : { type: '', id: '' };
    if (targetResource.id) {
      targetResource.id = targetResource.id.toString();
    }

    return {
      sequenceNumber: obj.sequenceNumber,
      previousHash: obj.previousHash,
      currentHash: obj.currentHash,
      tenantId: obj.tenantId ? obj.tenantId.toString() : '',
      action: obj.action,
      actor,
      targetResource,
      payload: obj.payload || {},
      timestamp: obj.timestamp
    };
  });

  // Sort ascending by sequenceNumber
  const sorted = [...normalizedRecords].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]!;

    // Check sequence continuity
    if (i === 0) {
      if (current.sequenceNumber === 1 && current.previousHash !== GENESIS_HASH) {
        return {
          isValid: false,
          totalRecordsChecked: i + 1,
          tamperedSequenceIndex: current.sequenceNumber,
          error: `Genesis record sequence 1 must point to GENESIS_HASH, got: ${current.previousHash}`
        };
      }
    } else {
      const prev = sorted[i - 1]!;
      if (current.sequenceNumber !== prev.sequenceNumber + 1) {
        return {
          isValid: false,
          totalRecordsChecked: i + 1,
          tamperedSequenceIndex: current.sequenceNumber,
          error: `Broken sequence between ${prev.sequenceNumber} and ${current.sequenceNumber}`
        };
      }

      if (current.previousHash !== prev.currentHash) {
        return {
          isValid: false,
          totalRecordsChecked: i + 1,
          tamperedSequenceIndex: current.sequenceNumber,
          error: `Hash link broken at sequence ${current.sequenceNumber}. Stored previousHash ${current.previousHash} does not match prior currentHash ${prev.currentHash}`
        };
      }
    }

    // Recompute current block hash
    const recomputedHash = computeAuditRecordHash({
      sequenceNumber: current.sequenceNumber,
      previousHash: current.previousHash,
      tenantId: current.tenantId,
      action: current.action,
      actor: current.actor,
      targetResource: current.targetResource,
      payload: current.payload,
      timestamp: current.timestamp
    });

    if (recomputedHash !== current.currentHash) {
      return {
        isValid: false,
        totalRecordsChecked: i + 1,
        tamperedSequenceIndex: current.sequenceNumber,
        error: `Payload tamper detected at sequence ${current.sequenceNumber}. Recomputed hash ${recomputedHash} differs from stored currentHash ${current.currentHash}`
      };
    }
  }

  return {
    isValid: true,
    totalRecordsChecked: sorted.length
  };
}

