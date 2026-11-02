import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import { signAccessToken } from '../services/authService.js';
import { SystemRoles } from '@nexus/shared';

describe('Phase 4 — Council API Gateway & Investigation Suite', () => {
  let app: ReturnType<typeof createApp>['app'];
  let adminToken: string;
  let viewerToken: string;
  let foreignTenantToken: string;
  let foreignTenantId: string;
  let testTenantId: string;
  let createdInvestigationId: string;

  beforeAll(async () => {
    process.env.ALLOW_MEMORY_FALLBACK = 'true';
    await connectDatabase();
    const serverInstance = createApp();
    app = serverInstance.app;

    const uniqueSlug = `council-test-${Date.now()}`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `admin@${uniqueSlug}.ai`,
        password: 'AdminPassword2026!',
        firstName: 'Elena',
        lastName: 'Rostova',
        organizationName: 'Nexus Defense Council',
        organizationSlug: uniqueSlug
      });

    expect(regRes.status).toBe(201);
    testTenantId = regRes.body.data.tenant.id;
    adminToken = regRes.body.data.accessToken;

    viewerToken = signAccessToken({
      userId: 'user-viewer-01',
      tenantId: testTenantId,
      email: `viewer@${uniqueSlug}.ai`,
      role: SystemRoles.VIEWER,
      permissions: ['read:all']
    });

    const foreignSlug = `foreign-test-${Date.now()}`;
    const foreignRegRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `admin@${foreignSlug}.ai`,
        password: 'AdminPassword2026!',
        firstName: 'Foreign',
        lastName: 'Admin',
        organizationName: 'Foreign Org',
        organizationSlug: foreignSlug
      });

    expect(foreignRegRes.status).toBe(201);
    foreignTenantId = foreignRegRes.body.data.tenant.id;
    foreignTenantToken = foreignRegRes.body.data.accessToken;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('rejects unauthenticated requests to /council/investigations', async () => {
    const res = await request(app).post('/api/v1/council/investigations').send({
      entityId: 'srv-auth'
    });
    expect(res.status).toBe(401);
  });

  it('creates and executes a real Council investigation with all 5 runtime agents', async () => {
    const res = await request(app)
      .post('/api/v1/council/investigations')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', testTenantId)
      .send({
        entityId: 'srv-auth',
        entityName: 'Authentication Node',
        worldId: 'world-campus-01',
        customTelemetry: {
          cpuUsage: 94,
          memoryUsage: 96,
          ipAddress: '10.2.0.10'
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const dossier = res.body.dossier;
    expect(dossier.investigationId).toBeDefined();
    expect(dossier.targetEntity.id).toBe('srv-auth');
    expect(dossier.status).toBe('AWAITING_APPROVAL');

    // 5 agents evidence
    expect(dossier.evidence.observedFacts.length).toBeGreaterThanOrEqual(3);
    expect(dossier.threatAssessment.severity).toBe('CRITICAL');
    expect(dossier.simulation.isSimulatedProjection).toBe(true);
    expect(dossier.recommendedPlan.action).toBe('ISOLATE_NODE');
    expect(dossier.reviewerVerdict.status).toBe('APPROVED_FOR_PRESENTATION');
    expect(dossier.cryptographicProof.sha256Hash).toBeDefined();

    createdInvestigationId = dossier.investigationId;
  });

  it('retrieves the active investigation list for the tenant', async () => {
    const res = await request(app)
      .get('/api/v1/council/investigations')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', testTenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.investigations.some((i: any) => i.investigationId === createdInvestigationId)).toBe(true);
  });

  it('retrieves single investigation details by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/council/investigations/${createdInvestigationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', testTenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dossier.investigationId).toBe(createdInvestigationId);
  });

  it('retrieves chronological lifecycle events for the investigation', async () => {
    const res = await request(app)
      .get(`/api/v1/council/investigations/${createdInvestigationId}/events`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', testTenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(5);
    expect(res.body.events[0].investigationId).toBe(createdInvestigationId);
  });

  it('blocks cross-tenant access to investigation details', async () => {
    const res = await request(app)
      .get(`/api/v1/council/investigations/${createdInvestigationId}`)
      .set('Authorization', `Bearer ${foreignTenantToken}`)
      .set('x-tenant-id', foreignTenantId);

    expect(res.status).toBe(403);
  });

  it('enforces human authorization approval gate (non-admin rejected)', async () => {
    // Non-admin viewer tries to approve
    const viewerRes = await request(app)
      .post(`/api/v1/council/investigations/${createdInvestigationId}/approve`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-tenant-id', testTenantId)
      .send({ comments: 'Attempted viewer signoff' });

    expect(viewerRes.status).toBe(403);

    // Authorized Admin approves
    const adminRes = await request(app)
      .post(`/api/v1/council/investigations/${createdInvestigationId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', testTenantId)
      .send({ comments: 'Dual-custody verification signed by Commander' });

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);
    expect(adminRes.body.dossier.status).toBe('APPROVED');
    expect(adminRes.body.dossier.humanApproval.approvedBy).toBeDefined();
  });

  it('supports investigation rejection with operator rationale', async () => {
    // Create new investigation
    const createRes = await request(app)
      .post('/api/v1/council/investigations')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', testTenantId)
      .send({
        entityId: 'srv-db-replica',
        entityName: 'Database Standby Replica',
        worldId: 'world-campus-01'
      });

    const invId = createRes.body.dossier.investigationId;

    const rejectRes = await request(app)
      .post(`/api/v1/council/investigations/${invId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', testTenantId)
      .send({ reason: 'Downtime risk too elevated during operational window' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.success).toBe(true);
    expect(rejectRes.body.dossier.status).toBe('REJECTED');
  });

  it('cancels an active investigation safely', async () => {
    const createRes = await request(app)
      .post('/api/v1/council/investigations')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', testTenantId)
      .send({
        entityId: 'edge-switch-01',
        worldId: 'world-campus-01'
      });

    const invId = createRes.body.dossier.investigationId;

    const cancelRes = await request(app)
      .post(`/api/v1/council/investigations/${invId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', testTenantId)
      .send({ reason: 'Manual abort by operator' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.investigationId).toBe(invId);
  });

  it('retrieves entity investigation history', async () => {
    const res = await request(app)
      .get('/api/v1/council/entities/srv-auth/history')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', testTenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.entityId).toBe('srv-auth');
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });
});
