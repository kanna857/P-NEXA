import { describe, it, expect } from 'vitest';
import { CouncilOrchestrator } from './councilOrchestrator.js';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';

describe('Phase 4 — Runtime Autonomous AI Agent Council', () => {
  const sampleNodes: TwinNode[] = [
    {
      id: 'srv-auth-primary',
      name: 'Authentication Core Server',
      type: 'server',
      tier: 2,
      status: 'compromised',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.2.0.10', cpuUsage: 94, memoryUsage: 96 }
    },
    {
      id: 'db-user-vault',
      name: 'User Directory Database',
      type: 'database',
      tier: 1,
      status: 'healthy',
      position: { x: 10, y: 0, z: 0 },
      metadata: { ipAddress: '10.2.0.20' }
    },
    {
      id: 'gw-ingress',
      name: 'Edge Ingress Gateway',
      type: 'gateway',
      tier: 3,
      status: 'healthy',
      position: { x: -10, y: 0, z: 0 },
      metadata: { ipAddress: '10.2.0.1' }
    }
  ];

  const sampleEdges: TwinEdge[] = [
    {
      id: 'edge-auth-db',
      source: 'srv-auth-primary',
      target: 'db-user-vault',
      type: 'network',
      status: 'active'
    },
    {
      id: 'edge-gw-auth',
      source: 'gw-ingress',
      target: 'srv-auth-primary',
      type: 'network',
      status: 'active'
    }
  ];

  it('coordinates all 5 runtime agents into an evidence-backed dossier', async () => {
    const orchestrator = new CouncilOrchestrator();
    const emittedEvents: string[] = [];

    const dossier = await orchestrator.executeInvestigation(
      {
        entityId: 'srv-auth-primary',
        tenantId: 'tenant-omega',
        worldId: 'world-campus-01',
        nodes: sampleNodes,
        edges: sampleEdges,
        requestedBy: 'operator@p-nexa.internal'
      },
      {
        onEvent: (evt) => emittedEvents.push(`${evt.agentRole || 'SUPERVISOR'}:${evt.stage}:${evt.status}`)
      }
    );

    // Verify Dossier Structure
    expect(dossier.investigationId).toMatch(/^inv-/);
    expect(dossier.targetEntity.id).toBe('srv-auth-primary');
    expect(dossier.status).toBe('AWAITING_APPROVAL');

    // 1. Investigator Agent
    expect(dossier.evidence.observedFacts.length).toBeGreaterThanOrEqual(3);
    expect(dossier.evidence.hypotheses.length).toBeGreaterThanOrEqual(2);
    expect(dossier.evidence.observedFacts[0]!.verified).toBe(true);

    // 2. Cybersecurity Agent
    expect(dossier.threatAssessment.severity).toBe('CRITICAL');
    expect(dossier.threatAssessment.riskScore).toBeGreaterThanOrEqual(80);
    expect(dossier.threatAssessment.mitreTechnique).toContain('T1486');
    expect(dossier.threatAssessment.explainableDetections.length).toBeGreaterThanOrEqual(3);

    // 3. Simulation Agent
    expect(dossier.simulation.isSimulatedProjection).toBe(true);
    expect(dossier.simulation.baselineCompromisedCount).toBeGreaterThanOrEqual(1);
    expect(dossier.simulation.uncertaintyRange.minRiskReduction).toBe(82);
    expect(dossier.simulation.stateHash.length).toBe(64); // SHA-256

    // 4. Planner Agent
    expect(dossier.candidatePlans.length).toBeGreaterThanOrEqual(3);
    expect(dossier.recommendedPlan.action).toBe('ISOLATE_NODE');
    expect(dossier.recommendedPlan.requiresDualCustody).toBe(true);

    // 5. Reviewer Agent
    expect(dossier.reviewerVerdict.status).toBe('APPROVED_FOR_PRESENTATION');
    expect(dossier.reviewerVerdict.complianceVerified).toBe(true);
    expect(dossier.humanApproval.required).toBe(true);

    // Cryptographic Proof
    expect(dossier.cryptographicProof.sha256Hash.length).toBe(64);

    // Lifecycle Events
    expect(emittedEvents.some((e) => e.includes('INVESTIGATOR:EVIDENCE_COLLECTION'))).toBe(true);
    expect(emittedEvents.some((e) => e.includes('CYBERSECURITY:THREAT_ASSESSMENT'))).toBe(true);
    expect(emittedEvents.some((e) => e.includes('SIMULATION:PREDICTIVE_SIMULATION'))).toBe(true);
    expect(emittedEvents.some((e) => e.includes('PLANNER:RESPONSE_PLANNING'))).toBe(true);
    expect(emittedEvents.some((e) => e.includes('REVIEWER:POLICY_REVIEW'))).toBe(true);
  });

  it('supports cancellation before or during execution', async () => {
    const orchestrator = new CouncilOrchestrator();
    const abortController = new AbortController();

    // Trigger cancellation immediately
    abortController.abort();

    const dossier = await orchestrator.executeInvestigation(
      {
        entityId: 'srv-auth-primary',
        tenantId: 'tenant-omega',
        worldId: 'world-campus-01',
        nodes: sampleNodes,
        edges: sampleEdges,
        requestedBy: 'operator@p-nexa.internal'
      },
      { abortSignal: abortController.signal }
    );

    expect(dossier.status).toBe('CANCELLED');
    expect(dossier.events.some((e) => e.status === 'CANCELLED')).toBe(true);
  });

  it('enforces human approval and rejection gates', async () => {
    const orchestrator = new CouncilOrchestrator();

    const dossier = await orchestrator.executeInvestigation({
      entityId: 'srv-auth-primary',
      tenantId: 'tenant-omega',
      worldId: 'world-campus-01',
      nodes: sampleNodes,
      edges: sampleEdges,
      requestedBy: 'operator@p-nexa.internal'
    });

    expect(dossier.status).toBe('AWAITING_APPROVAL');

    // Approve
    const approved = orchestrator.approveInvestigation(
      dossier.investigationId,
      'admin@p-nexa.internal',
      'Dual-custody key signed'
    );
    expect(approved.status).toBe('APPROVED');
    expect(approved.humanApproval.approvedBy).toBe('admin@p-nexa.internal');

    // Reject another
    const dossier2 = await orchestrator.executeInvestigation({
      entityId: 'db-user-vault',
      tenantId: 'tenant-omega',
      worldId: 'world-campus-01',
      nodes: sampleNodes,
      edges: sampleEdges,
      requestedBy: 'operator@p-nexa.internal'
    });

    const rejected = orchestrator.rejectInvestigation(
      dossier2.investigationId,
      'sec-analyst@p-nexa.internal',
      'Action deemed too disruptive to user database'
    );
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.humanApproval.rejectedBy).toBe('sec-analyst@p-nexa.internal');
  });

  it('maintains entity investigation history', async () => {
    const orchestrator = new CouncilOrchestrator();

    await orchestrator.executeInvestigation({
      entityId: 'srv-auth-primary',
      tenantId: 'tenant-omega',
      worldId: 'world-campus-01',
      requestedBy: 'analyst@p-nexa.internal'
    });

    const history = orchestrator.getEntityHistory('srv-auth-primary');
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]!.targetEntity.id).toBe('srv-auth-primary');
  });
});

