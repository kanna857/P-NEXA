import { describe, it, expect } from 'vitest';
import {
  executeAgentCouncilInvestigation,
  buildChainedAuditLogEntry
} from '../services/agentInvestigationService.js';
import { sha256, canonicalJson } from '../utils/crypto.js';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';

describe('AI Agent Council — Complete Investigation & Audit Trail Flow', () => {
  const sampleTargetEntity: TwinNode = {
    id: 'srv-auth',
    name: 'Main Authentication Server',
    type: 'server',
    tier: 2,
    status: 'compromised',
    position: { x: 12, y: 0, z: -8 },
    metadata: {
      ipAddress: '10.2.0.10',
      os: 'Ubuntu 24.04 LTS',
      cpuUsage: 93,
      memoryUsage: 96
    }
  };

  const sampleEdges: TwinEdge[] = [
    {
      id: 'e-lb-srv',
      source: 'lb-main',
      target: 'srv-auth',
      status: 'active',
      metadata: { protocol: 'HTTP', bandwidthMbps: 1000 }
    },
    {
      id: 'e-srv-db',
      source: 'srv-auth',
      target: 'db-master',
      status: 'active',
      metadata: { protocol: 'TCP/445', bandwidthMbps: 500 }
    }
  ];

  it('executes the full multi-agent investigation workflow across all council specialists', async () => {
    const stagesSeen: string[] = [];
    const logsReceived: string[] = [];

    const result = await executeAgentCouncilInvestigation({
      entity: sampleTargetEntity,
      worldMode: 'school',
      edges: sampleEdges,
      onStageChange: (stage) => stagesSeen.push(stage),
      onLog: (log) => logsReceived.push(`[${log.role}]: ${log.message}`)
    });

    // 1. Verify stage progression through council specialists
    expect(stagesSeen).toContain('TRIAGE');
    expect(stagesSeen).toContain('THREAT_HUNT');
    expect(stagesSeen).toContain('CONTAINMENT_PLAN');
    expect(stagesSeen).toContain('POLICY_AUDIT');
    expect(stagesSeen).toContain('COMPLETED');

    // 2. Verify SOC Triage findings
    expect(result.triage.severity).toBe('CRITICAL');
    expect(result.triage.confidence).toBeGreaterThanOrEqual(0.95);
    expect(result.triage.isFalsePositive).toBe(false);

    // 3. Verify Threat Hunter evidence and MITRE ATT&CK correlation
    expect(result.evidence.mitreTechnique).toContain('T1486');
    expect(result.evidence.indicatorsOfCompromise.length).toBeGreaterThan(0);
    expect(result.evidence.indicatorsOfCompromise[0]).toContain('198.51.100.23');
    expect(result.evidence.correlatedAssetIds).toEqual(expect.arrayContaining(['lb-main', 'db-master']));

    // 4. Verify Incident Responder evidence-backed recommendations
    expect(result.recommendations.length).toBe(2);
    const recommended = result.recommendations.find((r) => r.isRecommended);
    expect(recommended).toBeDefined();
    expect(recommended?.action).toBe('ISOLATE_NODE');
    expect(recommended?.riskReductionPercent).toBe(88);
    expect(recommended?.requiresDualCustody).toBe(true);

    const alternative = result.recommendations.find((r) => !r.isRecommended);
    expect(alternative).toBeDefined();
    expect(alternative?.action).toBe('RATE_LIMIT_TRAFFIC');
    expect(alternative?.riskReductionPercent).toBe(52);

    // 5. Verify Policy Auditor cryptographic SHA-256 proof
    expect(result.auditProof.sha256Proof).toHaveLength(64);
    expect(result.auditProof.signedBy).toContain('agent_policy_auditor');
  });

  it('generates deterministic SHA-256 hashes and canonical JSON representations', () => {
    const payloadA = { b: 2, a: 1, nested: { z: 10, y: 20 } };
    const payloadB = { a: 1, b: 2, nested: { y: 20, z: 10 } };

    const canonicalA = canonicalJson(payloadA);
    const canonicalB = canonicalJson(payloadB);

    // Key order independence
    expect(canonicalA).toBe(canonicalB);

    // 64-character SHA-256 hash reproducibility
    const hashA = sha256(canonicalA);
    const hashB = sha256(canonicalB);
    expect(hashA).toHaveLength(64);
    expect(hashA).toBe(hashB);

    // Known NIST test vector: sha256('')
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('builds a cryptographically chained audit log entry for the Audit Vault', async () => {
    const initialHash = '4392019284019283019284019283019284019283019284019283019284019283';
    const sequenceNumber = 4;

    const result = await executeAgentCouncilInvestigation({
      entity: sampleTargetEntity,
      worldMode: 'school',
      edges: sampleEdges
    });

    const auditEntry = buildChainedAuditLogEntry({
      previousHash: initialHash,
      sequenceNumber,
      investigation: result,
      authorizedBy: 'commander@nexus.ai',
      action: 'CONTAINMENT_QUARANTINE_AUTHORIZED'
    });

    // 1. Verify block structure
    expect(auditEntry.sequenceNumber).toBe(4);
    expect(auditEntry.previousHash).toBe(initialHash);
    expect(auditEntry.currentHash).toHaveLength(64);
    expect(auditEntry.action).toBe('CONTAINMENT_QUARANTINE_AUTHORIZED');
    expect(auditEntry.actor.userId).toBe('commander@nexus.ai');
    expect(auditEntry.actor.agentId).toBe('ai_agent_council');
    expect(auditEntry.actor.verifiedBy).toBe('agent_policy_auditor');
    expect(auditEntry.targetResource.id).toBe('srv-auth');

    // 2. Verify forensic payload
    expect(auditEntry.payload.mitreTechnique).toContain('T1486');
    expect(auditEntry.payload.recommendedAction).toBe('ISOLATE_NODE');
    expect(auditEntry.payload.riskReductionPercent).toBe(88);
    expect(auditEntry.payload.cryptographicProof).toBe(result.auditProof.sha256Proof);

    // 3. Verify cryptographic link integrity
    const recomputedBlockData = canonicalJson({
      sequenceNumber: auditEntry.sequenceNumber,
      previousHash: auditEntry.previousHash,
      action: auditEntry.action,
      actor: auditEntry.actor,
      targetResource: {
        type: 'DigitalTwinEntity',
        id: auditEntry.targetResource.id,
        name: sampleTargetEntity.name
      },
      payload: auditEntry.payload,
      timestamp: auditEntry.timestamp
    });
    const expectedHash = sha256(initialHash + recomputedBlockData);
    expect(auditEntry.currentHash).toBe(expectedHash);
  });

  it('detects tampering when payload in the audit block is altered', async () => {
    const initialHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const result = await executeAgentCouncilInvestigation({
      entity: sampleTargetEntity,
      worldMode: 'school'
    });

    const entry = buildChainedAuditLogEntry({
      previousHash: initialHash,
      sequenceNumber: 1,
      investigation: result,
      authorizedBy: 'auditor@nexus.ai'
    });

    // Valid block matches
    const recomputeValid = (data: typeof entry) => {
      const blockStr = canonicalJson({
        sequenceNumber: data.sequenceNumber,
        previousHash: data.previousHash,
        action: data.action,
        actor: data.actor,
        targetResource: {
          type: 'DigitalTwinEntity',
          id: data.targetResource.id,
          name: sampleTargetEntity.name
        },
        payload: data.payload,
        timestamp: data.timestamp
      });
      return sha256(data.previousHash + blockStr);
    };

    expect(recomputeValid(entry)).toBe(entry.currentHash);

    // Tampered payload fails verification
    const tamperedEntry = {
      ...entry,
      payload: {
        ...entry.payload,
        recommendedAction: 'UNAUTHORIZED_EXFILTRATION'
      }
    };
    expect(recomputeValid(tamperedEntry)).not.toBe(entry.currentHash);
  });
});

