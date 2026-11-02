import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import { signAccessToken } from '../services/authService.js';
import { SystemRoles } from '@nexus/shared';

describe('Developer Harness & Munder Difflin API Security Suite', () => {
  let app: ReturnType<typeof createApp>['app'];
  let superAdminToken: string;
  let orgAdminToken: string;
  let viewerToken: string;
  let testTenantId: string;

  beforeAll(async () => {
    process.env.ALLOW_MEMORY_FALLBACK = 'true';
    await connectDatabase();
    const serverInstance = createApp();
    app = serverInstance.app;

    const uniqueSlug = `dev-test-${Date.now()}`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `admin@${uniqueSlug}.ai`,
        password: 'AdminPassword2026!',
        firstName: 'Alex',
        lastName: 'Kumar',
        organizationName: 'Nexus Developer Lab',
        organizationSlug: uniqueSlug
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);

    testTenantId = regRes.body.data.tenant.id;
    superAdminToken = regRes.body.data.accessToken;

    orgAdminToken = signAccessToken({
      userId: 'admin-org-01',
      tenantId: testTenantId,
      email: `orgadmin@${uniqueSlug}.ai`,
      role: SystemRoles.ORG_ADMIN,
      permissions: ['manage:agents', 'execute:tasks']
    });

    viewerToken = signAccessToken({
      userId: 'user-viewer-01',
      tenantId: testTenantId,
      email: `viewer@${uniqueSlug}.ai`,
      role: SystemRoles.VIEWER,
      permissions: ['read:all']
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  // ── Authentication & RBAC Authorization Tests ─────────────────────────────
  it('blocks unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/developer/health');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('blocks non-admin users with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/developer/health')
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-tenant-id', testTenantId);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('permits authorized admin to query health and verifies 283 Agency Agents roster', async () => {
    const res = await request(app)
      .get('/api/v1/developer/health')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', testTenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('OPERATIONAL');
    expect(res.body.data.totalAgencyAgents).toBe(283);
    expect(res.body.data.singleCommitterRails).toBe(true);
  });

  it('permits ORG_ADMIN to query full agent catalog and filters by division', async () => {
    const res = await request(app)
      .get('/api/v1/developer/agents?division=spatial-computing')
      .set('Authorization', `Bearer ${orgAdminToken}`)
      .set('x-tenant-id', testTenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.registryTotal).toBe(283);
    expect(res.body.data.agents.length).toBeGreaterThan(0);
    expect(res.body.data.agents.every((a: any) => a.division === 'spatial-computing')).toBe(true);
  });

  it('inspects a single agent and loads skill instructions securely', async () => {
    const res = await request(app)
      .get('/api/v1/developer/agents/agency-3d-scene-developer')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', testTenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('agency-3d-scene-developer');
    expect(res.body.data.skillInstructions).toContain('3DSceneDeveloper');
  });

  // ── Task Creation, Execution, Timeline, and Approval Workflow ─────────────
  let createdTaskId = '';

  it('rejects destructive commands in task creation with 400 ValidationError', async () => {
    const res = await request(app)
      .post('/api/v1/developer/tasks')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', testTenantId)
      .send({
        prompt: 'rm -rf / --no-preserve-root',
        title: 'Malicious Operation'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('creates a legitimate development task with isolated worktree and initial timeline events', async () => {
    const res = await request(app)
      .post('/api/v1/developer/tasks')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', testTenantId)
      .send({
        prompt: 'Implement live Agent Execution Timeline for developer dashboard',
        title: 'Live Agent Execution Timeline',
        priority: 'HIGH'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toMatch(/^MD-TASK-/);
    expect(res.body.data.worktree.branchName).toContain('feat/agent-task');
    expect(res.body.data.timeline.length).toBeGreaterThanOrEqual(2);

    createdTaskId = res.body.data.id;
  });

  it('executes the multi-agent task and advances stages through code review, security review, and tests', async () => {
    const res = await request(app)
      .post(`/api/v1/developer/tasks/${createdTaskId}/execute`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', testTenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('AWAITING_APPROVAL');
    expect(res.body.data.codeReview.passed).toBe(true);
    expect(res.body.data.securityReview.passed).toBe(true);
    expect(res.body.data.testResults.passed).toBe(true);
    expect(res.body.data.timeline.length).toBeGreaterThanOrEqual(6);
  });

  it('queries the live Agent Execution Timeline endpoint with filters', async () => {
    const res = await request(app)
      .get(`/api/v1/developer/timeline?taskId=${createdTaskId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', testTenantId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.events.length).toBeGreaterThanOrEqual(6);
    expect(res.body.data.events.every((e: any) => e.taskId === createdTaskId)).toBe(true);

    // Verify filter by status
    const completedRes = await request(app)
      .get(`/api/v1/developer/timeline?taskId=${createdTaskId}&status=completed`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', testTenantId);

    expect(completedRes.status).toBe(200);
    expect(completedRes.body.data.events.every((e: any) => e.status === 'COMPLETED')).toBe(true);
  });

  it('records human approval decision and cleans up isolated worktree', async () => {
    const res = await request(app)
      .post(`/api/v1/developer/tasks/${createdTaskId}/approval`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', testTenantId)
      .send({
        decision: 'APPROVE',
        comment: 'All security audits and automated tests passed cleanly.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.worktree.isCleanedUp).toBe(true);
  });

  it('cancels a development task safely, pruning branch and recording cancellation event', async () => {
    // Create new task to cancel
    const createRes = await request(app)
      .post('/api/v1/developer/tasks')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', testTenantId)
      .send({
        prompt: 'Experimental feature to cancel',
        title: 'Cancel Me'
      });

    const taskIdToCancel = createRes.body.data.id;

    const cancelRes = await request(app)
      .post(`/api/v1/developer/tasks/${taskIdToCancel}/cancel`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', testTenantId)
      .send({
        reason: 'Feature deprecated by product team'
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.worktree.isCleanedUp).toBe(true);

    // Verify cancellation timeline event was captured
    const cancelEvent = cancelRes.body.data.timeline.find((e: any) => e.status === 'CANCELLED');
    expect(cancelEvent).toBeDefined();
    expect(cancelEvent.errorDetails.message).toContain('Feature deprecated');
  }, 35000);
});
