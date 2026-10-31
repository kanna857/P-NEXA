import { describe, it, expect, beforeEach } from 'vitest';
import { EventStore, computeEventIdempotencyKey } from './index.js';

describe('Event Store — Idempotent Ingestion Pipeline', () => {
  let eventStore: EventStore;

  beforeEach(() => {
    eventStore = new EventStore(60); // 60-minute window
  });

  it('computeEventIdempotencyKey generates deterministic SHA-256 hash regardless of payload key order', () => {
    const p1 = { a: 1, b: 2, c: 'data' };
    const p2 = { c: 'data', b: 2, a: 1 };

    const key1 = computeEventIdempotencyKey('tenant-1', 'syslog', 'netflow', p1, '2026-10-30T10:00:00Z');
    const key2 = computeEventIdempotencyKey('tenant-1', 'syslog', 'netflow', p2, '2026-10-30T10:00:00Z');

    expect(key1).toEqual(key2);
    expect(key1.length).toBe(64); // SHA-256 hex length
  });

  it('ingests a single event and returns a unique eventId', async () => {
    const res = await eventStore.ingestEvent({
      tenantId: 'tenant-omega',
      type: 'FIREWALL_ALERT',
      source: 'fw-edge-01',
      payload: { blockedIp: '198.51.100.12', port: 443 }
    });

    expect(res.eventId).toBeDefined();
    expect(res.isDuplicate).toBe(false);
    expect(eventStore.getCount('tenant-omega')).toBe(1);
  });

  it('identifies and prevents duplicate processing when the exact same event arrives again', async () => {
    const eventPayload = {
      tenantId: 'tenant-omega',
      type: 'AUTH_FAILED',
      source: 'auth-service-01',
      idempotencyKey: 'custom-idemp-key-999',
      payload: { user: 'root', ip: '203.0.113.5' }
    };

    const firstRun = await eventStore.ingestEvent(eventPayload);
    expect(firstRun.isDuplicate).toBe(false);

    // Ingest identical event with same idempotency key
    const secondRun = await eventStore.ingestEvent(eventPayload);
    expect(secondRun.isDuplicate).toBe(true);
    expect(secondRun.eventId).toBe(firstRun.eventId);

    // Event count must still remain 1 (no duplicate storage)
    expect(eventStore.getCount('tenant-omega')).toBe(1);
  });

  it('processes high-throughput batch ingestion (>1,000 events/sec) with zero duplicate processing', async () => {
    const tenantId = 'tenant-high-throughput';
    const batchSize = 2000;
    const events = [];

    // Create 2000 events (1500 unique, 500 duplicates of first 500)
    for (let i = 0; i < 1500; i++) {
      events.push({
        tenantId,
        type: 'NETFLOW_TELEMETRY',
        source: `sensor-${i % 10}`,
        idempotencyKey: `idemp-event-${i}`,
        payload: { packets: 100 + i, bytes: 50000 + i * 10 }
      });
    }

    // Add 500 duplicates
    for (let i = 0; i < 500; i++) {
      events.push({
        tenantId,
        type: 'NETFLOW_TELEMETRY',
        source: `sensor-${i % 10}`,
        idempotencyKey: `idemp-event-${i}`, // duplicate of item i
        payload: { packets: 100 + i, bytes: 50000 + i * 10 }
      });
    }

    const batchResult = await eventStore.ingestBatch(events);

    expect(batchResult.totalProcessed).toBe(2000);
    expect(batchResult.newEventsCount).toBe(1500);
    expect(batchResult.duplicateCount).toBe(500);
    // Acceptance criteria: > 1,000 events/sec ingestion throughput
    expect(batchResult.throughputEventsPerSec).toBeGreaterThan(1000);
    expect(eventStore.getCount(tenantId)).toBe(1500);
  });

  it('maintains strict multi-tenant isolation in queries', async () => {
    await eventStore.ingestEvent({
      tenantId: 'tenant-a',
      type: 'DNS_QUERY',
      source: 'dns-resolver',
      payload: { domain: 'evil-command-control.xyz' }
    });

    await eventStore.ingestEvent({
      tenantId: 'tenant-b',
      type: 'DNS_QUERY',
      source: 'dns-resolver',
      payload: { domain: 'internal-portal.local' }
    });

    const tenantAEvents = await eventStore.queryEvents('tenant-a');
    expect(tenantAEvents.length).toBe(1);
    expect(tenantAEvents[0]!.payload['domain']).toBe('evil-command-control.xyz');

    const tenantBEvents = await eventStore.queryEvents('tenant-b');
    expect(tenantBEvents.length).toBe(1);
    expect(tenantBEvents[0]!.payload['domain']).toBe('internal-portal.local');
  });

  it('filters queries by event type and source', async () => {
    const tenantId = 'tenant-filters';

    await eventStore.ingestEvent({
      tenantId,
      type: 'PORT_SCAN',
      source: 'sensor-east',
      payload: { portsScanned: [22, 80, 443] }
    });

    await eventStore.ingestEvent({
      tenantId,
      type: 'SSH_LOGIN',
      source: 'sensor-east',
      payload: { user: 'ubuntu' }
    });

    await eventStore.ingestEvent({
      tenantId,
      type: 'PORT_SCAN',
      source: 'sensor-west',
      payload: { portsScanned: [8080, 8443] }
    });

    const portScans = await eventStore.queryEvents(tenantId, { type: 'PORT_SCAN' });
    expect(portScans.length).toBe(2);

    const eastPortScans = await eventStore.queryEvents(tenantId, {
      type: 'PORT_SCAN',
      source: 'sensor-east'
    });
    expect(eastPortScans.length).toBe(1);
  });
});

