import { randomUUID } from 'node:crypto';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';

export interface RawTelemetryEvent {
  tenantId: string;
  sourceSystem: string;
  eventType: string;
  timestamp?: Date | string;
  sourceIp?: string;
  destIp?: string;
  targetNodeId?: string;
  user?: string;
  process?: string;
  bytesSent?: number;
  statusCode?: number;
  payload?: Record<string, unknown>;
}

export interface NormalizedThreatEvent {
  id: string;
  tenantId: string;
  timestamp: Date;
  sourceSystem: string;
  eventType: string;
  sourceIp?: string;
  destIp?: string;
  targetNodeId?: string;
  user?: string;
  process?: string;
  bytesSent?: number;
  statusCode?: number;
  severity: IncidentSeverity;
  raw: Record<string, unknown>;
}

export interface MitreAttackMapping {
  tactic: string;
  techniqueId: string;
  techniqueName: string;
  confidence: number;
  killChainPhase: string;
}

export interface ThreatIntelEnrichment {
  isKnownMalicious: boolean;
  threatActor?: string;
  campaign?: string;
  reputationScore: number; // 0 (benign) to 100 (critical malicious)
  cveReferences: string[];
  threatCategory?: string;
}

export interface CyberIncident {
  id: string;
  tenantId: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  mitreTactic: string;
  mitreTechnique: string;
  affectedNodeIds: string[];
  correlatedEventIds: string[];
  iocs: string[];
  threatActor?: string;
  riskScore: number;
  status: IncidentStatus;
  detectedAt: Date;
  updatedAt: Date;
}

// ── 1. Event Normalizer ───────────────────────────────────────────────────────
export function normalizeThreatEvent(raw: RawTelemetryEvent): NormalizedThreatEvent {
  const ts = raw.timestamp ? (raw.timestamp instanceof Date ? raw.timestamp : new Date(raw.timestamp)) : new Date();

  // Infer base severity
  let severity: IncidentSeverity = 'low';
  const eventLower = (raw.eventType || '').toLowerCase();
  const payloadStr = JSON.stringify(raw.payload || {}).toLowerCase();

  if (
    eventLower.includes('ransom') ||
    eventLower.includes('encrypt') ||
    eventLower.includes('exfiltration') ||
    payloadStr.includes('ransom') ||
    payloadStr.includes('encrypt') ||
    payloadStr.includes('mimikatz') ||
    payloadStr.includes('shadow_copy_deleted')
  ) {
    severity = 'critical';
  } else if (
    eventLower.includes('lateral') ||
    eventLower.includes('sqli') ||
    eventLower.includes('exploit') ||
    eventLower.includes('unauthorized') ||
    (raw.statusCode && raw.statusCode === 401 && raw.user === 'root')
  ) {
    severity = 'high';
  } else if (
    eventLower.includes('scan') ||
    eventLower.includes('auth_fail') ||
    eventLower.includes('probe')
  ) {
    severity = 'medium';
  }

  return {
    id: randomUUID(),
    tenantId: raw.tenantId,
    timestamp: ts,
    sourceSystem: raw.sourceSystem,
    eventType: raw.eventType,
    sourceIp: raw.sourceIp,
    destIp: raw.destIp,
    targetNodeId: raw.targetNodeId,
    user: raw.user,
    process: raw.process,
    bytesSent: raw.bytesSent,
    statusCode: raw.statusCode,
    severity,
    raw: raw.payload || {}
  };
}

// ── 2. MITRE ATT&CK Matrix Mapping ───────────────────────────────────────────
const MITRE_RULES: Array<{
  match: (e: NormalizedThreatEvent) => boolean;
  mapping: MitreAttackMapping;
}> = [
  {
    match: (e) =>
      e.eventType.toLowerCase().includes('ransom') ||
      e.eventType.toLowerCase().includes('encrypt') ||
      JSON.stringify(e.raw).toLowerCase().includes('vssadmin'),
    mapping: {
      tactic: 'Impact',
      techniqueId: 'T1486',
      techniqueName: 'Data Encrypted for Impact',
      confidence: 0.98,
      killChainPhase: 'Actions on Objectives'
    }
  },
  {
    match: (e) =>
      e.eventType.toLowerCase().includes('exfiltration') ||
      (e.bytesSent !== undefined && e.bytesSent > 10 * 1024 * 1024), // > 10MB
    mapping: {
      tactic: 'Exfiltration',
      techniqueId: 'T1048',
      techniqueName: 'Exfiltration Over Alternative Protocol',
      confidence: 0.94,
      killChainPhase: 'Exfiltration'
    }
  },
  {
    match: (e) =>
      e.eventType.toLowerCase().includes('lateral') ||
      e.eventType.toLowerCase().includes('smb') ||
      e.eventType.toLowerCase().includes('remote_exec') ||
      e.eventType.toLowerCase().includes('psexec'),
    mapping: {
      tactic: 'Lateral Movement',
      techniqueId: 'T1021',
      techniqueName: 'Remote Services',
      confidence: 0.92,
      killChainPhase: 'Lateral Movement'
    }
  },
  {
    match: (e) =>
      e.eventType.toLowerCase().includes('credential') ||
      e.eventType.toLowerCase().includes('dump') ||
      e.eventType.toLowerCase().includes('lsass') ||
      JSON.stringify(e.raw).toLowerCase().includes('mimikatz'),
    mapping: {
      tactic: 'Credential Access',
      techniqueId: 'T1003',
      techniqueName: 'OS Credential Dumping',
      confidence: 0.95,
      killChainPhase: 'Credential Access'
    }
  },
  {
    match: (e) =>
      e.eventType.toLowerCase().includes('brute') ||
      (e.eventType.toLowerCase().includes('auth_fail') && (e.raw['attemptCount'] as number) > 5),
    mapping: {
      tactic: 'Credential Access',
      techniqueId: 'T1110',
      techniqueName: 'Brute Force',
      confidence: 0.9,
      killChainPhase: 'Credential Access'
    }
  },
  {
    match: (e) =>
      e.eventType.toLowerCase().includes('sqli') ||
      e.eventType.toLowerCase().includes('exploit') ||
      e.eventType.toLowerCase().includes('public_facing'),
    mapping: {
      tactic: 'Initial Access',
      techniqueId: 'T1190',
      techniqueName: 'Exploit Public-Facing Application',
      confidence: 0.93,
      killChainPhase: 'Weaponization / Delivery'
    }
  },
  {
    match: (e) =>
      e.eventType.toLowerCase().includes('port_scan') ||
      e.eventType.toLowerCase().includes('recon') ||
      e.eventType.toLowerCase().includes('discovery'),
    mapping: {
      tactic: 'Discovery',
      techniqueId: 'T1046',
      techniqueName: 'Network Service Discovery',
      confidence: 0.88,
      killChainPhase: 'Reconnaissance'
    }
  }
];

export function mapMitreAttack(event: NormalizedThreatEvent): MitreAttackMapping {
  for (const rule of MITRE_RULES) {
    if (rule.match(event)) {
      return rule.mapping;
    }
  }

  return {
    tactic: 'Execution',
    techniqueId: 'T1059',
    techniqueName: 'Command and Scripting Interpreter',
    confidence: 0.7,
    killChainPhase: 'Execution'
  };
}

// ── 3. Threat Intel & IOC Enrichment ─────────────────────────────────────────
const KNOWN_IOC_FEED = new Map<
  string,
  { actor: string; campaign: string; cves: string[]; score: number }
>([
  [
    '198.51.100.12',
    {
      actor: 'APT29 / Cozy Bear',
      campaign: 'Nexus Solar Infiltration',
      cves: ['CVE-2026-3810'],
      score: 95
    }
  ],
  [
    '203.0.113.5',
    {
      actor: 'FIN7 / Carbanak',
      campaign: 'Financial Ransomware Campaign',
      cves: ['CVE-2026-1194', 'CVE-2026-7782'],
      score: 92
    }
  ],
  [
    'evil-command-control.xyz',
    {
      actor: 'Lazarus Group',
      campaign: 'Operation GhostPulse',
      cves: ['CVE-2026-5501'],
      score: 98
    }
  ]
]);

export function enrichIoCs(event: NormalizedThreatEvent): ThreatIntelEnrichment {
  const iocsToCheck: string[] = [];
  if (event.sourceIp) iocsToCheck.push(event.sourceIp);
  if (event.destIp) iocsToCheck.push(event.destIp);
  if (event.raw['domain']) iocsToCheck.push(String(event.raw['domain']));
  if (event.raw['hash']) iocsToCheck.push(String(event.raw['hash']));

  for (const ioc of iocsToCheck) {
    const known = KNOWN_IOC_FEED.get(ioc);
    if (known) {
      return {
        isKnownMalicious: true,
        threatActor: known.actor,
        campaign: known.campaign,
        reputationScore: known.score,
        cveReferences: known.cves,
        threatCategory: 'Advanced Persistent Threat (APT)'
      };
    }
  }

  // Fallback heuristic scoring
  const isHighSeverity = event.severity === 'critical' || event.severity === 'high';
  return {
    isKnownMalicious: isHighSeverity,
    reputationScore: isHighSeverity ? 75 : 20,
    cveReferences: isHighSeverity ? ['CVE-2026-GENERIC'] : [],
    threatCategory: isHighSeverity ? 'Suspicious Telemetry' : 'Normal / Low Risk'
  };
}

// ── 4. Cyber Incident Intelligence Manager ────────────────────────────────────
export class CyberIncidentManager {
  private incidents = new Map<string, CyberIncident>();
  // Index: tenantId:targetNodeId -> active incident id
  private activeIncidentByNode = new Map<string, string>();
  private escalationListeners: Array<(incident: CyberIncident) => Promise<void>> = [];

  public onEscalation(listener: (incident: CyberIncident) => Promise<void>): void {
    this.escalationListeners.push(listener);
  }

  /**
   * Processes a normalized threat event, performing MITRE mapping, IOC enrichment,
   * anomaly evaluation, and automated incident correlation.
   */
  public async processEvent(event: NormalizedThreatEvent): Promise<{
    incident?: CyberIncident;
    isNewIncident: boolean;
    mitre: MitreAttackMapping;
    enrichment: ThreatIntelEnrichment;
  }> {
    const mitre = mapMitreAttack(event);
    const enrichment = enrichIoCs(event);

    // Only escalate to incident if severity is medium or higher, or known malicious IOC
    const requiresIncident =
      event.severity === 'high' ||
      event.severity === 'critical' ||
      enrichment.isKnownMalicious;

    if (!requiresIncident) {
      return { isNewIncident: false, mitre, enrichment };
    }

    const nodeKey = `${event.tenantId}:${event.targetNodeId || event.sourceIp || 'unknown'}`;
    const existingIncidentId = this.activeIncidentByNode.get(nodeKey);

    let incident: CyberIncident;
    let isNewIncident = false;

    if (existingIncidentId && this.incidents.has(existingIncidentId)) {
      // Correlate into existing open incident
      incident = this.incidents.get(existingIncidentId)!;
      incident.correlatedEventIds.push(event.id);
      if (event.sourceIp && !incident.iocs.includes(event.sourceIp)) incident.iocs.push(event.sourceIp);
      if (enrichment.threatActor && !incident.threatActor) incident.threatActor = enrichment.threatActor;
      incident.riskScore = Math.min(100, incident.riskScore + 10);
      incident.updatedAt = new Date();

      if (event.severity === 'critical' && incident.severity !== 'critical') {
        incident.severity = 'critical';
      }
    } else {
      // Create new incident
      isNewIncident = true;
      const incidentId = `inc-${randomUUID().slice(0, 8)}`;
      const affectedNodes: string[] = [];
      if (event.targetNodeId) affectedNodes.push(event.targetNodeId);

      const iocs: string[] = [];
      if (event.sourceIp) iocs.push(event.sourceIp);
      if (event.destIp) iocs.push(event.destIp);

      const initialRisk =
        event.severity === 'critical' ? 90 : event.severity === 'high' ? 75 : 50;

      incident = {
        id: incidentId,
        tenantId: event.tenantId,
        title: `${mitre.techniqueName} detected on ${event.targetNodeId || event.sourceSystem}`,
        summary: `Automated detection triggered by ${event.eventType}. Threat actor: ${
          enrichment.threatActor || 'Unknown Adversary'
        }. MITRE: ${mitre.techniqueId} (${mitre.tactic}).`,
        severity: event.severity,
        mitreTactic: mitre.tactic,
        mitreTechnique: `${mitre.techniqueId} - ${mitre.techniqueName}`,
        affectedNodeIds: affectedNodes,
        correlatedEventIds: [event.id],
        iocs,
        threatActor: enrichment.threatActor,
        riskScore: Math.max(initialRisk, enrichment.reputationScore),
        status: 'OPEN',
        detectedAt: event.timestamp,
        updatedAt: new Date()
      };

      this.incidents.set(incidentId, incident);
      if (event.targetNodeId) {
        this.activeIncidentByNode.set(nodeKey, incidentId);
      }

      // Trigger automatic escalation callbacks for high/critical incidents
      if (incident.severity === 'critical' || incident.severity === 'high') {
        for (const listener of this.escalationListeners) {
          try {
            await listener(incident);
          } catch {
            // Non-blocking escalation error
          }
        }
      }
    }

    return {
      incident,
      isNewIncident,
      mitre,
      enrichment
    };
  }

  public getIncidentById(id: string): CyberIncident | null {
    return this.incidents.get(id) || null;
  }

  public getIncidents(
    tenantId: string,
    filters?: { severity?: IncidentSeverity; status?: IncidentStatus }
  ): CyberIncident[] {
    let list = Array.from(this.incidents.values()).filter((i) => i.tenantId === tenantId);

    if (filters?.severity) {
      list = list.filter((i) => i.severity === filters.severity);
    }
    if (filters?.status) {
      list = list.filter((i) => i.status === filters.status);
    }

    return list.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  public updateIncidentStatus(id: string, status: IncidentStatus): CyberIncident | null {
    const inc = this.incidents.get(id);
    if (!inc) return null;
    inc.status = status;
    inc.updatedAt = new Date();
    return inc;
  }

  public clear(): void {
    this.incidents.clear();
    this.activeIncidentByNode.clear();
  }
}

// Global default singleton manager
export const defaultIncidentManager = new CyberIncidentManager();
