import { describe, it, expect } from 'vitest';
import {
  canonicalJsonStringify,
  computeSha256,
  computeAuditRecordHash,
  verifyAuditChain,
  GENESIS_HASH
} from './crypto-audit.js';

describe('Cryptographic Governance & Audit Ledger', () => {
  it('canonicalJsonStringify sorts keys recursively ensuring bit-identical hash outputs', () => {
    const objA = { z: 1, a: 2, m: { y: 10, b: 20 } };
    const objB = { a: 2, m: { b: 20, y: 10 }, z: 1 };

    expect(canonicalJsonStringify(objA)).toBe(canonicalJsonStringify(objB));
    expect(computeSha256(canonicalJsonStringify(objA))).toBe(
      computeSha256(canonicalJsonStringify(objB))
    );
  });

  it('builds and verifies a valid cryptographic chain from Genesis', () => {
    const timestamp1 = new Date('2026-10-30T09:00:00.000Z');
    const block1Input = {
      sequenceNumber: 1,
      previousHash: GENESIS_HASH,
      tenantId: 'tenant_omega',
      action: 'TENANT_INITIALIZED',
      actor: { systemService: 'bootstrap' },
      targetResource: { type: 'Tenant', id: 'tenant_omega' },
      payload: { name: 'CyberDyne' },
      timestamp: timestamp1
    };
    const hash1 = computeAuditRecordHash(block1Input);

    const timestamp2 = new Date('2026-10-30T09:05:00.000Z');
    const block2Input = {
      sequenceNumber: 2,
      previousHash: hash1,
      tenantId: 'tenant_omega',
      action: 'USER_CREATED',
      actor: { userId: 'admin_1' },
      targetResource: { type: 'User', id: 'user_2' },
      payload: { email: 'analyst@cyberdyne.ai' },
      timestamp: timestamp2
    };
    const hash2 = computeAuditRecordHash(block2Input);

    const chain = [
      { ...block1Input, currentHash: hash1 },
      { ...block2Input, currentHash: hash2 }
    ];

    const result = verifyAuditChain(chain as any);
    expect(result.isValid).toBe(true);
    expect(result.totalRecordsChecked).toBe(2);
  });

  it('detects tampered payload in the ledger and identifies the broken sequence index', () => {
    const timestamp1 = new Date('2026-10-30T09:00:00.000Z');
    const block1Input = {
      sequenceNumber: 1,
      previousHash: GENESIS_HASH,
      tenantId: 'tenant_omega',
      action: 'TENANT_INITIALIZED',
      actor: { systemService: 'bootstrap' },
      targetResource: { type: 'Tenant', id: 'tenant_omega' },
      payload: { name: 'CyberDyne' },
      timestamp: timestamp1
    };
    const hash1 = computeAuditRecordHash(block1Input);

    const timestamp2 = new Date('2026-10-30T09:05:00.000Z');
    const block2Input = {
      sequenceNumber: 2,
      previousHash: hash1,
      tenantId: 'tenant_omega',
      action: 'USER_CREATED',
      actor: { userId: 'admin_1' },
      targetResource: { type: 'User', id: 'user_2' },
      payload: { email: 'analyst@cyberdyne.ai' },
      timestamp: timestamp2
    };
    const hash2 = computeAuditRecordHash(block2Input);

    // Maliciously tamper with block 1 payload without recalculating hashes
    const tamperedChain = [
      { ...block1Input, payload: { name: 'FraudulentName' }, currentHash: hash1 },
      { ...block2Input, currentHash: hash2 }
    ];

    const result = verifyAuditChain(tamperedChain as any);
    expect(result.isValid).toBe(false);
    expect(result.tamperedSequenceIndex).toBe(1);
    expect(result.error).toContain('Payload tamper detected at sequence 1');
  });

  it('detects broken pointer link when an intermediate block is deleted', () => {
    const timestamp1 = new Date('2026-10-30T09:00:00.000Z');
    const block1 = {
      sequenceNumber: 1,
      previousHash: GENESIS_HASH,
      tenantId: 'tenant_omega',
      action: 'A1',
      actor: {},
      targetResource: { type: 'T', id: '1' },
      payload: {},
      timestamp: timestamp1
    };
    const h1 = computeAuditRecordHash(block1);

    const timestamp3 = new Date('2026-10-30T09:10:00.000Z');
    const block3 = {
      sequenceNumber: 3, // Block 2 was deleted!
      previousHash: h1,
      tenantId: 'tenant_omega',
      action: 'A3',
      actor: {},
      targetResource: { type: 'T', id: '3' },
      payload: {},
      timestamp: timestamp3
    };
    const h3 = computeAuditRecordHash(block3);

    const brokenChain = [
      { ...block1, currentHash: h1 },
      { ...block3, currentHash: h3 }
    ];

    const result = verifyAuditChain(brokenChain as any);
    expect(result.isValid).toBe(false);
    expect(result.tamperedSequenceIndex).toBe(3);
  });
});

