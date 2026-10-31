import { describe, it, expect } from 'vitest';
import { generateComplianceReport } from './compliance.js';
import { AuditRecordPayload } from '@nexus/shared';

describe('Compliance Report Generator & Cryptographic Attestation', () => {
  const mockAuditRecords: AuditRecordPayload[] = [
    {
      sequenceNumber: 1,
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      currentHash: '1111111111111111111111111111111111111111111111111111111111111111',
      tenantId: 'tenant-orbital',
      action: 'USER_LOGIN',
      actor: { userId: 'user-01' },
      targetResource: { type: 'AUTH', id: 'auth-01' },
      payload: { method: 'PASSWORD_MFA' },
      timestamp: new Date().toISOString()
    },
    {
      sequenceNumber: 2,
      previousHash: '1111111111111111111111111111111111111111111111111111111111111111',
      currentHash: '2222222222222222222222222222222222222222222222222222222222222222',
      tenantId: 'tenant-orbital',
      action: 'AUDIT_VERIFIED',
      actor: { systemService: 'AuditVerifier' },
      targetResource: { type: 'LEDGER', id: 'ledger-01' },
      payload: { chainLength: 1 },
      timestamp: new Date().toISOString()
    },
    {
      sequenceNumber: 3,
      previousHash: '2222222222222222222222222222222222222222222222222222222222222222',
      currentHash: '3333333333333333333333333333333333333333333333333333333333333333',
      tenantId: 'tenant-orbital',
      action: 'INCIDENT_CREATED',
      actor: { systemService: 'CorrelationWorker' },
      targetResource: { type: 'INCIDENT', id: 'inc-01' },
      payload: { severity: 'CRITICAL', mitreTechnique: 'T1486' },
      timestamp: new Date().toISOString()
    },
    {
      sequenceNumber: 4,
      previousHash: '3333333333333333333333333333333333333333333333333333333333333333',
      currentHash: '4444444444444444444444444444444444444444444444444444444444444444',
      tenantId: 'tenant-orbital',
      action: 'HOST_ISOLATED',
      actor: { userId: 'analyst-01' },
      targetResource: { type: 'NODE', id: 'srv-app-01' },
      payload: { blastRadiusMitigated: true },
      timestamp: new Date().toISOString()
    },
    {
      sequenceNumber: 5,
      previousHash: '4444444444444444444444444444444444444444444444444444444444444444',
      currentHash: '5555555555555555555555555555555555555555555555555555555555555555',
      tenantId: 'tenant-orbital',
      action: 'WORKFLOW_APPROVAL_SUBMITTED',
      actor: { userId: 'commander-01' },
      targetResource: { type: 'WORKFLOW', id: 'wf-01' },
      payload: { decision: 'APPROVED', dualCustodySatisfied: true },
      timestamp: new Date().toISOString()
    },
    {
      sequenceNumber: 6,
      previousHash: '5555555555555555555555555555555555555555555555555555555555555555',
      currentHash: '6666666666666666666666666666666666666666666666666666666666666666',
      tenantId: 'tenant-orbital',
      action: 'POLICY_PROMOTED',
      actor: { userId: 'admin-01' },
      targetResource: { type: 'POLICY', id: 'pol-01' },
      payload: { version: '1.1.0', benchmarkPassed: true },
      timestamp: new Date().toISOString()
    }
  ];

  it('generates fully compliant SOC2 Type II report with 100% controls passed', () => {
    const report = generateComplianceReport('tenant-orbital', mockAuditRecords, 'SOC2');

    expect(report.framework).toBe('SOC2');
    expect(report.overallStatus).toBe('COMPLIANT');
    expect(report.complianceScore).toBe(100);
    expect(report.controlsPassed).toBe(5);
    expect(report.totalControls).toBe(5);
    expect(report.merkleRoot).toBeDefined();
    expect(report.merkleRoot).toHaveLength(64);
    expect(report.attestationHash).toBeDefined();
    expect(report.attestationHash).toHaveLength(64);

    for (const control of report.controls) {
      expect(control.status).toBe('PASSED');
      expect(control.evidenceCount).toBeGreaterThan(0);
      expect(control.sampleEvidenceHashes.length).toBeGreaterThan(0);
    }
  });

  it('generates ISO 27001 report verifying operations and incident controls', () => {
    const report = generateComplianceReport('tenant-orbital', mockAuditRecords, 'ISO27001');

    expect(report.framework).toBe('ISO27001');
    expect(report.overallStatus).toBe('COMPLIANT');
    expect(report.complianceScore).toBe(100);
    expect(report.controlsPassed).toBe(4);
    expect(report.totalControls).toBe(4);
  });

  it('generates NIST AI RMF 1.0 report evaluating AI safety and benchmark gates', () => {
    const report = generateComplianceReport('tenant-orbital', mockAuditRecords, 'NIST_AI_RMF');

    expect(report.framework).toBe('NIST_AI_RMF');
    expect(report.complianceScore).toBeGreaterThanOrEqual(75);
    expect(report.controls.some((c) => c.controlId === 'GOVERN_1.1')).toBe(true);
    expect(report.controls.some((c) => c.controlId === 'MEASURE_2.6')).toBe(true);
  });
});

