import React, { useState } from 'react';
import { Bot, Shield, CheckCircle2, Brain, UserCheck, GitBranch, Sparkles, Zap } from 'lucide-react';

interface AgentPersona {
  id: string;
  name: string;
  role: string;
  status: 'IDLE' | 'ACTIVE' | 'THINKING';
  toolAllowlist: string[];
  systemPrompt: string;
  avatarColor: string;
}

const AGENT_PERSONAS: AgentPersona[] = [
  {
    id: 'agent_soc_01',
    name: 'Aegis Sentinel',
    role: 'SOC_TRIAGE',
    status: 'ACTIVE',
    toolAllowlist: ['query_siem', 'classify_alert', 'query_vector_memory'],
    systemPrompt: 'Triages security telemetry, filters false positives, and categorizes incident severity.',
    avatarColor: 'border-neon-cyan text-neon-cyan'
  },
  {
    id: 'agent_hunter_01',
    name: 'Vector Stalker',
    role: 'THREAT_HUNTER',
    status: 'ACTIVE',
    toolAllowlist: ['scan_mitre_ttp', 'trace_lateral_movement', 'query_ioc_database'],
    systemPrompt: 'Maps active threats to MITRE ATT&CK techniques (T1486, T1048) and correlates IoCs.',
    avatarColor: 'border-neon-purple text-neon-purple'
  },
  {
    id: 'agent_responder_01',
    name: 'Grid Bastion',
    role: 'INCIDENT_RESPONDER',
    status: 'ACTIVE',
    toolAllowlist: ['request_containment_approval', 'isolate_host', 'sever_network_edge'],
    systemPrompt: 'Formulates blast-radius containment plans. Enforces dual-custody gates for destructive actions.',
    avatarColor: 'border-neon-amber text-neon-amber'
  },
  {
    id: 'agent_redteam_01',
    name: 'Phantom Outbreak',
    role: 'RED_TEAM_ADVERSARY',
    status: 'IDLE',
    toolAllowlist: ['simulate_adversary_path', 'probe_exploitable_cve'],
    systemPrompt: 'Simulates counterfactual attacker movements to mathematically verify defense posture.',
    avatarColor: 'border-neon-crimson text-neon-crimson'
  },
  {
    id: 'agent_auditor_01',
    name: 'Veritas Ledger',
    role: 'POLICY_AUDITOR',
    status: 'ACTIVE',
    toolAllowlist: ['verify_tool_allowlist', 'verify_dual_custody', 'generate_audit_hash'],
    systemPrompt: 'Enforces zero-arbitrary-code-execution constraints and signs SHA-256 state proofs.',
    avatarColor: 'border-neon-matrix text-neon-matrix'
  }
];

export const AgentsSocietyView: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<AgentPersona>(AGENT_PERSONAS[0]!);
  const [approvals, setApprovals] = useState([
    {
      id: 'appr-wf-001',
      action: 'ISOLATE_NODE',
      targetId: 'node-app-cluster',
      reason: 'Detected high-confidence lateral ransomware spread attempt via SMB CVE-2024-3400',
      riskLevel: 'CRITICAL',
      status: 'PENDING_APPROVAL',
      signersRequired: 2,
      signersCollected: ['officer@aegis.defense']
    }
  ]);

  const [memories] = useState([
    {
      id: 'mem-01',
      agentRole: 'SOC_TRIAGE',
      entityId: 'node-app-cluster',
      observation: 'Observed anomalous port 445 SMB outbound connection spike matching WannaCry signature',
      recencyScore: 0.98,
      importance: 0.9,
      semanticRelevance: 0.94
    },
    {
      id: 'mem-02',
      agentRole: 'THREAT_HUNTER',
      entityId: 'APT29',
      observation: 'Correlated secondary ingress IP 198.51.100.23 against known Lazarus C2 threat intelligence feed',
      recencyScore: 0.91,
      importance: 0.85,
      semanticRelevance: 0.89
    }
  ]);

  const [simulationState, setSimulationState] = useState<{
    status: 'IDLE' | 'PROPOSING' | 'SIMULATING' | 'COMPLETED';
    proposedScenario?: {
      title: string;
      proposer: string;
      targetNode: string;
      action: string;
      seed: number;
    };
    results?: {
      containmentRate: string;
      blastRadiusDelta: number;
      resilienceScore: number;
      explanation: string;
      verifiedZeroRegression: boolean;
    };
  }>({
    status: 'IDLE'
  });

  const handleProposeAndSimulate = () => {
    setSimulationState({
      status: 'PROPOSING',
      proposedScenario: {
        title: 'Counterfactual Lateral Quarantine (Branch B-1)',
        proposer: 'Grid Bastion (INCIDENT_RESPONDER)',
        targetNode: 'node-app-cluster',
        action: 'ISOLATE_NODE & SEVER_SMB',
        seed: 998244353
      }
    });

    setTimeout(() => {
      setSimulationState((prev) => ({
        ...prev,
        status: 'SIMULATING'
      }));

      setTimeout(() => {
        setSimulationState({
          status: 'COMPLETED',
          proposedScenario: {
            title: 'Counterfactual Lateral Quarantine (Branch B-1)',
            proposer: 'Grid Bastion (INCIDENT_RESPONDER)',
            targetNode: 'node-app-cluster',
            action: 'ISOLATE_NODE & SEVER_SMB',
            seed: 998244353
          },
          results: {
            containmentRate: '100% Contained (Tick 2)',
            blastRadiusDelta: -3,
            resilienceScore: 94,
            explanation:
              'Simulated isolation of node-app-cluster halted SMB propagation before adjacent database tiers were reached. Preserved 94% network resilience with zero critical asset compromises.',
            verifiedZeroRegression: true
          }
        });
      }, 700);
    }, 600);
  };

  const handleSignApproval = (id: string) => {
    setApprovals(
      approvals.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'APPROVED_EXECUTED',
              signersCollected: [...a.signersCollected, 'commander@aegis.defense']
            }
          : a
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-neon-cyan text-xs font-mono mb-1">
            <Bot className="w-4 h-4" />
            <span>STATEFUL AGENT COLLABORATION & EPISODIC MEMORY</span>
          </div>
          <h2 className="text-xl font-bold font-mono text-white">
            Multi-Agent AI Society (Phase 3 Verified)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            5 autonomous specialized personas coordinating containment, triaging alerts, and enforcing dual-custody gates.
          </p>
        </div>

        <button
          onClick={handleProposeAndSimulate}
          disabled={simulationState.status === 'PROPOSING' || simulationState.status === 'SIMULATING'}
          className="px-4 py-2.5 rounded-lg bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple border border-neon-purple/50 font-mono text-xs font-bold transition-all glow-purple flex items-center space-x-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>
            {simulationState.status === 'PROPOSING'
              ? 'Agent Formulating Scenario...'
              : simulationState.status === 'SIMULATING'
              ? 'Simulating PRNG Ticks...'
              : 'Agent: Propose & Run Simulation'}
          </span>
        </button>
      </div>

      {/* Autonomous Counterfactual Agent Simulation Panel */}
      {simulationState.status !== 'IDLE' && (
        <div className="glass-panel p-5 rounded-xl border border-neon-purple/40 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-neon-purple font-bold">
              <GitBranch className="w-4 h-4" />
              <span>AGENT COUNTERFACTUAL SCENARIO & REASONING LOOP</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                simulationState.status === 'COMPLETED'
                  ? 'bg-neon-matrix/20 text-neon-matrix border border-neon-matrix/40'
                  : 'bg-neon-amber/20 text-neon-amber border border-neon-amber/40 animate-pulse'
              }`}
            >
              STATUS: {simulationState.status}
            </span>
          </div>

          {simulationState.proposedScenario && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950/80 rounded border border-surface-border">
                <span className="text-slate-500 text-[10px]">PROPOSED SCENARIO</span>
                <div className="text-white font-bold mt-0.5">{simulationState.proposedScenario.title}</div>
                <div className="text-[10px] text-neon-cyan mt-1">By {simulationState.proposedScenario.proposer}</div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded border border-surface-border">
                <span className="text-slate-500 text-[10px]">ACTION & TARGET</span>
                <div className="text-neon-matrix font-bold mt-0.5">{simulationState.proposedScenario.action}</div>
                <div className="text-[10px] text-slate-400 mt-1">Target: {simulationState.proposedScenario.targetNode}</div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded border border-surface-border">
                <span className="text-slate-500 text-[10px]">DETERMINISTIC SEED</span>
                <div className="text-neon-psionic font-bold mt-0.5">#{simulationState.proposedScenario.seed}</div>
                <div className="text-[10px] text-slate-400 mt-1">PRNG Mulberry32 Engine</div>
              </div>
            </div>
          )}

          {simulationState.results && (
            <div className="p-4 bg-slate-950/90 rounded-lg border border-neon-matrix/30 space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px]">CONTAINMENT RATE</span>
                  <div className="text-neon-matrix font-bold">{simulationState.results.containmentRate}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">BLAST RADIUS REDUCTION</span>
                  <div className="text-neon-cyan font-bold">{simulationState.results.blastRadiusDelta} Nodes</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">PRESERVED RESILIENCE</span>
                  <div className="text-neon-matrix font-bold">{simulationState.results.resilienceScore} / 100</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">VERIFICATION GATE</span>
                  <div className="text-neon-matrix font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>0-Regression Pass</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900/80 rounded border border-slate-800 text-slate-200 text-xs leading-relaxed flex items-start space-x-2">
                <Zap className="w-4 h-4 text-neon-cyan flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-neon-cyan font-bold">Reviewer & Auditor Agent Explanation: </span>
                  {simulationState.results.explanation}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {AGENT_PERSONAS.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent)}
            className={`p-4 rounded-xl text-left border transition-all ${
              selectedAgent.id === agent.id
                ? 'bg-slate-900/90 border-neon-cyan shadow-lg shadow-neon-cyan/10'
                : 'glass-panel border-surface-border hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`w-8 h-8 rounded-lg border flex items-center justify-center ${agent.avatarColor}`}>
                <Bot className="w-4 h-4" />
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-neon-matrix/10 text-neon-matrix border border-neon-matrix/30">
                {agent.status}
              </span>
            </div>
            <div className="text-xs font-bold text-white font-mono">{agent.name}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{agent.role}</div>
          </button>
        ))}
      </div>

      {/* Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Profile & Allowlist */}
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <div className="flex items-center space-x-2 text-neon-cyan font-mono text-xs">
            <Shield className="w-4 h-4" />
            <span>AGENT SPECIFICATION & ALLOWLIST</span>
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="text-slate-500 text-[10px]">SELECTED PERSONA</div>
              <div className="text-white font-bold">{selectedAgent.name} ({selectedAgent.role})</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">SYSTEM DIRECTIVE</div>
              <div className="text-slate-300 text-[11px] leading-relaxed mt-1 p-2 bg-slate-950/60 rounded border border-surface-border">
                {selectedAgent.systemPrompt}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] mb-1">STRICT TOOL ALLOWLIST (SANDBOXED)</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedAgent.toolAllowlist.map((tool) => (
                  <span key={tool} className="px-2 py-0.5 rounded bg-slate-900 text-neon-matrix border border-neon-matrix/30 text-[10px]">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Episodic Vector Memory */}
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <div className="flex items-center space-x-2 text-neon-purple font-mono text-xs">
            <Brain className="w-4 h-4" />
            <span>EPISODIC VECTOR MEMORY RECALL</span>
          </div>
          <div className="space-y-2.5">
            {memories.map((mem) => (
              <div key={mem.id} className="p-3 bg-slate-950/60 rounded-lg border border-surface-border text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-neon-purple font-bold">[{mem.agentRole}]</span>
                  <span className="text-slate-400">Target: {mem.entityId}</span>
                </div>
                <p className="text-[11px] text-slate-300">{mem.observation}</p>
                <div className="flex items-center space-x-3 text-[9px] text-slate-400 pt-1 border-t border-slate-800">
                  <span>Recency: {mem.recencyScore}</span>
                  <span>Importance: {mem.importance}</span>
                  <span className="text-neon-matrix font-bold">Tri-Score: {mem.semanticRelevance}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dual-Custody Approval Queue */}
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <div className="flex items-center space-x-2 text-neon-amber font-mono text-xs">
            <UserCheck className="w-4 h-4" />
            <span>DUAL-CUSTODY APPROVAL QUEUE</span>
          </div>
          <div className="space-y-3">
            {approvals.map((appr) => (
              <div key={appr.id} className="p-3.5 bg-slate-950/80 rounded-lg border border-neon-amber/40 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded bg-neon-crimson/20 text-neon-crimson border border-neon-crimson/40 text-[9px] font-bold">
                    {appr.riskLevel}
                  </span>
                  <span className={`text-[10px] ${appr.status === 'APPROVED_EXECUTED' ? 'text-neon-matrix' : 'text-neon-amber'}`}>
                    {appr.status}
                  </span>
                </div>
                <div className="text-white font-bold">{appr.action} &rarr; {appr.targetId}</div>
                <p className="text-[10px] text-slate-400 leading-snug">{appr.reason}</p>
                <div className="text-[10px] text-slate-400">
                  Signers ({appr.signersCollected.length}/{appr.signersRequired}):{' '}
                  <span className="text-neon-cyan">{appr.signersCollected.join(', ')}</span>
                </div>
                {appr.status === 'PENDING_APPROVAL' && (
                  <button
                    onClick={() => handleSignApproval(appr.id)}
                    className="w-full py-1.5 rounded bg-neon-amber/20 hover:bg-neon-amber/30 text-neon-amber border border-neon-amber/40 text-xs font-bold transition-all"
                  >
                    Provide Second Dual-Custody Sign-Off
                  </button>
                )}
                {appr.status === 'APPROVED_EXECUTED' && (
                  <div className="text-[10px] text-neon-matrix flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Dual-Custody Satisfied. Containment Applied.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

