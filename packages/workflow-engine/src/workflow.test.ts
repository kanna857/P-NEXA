import { describe, it, expect, beforeEach } from 'vitest';
import { generateWorldFromNL } from './nl-generator.js';
import { WorkflowManager } from './workflow-manager.js';
import { WorkflowInstance, WorkflowStep } from './types.js';
import { WorkflowStateMachine, validateWorkflowAcyclic } from './workflow-state-machine.js';

describe('Phase 7: Natural-Language World Creation & Workflow Automation', () => {
  let manager: WorkflowManager;

  beforeEach(() => {
    manager = new WorkflowManager();
  });

  describe('Natural-Language 3D Digital Twin World Generator', () => {
    it('synthesizes cloud microservice topology with 3D spatial coordinates from natural language', () => {
      const generated = generateWorldFromNL({
        prompt: 'Build a secure cloud microservice cluster with WAF ingress, OAuth API server with CVE-2024-21413, Redis cache, and PostgreSQL database',
        tenantId: 'tenant-test'
      });

      expect(generated.environmentType).toBe('cloud');
      expect(generated.nodes.length).toBeGreaterThanOrEqual(4);
      expect(generated.edges.length).toBeGreaterThanOrEqual(3);

      // Verify node types and CVE metadata
      const authNode = generated.nodes.find((n) => n.id.includes('auth'));
      expect(authNode).toBeDefined();
      expect(authNode?.metadata.vulnerabilities).toContain('CVE-2024-21413');

      // Verify 3D spatial positioning calculated
      for (const node of generated.nodes) {
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
        expect(typeof node.position.z).toBe('number');
      }

      expect(generated.rationale.length).toBeGreaterThan(0);
    });

    it('identifies and synthesizes SCADA/ICS industrial power grid topology', () => {
      const generated = generateWorldFromNL({
        prompt: 'Generate an industrial SCADA water treatment grid with Centrifuge PLCs, HMI workstations, and historian database',
        tenantId: 'tenant-test'
      });

      expect(generated.environmentType).toBe('scada_ics');
      const plcNode = generated.nodes.find((n) => n.type === 'iot_sensor');
      expect(plcNode).toBeDefined();

      const hmiNode = generated.nodes.find((n) => n.name.includes('HMI'));
      expect(hmiNode).toBeDefined();
    });

    it('synthesizes satellite orbital constellation topology with laser links', () => {
      const generated = generateWorldFromNL({
        prompt: 'Construct an orbital satellite mesh constellation with ground station relay and inter-satellite laser communications',
        tenantId: 'tenant-test'
      });

      expect(generated.environmentType).toBe('satellite_mesh');
      const satNodes = generated.nodes.filter((n) => n.name.includes('Satellite'));
      expect(satNodes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Workflow State Machine & Dual-Custody Approval Gates', () => {
    it('executes automated steps, pauses at dual-custody gate, and resumes upon dual sign-off', () => {
      const playbook = manager.createRansomwareContainmentPlaybook(
        'tenant-omega',
        'host-db-01',
        'edge-gw-db'
      );

      expect(playbook.status).toBe('IDLE');
      expect(playbook.steps.length).toBe(7);

      // 1. Start Workflow: should execute Steps 1, 2, 3 and pause at Step 4 (Dual-Custody Gate)
      const startRes = manager.startWorkflow('tenant-omega', playbook.id);
      expect(startRes.haltedAtGate).toBe(true);
      expect(playbook.status).toBe('WAITING_FOR_APPROVAL');
      expect(playbook.currentStepIndex).toBe(3); // Step index 3 is Step 4 (Dual-Custody Gate)
      expect(playbook.steps[3]?.status).toBe('PAUSED');

      // Verify audit proof hash generated
      expect(playbook.auditProofHash).toMatch(/^[a-f0-9]{64}$/);

      // 2. First Approval Sign-off (SOC Lead)
      const signoff1Res = manager.submitApproval('tenant-omega', playbook.id, {
        userId: 'officer-marcus',
        role: 'SECURITY_ANALYST',
        decision: 'APPROVED',
        comment: 'Verified blast-radius; containment necessary.',
        timestamp: new Date().toISOString()
      });

      // Still halted because dual approval (2 distinct approvers) is required
      expect(signoff1Res.haltedAtGate).toBe(true);
      expect(playbook.status).toBe('WAITING_FOR_APPROVAL');
      expect(playbook.steps[3]?.approvals?.length).toBe(1);

      // 3. Second Approval Sign-off (Org Admin)
      const signoff2Res = manager.submitApproval('tenant-omega', playbook.id, {
        userId: 'admin-sarah',
        role: 'ORG_ADMIN',
        decision: 'APPROVED',
        comment: 'Secondary dual-custody sign-off confirmed. Proceed with containment.',
        timestamp: new Date().toISOString()
      });

      // With 2 distinct approvers, workflow resumes through Step 5 (isolate), 6 (sever link), and 7 (notify)
      expect(signoff2Res.haltedAtGate).toBe(false);
      expect(playbook.status).toBe('COMPLETED');
      expect(playbook.completedAt).toBeDefined();

      // Verify all steps are marked COMPLETED
      for (const step of playbook.steps) {
        expect(step.status).toBe('COMPLETED');
        expect(step.output).toBeDefined();
      }

      // Final step outputs
      const isolateStep = playbook.steps.find((s) => s.type === 'ISOLATE_HOST');
      expect(isolateStep?.output?.networkTrafficSevered).toBe(true);

      const severStep = playbook.steps.find((s) => s.type === 'SEVER_NETWORK_LINK');
      expect(severStep?.output?.packetFlowHalted).toBe(true);
    });

    it('immediately aborts workflow when approval gate is rejected', () => {
      const playbook = manager.createRansomwareContainmentPlaybook(
        'tenant-omega',
        'host-db-01',
        'edge-gw-db'
      );

      manager.startWorkflow('tenant-omega', playbook.id);
      expect(playbook.status).toBe('WAITING_FOR_APPROVAL');

      // Reject sign-off
      const rejectRes = manager.submitApproval('tenant-omega', playbook.id, {
        userId: 'officer-marcus',
        role: 'SECURITY_ANALYST',
        decision: 'REJECTED',
        comment: 'False alarm. Server is performing planned data backup.',
        timestamp: new Date().toISOString()
      });

      expect(rejectRes.haltedAtGate).toBe(false);
      expect(playbook.status).toBe('ABORTED');
      expect(playbook.steps[3]?.status).toBe('FAILED');
      expect(playbook.steps[3]?.error).toContain('False alarm');
    });
  });

  describe('Phase 5: Real-Time Intelligence & Workflow Automation Extensions', () => {
    it('validates acyclic DAG structure and detects cyclic dependencies', () => {
      // Valid acyclic DAG
      const acyclicSteps: WorkflowStep[] = [
        { id: 'step-1', name: 'Trigger', type: 'TELEMETRY_TRIGGER', status: 'PENDING', riskLevel: 'LOW', nextStepIds: ['step-2'] },
        { id: 'step-2', name: 'Anomaly', type: 'ANOMALY_DETECTION', status: 'PENDING', riskLevel: 'LOW', nextStepIds: ['step-3'] },
        { id: 'step-3', name: 'Remediate', type: 'AUTHORIZED_REMEDIATION', status: 'PENDING', riskLevel: 'HIGH', nextStepIds: [] }
      ];
      const validRes = validateWorkflowAcyclic(acyclicSteps);
      expect(validRes.isValid).toBe(true);
      expect(validRes.hasCycle).toBe(false);

      // Cyclic graph: step-1 -> step-2 -> step-3 -> step-1
      const cyclicSteps: WorkflowStep[] = [
        { id: 'step-1', name: 'Trigger', type: 'TELEMETRY_TRIGGER', status: 'PENDING', riskLevel: 'LOW', nextStepIds: ['step-2'] },
        { id: 'step-2', name: 'Anomaly', type: 'ANOMALY_DETECTION', status: 'PENDING', riskLevel: 'LOW', nextStepIds: ['step-3'] },
        { id: 'step-3', name: 'Remediate', type: 'AUTHORIZED_REMEDIATION', status: 'PENDING', riskLevel: 'HIGH', nextStepIds: ['step-1'] }
      ];
      const cyclicRes = validateWorkflowAcyclic(cyclicSteps);
      expect(cyclicRes.isValid).toBe(false);
      expect(cyclicRes.hasCycle).toBe(true);
      expect(cyclicRes.cyclePath?.length).toBeGreaterThan(1);
    });

    it('executes full 9-node Phase 5 automation pipeline with bounded execution and audit logging', () => {
      const sm = new WorkflowStateMachine();

      const instance: WorkflowInstance = {
        id: 'wf-phase5-001',
        tenantId: 'tenant-test',
        title: 'Real-time Autonomous Threat Response',
        description: 'Telemetry trigger -> Anomaly -> Council -> Remediation -> Audit',
        version: '1.2.0',
        status: 'IDLE',
        currentStepIndex: 0,
        maxExecutionSteps: 20,
        context: {},
        auditProofHash: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
          { id: 's1', name: 'CPU Spike Trigger', type: 'TELEMETRY_TRIGGER', status: 'PENDING', riskLevel: 'LOW', payload: { metric: 'cpu', value: 96 } },
          { id: 's2', name: 'Threshold Check', type: 'THRESHOLD_CONDITION', status: 'PENDING', riskLevel: 'LOW', payload: { threshold: 85, value: 96 } },
          { id: 's3', name: 'Predictive Anomaly Scorer', type: 'ANOMALY_DETECTION', status: 'PENDING', riskLevel: 'LOW' },
          { id: 's4', name: 'AI Council Investigation', type: 'COUNCIL_INVESTIGATION', status: 'PENDING', riskLevel: 'LOW' },
          { id: 's5', name: 'Blast Radius Simulation', type: 'SIMULATION', status: 'PENDING', riskLevel: 'LOW' },
          { id: 's6', name: 'Commander Notification', type: 'NOTIFICATION', status: 'PENDING', riskLevel: 'LOW' },
          { id: 's7', name: 'Human Dual Approval Gate', type: 'HUMAN_APPROVAL', status: 'PENDING', riskLevel: 'CRITICAL', requiresDualApproval: true },
          { id: 's8', name: 'Authorized Node Isolation', type: 'AUTHORIZED_REMEDIATION', status: 'PENDING', riskLevel: 'HIGH' },
          { id: 's9', name: 'Immutable Audit Ledger Record', type: 'AUDIT_LOGGING', status: 'PENDING', riskLevel: 'LOW' }
        ]
      };

      // 1. Initial advance should halt at Step 7 (HUMAN_APPROVAL)
      const res1 = sm.advance(instance);
      expect(res1.haltedAtGate).toBe(true);
      expect(instance.status).toBe('WAITING_FOR_APPROVAL');
      expect(instance.currentStepIndex).toBe(6);
      expect(instance.steps[0]?.status).toBe('COMPLETED');
      expect(instance.steps[0]?.output?.triggered).toBe(true);
      expect(instance.steps[3]?.output?.investigationTriggered).toBe(true);
      expect(instance.executionHistory?.length).toBe(6);

      // 2. Submit First Approval
      const res2 = sm.advance(instance, {
        userId: 'sec-lead-01',
        role: 'SECURITY_ANALYST',
        decision: 'APPROVED',
        timestamp: new Date().toISOString()
      });
      expect(res2.haltedAtGate).toBe(true); // Still waiting for second approver

      // 3. Submit Second Approval
      const res3 = sm.advance(instance, {
        userId: 'commander-02',
        role: 'COMMANDER',
        decision: 'APPROVED',
        timestamp: new Date().toISOString()
      });
      expect(res3.haltedAtGate).toBe(false);
      expect(instance.status).toBe('COMPLETED');
      expect(instance.steps[7]?.output?.remediationStatus).toBe('EXECUTED_CLEANLY');
      expect(instance.steps[8]?.output?.ledgerBlockSealed).toBe(true);
      expect(instance.auditProofHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('safely cancels an in-flight workflow instance', () => {
      const sm = new WorkflowStateMachine();

      const instance: WorkflowInstance = {
        id: 'wf-cancel-test',
        tenantId: 'tenant-test',
        title: 'Cancel Test',
        description: 'Test cancellation',
        status: 'WAITING_FOR_APPROVAL',
        currentStepIndex: 1,
        steps: [
          { id: 's1', name: 'Step 1', type: 'TELEMETRY_TRIGGER', status: 'COMPLETED', riskLevel: 'LOW' },
          { id: 's2', name: 'Step 2', type: 'HUMAN_APPROVAL', status: 'PAUSED', riskLevel: 'CRITICAL' }
        ],
        context: {},
        auditProofHash: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const cancelled = sm.cancel(instance, 'Operator cancelled due to maintenance window');
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.context.cancellationReason).toContain('maintenance window');
      expect(cancelled.auditProofHash).toBeDefined();
    });
  });
});
