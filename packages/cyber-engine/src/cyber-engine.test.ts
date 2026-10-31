import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeThreatEvent,
  mapMitreAttack,
  enrichIoCs,
  CyberIncidentManager
} from './index.js';

describe('Cyber Incident Intelligence & MITRE ATT&CK Engine', () => {
  let incidentManager: CyberIncidentManager;

  beforeEach(() => {
    incidentManager = new CyberIncidentManager();
  });

  it('normalizeThreatEvent normalizes raw telemetry and infers severity accurately', () => {
    const rawRansomware = {
      tenantId: 'tenant-test',
      sourceSystem: 'edr-agent',
      eventType: 'SUSPICIOUS_ENCRYPTOR_EXECUTED',
      payload: { process: 'ransom.exe', vssadmin_deleted: true }
    };

    const norm = normalizeThreatEvent(rawRansomware);
    expect(norm.id).toBeDefined();
    expect(norm.severity).toBe('critical');
    expect(norm.tenantId).toBe('tenant-test');

    const rawProbe = {
      tenantId: 'tenant-test',
      sourceSystem: 'perimeter-firewall',
      eventType: 'TCP_PORT_SCAN',
      payload: { portsScanned: [22, 80] }
    };
    const normProbe = normalizeThreatEvent(rawProbe);
    expect(normProbe.severity).toBe('medium');
  });

  it('maps threat behavior to standard MITRE ATT&CK techniques', () => {
    // 1. Ransomware -> T1486 (Impact)
    const ransomwareEvent = normalizeThreatEvent({
      tenantId: 't1',
      sourceSystem: 'edr',
      eventType: 'RANSOMWARE_ENCRYPTION_TRIGGERED',
      payload: {}
    });
    const m1 = mapMitreAttack(ransomwareEvent);
    expect(m1.techniqueId).toBe('T1486');
    expect(m1.tactic).toBe('Impact');

    // 2. Lateral Movement -> T1021
    const lateralEvent = normalizeThreatEvent({
      tenantId: 't1',
      sourceSystem: 'netflow',
      eventType: 'LATERAL_SMB_REMOTE_EXEC',
      payload: {}
    });
    const m2 = mapMitreAttack(lateralEvent);
    expect(m2.techniqueId).toBe('T1021');
    expect(m2.tactic).toBe('Lateral Movement');

    // 3. Credential Access -> T1003
    const credEvent = normalizeThreatEvent({
      tenantId: 't1',
      sourceSystem: 'edr',
      eventType: 'MEMORY_DUMP',
      payload: { process: 'mimikatz.exe' }
    });
    const m3 = mapMitreAttack(credEvent);
    expect(m3.techniqueId).toBe('T1003');
    expect(m3.tactic).toBe('Credential Access');

    // 4. Large Data Exfiltration -> T1048
    const exfilEvent = normalizeThreatEvent({
      tenantId: 't1',
      sourceSystem: 'gateway-proxy',
      eventType: 'OUTBOUND_DATA_BURST',
      bytesSent: 15 * 1024 * 1024, // 15MB
      payload: {}
    });
    const m4 = mapMitreAttack(exfilEvent);
    expect(m4.techniqueId).toBe('T1048');
    expect(m4.tactic).toBe('Exfiltration');
  });

  it('enriches events with known threat intelligence feeds and IOC reputation', () => {
    const eventWithIoc = normalizeThreatEvent({
      tenantId: 't1',
      sourceSystem: 'border-firewall',
      eventType: 'INBOUND_CONNECTION',
      sourceIp: '198.51.100.12',
      payload: {}
    });

    const intel = enrichIoCs(eventWithIoc);
    expect(intel.isKnownMalicious).toBe(true);
    expect(intel.threatActor).toContain('APT29');
    expect(intel.reputationScore).toBeGreaterThanOrEqual(90);
    expect(intel.cveReferences).toContain('CVE-2026-3810');
  });

  it('CyberIncidentManager aggregates correlated events into a single incident and triggers escalation', async () => {
    let escalationTriggered = false;
    incidentManager.onEscalation(async (incident) => {
      if (incident.severity === 'high' || incident.severity === 'critical') {
        escalationTriggered = true;
      }
    });

    // 1. Ingest initial lateral movement alert on server-app-01
    const event1 = normalizeThreatEvent({
      tenantId: 'tenant-omega',
      sourceSystem: 'edr',
      eventType: 'LATERAL_MOVEMENT_SMB',
      targetNodeId: 'server-app-01',
      sourceIp: '198.51.100.12',
      payload: {}
    });

    const result1 = await incidentManager.processEvent(event1);
    expect(result1.isNewIncident).toBe(true);
    expect(result1.incident).toBeDefined();
    expect(result1.incident!.affectedNodeIds).toContain('server-app-01');
    expect(result1.incident!.threatActor).toContain('APT29');
    expect(escalationTriggered).toBe(true);

    const initialIncidentId = result1.incident!.id;

    // 2. Ingest second related event on the same node
    const event2 = normalizeThreatEvent({
      tenantId: 'tenant-omega',
      sourceSystem: 'edr',
      eventType: 'CREDENTIAL_DUMPING_ATTEMPT',
      targetNodeId: 'server-app-01',
      sourceIp: '198.51.100.12',
      payload: { process: 'mimikatz.exe' }
    });

    const result2 = await incidentManager.processEvent(event2);
    // Should correlate into existing incident, not create a duplicate
    expect(result2.isNewIncident).toBe(false);
    expect(result2.incident!.id).toBe(initialIncidentId);
    expect(result2.incident!.correlatedEventIds.length).toBe(2);
    expect(result2.incident!.severity).toBe('critical');
  });

  it('updates incident status and queries incidents with filtering', async () => {
    const event = normalizeThreatEvent({
      tenantId: 'tenant-alpha',
      sourceSystem: 'siem',
      eventType: 'SQLI_ATTEMPT',
      targetNodeId: 'auth-db',
      payload: {}
    });

    const res = await incidentManager.processEvent(event);
    const incidentId = res.incident!.id;

    expect(incidentManager.getIncidents('tenant-alpha').length).toBe(1);

    // Update status to INVESTIGATING then CONTAINED
    incidentManager.updateIncidentStatus(incidentId, 'INVESTIGATING');
    expect(incidentManager.getIncidentById(incidentId)?.status).toBe('INVESTIGATING');

    incidentManager.updateIncidentStatus(incidentId, 'CONTAINED');
    expect(incidentManager.getIncidentById(incidentId)?.status).toBe('CONTAINED');

    // Filter by status
    const contained = incidentManager.getIncidents('tenant-alpha', { status: 'CONTAINED' });
    expect(contained.length).toBe(1);

    const open = incidentManager.getIncidents('tenant-alpha', { status: 'OPEN' });
    expect(open.length).toBe(0);
  });
});

