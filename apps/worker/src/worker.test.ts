import { describe, it, expect, beforeEach } from 'vitest';
import { processTelemetryBatch } from './index.js';
import { defaultEventStore } from '@nexus/event-store';
import { defaultIncidentManager, RawTelemetryEvent } from '@nexus/cyber-engine';

describe('Cyber Intelligence Worker — Ingestion & Incident Aggregation Pipeline', () => {
  beforeEach(() => {
    defaultEventStore.clear();
    defaultIncidentManager.clear();
  });

  it('ingests and normalizes telemetry events, correlating them into cyber incidents', async () => {
    const events: RawTelemetryEvent[] = [
      {
        tenantId: 'tenant-omega',
        sourceSystem: 'edr-collector',
        eventType: 'SUSPICIOUS_REMOTE_EXEC',
        targetNodeId: 'app-01',
        sourceIp: '198.51.100.12',
        payload: { command: 'psexec.exe \\\\db-01' }
      },
      {
        tenantId: 'tenant-omega',
        sourceSystem: 'netflow-collector',
        eventType: 'SMB_LATERAL_BURST',
        targetNodeId: 'app-01',
        destIp: '10.0.3.10',
        payload: { bytesSent: 204800 }
      }
    ];

    const report = await processTelemetryBatch(events);

    expect(report.batchResult.newEventsCount).toBe(2);
    expect(report.batchResult.duplicateCount).toBe(0);
    expect(report.normalizedCount).toBe(2);
    expect(report.incidentsCreated.length).toBe(1);

    const incident = report.incidentsCreated[0]!;
    expect(incident.affectedNodeIds).toContain('app-01');
    expect(incident.threatActor).toContain('APT29');
    expect(incident.correlatedEventIds.length).toBe(2);
  });

  it('idempotently filters duplicate telemetry batches without double incident creation', async () => {
    const rawEvent: RawTelemetryEvent = {
      tenantId: 'tenant-omega',
      sourceSystem: 'firewall-perimeter',
      eventType: 'SQLI_EXPLOIT_ATTEMPT',
      targetNodeId: 'api-gateway',
      payload: { uri: '/api/v1/auth?user=\' OR 1=1--' }
    };

    // First batch run
    const report1 = await processTelemetryBatch([rawEvent]);
    expect(report1.incidentsCreated.length).toBe(1);

    // Second batch run with exact same event
    const report2 = await processTelemetryBatch([rawEvent]);
    expect(report2.batchResult.duplicateCount).toBe(1);
    expect(report2.normalizedCount).toBe(0);
    expect(report2.incidentsCreated.length).toBe(0);
  });
});

