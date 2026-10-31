import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDatabase, disconnectDatabase, getDatabaseStatus } from '../db/connection.js';
import { DataStore } from '../db/store.js';
import { WorldStore } from '../db/worldStore.js';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { DigitalTwinWorld } from '../models/DigitalTwinWorld.js';
import { defaultEventStore } from '@nexus/event-store';
import { defaultIncidentManager } from '@nexus/cyber-engine';
import { defaultScenarioManager } from '@nexus/simulation-engine';
import { defaultPolicyStore } from '@nexus/learning-engine';
import { defaultWorkflowManager } from '@nexus/workflow-engine';

describe('NEXUS OMEGA X API Gateway & Security Tests', () => {
  let app: ReturnType<typeof createApp>['app'];
  let authToken = '';
  let tenantId = '';
  let refreshToken = '';
  let worldId = '';
  let approvalRequestId = '';
  let cyberIncidentId = '';
  let scenarioId = '';
  let branchScenarioId = '';
  let policyId = '';
  let candidatePolicyId = '';
  let workflowId = '';
  let commanderToken = '';
  let savedMerkleProof: any = null;

  const cleanupDatabase = async () => {
    DataStore.clearMemoryStore();
    WorldStore.clearMemoryStore();
    defaultEventStore.clear();
    defaultIncidentManager.clear();
    defaultScenarioManager.clear();
    defaultPolicyStore.clear();
    defaultWorkflowManager.clear();
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      try {
        await Tenant.deleteMany({ slug: 'aegis-orbital' });
        await User.deleteMany({ email: { $in: ['officer@aegis.defense', 'analyst@aegis.defense', 'commander@aegis.defense'] } });
        await AuditLog.deleteMany({});
        await RefreshToken.deleteMany({});
        await DigitalTwinWorld.deleteMany({});
      } catch {
        // ignore errors during cleanup
      }
    }
  };

  beforeAll(async () => {
    process.env.ALLOW_MEMORY_FALLBACK = 'true';
    await connectDatabase();
    await cleanupDatabase();
    const { app: a } = createApp();
    app = a;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await disconnectDatabase();
  });

  // ── Phase 1: Foundation ───────────────────────────────────────────────────
  it('GET /health returns 200 OK and service metadata', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('nexus-omega-x-api');
  });

  it('GET /health/ready returns readiness check for database and cache', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.database.connected).toBe(true);
  });

  it('POST /api/v1/auth/register registers a new organization and admin user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'officer@aegis.defense',
        password: 'DefensePass2026!',
        firstName: 'Marcus',
        lastName: 'Vance',
        organizationName: 'Aegis Orbital Defense',
        organizationSlug: 'aegis-orbital'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('officer@aegis.defense');
    expect(res.body.data.tenant.slug).toBe('aegis-orbital');
    expect(res.body.data.accessToken).toBeDefined();

    authToken = res.body.data.accessToken;
    tenantId = res.body.data.tenant.id;
    refreshToken = res.body.data.refreshToken;
  });

  it('POST /api/v1/auth/login authenticates registered user and rotates tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'officer@aegis.defense',
        password: 'DefensePass2026!',
        tenantSlug: 'aegis-orbital'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('GET /api/v1/auth/me returns authenticated user identity and active tenant', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('officer@aegis.defense');
    expect(res.body.data.currentTenant.id).toBe(tenantId);
  });

  it('POST /api/v1/users provisions a new user within tenant with RBAC role', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        email: 'analyst@aegis.defense',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'SECURITY_ANALYST',
        permissions: []
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('analyst@aegis.defense');
    expect(res.body.data.role).toBe('SECURITY_ANALYST');
  });

  it('GET /api/v1/audit returns chained audit ledger logs for tenant', async () => {
    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].currentHash).toBeDefined();
  });

  it('GET /api/v1/audit/verify mathematically verifies SHA-256 chain integrity', async () => {
    const res = await request(app)
      .get('/api/v1/audit/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.chainIntegrityStatus).toBe('VERIFIED');
    expect(res.body.data.totalBlocksAudited).toBeGreaterThan(0);
  });

  it('Rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/organizations');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ── Phase 2: Digital Twin Worlds ────────────────────────────────────────
  it('POST /api/v1/worlds creates a new digital twin world with nodes and edges', async () => {
    const res = await request(app)
      .post('/api/v1/worlds')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        name: 'Orbital Defense Grid Alpha',
        description: 'Primary defensive perimeter infrastructure',
        environmentType: 'enterprise_datacenter',
        nodes: [
          {
            nodeId: 'fw-01',
            name: 'Border Firewall',
            type: 'firewall',
            tier: 0,
            status: 'healthy',
            metadata: { ipAddress: '10.0.0.1' }
          },
          {
            nodeId: 'lb-01',
            name: 'Ingress Load Balancer',
            type: 'load_balancer',
            tier: 1,
            status: 'healthy',
            metadata: {}
          },
          {
            nodeId: 'app-01',
            name: 'Auth Service',
            type: 'server',
            tier: 2,
            status: 'healthy',
            metadata: { os: 'Linux', ipAddress: '10.0.2.10' }
          },
          {
            nodeId: 'db-01',
            name: 'Identity Vault',
            type: 'database',
            tier: 3,
            status: 'healthy',
            metadata: { ipAddress: '10.0.3.10' }
          }
        ],
        edges: [
          {
            edgeId: 'e-fw-lb',
            source: 'fw-01',
            target: 'lb-01',
            protocol: 'TLS',
            trafficRateKbps: 1000,
            isEncrypted: true
          },
          {
            edgeId: 'e-lb-app',
            source: 'lb-01',
            target: 'app-01',
            protocol: 'GRPC',
            trafficRateKbps: 500,
            isEncrypted: true
          },
          {
            edgeId: 'e-app-db',
            source: 'app-01',
            target: 'db-01',
            protocol: 'TCP',
            trafficRateKbps: 250,
            isEncrypted: true
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Orbital Defense Grid Alpha');
    expect(res.body.data.nodes).toHaveLength(4);

    worldId = (res.body.data as any)._id || (res.body.data as any).id;
  });

  it('GET /api/v1/worlds/:id retrieves world with nodes and edges', async () => {
    const res = await request(app)
      .get(`/api/v1/worlds/${worldId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nodes).toHaveLength(4);
    expect(res.body.data.edges).toHaveLength(3);
  });

  it('PATCH /api/v1/worlds/:id/nodes/:nodeId/status marks a node as compromised', async () => {
    const res = await request(app)
      .patch(`/api/v1/worlds/${worldId}/nodes/app-01/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({ status: 'compromised' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('compromised');
  });

  it('GET /api/v1/worlds/:id/blast-radius computes threat propagation radius', async () => {
    const res = await request(app)
      .get(`/api/v1/worlds/${worldId}/blast-radius?nodeId=app-01&maxHops=2`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.startNodeId).toBe('app-01');
    expect(res.body.data.impactedNodeIds.length).toBeGreaterThan(0);
    expect(res.body.data.riskScore).toBeGreaterThan(0);
  });

  it('GET /api/v1/worlds/:id/attack-path finds shortest path between two nodes', async () => {
    const res = await request(app)
      .get(`/api/v1/worlds/${worldId}/attack-path?sourceId=fw-01&targetId=db-01`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reachable).toBe(true);
    expect(res.body.data.path).toContain('fw-01');
    expect(res.body.data.path).toContain('db-01');
  });

  it('PATCH /api/v1/worlds/:id/edges/:edgeId/status severs an edge to contain threat', async () => {
    const res = await request(app)
      .patch(`/api/v1/worlds/${worldId}/edges/e-app-db/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({ status: 'severed' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('severed');
  });

  it('Attack path returns unreachable when edge connecting to target is severed', async () => {
    const res = await request(app)
      .get(`/api/v1/worlds/${worldId}/attack-path?sourceId=fw-01&targetId=db-01`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reachable).toBe(false);
    expect(res.body.data.path).toBeNull();
  });

  // ── Phase 3: Multi-Agent AI Society ─────────────────────────────────────
  it('GET /api/v1/agents lists all 5 specialized AI agent personas and tool allowlists', async () => {
    const res = await request(app)
      .get('/api/v1/agents')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(5);

    const roles = res.body.data.map((a: any) => a.role);
    expect(roles).toContain('SOC_TRIAGE');
    expect(roles).toContain('THREAT_HUNTER');
    expect(roles).toContain('INCIDENT_RESPONDER');
    expect(roles).toContain('RED_TEAM_ADVERSARY');
    expect(roles).toContain('POLICY_AUDITOR');
  });

  it('POST /api/v1/agents/incident-workflow runs stateful multi-agent society and halts at HITL gate', async () => {
    const res = await request(app)
      .post('/api/v1/agents/incident-workflow')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        worldId,
        alert: {
          title: 'Suspicious Lateral Movement towards Database',
          description: 'Host app-01 initiated high volume queries towards db-01 with unauthorized admin token',
          sourceNodeId: 'app-01',
          targetNodeId: 'db-01'
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.currentStage).toBe('HITL_APPROVAL_GATE');
    expect(res.body.data.approvalStatus).toBe('PENDING');
    expect(res.body.data.approvalId).toBeDefined();

    approvalRequestId = res.body.data.approvalId;

    // Verify stage reports
    expect(res.body.data.triageReport.severity).toBeDefined();
    expect(res.body.data.threatHuntReport.mitreTechnique).toBeDefined();
    expect(res.body.data.responsePlan.action).toBe('ISOLATE_NODE');
    expect(res.body.data.auditVerdict.compliant).toBe(true);
  });

  it('GET /api/v1/agents/approvals returns pending Human-in-the-Loop requests', async () => {
    const res = await request(app)
      .get('/api/v1/agents/approvals')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const pendingItem = res.body.data.find((item: any) => item.id === approvalRequestId);
    expect(pendingItem).toBeDefined();
    expect(pendingItem.status).toBe('PENDING');
    expect(pendingItem.targetId).toBe('app-01');
  });

  it('POST /api/v1/agents/approvals/:id/decide authorizes containment action', async () => {
    const res = await request(app)
      .post(`/api/v1/agents/approvals/${approvalRequestId}/decide`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        decision: 'APPROVED',
        reason: 'Authorized emergency isolation after SOC triage review'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');

    // Verify node is now isolated in world
    const worldRes = await request(app)
      .get(`/api/v1/worlds/${worldId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    const isolatedNode = worldRes.body.data.nodes.find((n: any) => n.nodeId === 'app-01');
    expect(isolatedNode.status).toBe('isolated');
  });

  it('GET /api/v1/agents/memories retrieves episodic vector memories created by agents', async () => {
    const res = await request(app)
      .get('/api/v1/agents/memories?entityId=app-01')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // ── Phase 4: Real-Time Event Ingestion & Cyber Incidents ───────────────
  it('POST /api/v1/incidents/telemetry/ingest ingests and deduplicates events, generating cyber incident', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/telemetry/ingest')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        events: [
          {
            sourceSystem: 'perimeter-firewall',
            eventType: 'SUSPICIOUS_LATERAL_SMB',
            sourceIp: '198.51.100.12',
            targetNodeId: 'app-01',
            destIp: '10.0.3.10',
            idempotencyKey: 'idemp-telemetry-key-01',
            payload: { bytesSent: 1048576 }
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.batchResult.newEventsCount).toBe(1);
    expect(res.body.data.incidentsCreated.length).toBe(1);

    const inc = res.body.data.incidentsCreated[0];
    expect(inc.affectedNodeIds).toContain('app-01');
    expect(inc.threatActor).toContain('APT29');
    expect(inc.mitreTechnique).toContain('T1021');

    cyberIncidentId = inc.id;
  });

  it('Re-ingesting duplicate telemetry batch produces zero duplicate incidents', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/telemetry/ingest')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        events: [
          {
            sourceSystem: 'perimeter-firewall',
            eventType: 'SUSPICIOUS_LATERAL_SMB',
            sourceIp: '198.51.100.12',
            targetNodeId: 'app-01',
            destIp: '10.0.3.10',
            idempotencyKey: 'idemp-telemetry-key-01',
            payload: { bytesSent: 1048576 }
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.batchResult.duplicateCount).toBe(1);
    expect(res.body.data.batchResult.newEventsCount).toBe(0);
    expect(res.body.data.incidentsCreated.length).toBe(0);
  });

  it('GET /api/v1/incidents retrieves list of correlated incidents', async () => {
    const res = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const target = res.body.data.find((i: any) => i.id === cyberIncidentId);
    expect(target).toBeDefined();
    expect(target.status).toBe('OPEN');
  });

  it('PATCH /api/v1/incidents/:id/status updates incident status', async () => {
    const res = await request(app)
      .patch(`/api/v1/incidents/${cyberIncidentId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({ status: 'INVESTIGATING' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('INVESTIGATING');
  });

  it('POST /api/v1/incidents/:id/triage-with-agents hands off incident to Multi-Agent Society', async () => {
    const res = await request(app)
      .post(`/api/v1/incidents/${cyberIncidentId}/triage-with-agents`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({ worldId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.incidentId).toBe(cyberIncidentId);
    expect(res.body.data.workflowState).toBeDefined();
    expect(res.body.data.workflowState.triageReport).toBeDefined();
    expect(res.body.data.workflowState.responsePlan).toBeDefined();
  });

  // ── Phase 5: Parallel Scenario Simulation & Deterministic Replay ────────────
  it('POST /api/v1/scenarios initializes deterministic simulation scenario', async () => {
    const res = await request(app)
      .post('/api/v1/scenarios')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        worldId,
        name: 'WannaCry Lateral Spread Scenario',
        seed: 777123,
        maxTicks: 8,
        initialThreats: [
          {
            name: 'WannaCry SMB Exploit',
            targetNodeId: 'app-01',
            spreadProbability: 0.8
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.seed).toBe(777123);
    expect(res.body.data.currentTick).toBe(0);
    expect(res.body.data.snapshots.length).toBe(1);

    scenarioId = res.body.data.id;
  }, 30000);

  it('GET /api/v1/scenarios lists active scenarios for tenant', async () => {
    const res = await request(app)
      .get('/api/v1/scenarios')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.some((s: any) => s.id === scenarioId)).toBe(true);
  });

  it('POST /api/v1/scenarios/:id/tick steps simulation forward deterministically', async () => {
    const res = await request(app)
      .post(`/api/v1/scenarios/${scenarioId}/tick`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({ steps: 2 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.scenario.currentTick).toBe(2);
    expect(res.body.data.newSnapshots.length).toBe(2);
    expect(res.body.data.newSnapshots[0].stateHash).toBeDefined();
  });

  it('POST /api/v1/scenarios/:id/actions schedules containment intervention', async () => {
    const res = await request(app)
      .post(`/api/v1/scenarios/${scenarioId}/actions`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        type: 'ISOLATE_NODE',
        targetId: 'app-01',
        scheduledTick: 3
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.type).toBe('ISOLATE_NODE');
  });

  it('POST /api/v1/scenarios/:id/branch creates counterfactual branch at tick T', async () => {
    const res = await request(app)
      .post(`/api/v1/scenarios/${scenarioId}/branch`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        branchTick: 2,
        name: 'Counterfactual: Sever Database Edge',
        actions: [
          {
            type: 'SEVER_EDGE',
            targetId: 'edge-app-db',
            scheduledTick: 3
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.parentId).toBe(scenarioId);
    expect(res.body.data.branchTick).toBe(2);

    branchScenarioId = res.body.data.id;
  });

  it('POST /api/v1/scenarios/:id/run advances scenarios forward', async () => {
    const resA = await request(app)
      .post(`/api/v1/scenarios/${scenarioId}/run`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({ targetTick: 5 });

    expect(resA.status).toBe(200);
    expect(resA.body.data.scenario.currentTick).toBe(5);

    const resB = await request(app)
      .post(`/api/v1/scenarios/${branchScenarioId}/run`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({ targetTick: 5 });

    expect(resB.status).toBe(200);
    expect(resB.body.data.scenario.currentTick).toBe(5);
  });

  it('GET /api/v1/scenarios/:id/replay verifies 100% bit-exact SHA-256 determinism', async () => {
    const res = await request(app)
      .get(`/api/v1/scenarios/${scenarioId}/replay`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verified).toBe(true);
    expect(res.body.data.discrepancies).toHaveLength(0);
    expect(res.body.data.totalTicksVerified).toBe(5);
    expect(res.body.data.finalStateHash).toBeDefined();
  });

  it('POST /api/v1/scenarios/compare detects divergence between parallel branches', async () => {
    const res = await request(app)
      .post('/api/v1/scenarios/compare')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        scenarioAId: scenarioId,
        scenarioBId: branchScenarioId
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.parentScenarioId).toBe(scenarioId);
    expect(res.body.data.branchScenarioId).toBe(branchScenarioId);
    expect(res.body.data.timelineComparison.length).toBeGreaterThan(0);
  });

  // ── Phase 6: Strategy Evaluation & Controlled Self-Improvement ──────────────
  it('POST /api/v1/policies creates versioned defense policy with strict declarative parameters', async () => {
    const res = await request(app)
      .post('/api/v1/policies')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        name: 'Standard Perimeter Containment',
        description: 'Automated host quarantine for high severity lateral movement alerts',
        version: '1.0.0',
        status: 'CANDIDATE',
        parameters: {
          containmentThreshold: 'HIGH',
          maxLateralHops: 2,
          isolationStrategy: 'AGGRESSIVE_ISOLATE',
          requireDualCustodyApproval: false,
          confidenceThreshold: 0.75,
          maxAutonomousSeverances: 3
        },
        changelog: 'Initial baseline production defense policy'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.body.data.status).toBe('CANDIDATE');
    expect(res.body.data.immutableHash).toBeDefined();

    policyId = res.body.data.id;
  });

  it('GET /api/v1/policies lists policies for tenant', async () => {
    const res = await request(app)
      .get('/api/v1/policies')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.some((p: any) => p.id === policyId)).toBe(true);
  });

  it('POST /api/v1/policies/:id/benchmark executes quantitative synthetic benchmark suite', async () => {
    const res = await request(app)
      .post(`/api/v1/policies/${policyId}/benchmark`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCases).toBe(2);
    expect(res.body.data.passedAll).toBe(true);
    expect(res.body.data.compositeScore).toBeGreaterThanOrEqual(75);
    expect(res.body.data.isEligibleForPromotion).toBe(true);
  });

  it('POST /api/v1/policies/:id/promote evaluates promotion gate and promotes policy to ACTIVE', async () => {
    const res = await request(app)
      .post(`/api/v1/policies/${policyId}/promote`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.promoted).toBe(true);
    expect(res.body.data.policy.status).toBe('ACTIVE');
  });

  it('GET /api/v1/policies/active retrieves current active production policy', async () => {
    const res = await request(app)
      .get('/api/v1/policies/active')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(policyId);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.version).toBe('1.0.0');
  });

  it('POST /api/v1/policies/:id/optimize synthesizes controlled candidate policy from operational metrics', async () => {
    const res = await request(app)
      .post(`/api/v1/policies/${policyId}/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        meanMTTC: 4.2,
        meanResilience: 72,
        containmentFailureRate: 0.12
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.suggestedVersion).toBe('1.1.0');
    expect(res.body.data.candidateDraft).toBeDefined();
    expect(res.body.data.candidateDraft.status).toBe('CANDIDATE');

    candidatePolicyId = res.body.data.candidateDraft.id;
  });

  it('POST /api/v1/policies/:id/compare-ab runs A/B benchmark evaluation comparing candidate against active baseline', async () => {
    const res = await request(app)
      .post(`/api/v1/policies/${candidatePolicyId}/compare-ab`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activePolicyId).toBe(policyId);
    expect(res.body.data.candidatePolicyId).toBe(candidatePolicyId);
    expect(res.body.data.recommendation).toBeDefined();
    expect(['PROMOTE', 'REVISE']).toContain(res.body.data.recommendation);
  });

  // ── Phase 7: Natural-Language World Creation & Workflow Automation ─────────
  it('POST /api/v1/workflows/generate-world creates validated 3D digital twin world from NL description', async () => {
    const res = await request(app)
      .post('/api/v1/workflows/generate-world')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        prompt: 'Generate a global cloud banking architecture with api-gateway, auth-service, core-ledger, and postgresql database cluster across us-east and eu-central',
        preferredEnvironment: 'CLOUD'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.world).toBeDefined();
    expect(res.body.data.generated.nodes.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data.generated.edges.length).toBeGreaterThanOrEqual(3);

    // Verify all nodes have 3D coordinates calculated
    for (const node of res.body.data.generated.nodes) {
      expect(node.position).toBeDefined();
      expect(typeof node.position.x).toBe('number');
      expect(typeof node.position.y).toBe('number');
      expect(typeof node.position.z).toBe('number');
    }
  });

  it('POST /api/v1/workflows/playbooks/ransomware creates 7-step containment playbook with dual-custody gate', async () => {
    const res = await request(app)
      .post('/api/v1/workflows/playbooks/ransomware')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        targetNodeId: 'node-app-cluster',
        edgeId: 'edge-app-db'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.steps).toHaveLength(7);

    // Step 4 must be dual-custody human approval gate
    const gateStep = res.body.data.steps[3];
    expect(gateStep.type).toBe('HUMAN_APPROVAL_GATE');
    expect(gateStep.requiresDualApproval).toBe(true);
    expect(gateStep.riskLevel).toBe('CRITICAL');

    workflowId = res.body.data.id;
  });

  it('GET /api/v1/workflows lists active workflows for tenant', async () => {
    const res = await request(app)
      .get('/api/v1/workflows')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some((w: any) => w.id === workflowId)).toBe(true);
  });

  it('GET /api/v1/workflows/:id retrieves single workflow instance', async () => {
    const res = await request(app)
      .get(`/api/v1/workflows/${workflowId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(workflowId);
    expect(res.body.data.status).toBe('IDLE');
  });

  it('POST /api/v1/workflows/:id/start advances automated steps up to Step 4 and halts at gate', async () => {
    const res = await request(app)
      .post(`/api/v1/workflows/${workflowId}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.haltedAtGate).toBe(true);
    expect(res.body.data.instance.status).toBe('WAITING_FOR_APPROVAL');
    expect(res.body.data.instance.currentStepIndex).toBe(3); // Paused at step index 3 (Step 4)

    // First 3 steps should be completed
    expect(res.body.data.instance.steps[0].status).toBe('COMPLETED');
    expect(res.body.data.instance.steps[1].status).toBe('COMPLETED');
    expect(res.body.data.instance.steps[2].status).toBe('COMPLETED');
    expect(res.body.data.instance.steps[3].status).toBe('PAUSED');
  });

  it('POST /api/v1/workflows/:id/approve records first signoff and keeps workflow paused for dual-custody', async () => {
    const res = await request(app)
      .post(`/api/v1/workflows/${workflowId}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        decision: 'APPROVED',
        comment: 'Primary Officer approval for containment severance'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.haltedAtGate).toBe(true);
    expect(res.body.data.instance.status).toBe('WAITING_FOR_APPROVAL');
    expect(res.body.data.instance.currentStepIndex).toBe(3);
    expect(res.body.data.instance.steps[3].approvals).toHaveLength(1);
    expect(res.body.data.instance.steps[3].approvals[0].decision).toBe('APPROVED');
  });

  it('provisions second commander user to fulfill dual-custody requirements', async () => {
    // 1. Provision commander user
    const inviteRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        email: 'commander@aegis.defense',
        firstName: 'Sarah',
        lastName: 'Connor',
        role: 'ORG_ADMIN',
        permissions: []
      });

    expect(inviteRes.status).toBe(201);

    // 2. Login commander
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'commander@aegis.defense',
        password: 'NexusTemporaryPass2026!',
        tenantSlug: 'aegis-orbital'
      });

    expect(loginRes.status).toBe(200);
    commanderToken = loginRes.body.data.accessToken;
    expect(commanderToken).toBeDefined();
  });

  it('POST /api/v1/workflows/:id/approve records second signoff, satisfies dual-custody, and finishes execution', async () => {
    const res = await request(app)
      .post(`/api/v1/workflows/${workflowId}/approve`)
      .set('Authorization', `Bearer ${commanderToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        decision: 'APPROVED',
        comment: 'Secondary Commander dual-custody authorization confirmed'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.haltedAtGate).toBe(false);
    expect(res.body.data.instance.status).toBe('COMPLETED');
    expect(res.body.data.instance.steps[3].approvals).toHaveLength(2);
    expect(res.body.data.instance.auditProofHash).toBeDefined();
    expect(res.body.data.instance.auditProofHash).toHaveLength(64);

    // All steps should now be COMPLETED
    for (const step of res.body.data.instance.steps) {
      expect(step.status).toBe('COMPLETED');
    }
  });

  it('POST /api/v1/workflows/:id/abort allows authorized operator to abort an active workflow', async () => {
    // Create new playbook to abort
    const createRes = await request(app)
      .post('/api/v1/workflows/playbooks/ransomware')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        targetNodeId: 'node-db-01'
      });

    const abortWorkflowId = createRes.body.data.id;

    // Start workflow
    await request(app)
      .post(`/api/v1/workflows/${abortWorkflowId}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    // Abort workflow
    const abortRes = await request(app)
      .post(`/api/v1/workflows/${abortWorkflowId}/abort`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        reason: 'Operator manual override: false positive lateral threat'
      });

    expect(abortRes.status).toBe(200);
    expect(abortRes.body.success).toBe(true);
    expect(abortRes.body.data.status).toBe('ABORTED');
  });

  // ── Phase 8: Evidence-Based AI Governance & Tamper-Evident Audit Vault ─────
  it('GET /api/v1/audit/merkle-root returns computed Merkle tree root for tenant', async () => {
    const res = await request(app)
      .get('/api/v1/audit/merkle-root')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.merkleRoot).toBeDefined();
    expect(res.body.data.merkleRoot).toHaveLength(64);
    expect(res.body.data.totalLeaves).toBeGreaterThanOrEqual(1);
    expect(res.body.data.tenantId).toBe(tenantId);
  });

  it('GET /api/v1/audit/merkle-proof/:sequenceNumber generates cryptographic inclusion proof', async () => {
    const res = await request(app)
      .get('/api/v1/audit/merkle-proof/1')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sequenceNumber).toBe(1);
    expect(res.body.data.record).toBeDefined();
    expect(res.body.data.proof).toBeDefined();
    expect(res.body.data.proof.leaf).toBeDefined();
    expect(res.body.data.proof.root).toBeDefined();
    expect(res.body.data.proof.index).toBe(0);
    expect(Array.isArray(res.body.data.proof.proof)).toBe(true);

    savedMerkleProof = res.body.data.proof;
  });

  it('POST /api/v1/audit/verify-proof mathematically verifies valid Merkle inclusion proof', async () => {
    const res = await request(app)
      .post('/api/v1/audit/verify-proof')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send(savedMerkleProof);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isValid).toBe(true);
  });

  it('POST /api/v1/audit/verify-proof detects counterfeit/tampered leaf in proof', async () => {
    const fakeProof = {
      ...savedMerkleProof,
      leaf: '0000000000000000000000000000000000000000000000000000000000000001'
    };

    const res = await request(app)
      .post('/api/v1/audit/verify-proof')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId)
      .send(fakeProof);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isValid).toBe(false);
  });

  it('GET /api/v1/audit/compliance-report generates exportable SOC2 compliance attestation', async () => {
    const res = await request(app)
      .get('/api/v1/audit/compliance-report?framework=SOC2')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.framework).toBe('SOC2');
    expect(res.body.data.overallStatus).toBeDefined();
    expect(res.body.data.complianceScore).toBeGreaterThanOrEqual(60);
    expect(res.body.data.controls).toHaveLength(5);
    expect(res.body.data.merkleRoot).toBeDefined();
    expect(res.body.data.attestationHash).toBeDefined();
    expect(res.body.data.attestationHash).toHaveLength(64);
  });

  it('GET /api/v1/audit/compliance-report generates exportable NIST AI RMF report', async () => {
    const res = await request(app)
      .get('/api/v1/audit/compliance-report?framework=NIST_AI_RMF')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.framework).toBe('NIST_AI_RMF');
    expect(res.body.data.controls.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data.controls.some((c: any) => c.controlId === 'GOVERN_1.1')).toBe(true);
    expect(res.body.data.controls.some((c: any) => c.controlId === 'MEASURE_2.6')).toBe(true);
  });
});
