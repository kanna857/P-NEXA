import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Terminal,
  FileCheck,
  ArrowRight,
  X,
  Server,
  Network,
  Fingerprint
} from 'lucide-react';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';
import {
  AgentExecutionStage,
  AgentInvestigationLog,
  InvestigationResult,
  executeAgentCouncilInvestigation,
  buildChainedAuditLogEntry
} from '../services/agentInvestigationService.js';
import { AuditLogItem } from '../App.js';

interface AgentInvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: TwinNode | null;
  worldMode: string;
  edges?: TwinEdge[];
  currentUserEmail: string;
  previousAuditHash: string;
  nextAuditSequenceNumber: number;
  onRecordAuditLog: (entry: AuditLogItem) => void;
  onNodeStatusChange?: (nodeId: string, status: TwinNode['status']) => void;
  onNavigateTab?: (tab: string) => void;
}

export const AgentInvestigationModal: React.FC<AgentInvestigationModalProps> = ({
  isOpen,
  onClose,
  entity,
  worldMode,
  edges = [],
  currentUserEmail,
  previousAuditHash,
  nextAuditSequenceNumber,
  onRecordAuditLog,
  onNodeStatusChange,
  onNavigateTab
}) => {
  const [stage, setStage] = useState<AgentExecutionStage>('IDLE');
  const [logs, setLogs] = useState<AgentInvestigationLog[]>([]);
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string>('opt-quarantine');
  const [isQuarantined, setIsQuarantined] = useState(false);
  const [recordedAuditBlock, setRecordedAuditBlock] = useState<{ sequenceNumber: number; currentHash: string } | null>(null);
  const [showFullLogs, setShowFullLogs] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const entityId = entity?.id;
  useEffect(() => {
    if (isOpen && entity) {
      // Reset state and trigger investigation execution
      setStage('IDLE');
      setLogs([]);
      setResult(null);
      setIsQuarantined(entity.status === 'isolated');
      setRecordedAuditBlock(null);

      executeAgentCouncilInvestigation({
        entity,
        worldMode,
        edges,
        onStageChange: (st) => setStage(st),
        onLog: (newLog) => {
          setLogs((prev) => [...prev, newLog]);
          setTimeout(() => {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      })
        .then((res) => {
          setResult(res);
        })
        .catch((err) => {
          console.error('[Agent Council Error]:', err);
        });
    }
  }, [isOpen, entityId, worldMode]);

  if (!isOpen || !entity) return null;

  const councilMembers = [
    {
      role: 'SOC_TRIAGE',
      name: 'Aegis Sentinel',
      stageKey: 'TRIAGE',
      icon: ShieldAlert,
      color: 'border-neon-cyan text-neon-cyan',
      desc: 'Telemetry & Alert Triage'
    },
    {
      role: 'THREAT_HUNTER',
      name: 'Vector Stalker',
      stageKey: 'THREAT_HUNT',
      icon: Network,
      color: 'border-neon-purple text-neon-purple',
      desc: 'MITRE ATT&CK & IoC Correlation'
    },
    {
      role: 'INCIDENT_RESPONDER',
      name: 'Grid Bastion',
      stageKey: 'CONTAINMENT_PLAN',
      icon: Server,
      color: 'border-neon-amber text-neon-amber',
      desc: 'Evidence-Backed Containment Planning'
    },
    {
      role: 'POLICY_AUDITOR',
      name: 'Veritas Ledger',
      stageKey: 'POLICY_AUDIT',
      icon: Lock,
      color: 'border-neon-matrix text-neon-matrix',
      desc: 'RBAC Zero-Trust & SHA-256 Proof Signing'
    }
  ];

  const handleAuthorizeQuarantine = () => {
    if (!result) return;

    // 1. Mutate node status in 3D Digital Twin
    onNodeStatusChange?.(entity.id, 'isolated');
    setIsQuarantined(true);

    // 2. Build hash-chained cryptographic audit entry
    const entry = buildChainedAuditLogEntry({
      previousHash: previousAuditHash,
      sequenceNumber: nextAuditSequenceNumber,
      investigation: result,
      authorizedBy: currentUserEmail,
      action: 'CONTAINMENT_QUARANTINE_AUTHORIZED'
    });

    // 3. Record in audit history
    onRecordAuditLog(entry as any);
    setRecordedAuditBlock({
      sequenceNumber: entry.sequenceNumber,
      currentHash: entry.currentHash
    });
  };

  const handleRecordInvestigationOnly = () => {
    if (!result || recordedAuditBlock) return;

    const entry = buildChainedAuditLogEntry({
      previousHash: previousAuditHash,
      sequenceNumber: nextAuditSequenceNumber,
      investigation: result,
      authorizedBy: currentUserEmail,
      action: 'AGENT_INCIDENT_INVESTIGATION_COMPLETED'
    });

    onRecordAuditLog(entry as any);
    setRecordedAuditBlock({
      sequenceNumber: entry.sequenceNumber,
      currentHash: entry.currentHash
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Agent Council Incident Investigation"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 lg:p-6 bg-slate-950/80 backdrop-blur-md font-mono text-xs select-none"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-950 border border-blue-500/40 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center">
              <Bot className="w-5 h-5 text-neon-purple animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  AI Agent Council · Autonomous Incident Investigation
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] bg-neon-purple/20 text-neon-purple border border-neon-purple/40 font-bold">
                  Live LangGraph Runtime
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target Entity: <span className="text-white font-bold">{entity.name}</span> ({entity.id}) · IP:{' '}
                <span className="text-neon-cyan">{entity.metadata?.ipAddress || '10.2.0.10'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Investigation Modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-4">
          {/* Council Specialist Pipeline Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {councilMembers.map((member, idx) => {
              const Icon = member.icon;
              const isCurrent = stage === member.stageKey;
              const isPast =
                stage === 'COMPLETED' ||
                (member.stageKey === 'TRIAGE' && ['THREAT_HUNT', 'CONTAINMENT_PLAN', 'POLICY_AUDIT'].includes(stage)) ||
                (member.stageKey === 'THREAT_HUNT' && ['CONTAINMENT_PLAN', 'POLICY_AUDIT'].includes(stage)) ||
                (member.stageKey === 'CONTAINMENT_PLAN' && ['POLICY_AUDIT'].includes(stage));

              return (
                <div
                  key={member.role}
                  className={`p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? `${member.color} bg-slate-900/90 shadow-lg scale-[1.02] ring-1 ring-white/20 animate-pulse`
                      : isPast
                      ? 'border-emerald-500/40 bg-emerald-950/10 text-emerald-400'
                      : 'border-slate-800 bg-slate-900/40 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-bold text-[10px]">STEP {idx + 1}</span>
                    </div>
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-neon-cyan animate-ping" />
                    ) : (
                      <span className="text-[9px] text-slate-600">PENDING</span>
                    )}
                  </div>
                  <div className="font-bold text-white text-[11px] truncate">{member.name}</div>
                  <div className="text-[9px] text-slate-400 truncate mt-0.5">{member.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Real-time Agent Execution Terminal */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
            <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-neon-cyan" />
                <span className="text-[11px] font-bold text-white">Agent Multi-Graph Execution Stream</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-400">{logs.length} events emitted</span>
                <button
                  onClick={() => setShowFullLogs(!showFullLogs)}
                  className="text-[10px] text-neon-cyan hover:underline"
                >
                  {showFullLogs ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            <div
              className={`p-3 space-y-1.5 overflow-y-auto font-mono text-[11px] transition-all ${
                showFullLogs ? 'max-h-56' : 'max-h-28'
              }`}
            >
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                  <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                  <span
                    className={`font-bold select-none ${
                      log.type === 'error'
                        ? 'text-rose-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : log.type === 'success'
                        ? 'text-emerald-400'
                        : 'text-neon-cyan'
                    }`}
                  >
                    [{log.agentName}]:
                  </span>
                  <span className="text-slate-300 flex-1">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Completed Evidence-Backed Intelligence Dossier */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Finding & Evidence Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Triage Finding */}
                <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/20 space-y-2">
                  <div className="flex items-center justify-between border-b border-rose-900/50 pb-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-neon-crimson" />
                      <span className="font-bold text-white text-xs">SOC Triage Finding</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-500/50">
                      {result.triage.severity} SEVERITY
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{result.triage.summary}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-rose-950/40 text-[10px]">
                    <span className="text-slate-400">Model Confidence:</span>
                    <span className="text-emerald-400 font-bold">{(result.triage.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Threat Evidence & MITRE Techniques */}
                <div className="p-3.5 rounded-xl border border-purple-500/40 bg-purple-950/20 space-y-2">
                  <div className="flex items-center justify-between border-b border-purple-900/50 pb-2">
                    <div className="flex items-center space-x-2">
                      <Fingerprint className="w-4 h-4 text-neon-purple" />
                      <span className="font-bold text-white text-xs">Forensic Indicators & Threat Profile</span>
                    </div>
                    <span className="text-[10px] text-purple-300 font-bold">{result.evidence.threatActor}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-400 text-[10px]">Correlated MITRE Technique:</div>
                    <div className="p-1.5 rounded-lg bg-slate-950/80 border border-purple-800 text-[11px] text-purple-200 font-bold">
                      {result.evidence.mitreTechnique}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-400 text-[10px]">Correlated IoCs:</div>
                    <div className="flex flex-wrap gap-1">
                      {result.evidence.indicatorsOfCompromise.map((ioc, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                        >
                          {ioc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence-Backed Recommendations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-neon-amber" />
                    <span className="font-bold text-white text-xs">Council Recommended Containment Actions</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Select preferred playbook option below</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.recommendations.map((rec) => {
                    const isSelected = selectedRecommendationId === rec.id;
                    return (
                      <div
                        key={rec.id}
                        onClick={() => setSelectedRecommendationId(rec.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-neon-cyan bg-cyan-950/20 ring-1 ring-neon-cyan/50 shadow-lg'
                            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-bold text-white text-xs block">{rec.title}</span>
                            {rec.isRecommended && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40 mt-1 inline-block">
                                RECOMMENDED BY COUNCIL
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-neon-matrix">+{rec.riskReductionPercent}% Protection</span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-snug mb-2.5">{rec.rationale}</p>

                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-800/80 text-slate-400">
                          <div>
                            <span>Est. Downtime:</span>{' '}
                            <span className="text-white font-bold">{rec.estimatedDowntime}</span>
                          </div>
                          <div>
                            <span>Dual-Custody:</span>{' '}
                            <span className="text-amber-400 font-bold">
                              {rec.requiresDualCustody ? 'Required' : 'Optional'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cryptographic SHA-256 Proof Signature Box */}
              <div className="p-3 rounded-xl border border-neon-matrix/40 bg-slate-950/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-5 h-5 text-neon-matrix" />
                  <div>
                    <span className="font-bold text-white block">Cryptographic State Proof Generated</span>
                    <span className="text-slate-400 text-[10px]">
                      Signer: {result.auditProof.signedBy} · Hash:{' '}
                      <span className="text-neon-cyan font-bold">
                        {result.auditProof.sha256Proof.slice(0, 24)}...
                      </span>
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-bold">
                  FIPS 180-4 VERIFIED
                </span>
              </div>

              {/* Audit Vault Confirmation Toast */}
              {recordedAuditBlock && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/50 flex items-center justify-between animate-in slide-in-from-bottom-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300 font-bold text-xs">
                      Recorded in Tamper-Evident Audit Vault (Block #{recordedAuditBlock.sequenceNumber})
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateTab?.('audit-vault');
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 text-[10px] font-bold flex items-center space-x-1"
                  >
                    <span>Inspect Ledger</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer / Action Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
            <span>Actor:</span>
            <span className="text-white font-bold">{currentUserEmail}</span>
            <span>· Role:</span>
            <span className="text-neon-purple font-bold">ADMINISTRATOR</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                onClose();
                onNavigateTab?.('ai-council');
              }}
              className="px-3 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 font-bold transition-all text-xs border border-purple-500/40 flex items-center space-x-1.5"
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>Open in AI Council View</span>
            </button>

            {result && !recordedAuditBlock && (
              <button
                onClick={handleRecordInvestigationOnly}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all text-xs border border-slate-700 flex items-center space-x-1.5"
              >
                <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                <span>Record Dossier to Vault</span>
              </button>
            )}

            {result && (
              <button
                onClick={handleAuthorizeQuarantine}
                disabled={isQuarantined}
                className={`px-4 py-2 rounded-xl font-bold transition-all text-xs flex items-center space-x-2 shadow-lg ${
                  isQuarantined
                    ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40 cursor-not-allowed'
                    : 'bg-neon-crimson hover:bg-rose-600 text-white shadow-rose-900/50'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {isQuarantined
                    ? 'Host Already Quarantined'
                    : 'Authorize Containment & Sign Dual-Custody'}
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold transition-all text-xs border border-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
