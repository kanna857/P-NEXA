import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import { signAccessToken } from '../services/authService.js';
import { SystemRoles } from '@nexus/shared';
import { defaultTelemetryService } from '../services/telemetryService.js';
import { defaultPredictiveEngine } from '@nexus/cyber-engine';

describe('Phase 5 — Telemetry Ingestion, Predictive Intelligence & Live Sync Suite', () => {
  let app: ReturnType<typeof createApp>['app'];
  let adminToken: string;
  let foreignTenantToken: string;
  let testTenantId: string;
  let foreignTenantId: string;

  beforeAll(async () => {
    process.env.ALLOW_MEMORY_FALLBACK = 'true';
    await connectDatabase();
    const serverInstance = createApp();
    app = serverInstance.app;

    const uniqueSlug = `telemetry-test-${Date.now()}`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `telemetry-admin@${uniqueSlug}.ai`,
        password: 'AdminPassword2026!',
        firstName: 'Marcus',
        lastName: 'Vance',
        organizationName: 'Nexus Streaming Complex',
        organizationSlug: uniqueSlug
      });

    expect(regRes.status).toBe(201);
    testTenantId = regRes.body.data.tenant.id;
    adminToken = regRes.body.data.accessToken;

    const foreignSlug = `foreign-test-${Date.now()}`;
    const regRes2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `foreign-admin@${foreignSlug}.ai`,
        password: 'AdminPassword2026!',
        firstName: 'Elena',
        lastName: 'Foreign',
        organizationName: 'Foreign Enterprise Complex',
        organizationSlug: foreignSlug
      });

    expect(regRes2.status).toBe(201);
    foreignTenantId = regRes2.body.data.tenant.id;
    foreignTenantToken = regRes2.body.data.accessToken;
  });

  afterAll(async () => {
    defaultTelemetryService.clear();
    defaultPredictiveEngine.clear();
    await disconnectDatabase();
  });

  describe('Telemetry Schema Validation & Ingestion', () => {
    it('rejects invalid telemetry events missing required entityId or with invalid metrics', async () => {
      const res = await request(app)
        .post('/api/v1/telemetry/ingest')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenantId)
        .send({
          source: 'system_agent',
          category: 'system_metrics',
          metrics: { cpu: 150 } // Invalid: CPU exceeds 100%
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('ingests a valid telemetry event and computes live entity health score', async () => {
      const res = await request(app)
        .post('/api/v1/telemetry/ingest')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenantId)
        .send({
          entityId: 'srv-auth',
          source: 'system_agent',
          mode: 'connected',
          category: 'system_metrics',
          metrics: { cpu: 22.5, memory: 34.0, disk: 45.0, networkInKbps: 1200 },
          status: 'healthy'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.result.isDuplicate).toBe(false);
      expect(res.body.result.eventId).toBeDefined();

      // Check entity live state
      const entRes = await request(app)
        .get('/api/v1/telemetry/entities')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenantId);

      expect(entRes.status).toBe(200);
      expect(entRes.body.entities.length).toBeGreaterThanOrEqual(1);
      const authEntity = entRes.body.entities.find((e: any) => e.entityId === 'srv-auth');
      expect(authEntity).toBeDefined();
      expect(authEntity.status).toBe('healthy');
      expect(authEntity.healthScore).toBeGreaterThanOrEqual(80);
      expect(authEntity.freshness).toBe('LIVE');
    });

    it('idempotently deduplicates identical telemetry events without double processing', async () => {
      const fixedTimestamp = new Date().toISOString();
      const payload = {
        id: `fixed-evt-dedup-${Date.now()}`,
        entityId: 'srv-api',
        source: 'system_agent',
        category: 'system_metrics',
        timestamp: fixedTimestamp,
        metrics: { cpu: 45.0, memory: 50.0 },
        status: 'healthy'
      };

      // Ingest 1
      const res1 = await request(app)
        .post('/api/v1/telemetry/ingest')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenantId)
        .send(payload);

      expect(res1.status).toBe(201);
      expect(res1.body.result.isDuplicate).toBe(false);

      // Ingest 2 with same idempotency payload
      const res2 = await request(app)
        .post('/api/v1/telemetry/ingest')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenantId)
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.result.isDuplicate).toBe(true);
    });

    it('enforces strict cross-tenant telemetry isolation', async () => {
      // Foreign tenant queries telemetry
      const res = await request(app)
        .get('/api/v1/telemetry/entities')
        .set('Authorization', `Bearer ${foreignTenantToken}`)
        .set('x-tenant-id', foreignTenantId);

      expect(res.status).toBe(200);
      // Must not see testTenantId's entities
      const leaked = res.body.entities.find((e: any) => e.tenantId === testTenantId);
      expect(leaked).toBeUndefined();
    });

    it('ingests high-throughput batch of telemetry events', async () => {
      const batchEvents = [
        {
          entityId: 'fw-border',
          source: 'network_probe',
          category: 'network_traffic',
          metrics: { networkInKbps: 5400, activeConnections: 120 },
          status: 'healthy'
        },
        {
          entityId: 'db-mongo',
          source: 'system_agent',
          category: 'system_metrics',
          metrics: { cpu: 38.0, memory: 62.0 },
          status: 'healthy'
        }
      ];

      const res = await request(app)
        .post('/api/v1/telemetry/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenantId)
        .send({
          tenantId: testTenantId,
          mode: 'demo',
          events: batchEvents
        });

      expect(res.status).toBe(200);
      expect(res.body.report.total).toBe(2);
      expect(res.body.report.ingested).toBe(2);
      expect(res.body.report.duplicates).toBe(0);
    });
  });

  describe('Predictive Intelligence & Automated Council Investigation', () => {
    it('detects a statistically anomalous metric surge and triggers automated Council investigation', async () => {
      const entityId = 'srv-auth-surge';

      // 1. Ingest stable baseline samples
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/v1/telemetry/ingest')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', testTenantId)
          .send({
            entityId,
            source: 'system_agent',
            category: 'system_metrics',
            metrics: { cpu: 32 + (i % 3), memory: 40 },
            status: 'healthy'
          });
      }

      // 2. Ingest critical surge event
      const surgeRes = await request(app)
        .post('/api/v1/telemetry/ingest')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenantId)
        .send({
          entityId,
          source: 'system_agent',
          category: 'system_metrics',
          metrics: { cpu: 98.2, memory: 96.0, authFailures: 25 },
          status: 'compromised'
        });

      expect(surgeRes.status).toBe(201);
      expect(surgeRes.body.result.isAnomaly).toBe(true);
      expect(surgeRes.body.result.anomalyFinding).toBeDefined();
      expect(surgeRes.body.result.anomalyFinding.zScore).toBeGreaterThan(2.0);
      expect(surgeRes.body.result.investigationTriggered).toBe(true);
      expect(surgeRes.body.result.investigationId).toBeDefined();

      // 3. Verify immediate consecutive spike is throttled by cooldown
      const secondSurge = await request(app)
        .post('/api/v1/telemetry/ingest')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenantId)
        .send({
          entityId,
          source: 'system_agent',
          category: 'system_metrics',
          metrics: { cpu: 97.0, memory: 95.0 },
          status: 'compromised'
        });

      expect(secondSurge.body.result.investigationTriggered).toBe(false); // Cooldown prevented duplicate
    });

    it('generates multi-step linear trend forecast with calibrated confidence bounds via predictive API', async () => {
      const res = await request(app)
        .post('/api/v1/predictive/forecast')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenantId)
        .send({
          entityId: 'srv-forecast',
          metric: 'cpu',
          horizonSteps: 6,
          stepIntervalSec: 15,
          historicalValues: [25, 28, 32, 35, 39, 44]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.forecast.length).toBe(6);
      expect(res.body.forecast[0].projectedValue).toBeGreaterThan(44);
      expect(res.body.forecast[0].lowerBound).toBeLessThan(res.body.forecast[0].projectedValue);
      expect(res.body.forecast[0].upperBound).toBeGreaterThan(res.body.forecast[0].projectedValue);
    });

    it('executes full end-to-end demo scenario with Council dossier generation', async () => {
      const res = await request(app)
        .post('/api/v1/telemetry/demo-scenario')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenantId)
        .send({
          entityId: 'srv-demo-cluster'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.scenario).toContain('End-to-End');
      expect(res.body.investigationId).toBeDefined();
      expect(res.body.anomaly).toBeDefined();
      expect(res.body.recommendedPlan).toBeDefined();
    });
  });
});

