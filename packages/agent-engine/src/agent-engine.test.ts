import { describe, it, expect, beforeEach } from 'vitest';
import {
  AGENT_PERSONAS,
  isToolAllowed,
  executeToolSandboxed,
  ApprovalQueueManager,
  createSocietyWorkflow,
  executeSocietyWorkflow,
  resumeWorkflowAfterApproval,
  SecurityAlert
} from './index.js';
import { VectorMemoryStore } from '@nexus/agent-memory';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';

describe('Multi-Agent AI Society & Stateful Workflow Engine', () => {
  let memoryStore: VectorMemoryStore;
  let approvalQueue: ApprovalQueueManager;

  const mockNodes: TwinNode[] = [
    {
      id: 'fw-01',
      name: 'Perimeter Firewall',
      type: 'firewall',
      tier: 0,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: {}
    },
    {
      id: 'app-01',
      name: 'Core Payment App',
      type: 'server',
      tier: 2,
      status: 'compromised',
      position: { x: 20, y: 0, z: 0 },
      metadata: { os: 'Linux', cpuUsage: 88 }
    },
    {
      id: 'db-01',
      name: 'Vault Database',
      type: 'database',
      tier: 3,
      status: 'healthy',
      position: { x: 40, y: 0, z: 0 },
      metadata: {}
    }
  ];

  const mockEdges: TwinEdge[] = [
    {
      id: 'e-fw-app',
      source: 'fw-01',
      target: 'app-01',
      protocol: 'TLS',
      trafficRateKbps: 500,
      isEncrypted: true,
      status: 'normal'
    },
    {
      id: 'e-app-db',
      source: 'app-01',
      target: 'db-01',
      protocol: 'TCP',
      trafficRateKbps: 300,
      isEncrypted: true,
      status: 'normal'
    }
  ];

  beforeEach(() => {
    memoryStore = new VectorMemoryStore();
    approvalQueue = new ApprovalQueueManager();
  });

  it('strictly validates tool allowlists per role', () => {
    const soc = AGENT_PERSONAS.SOC_TRIAGE;
    const responder = AGENT_PERSONAS.INCIDENT_RESPONDER;

    expect(isToolAllowed(soc, 'query_telemetry')).toBe(true);
    expect(isToolAllowed(soc, 'classify_threat')).toBe(true);
    // SOC cannot directly execute containment actions
    expect(isToolAllowed(soc, 'apply_containment')).toBe(false);

    expect(isToolAllowed(responder, 'query_blast_radius')).toBe(true);
    expect(isToolAllowed(responder, 'propose_node_isolation')).toBe(true);
    // Responder cannot simulate red team attacks
    expect(isToolAllowed(responder, 'simulate_attack_vector')).toBe(false);
  });

  it('rejects unauthorized tool execution and blocks arbitrary code execution', async () => {
    const soc = AGENT_PERSONAS.SOC_TRIAGE;

    await expect(
      executeToolSandboxed(
        soc,
        'apply_containment',
        { action: 'ISOLATE_NODE', targetId: 'app-01' },
        { tenantId: 't1', worldId: 'w1', nodes: mockNodes, edges: mockEdges }
      )
    ).rejects.toThrow(/Permission Denied/);
  });

  it('executes multi-agent society pipeline and halts at Human-in-the-Loop gate for high-risk actions', async () => {
    const alert: SecurityAlert = {
      id: 'alert-101',
      sourceNodeId: 'app-01',
      title: 'Active Ransomware Lateral Traversal Detected',
      description: 'Host app-01 is executing high-frequency encryption and probing database on port 5432',
      rawPayload: { port: 5432, bytesSent: 1048576 },
      timestamp: new Date()
    };

    const workflow = createSocietyWorkflow({
      incidentId: 'inc-900',
      tenantId: 'tenant-omega',
      worldId: 'world-prime',
      alert,
      nodes: JSON.parse(JSON.stringify(mockNodes)),
      edges: JSON.parse(JSON.stringify(mockEdges))
    });

    // Execute workflow - should run through Triage -> ThreatHunt -> ResponsePlan -> RedTeam -> PolicyAudit -> pause at HITL
    const pausedState = await executeSocietyWorkflow(workflow, {
      memoryStore,
      approvalQueue,
      autoApproveHITL: false
    });

    expect(pausedState.currentStage).toBe('HITL_APPROVAL_GATE');
    expect(pausedState.approvalId).toBeDefined();
    expect(pausedState.approvalStatus).toBe('PENDING');

    // Verify Triage report
    expect(pausedState.triageReport?.severity).toBe('CRITICAL');
    expect(pausedState.triageReport?.isFalsePositive).toBe(false);

    // Verify Threat Hunter report
    expect(pausedState.threatHuntReport?.mitreTechnique).toContain('T1021');
    expect(pausedState.threatHuntReport?.threatActorProfile).toBeDefined();

    // Verify Response Plan
    expect(pausedState.responsePlan?.action).toBe('ISOLATE_NODE');
    expect(pausedState.responsePlan?.requiresHumanApproval).toBe(true);
    expect(pausedState.responsePlan?.blastRadius?.impactedNodeIds).toContain('db-01');

    // Verify Red Team Adversary analysis
    expect(pausedState.redTeamReport?.simulatedAttackPath).toEqual(['app-01', 'db-01']);
    expect(pausedState.redTeamReport?.exploitFeasibility).toBe('HIGH');

    // Verify Policy Auditor verdict & audit proof hash
    expect(pausedState.auditVerdict?.compliant).toBe(true);
    expect(pausedState.auditVerdict?.auditProofHash).toBeDefined();

    // Verify that the request is queued in the approval manager
    const pending = approvalQueue.getPendingRequests('tenant-omega');
    expect(pending.length).toBe(1);
    expect(pending[0]!.id).toBe(pausedState.approvalId);
    expect(pending[0]!.action).toBe('ISOLATE_NODE');
    expect(pending[0]!.targetId).toBe('app-01');
  });

  it('resumes workflow after authorized human approves containment action', async () => {
    const alert: SecurityAlert = {
      id: 'alert-102',
      sourceNodeId: 'app-01',
      title: 'Credential Dumping via Memory Injection',
      description: 'Suspicious memory dumping on app-01 targeting DB credentials',
      rawPayload: {},
      timestamp: new Date()
    };

    const workflow = createSocietyWorkflow({
      incidentId: 'inc-901',
      tenantId: 'tenant-omega',
      worldId: 'world-prime',
      alert,
      nodes: JSON.parse(JSON.stringify(mockNodes)),
      edges: JSON.parse(JSON.stringify(mockEdges))
    });

    const pausedState = await executeSocietyWorkflow(workflow, { memoryStore, approvalQueue });
    expect(pausedState.currentStage).toBe('HITL_APPROVAL_GATE');

    // Human operator grants approval
    const completedState = await resumeWorkflowAfterApproval(
      pausedState,
      'APPROVED',
      'SecurityOfficer_Vance',
      'Authorized immediate emergency isolation',
      { memoryStore, approvalQueue }
    );

    expect(completedState.currentStage).toBe('COMPLETED');
    expect(completedState.approvalStatus).toBe('APPROVED');
    expect(completedState.containmentResult?.success).toBe(true);
    expect(completedState.containmentResult?.appliedAction).toBe('ISOLATE_NODE');

    // Verify that the node was isolated in the topology
    const isolatedNode = completedState.nodes.find((n) => n.id === 'app-01');
    expect(isolatedNode?.status).toBe('isolated');

    // Verify that episodic vector memories were recorded
    const pastMemories = await memoryStore.getMemoriesByEntity('tenant-omega', 'app-01');
    expect(pastMemories.length).toBeGreaterThan(0);
    const hasContainmentLog = pastMemories.some((m) => m.content.includes('contained successfully'));
    expect(hasContainmentLog).toBe(true);
  });

  it('safely aborts containment when human rejects approval request', async () => {
    const alert: SecurityAlert = {
      id: 'alert-103',
      sourceNodeId: 'app-01',
      title: 'High CPU spike on production payment gateway',
      description: 'Payment server CPU at 99%, possible cryptominer',
      rawPayload: {},
      timestamp: new Date()
    };

    const workflow = createSocietyWorkflow({
      incidentId: 'inc-902',
      tenantId: 'tenant-omega',
      worldId: 'world-prime',
      alert,
      nodes: JSON.parse(JSON.stringify(mockNodes)),
      edges: JSON.parse(JSON.stringify(mockEdges))
    });

    const pausedState = await executeSocietyWorkflow(workflow, { memoryStore, approvalQueue });

    // Human operator rejects: high CPU was legitimate end-of-month batch processing
    const rejectedState = await resumeWorkflowAfterApproval(
      pausedState,
      'REJECTED',
      'SecOps_Director',
      'Known scheduled financial end-of-month reconciliation, do not isolate.',
      { memoryStore, approvalQueue }
    );

    expect(rejectedState.currentStage).toBe('COMPLETED');
    expect(rejectedState.approvalStatus).toBe('REJECTED');
    expect(rejectedState.containmentResult?.success).toBe(false);

    // Node must NOT be isolated
    const node = rejectedState.nodes.find((n) => n.id === 'app-01');
    expect(node?.status).not.toBe('isolated');
  });

  it('SOC Triage automatically closes false positive alerts without disrupting services', async () => {
    const falsePositiveAlert: SecurityAlert = {
      id: 'alert-104',
      sourceNodeId: 'app-01',
      title: 'Scheduled-Test Port Scan from Authorized Scanner',
      description: 'Routine scheduled-test vulnerability assessment ping',
      rawPayload: {},
      timestamp: new Date()
    };

    const workflow = createSocietyWorkflow({
      incidentId: 'inc-903',
      tenantId: 'tenant-omega',
      worldId: 'world-prime',
      alert: falsePositiveAlert,
      nodes: JSON.parse(JSON.stringify(mockNodes)),
      edges: JSON.parse(JSON.stringify(mockEdges))
    });

    const completedState = await executeSocietyWorkflow(workflow, { memoryStore, approvalQueue });

    expect(completedState.currentStage).toBe('COMPLETED');
    expect(completedState.triageReport?.isFalsePositive).toBe(true);
    expect(completedState.threatHuntReport).toBeUndefined();
    expect(completedState.responsePlan).toBeUndefined();
  });

  describe('LangGraph.js Agent Orchestration & Checkpointer Pattern', () => {
    it('executes stateful graph, interrupts at HIL gate, and saves checkpoints', async () => {
      const { createDefaultAgentSocietyGraph, InMemoryStateCheckpointer } = await import('./langgraphOrchestrator.js');

      const checkpointer = new InMemoryStateCheckpointer();
      const graph = createDefaultAgentSocietyGraph();
      const runner = graph.compile({ checkpointer, approvalQueue, memoryStore });

      const alert: SecurityAlert = {
        id: 'alert-lg-001',
        sourceNodeId: 'app-01',
        title: 'CVE-2024-3400 SMB Exploit Detected',
        description: 'Unauthorized lateral movement attempt on port 445',
        rawPayload: { severity: 'CRITICAL' },
        timestamp: new Date()
      };

      const initialState = {
        incidentId: 'inc-lg-100',
        tenantId: 'tenant-omega',
        worldId: 'world-prime',
        alert,
        nodes: JSON.parse(JSON.stringify(mockNodes)),
        edges: JSON.parse(JSON.stringify(mockEdges)),
        isApproved: false,
        currentNode: 'triage',
        isInterrupted: false,
        logs: []
      };

      // 1. First run halts at HIL interrupt gate
      const pausedState = await runner.invoke(initialState);

      expect(pausedState.isInterrupted).toBe(true);
      expect(pausedState.currentNode).toBe('execute_containment');
      expect(pausedState.interruptReason).toContain('Human-In-The-Loop gate');
      expect(pausedState.triageReport?.severity).toBe('CRITICAL');
      expect(pausedState.threatHuntReport?.mitreTechnique).toContain('T1486');
      expect(pausedState.responsePlan?.action).toBe('ISOLATE_NODE');

      // Verify checkpoints were persisted
      const savedCheckpoints = await checkpointer.list('inc-lg-100');
      expect(savedCheckpoints.length).toBeGreaterThanOrEqual(3);

      // 2. Supervisor approves dual-custody authorization and resumes from checkpoint
      const latestCheckpointId = 'inc-lg-100_step_3_containment_planning';
      const completedState = await runner.resume(latestCheckpointId, { isApproved: true });

      expect(completedState.isInterrupted).toBe(false);
      expect(completedState.currentNode).toBe('__END__');
      expect(completedState.executionResult?.success).toBe(true);
      expect(completedState.auditProof?.sha256Proof).toBeDefined();

      // Verify node was isolated
      const isolatedNode = completedState.nodes.find((n: any) => n.id === 'app-01');
      expect(isolatedNode?.status).toBe('isolated');
    });

    it('conditional edge terminates early for false positive alerts', async () => {
      const { createDefaultAgentSocietyGraph, InMemoryStateCheckpointer } = await import('./langgraphOrchestrator.js');

      const checkpointer = new InMemoryStateCheckpointer();
      const graph = createDefaultAgentSocietyGraph();
      const runner = graph.compile({ checkpointer, approvalQueue, memoryStore });

      const falsePositiveAlert: SecurityAlert = {
        id: 'alert-lg-002',
        sourceNodeId: 'app-01',
        title: 'Routine Health Scan',
        description: 'Authorized benchmark test from vulnerability scanner',
        rawPayload: { severity: 'LOW' },
        timestamp: new Date()
      };

      const result = await runner.invoke({
        incidentId: 'inc-lg-200',
        tenantId: 'tenant-omega',
        worldId: 'world-prime',
        alert: falsePositiveAlert,
        nodes: JSON.parse(JSON.stringify(mockNodes)),
        edges: JSON.parse(JSON.stringify(mockEdges)),
        isApproved: false,
        currentNode: 'triage',
        isInterrupted: false,
        logs: []
      });

      expect(result.currentNode).toBe('__END__');
      expect(result.triageReport?.isFalsePositive).toBe(true);
      expect(result.threatHuntReport).toBeUndefined();
      expect(result.isInterrupted).toBe(false);
    });
  });
});

