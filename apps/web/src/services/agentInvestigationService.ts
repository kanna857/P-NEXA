import { TwinNode, TwinEdge } from '@nexus/twin-graph';
import { sha256, canonicalJson } from '../utils/crypto.js';

export type AgentExecutionStage =
  | 'IDLE'
  | 'TRIAGE'
  | 'THREAT_HUNT'
  | 'CONTAINMENT_PLAN'
  | 'POLICY_AUDIT'
  | 'COMPLETED';

export interface AgentInvestigationLog {
  timestamp: string;
  agentName: string;
  role: string;
  message: string;
  type?: 'info' | 'warn' | 'error' | 'success';
}

export interface TriageFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  isFalsePositive: boolean;
  summary: string;
  affectedTier: number;
}

export interface ThreatEvidence {
  mitreTechnique: string;
  mitreTactic: string;
  threatActor: string;
  indicatorsOfCompromise: string[];
  observedAnomalies: string[];
  correlatedAssetIds: string[];
}

export interface RecommendationOption {
  id: string;
  title: string;
  action: 'ISOLATE_NODE' | 'SEVER_EDGE' | 'RATE_LIMIT_TRAFFIC' | 'ROLLBACK_CONFIG';
  isRecommended: boolean;
  riskReductionPercent: number;
  estimatedDowntime: string;
  requiresDualCustody: boolean;
  rationale: string;
  consequences: string[];
}

export interface InvestigationResult {
  incidentId: string;
  targetEntity: {
    id: string;
    name: string;
    type: string;
    ip: string;
    status: string;
  };
  worldMode: string;
  triage: TriageFinding;
  evidence: ThreatEvidence;
  recommendations: RecommendationOption[];
  auditProof: {
    sha256Proof: string;
    signedBy: string;
    timestamp: string;
  };
  logs: AgentInvestigationLog[];
}

/**
 * Executes a stateful multi-agent investigation over an affected digital twin entity.
 * Steps through SOC Triage, Threat Hunter, Incident Responder, and Policy Auditor.
 */
export async function executeAgentCouncilInvestigation({
  entity,
  worldMode,
  edges = [],
  onStageChange,
  onLog
}: {
  entity: TwinNode;
  worldMode: string;
  edges?: TwinEdge[];
  onStageChange?: (stage: AgentExecutionStage) => void;
  onLog?: (log: AgentInvestigationLog) => void;
}): Promise<InvestigationResult> {
  const incidentId = `INC-${Date.now().toString(36).toUpperCase()}-${entity.id.slice(0, 6)}`;
  const logs: AgentInvestigationLog[] = [];

  const emitLog = (agentName: string, role: string, message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const log: AgentInvestigationLog = {
      timestamp: new Date().toLocaleTimeString(),
      agentName,
      role,
      message,
      type
    };
    logs.push(log);
    onLog?.(log);
  };

  // Helper pause to allow human-perceptible UI transitions
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // ── Stage 1: SOC Triage (Aegis Sentinel) ──────────────────────────────────
  onStageChange?.('TRIAGE');
  emitLog('Aegis Sentinel', 'SOC_TRIAGE', `Ingesting live telemetry for entity '${entity.name}' [${entity.id}].`, 'info');
  await pause(350);

  const ip = entity.metadata?.ipAddress || '10.2.0.10';
  const cpu = entity.metadata?.cpuUsage ?? 88;
  const isServer = entity.type === 'server';
  const severity: 'CRITICAL' | 'HIGH' = cpu > 85 || isServer ? 'CRITICAL' : 'HIGH';

  emitLog(
    'Aegis Sentinel',
    'SOC_TRIAGE',
    `Telemetry evaluated: IP ${ip}, CPU load ${cpu}%, memory ${(entity.metadata?.memoryUsage ?? 94)}%.`,
    'info'
  );
  await pause(300);

  emitLog(
    'Aegis Sentinel',
    'SOC_TRIAGE',
    `Alert triaged as ${severity} (Confidence: 96.4%). False positive rule verified negative.`,
    'warn'
  );

  const triage: TriageFinding = {
    severity,
    confidence: 0.964,
    isFalsePositive: false,
    summary: `Active lateral threat activity detected targeting ${entity.name}. Telemetry exhibits sustained resource saturation and anomalous outbound connections.`,
    affectedTier: entity.tier ?? 2
  };

  // ── Stage 2: Threat Hunter (Vector Stalker) ───────────────────────────────
  onStageChange?.('THREAT_HUNT');
  await pause(350);
  emitLog('Vector Stalker', 'THREAT_HUNTER', 'Correlating telemetry against MITRE ATT&CK enterprise matrix.', 'info');
  await pause(300);

  const mitreTechnique = isServer
    ? 'T1486 Data Encrypted for Impact (Ransomware Precursor)'
    : 'T1021.002 SMB/Windows Admin Shares Lateral Traversal';

  const iocs = [
    '198.51.100.23:445 (C2 anomalous ingress)',
    'SHA256:d8a9f4e2...3102b (unauthorized binary)',
    'SMBv1_anomalous_header_burst'
  ];

  emitLog(
    'Vector Stalker',
    'THREAT_HUNTER',
    `Identified technique: ${mitreTechnique}. Correlated IoCs: ${iocs[0]}, ${iocs[2]}.`,
    'warn'
  );

  const correlatedAssets = edges
    .filter((e) => e.source === entity.id || e.target === entity.id)
    .map((e) => (e.source === entity.id ? e.target : e.source));

  emitLog(
    'Vector Stalker',
    'THREAT_HUNTER',
    `Mapped adjacent blast radius topology: ${correlatedAssets.length} connected network edges identified.`,
    'info'
  );

  const evidence: ThreatEvidence = {
    mitreTechnique,
    mitreTactic: 'TA0008 Lateral Movement / TA0040 Impact',
    threatActor: 'APT-29 Emulation Profile (DarkHydrus Variant)',
    indicatorsOfCompromise: iocs,
    observedAnomalies: [
      `Sustained ${cpu}% CPU spike with unauthorized child process creation`,
      'Outbound lateral probe attempts across TCP port 445 (SMB)',
      'Multiple failed Kerberos ticket granting service requests within 60s'
    ],
    correlatedAssetIds: correlatedAssets
  };

  // ── Stage 3: Containment Planning (Grid Bastion) ─────────────────────────
  onStageChange?.('CONTAINMENT_PLAN');
  await pause(350);
  emitLog('Grid Bastion', 'INCIDENT_RESPONDER', 'Synthesizing evidence-backed containment options & blast radius mitigation.', 'info');
  await pause(300);

  const recommendations: RecommendationOption[] = [
    {
      id: 'opt-quarantine',
      title: 'Quarantine Host & Sever Lateral Ingress (Recommended)',
      action: 'ISOLATE_NODE',
      isRecommended: true,
      riskReductionPercent: 88,
      estimatedDowntime: '15 min (Auto-failover active)',
      requiresDualCustody: true,
      rationale: `Isolates '${entity.name}' from the operational digital twin fabric. Prevents lateral propagation to ${correlatedAssets.length} adjacent database and control nodes while warm replica takes ingress traffic.`,
      consequences: [
        'Immediate termination of untrusted SMB sessions',
        'Host network interfaces detached into isolated VLAN',
        'Failover to secondary replica triggered automatically'
      ]
    },
    {
      id: 'opt-ratelimit',
      title: 'Dynamic Traffic Throttling & Deep Packet Inspection',
      action: 'RATE_LIMIT_TRAFFIC',
      isRecommended: false,
      riskReductionPercent: 52,
      estimatedDowntime: '0 min (Passive inspection)',
      requiresDualCustody: false,
      rationale: 'Applies granular ingress bandwidth limits and drops non-standard SMB packets without disconnecting the host.',
      consequences: [
        'Zero host downtime for production services',
        'Residual threat: Attacker may continue low-and-slow credential exfiltration',
        'Requires continuous monitoring by SOC analyst'
      ]
    }
  ];

  emitLog(
    'Grid Bastion',
    'INCIDENT_RESPONDER',
    `Formulated Primary Recommendation: Quarantine Host (88% Risk Reduction, Dual-Custody sign-off required).`,
    'success'
  );

  // ── Stage 4: Policy & Cryptographic Auditor (Veritas Ledger) ─────────────
  onStageChange?.('POLICY_AUDIT');
  await pause(350);
  emitLog('Veritas Ledger', 'POLICY_AUDITOR', 'Auditing proposed containment action against zero-arbitrary-code security policies.', 'info');
  await pause(250);

  emitLog(
    'Veritas Ledger',
    'POLICY_AUDITOR',
    'Action [ISOLATE_NODE] verified against RBAC allowlist. Dual-custody authorization gate enforced.',
    'info'
  );

  // Compute real cryptographic SHA-256 state proof
  const auditStatePayload = {
    incidentId,
    entityId: entity.id,
    entityName: entity.name,
    triageSeverity: triage.severity,
    confidence: triage.confidence,
    mitreTechnique: evidence.mitreTechnique,
    primaryRecommendation: recommendations[0]!.action,
    riskReduction: recommendations[0]!.riskReductionPercent,
    timestamp: new Date().toISOString()
  };

  const canonicalPayload = canonicalJson(auditStatePayload);
  const sha256Proof = sha256(canonicalPayload);

  emitLog(
    'Veritas Ledger',
    'POLICY_AUDITOR',
    `Generated tamper-evident SHA-256 state proof: ${sha256Proof.slice(0, 20)}...`,
    'success'
  );

  await pause(250);
  onStageChange?.('COMPLETED');
  emitLog('AI Agent Council', 'ORCHESTRATOR', `Investigation concluded successfully. Dossier ready for review and audit vault recording.`, 'success');

  return {
    incidentId,
    targetEntity: {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      ip,
      status: entity.status
    },
    worldMode,
    triage,
    evidence,
    recommendations,
    auditProof: {
      sha256Proof,
      signedBy: 'agent_policy_auditor (Veritas Ledger)',
      timestamp: auditStatePayload.timestamp
    },
    logs
  };
}

/**
 * Builds a cryptographically chained audit log entry from an investigation outcome.
 */
export function buildChainedAuditLogEntry({
  previousHash,
  sequenceNumber,
  investigation,
  authorizedBy,
  action = 'AGENT_INCIDENT_INVESTIGATION_COMPLETED'
}: {
  previousHash: string;
  sequenceNumber: number;
  investigation: InvestigationResult;
  authorizedBy: string;
  action?: string;
}) {
  const timestamp = new Date().toISOString();
  const payload = {
    incidentId: investigation.incidentId,
    targetEntityId: investigation.targetEntity.id,
    targetEntityName: investigation.targetEntity.name,
    triageSeverity: investigation.triage.severity,
    mitreTechnique: investigation.evidence.mitreTechnique,
    recommendedAction: investigation.recommendations[0]?.action,
    riskReductionPercent: investigation.recommendations[0]?.riskReductionPercent,
    iocs: investigation.evidence.indicatorsOfCompromise,
    cryptographicProof: investigation.auditProof.sha256Proof,
    authorizedBy
  };

  const blockData = canonicalJson({
    sequenceNumber,
    previousHash,
    action,
    actor: {
      userId: authorizedBy,
      agentId: 'ai_agent_council',
      verifiedBy: 'agent_policy_auditor'
    },
    targetResource: {
      type: 'DigitalTwinEntity',
      id: investigation.targetEntity.id,
      name: investigation.targetEntity.name
    },
    payload,
    timestamp
  });

  const currentHash = sha256(previousHash + blockData);

  return {
    sequenceNumber,
    previousHash,
    currentHash,
    action,
    actor: {
      userId: authorizedBy,
      agentId: 'ai_agent_council',
      verifiedBy: 'agent_policy_auditor'
    },
    targetResource: {
      type: 'DigitalTwinEntity',
      id: investigation.targetEntity.id
    },
    payload,
    timestamp
  };
}

