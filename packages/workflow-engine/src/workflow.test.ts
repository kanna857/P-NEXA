import { describe, it, expect, beforeEach } from 'vitest';
import { generateWorldFromNL } from './nl-generator.js';
import { WorkflowManager } from './workflow-manager.js';

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
});
