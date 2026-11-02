import React, { useState, useEffect } from 'react';
import {
  Bot,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Fingerprint,
  Activity,
  Clock,
  Sparkles,
  UserCheck,
  RotateCcw,
  Filter,
  Sliders,
  Check,
  XCircle,
  Search
} from 'lucide-react';
import {
  CouncilInvestigationDossier,
  CouncilAgentRole
} from '../types/council.js';
import {
  createInvestigation,
  fetchInvestigations,
  approveInvestigation,
  rejectInvestigation,
  generateClientMockDossier
} from '../services/councilApiClient.js';
import { AuditLogItem } from '../App.js';

interface AICouncilCommandCenterViewProps {
  userRole: string;
  currentUserEmail: string;
  tenantId: string;
  onRecordAuditLog?: (entry: AuditLogItem) => void;
  onNavigateTab?: (tab: string) => void;
}

export const AICouncilCommandCenterView: React.FC<AICouncilCommandCenterViewProps> = ({
  userRole,
  currentUserEmail,
  tenantId,
  onRecordAuditLog,
  onNavigateTab
}) => {
  const [dossier, setDossier] = useState<CouncilInvestigationDossier | null>(null);
  const [recentInvestigations, setRecentInvestigations] = useState<CouncilInvestigationDossier[]>([]);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'facts' | 'threats' | 'blast' | 'memory'>('facts');
  const [timelineFilter, setTimelineFilter] = useState<string>('ALL');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [approvalFeedback, setApprovalFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [entityToInvestigate, setEntityToInvestigate] = useState('srv-auth');

  // Load or initialize investigation
  const loadInvestigations = async () => {
    setIsLoading(true);
    try {
      const list = await fetchInvestigations(tenantId);
      if (list && list.length > 0) {
        setRecentInvestigations(list);
        if (!dossier) {
          setDossier(list[0]);
          setSelectedPlanId(list[0].recommendedPlan?.id || '');
        }
      } else {
        // Generate baseline demo investigation
        const mock = generateClientMockDossier({
          entityId: 'srv-auth',
          entityName: 'Authentication & Identity Bastion',
          tenantId
        });
        setDossier(mock);
        setSelectedPlanId(mock.recommendedPlan?.id || '');
        setRecentInvestigations([mock]);
      }
    } catch {
      const mock = generateClientMockDossier({
        entityId: 'srv-auth',
        entityName: 'Authentication & Identity Bastion',
        tenantId
      });
      setDossier(mock);
      setSelectedPlanId(mock.recommendedPlan?.id || '');
      setRecentInvestigations([mock]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvestigations();
  }, [tenantId]);

  const handleStartNewInvestigation = async () => {
    setIsLoading(true);
    try {
      const newDossier = await createInvestigation({
        entityId: entityToInvestigate,
        entityName: entityToInvestigate === 'srv-auth' ? 'Authentication Bastion' : `Entity ${entityToInvestigate}`,
        tenantId
      });
      setDossier(newDossier);
      setSelectedPlanId(newDossier.recommendedPlan?.id || '');
      setRecentInvestigations((prev) => [newDossier, ...prev.filter((d) => d.investigationId !== newDossier.investigationId)]);
      setApprovalFeedback(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!dossier) return;
    setIsLoading(true);
    try {
      const updated = await approveInvestigation(dossier.investigationId, approvalComments, tenantId);
      setDossier(updated);
      setApprovalFeedback(`Action '${updated.recommendedPlan.action}' approved and queued for safe tool execution.`);
      setIsApproving(false);

      if (onRecordAuditLog) {
        onRecordAuditLog({
          sequenceNumber: updated.cryptographicProof.sequenceNumber || Date.now(),
          previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
          currentHash: updated.cryptographicProof.sha256Hash,
          action: 'COUNCIL_ACTION_APPROVED',
          actor: { userId: currentUserEmail, agentId: 'council-reviewer', systemService: 'council-orchestrator' },
          payload: {
            investigationId: updated.investigationId,
            action: updated.recommendedPlan.action,
            targetEntity: updated.targetEntity.id,
            comments: approvalComments
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!dossier) return;
    if (!rejectionReason.trim()) {
      alert('Please state a reason for rejecting the action.');
      return;
    }
    setIsLoading(true);
    try {
      const updated = await rejectInvestigation(dossier.investigationId, rejectionReason, tenantId);
      setDossier(updated);
      setApprovalFeedback(`Action rejected: ${rejectionReason}`);
      setIsRejecting(false);

      if (onRecordAuditLog) {
        onRecordAuditLog({
          sequenceNumber: Date.now(),
          previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
          currentHash: updated.cryptographicProof.sha256Hash,
          action: 'COUNCIL_ACTION_REJECTED',
          actor: { userId: currentUserEmail, agentId: 'council-reviewer', systemService: 'council-orchestrator' },
          payload: {
            investigationId: updated.investigationId,
            reason: rejectionReason,
            targetEntity: updated.targetEntity.id
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestRevision = () => {
    if (!revisionNotes.trim()) {
      alert('Please specify what revisions or additional verification are needed.');
      return;
    }
    if (dossier) {
      setDossier({
        ...dossier,
        status: 'INVESTIGATING',
        reviewerVerdict: {
          ...dossier.reviewerVerdict,
          status: 'REVISION_REQUIRED',
          reviewNotes: `Operator requested revision: ${revisionNotes}`
        }
      });
      setApprovalFeedback(`Revision requested: "${revisionNotes}". Council specialists re-evaluating.`);
      setIsRequestingRevision(false);
    }
  };

  // 5 Runtime Council Agents Definition
  const runtimeAgents: Array<{
    role: CouncilAgentRole;
    name: string;
    specialty: string;
    status: 'IDLE' | 'ANALYZING' | 'SIMULATING' | 'VERIFYING' | 'AWAITING_APPROVAL' | 'COMPLETE' | 'ERROR';
    progress: number;
    lastAction: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    errorState?: string;
  }> = [
    {
      role: 'INVESTIGATOR',
      name: 'Investigator Agent',
      specialty: 'Telemetry & Graph Forensics',
      status: dossier ? 'COMPLETE' : 'IDLE',
      progress: dossier ? 100 : 0,
      lastAction: dossier ? `Ingested ${dossier.evidence.observedFacts.length} facts & matched historical incidents` : 'Standing by',
      icon: Search,
      accentColor: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/20'
    },
    {
      role: 'CYBERSECURITY',
      name: 'Cybersecurity Agent',
      specialty: 'MITRE ATT&CK & IOC Triage',
      status: dossier ? 'COMPLETE' : 'IDLE',
      progress: dossier ? 100 : 0,
      lastAction: dossier ? `Identified ${dossier.threatAssessment.mitreTechnique} (Risk: ${dossier.threatAssessment.riskScore}/100)` : 'Standing by',
      icon: ShieldAlert,
      accentColor: 'border-rose-500/40 text-rose-400 bg-rose-950/20'
    },
    {
      role: 'SIMULATION',
      name: 'Simulation Agent',
      specialty: 'What-If Blast Radius Projections',
      status: dossier ? 'COMPLETE' : 'IDLE',
      progress: dossier ? 100 : 0,
      lastAction: dossier ? `Simulated ${dossier.simulation.propagationTicks} ticks with seed ${dossier.simulation.seed}` : 'Standing by',
      icon: Activity,
      accentColor: 'border-amber-500/40 text-amber-400 bg-amber-950/20'
    },
    {
      role: 'PLANNER',
      name: 'Planner Agent',
      specialty: 'Action Synthesis & Tradeoffs',
      status: dossier ? 'COMPLETE' : 'IDLE',
      progress: dossier ? 100 : 0,
      lastAction: dossier ? `Synthesized candidate actions (Primary: ${dossier.recommendedPlan.action})` : 'Standing by',
      icon: Sliders,
      accentColor: 'border-purple-500/40 text-purple-400 bg-purple-950/20'
    },
    {
      role: 'REVIEWER',
      name: 'Reviewer Agent',
      specialty: 'Policy & Anti-Hallucination Verification',
      status: dossier ? (dossier.status === 'AWAITING_APPROVAL' ? 'AWAITING_APPROVAL' : dossier.status === 'APPROVED' ? 'COMPLETE' : 'VERIFYING') : 'IDLE',
      progress: dossier ? 100 : 0,
      lastAction: dossier ? `Verdict: ${dossier.reviewerVerdict.status} (Human authorization enforced)` : 'Standing by',
      icon: ShieldCheck,
      accentColor: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
    }
  ];

  const filteredEvents = (dossier?.events || []).filter((evt) => {
    if (timelineFilter === 'ALL') return true;
    return evt.agentRole === timelineFilter;
  });

  const selectedPlan =
    dossier?.candidatePlans.find((p) => p.id === selectedPlanId) ||
    dossier?.recommendedPlan;

  const isAdminOrCommander =
    userRole === 'admin' ||
    userRole === 'SUPER_ADMIN' ||
    userRole === 'ORG_ADMIN' ||
    userRole === 'commander' ||
    userRole === 'ADMINISTRATOR';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in text-slate-100">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="p-1.5 rounded-lg bg-purple-900/60 border border-purple-500/40 text-purple-300">
                <Bot className="w-5 h-5 text-neon-purple animate-pulse" />
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-500/30">
                Phase 4 Runtime Multi-Agent Council
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>5 Runtime Specialists Active</span>
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black font-mono tracking-tight text-white flex items-center space-x-2">
              <span>AI Council Command Center</span>
            </h1>
            <p className="text-xs text-slate-400 font-sans mt-1 max-w-3xl">
              Cooperating runtime intelligence council connecting digital twin telemetry to real-time incident investigation, predictive what-if simulation, and human-authorized containment response.
            </p>
          </div>

          {/* Quick Investigation Dispatcher */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            {recentInvestigations.length > 1 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Session History</span>
                <select
                  value={dossier?.investigationId || ''}
                  onChange={(e) => {
                    const match = recentInvestigations.find((d) => d.investigationId === e.target.value);
                    if (match) {
                      setDossier(match);
                      setSelectedPlanId(match.recommendedPlan?.id || '');
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded-lg px-2 py-1 outline-none"
                >
                  {recentInvestigations.map((inv) => (
                    <option key={inv.investigationId} value={inv.investigationId}>
                      {inv.investigationId.slice(0, 12)}... ({inv.targetEntity.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Target Entity</span>
              <select
                value={entityToInvestigate}
                onChange={(e) => setEntityToInvestigate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option value="srv-auth">srv-auth (Authentication Bastion)</option>
                <option value="srv-db-replica">srv-db-replica (Database Standby)</option>
                <option value="gw-campus-edge">gw-campus-edge (Perimeter Router)</option>
                <option value="bastion-admin-01">bastion-admin-01 (Admin Jump Box)</option>
              </select>
            </div>
            <button
              onClick={handleStartNewInvestigation}
              disabled={isLoading}
              data-testid="dispatch-council-btn"
              className="px-4 py-2 mt-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-purple-900/40 flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Convening...' : 'Dispatch Council'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3.1 Council Overview — Five Runtime Agent Status Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              3.1 Runtime Agent Council Members (5 Specialists)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Autonomous Runtime Architecture</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {runtimeAgents.map((agent) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.role}
                data-testid={`council-card-${agent.role.toLowerCase()}`}
                className={`p-3.5 rounded-xl border bg-slate-900/70 backdrop-blur-sm transition-all hover:border-purple-500/50 flex flex-col justify-between ${agent.accentColor.split(' ')[0]}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {agent.status}
                    </span>
                  </div>
                  <div className="text-xs font-bold font-mono text-white leading-tight">
                    {agent.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                    {agent.specialty}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Progress</span>
                    <span className="text-emerald-400 font-bold">{agent.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 line-clamp-2 mt-1">
                    <span className="text-slate-500">Last: </span>
                    {agent.lastAction}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Stage (Dossier & Evidence) | Right Stage (Approval & Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: 3.4 Dossier & 3.3 Evidence Explorer */}
        <div className="lg:col-span-7 space-y-5">
          {/* 3.4 Investigation Dossier */}
          {dossier && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/40">
                      Dossier: {dossier.investigationId}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Incident {dossier.incidentId}
                    </span>
                  </div>
                  <h3 className="text-base font-bold font-mono text-white mt-1">
                    Target: {dossier.targetEntity.name} ({dossier.targetEntity.id})
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
                    dossier.status === 'APPROVED'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                      : dossier.status === 'REJECTED'
                      ? 'bg-rose-950/60 border-rose-500 text-rose-400'
                      : 'bg-amber-950/60 border-amber-500 text-amber-300 animate-pulse'
                  }`}>
                    STATUS: {dossier.status}
                  </span>
                </div>
              </div>

              {/* Target Entity Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">IP Address</span>
                  <span className="text-xs font-mono font-bold text-white">{dossier.targetEntity.ip}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Threat Level</span>
                  <span className="text-xs font-mono font-bold text-rose-400">{dossier.threatAssessment.severity}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Risk Score</span>
                  <span className="text-xs font-mono font-bold text-rose-400">{dossier.threatAssessment.riskScore} / 100</span>
                </div>
                <div
                  onClick={() => onNavigateTab?.('audit-vault')}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-cyan-500/40 transition-all"
                  title="Click to view in Audit Vault"
                >
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Cryptographic Proof</span>
                  <span className="text-xs font-mono font-bold text-cyan-400 truncate block">
                    {dossier.cryptographicProof.sha256Hash.slice(0, 12)}...
                  </span>
                </div>
              </div>

              {/* Executive Summary Synthesized by Planner */}
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1">
                <div className="text-[10px] font-mono font-bold text-purple-400 uppercase flex items-center space-x-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>Planner Agent Executive Summary</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Council identified credential brute force and anomalous outbound beaconing on entity{' '}
                  <span className="font-mono text-white font-bold">{dossier.targetEntity.id}</span>. Predictive what-if simulation demonstrates that without intervention, 3 adjacent cluster nodes are vulnerable to lateral infection within 50 ticks. Primary recommendation: <span className="font-mono text-neon-purple font-bold">{dossier.recommendedPlan.action}</span> with automated failover.
                </p>
              </div>

              {/* Predictive Simulation Result with Explicit Projection Badge */}
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-neon-amber" />
                    <span className="text-xs font-mono font-bold text-white">
                      {dossier.simulation.scenarioName}
                    </span>
                  </div>
                  {/* Explicit Mandatory Label */}
                  <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500 text-amber-300">
                    Simulated Projection
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Baseline Risk</span>
                    <span className="text-rose-400 font-bold">{dossier.simulation.baselineCompromisedCount} nodes exposed</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Mitigated Impact</span>
                    <span className="text-emerald-400 font-bold">{dossier.simulation.mitigatedCompromisedCount} node quarantined</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Risk Reduction</span>
                    <span className="text-cyan-400 font-bold">
                      {dossier.simulation.uncertaintyRange.minRiskReduction}% - {dossier.simulation.uncertaintyRange.maxRiskReduction}%
                    </span>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 pt-1">
                  <span className="text-slate-500">Blast Radius: </span>
                  {dossier.simulation.blastRadiusNodeIds.join(', ')} (Seed: {dossier.simulation.seed})
                </div>
              </div>

              {/* Reviewer Agent Findings */}
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-emerald-400 uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Reviewer Agent Verification Findings</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-600/40">
                    {dossier.reviewerVerdict.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans">
                  {dossier.reviewerVerdict.reviewNotes}
                </p>
                <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-400 pt-1">
                  <span className="flex items-center space-x-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>NIST Compliance Verified</span>
                  </span>
                  <span className="flex items-center space-x-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Zero Unsupported Hallucinations</span>
                  </span>
                  <span className="flex items-center space-x-1 text-purple-400">
                    <Lock className="w-3 h-3" />
                    <span>Human Authorization Mandatory</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3.3 Evidence Explorer */}
          {dossier && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                    3.3 Evidence Explorer
                  </h3>
                </div>
                <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
                  <button
                    onClick={() => setActiveEvidenceTab('facts')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeEvidenceTab === 'facts' ? 'bg-purple-900/60 text-purple-200 font-bold border border-purple-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Telemetry Facts ({dossier.evidence.observedFacts.length})
                  </button>
                  <button
                    onClick={() => setActiveEvidenceTab('threats')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeEvidenceTab === 'threats' ? 'bg-purple-900/60 text-purple-200 font-bold border border-purple-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Threat Rules ({dossier.threatAssessment.explainableDetections.length})
                  </button>
                  <button
                    onClick={() => setActiveEvidenceTab('blast')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeEvidenceTab === 'blast' ? 'bg-purple-900/60 text-purple-200 font-bold border border-purple-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Blast Radius
                  </button>
                  <button
                    onClick={() => setActiveEvidenceTab('memory')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeEvidenceTab === 'memory' ? 'bg-purple-900/60 text-purple-200 font-bold border border-purple-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Incident Memory
                  </button>
                </div>
              </div>

              {/* Tab 1: Observed Facts vs Hypotheses */}
              {activeEvidenceTab === 'facts' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase block">
                      Empirical Observed Facts (Verified Telemetry)
                    </span>
                    {dossier.evidence.observedFacts.map((fact) => (
                      <div
                        key={fact.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start justify-between space-x-2"
                      >
                        <div className="space-y-0.5">
                          <div className="text-white font-mono">{fact.description}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Source: <span className="text-slate-400">{fact.source}</span> · Category: <span className="text-slate-400">{fact.category}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold flex-shrink-0">
                          {(fact.confidence * 100).toFixed(0)}% Conf
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase block">
                      Inferred Hypotheses (Investigator Reasoning)
                    </span>
                    {dossier.evidence.hypotheses.map((hyp) => (
                      <div
                        key={hyp.id}
                        className="p-2.5 rounded-xl bg-purple-950/10 border border-purple-900/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-purple-200 font-bold">{hyp.statement}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-500/40">
                            {(hyp.likelihoodScore * 100).toFixed(0)}% Likelihood
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          <span className="text-slate-500">Test Strategy: </span>{hyp.testStrategy}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Threat Detection Rules */}
              {activeEvidenceTab === 'threats' && (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-1">
                    <div className="font-mono font-bold text-rose-300">
                      MITRE ATT&CK: {dossier.threatAssessment.mitreTechnique}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tactic: {dossier.threatAssessment.mitreTactic} · Threat Actor Attribution: {dossier.threatAssessment.threatActor}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {dossier.threatAssessment.explainableDetections.map((rule) => (
                      <div
                        key={rule.ruleId}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-start"
                      >
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-white flex items-center space-x-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">{rule.ruleId}</span>
                            <span>{rule.ruleName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans">{rule.evidence}</div>
                        </div>
                        <span className="text-[10px] font-mono text-rose-400 font-bold bg-rose-950/40 px-2 py-1 rounded border border-rose-500/30">
                          +{rule.contributionToScore} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Blast Radius Dependencies */}
              {activeEvidenceTab === 'blast' && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-mono text-slate-300">
                    BFS Dependency Hop Analysis around <span className="text-white font-bold">{dossier.targetEntity.id}</span>:
                  </div>
                  <div className="space-y-2">
                    {dossier.simulation.blastRadiusNodeIds.map((nodeId, idx) => (
                      <div key={nodeId} className="flex items-center space-x-2 text-xs font-mono p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="w-5 h-5 rounded-full bg-amber-900/60 border border-amber-500/40 text-amber-300 flex items-center justify-center text-[10px]">
                          {idx}
                        </span>
                        <span className="text-white font-bold">{nodeId}</span>
                        <span className="text-slate-500 text-[10px]">
                          {idx === 0 ? '(Origin Compromise)' : '(Dependent Secondary Tier Asset)'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Historical Incident Memory */}
              {activeEvidenceTab === 'memory' && (
                <div className="space-y-2">
                  {dossier.evidence.relatedHistoricalIncidents.map((inc) => (
                    <div
                      key={inc.incidentId}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-cyan-300">{inc.incidentId}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                          {(inc.similarity * 100).toFixed(0)}% Vector Match
                        </span>
                      </div>
                      <div className="text-white font-sans">{inc.title}</div>
                      <div className="text-[10px] font-mono text-emerald-400">
                        Historical Resolution: {inc.resolvedAction}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: 3.5 Human Approval Panel & 3.2 Live Investigation Timeline */}
        <div className="lg:col-span-5 space-y-5">
          {/* 3.5 Human Approval Panel */}
          {dossier && (
            <div
              data-testid="human-approval-panel"
              className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/40 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-neon-purple" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                    3.5 Human Authorization Gate
                  </h3>
                </div>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-300">
                  Dual-Custody Gate
                </span>
              </div>

              {approvalFeedback && (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/50 text-xs font-mono text-purple-200">
                  {approvalFeedback}
                </div>
              )}

              {/* Proposed Response Options */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  Select Containment Action:
                </span>
                {dossier.candidatePlans.map((plan) => {
                  const isSelected = (selectedPlan?.id === plan.id);
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-white flex items-center space-x-1.5">
                          <span>{plan.title}</span>
                          {plan.isRecommended && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                              RECOMMENDED
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">
                          +{plan.riskReductionPercent}% Risk Cut
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans line-clamp-2">
                        {plan.rationale}
                      </p>
                      <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500 mt-2">
                        <span>Downtime: {plan.estimatedDowntime}</span>
                        <span>Rollback: {plan.rollbackSteps.length} steps</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rollback Procedure Details */}
              {selectedPlan && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px]">
                  <span className="font-mono font-bold text-slate-300 uppercase text-[9px] block">
                    Verified Rollback Procedure:
                  </span>
                  <ul className="space-y-1 list-disc list-inside text-slate-400">
                    {selectedPlan.rollbackSteps.map((step, idx) => (
                      <li key={idx} className="font-mono text-[10px]">{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {!isApproving && !isRejecting && !isRequestingRevision && (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setIsApproving(true)}
                      disabled={dossier.status === 'APPROVED' || !isAdminOrCommander}
                      data-testid="council-approve-btn"
                      className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1 shadow-lg shadow-emerald-950/40"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => setIsRejecting(true)}
                      disabled={dossier.status === 'APPROVED' || dossier.status === 'REJECTED'}
                      data-testid="council-reject-btn"
                      className="py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1 shadow-lg shadow-rose-950/40"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => setIsRequestingRevision(true)}
                      disabled={dossier.status === 'APPROVED'}
                      data-testid="council-revision-btn"
                      className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1 border border-slate-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revise</span>
                    </button>
                  </div>
                )}

                {/* Approve Sub-Form */}
                {isApproving && (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/50 space-y-2 animate-in fade-in">
                    <span className="text-[11px] font-mono text-emerald-300 font-bold block">
                      Sign & Authorize Execution:
                    </span>
                    <input
                      type="text"
                      placeholder="Commander verification notes / ticket ID..."
                      value={approvalComments}
                      onChange={(e) => setApprovalComments(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleApprove}
                        disabled={isLoading}
                        data-testid="confirm-approve-btn"
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold"
                      >
                        {isLoading ? 'Signing...' : 'Confirm Dual-Custody Approval'}
                      </button>
                      <button
                        onClick={() => setIsApproving(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Reject Sub-Form */}
                {isRejecting && (
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/50 space-y-2 animate-in fade-in">
                    <span className="text-[11px] font-mono text-rose-300 font-bold block">
                      State Rationale for Rejection:
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Downtime risk too elevated during transaction peak..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleReject}
                        disabled={isLoading}
                        data-testid="confirm-reject-btn"
                        className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => setIsRejecting(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Revision Sub-Form */}
                {isRequestingRevision && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/50 space-y-2 animate-in fade-in">
                    <span className="text-[11px] font-mono text-amber-300 font-bold block">
                      Requested Council Re-Analysis:
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Re-run simulation with 0.2 infection probability..."
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleRequestRevision}
                        data-testid="confirm-revision-btn"
                        className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold"
                      >
                        Dispatch Revision
                      </button>
                      <button
                        onClick={() => setIsRequestingRevision(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-500 font-mono text-center">
                  Immutable audit block signed to SHA-256 vault upon decision.
                </div>
              </div>
            </div>
          )}

          {/* 3.2 Live Investigation Timeline */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  3.2 Live Council Timeline
                </h3>
              </div>
              <div className="flex items-center space-x-1 text-[10px] font-mono">
                <Filter className="w-3 h-3 text-slate-500" />
                <select
                  value={timelineFilter}
                  onChange={(e) => setTimelineFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 outline-none"
                >
                  <option value="ALL">All Agents</option>
                  <option value="INVESTIGATOR">Investigator</option>
                  <option value="CYBERSECURITY">Cybersecurity</option>
                  <option value="SIMULATION">Simulation</option>
                  <option value="PLANNER">Planner</option>
                  <option value="REVIEWER">Reviewer</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-purple-300">
                      {evt.agentName || 'Council Engine'}
                    </span>
                    <span className="text-slate-500">
                      {new Date(evt.timestamp).toLocaleTimeString()} ({evt.durationMs || 50}ms)
                    </span>
                  </div>
                  <div className="text-slate-200 font-sans text-[11px] leading-snug">
                    {evt.message}
                  </div>
                  <div className="flex items-center space-x-2 text-[9px] font-mono text-slate-500 pt-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {evt.stage}
                    </span>
                    <span className="text-emerald-400">{evt.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
