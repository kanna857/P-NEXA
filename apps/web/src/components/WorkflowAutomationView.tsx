import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  NodeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Workflow,
  Sparkles,
  CheckCircle2,
  PauseCircle,
  UserCheck,
  ShieldAlert,
  Server,
  Scissors,
  Bell,
  Eye,
  Activity
} from 'lucide-react';

interface PlaybookStepData {
  stepNumber: number;
  label: string;
  description: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'COMPLETED' | 'PAUSED' | 'PENDING';
  actor: string;
  iconType: 'alert' | 'diagnostic' | 'calc' | 'approval' | 'quarantine' | 'sever' | 'notify';
}

const STEP_ICONS = {
  alert: ShieldAlert,
  diagnostic: Eye,
  calc: Activity,
  approval: UserCheck,
  quarantine: Server,
  sever: Scissors,
  notify: Bell
};

const RISK_COLORS = {
  LOW: { text: 'text-slate-400', bg: 'bg-slate-800/80', border: 'border-slate-700' },
  MEDIUM: { text: 'text-neon-cyan', bg: 'bg-neon-cyan/20', border: 'border-neon-cyan/40' },
  HIGH: { text: 'text-neon-amber', bg: 'bg-neon-amber/20', border: 'border-neon-amber/40' },
  CRITICAL: { text: 'text-neon-alert', bg: 'bg-neon-alert/20', border: 'border-neon-alert/40' }
};

// ── Custom React Flow Playbook Node (xyflow pattern) ──────────────────────
function PlaybookFlowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as PlaybookStepData;
  const Icon = STEP_ICONS[nodeData.iconType] || Activity;
  const riskTheme = RISK_COLORS[nodeData.risk] || RISK_COLORS.LOW;

  const isCompleted = nodeData.status === 'COMPLETED';
  const isPaused = nodeData.status === 'PAUSED';

  return (
    <div
      className={`relative rounded-xl border font-mono text-xs select-none transition-all w-64 p-3.5 shadow-xl ${
        isCompleted
          ? 'bg-slate-950/90 border-neon-matrix/40 shadow-neon-matrix/10'
          : isPaused
          ? 'bg-slate-950/95 border-neon-amber shadow-neon-amber/20 ring-2 ring-neon-amber/40'
          : 'bg-slate-950/70 border-surface-border text-slate-400'
      } ${selected ? 'ring-2 ring-neon-cyan' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 bg-neon-cyan border-2 border-slate-900"
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span
            className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              isCompleted
                ? 'bg-neon-matrix/20 text-neon-matrix'
                : isPaused
                ? 'bg-neon-amber/20 text-neon-amber animate-pulse'
                : 'bg-slate-900 text-slate-500'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </span>
          <span className="text-[10px] text-slate-400 font-bold">
            Step {nodeData.stepNumber}
          </span>
        </div>

        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${riskTheme.bg} ${riskTheme.text} ${riskTheme.border}`}
        >
          {nodeData.risk}
        </span>
      </div>

      <div className="text-white font-bold text-xs truncate mb-1">
        {nodeData.label}
      </div>
      <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">
        {nodeData.description}
      </p>

      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px]">
        <span className="text-slate-500">Actor: {nodeData.actor}</span>
        <span
          className={`font-bold flex items-center space-x-1 ${
            isCompleted
              ? 'text-neon-matrix'
              : isPaused
              ? 'text-neon-amber'
              : 'text-slate-500'
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              <span>DONE</span>
            </>
          ) : isPaused ? (
            <>
              <PauseCircle className="w-3 h-3 animate-spin" />
              <span>GATED</span>
            </>
          ) : (
            <span>PENDING</span>
          )}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-neon-cyan border-2 border-slate-900"
      />
    </div>
  );
}

export const WorkflowAutomationView: React.FC = () => {
  const [nlPrompt, setNlPrompt] = useState(
    'Synthesize an orbital satellite mesh with 6 communication relays, cross-link encryption, and downlinks to ground telemetry stations.'
  );
  const [generationOutput, setGenerationOutput] = useState<string | null>(null);

  const [workflowStatus, setWorkflowStatus] = useState<'WAITING_FOR_APPROVAL' | 'COMPLETED'>('WAITING_FOR_APPROVAL');
  const [signers, setSigners] = useState<string[]>(['officer@aegis.defense']);
  const [selectedNodeData, setSelectedNodeData] = useState<PlaybookStepData | null>(null);

  // Playbook step definitions
  const stepsConfig: PlaybookStepData[] = useMemo(
    () => [
      {
        stepNumber: 1,
        label: 'Alert Triage & MITRE Correlation',
        description: 'Analyzes inbound SMB NetFlow telemetry, maps T1486 lateral pattern.',
        risk: 'LOW',
        status: 'COMPLETED',
        actor: 'agent_soc_triage',
        iconType: 'alert'
      },
      {
        stepNumber: 2,
        label: 'Deep Host Diagnostic Check',
        description: 'Runs integrity audit on node-app-cluster, scans memory pointers.',
        risk: 'LOW',
        status: 'COMPLETED',
        actor: 'agent_threat_hunter',
        iconType: 'diagnostic'
      },
      {
        stepNumber: 3,
        label: 'Blast Radius Calculation',
        description: 'Computes 3-hop topological blast radius across 12 downstream subnets.',
        risk: 'LOW',
        status: 'COMPLETED',
        actor: 'agent_incident_responder',
        iconType: 'calc'
      },
      {
        stepNumber: 4,
        label: 'Dual-Custody Human Sign-Off Gate',
        description: 'Requires 2 independent cryptographically signed human approvals.',
        risk: 'CRITICAL',
        status: workflowStatus === 'COMPLETED' ? 'COMPLETED' : 'PAUSED',
        actor: 'SecOps Officer + Commander',
        iconType: 'approval'
      },
      {
        stepNumber: 5,
        label: 'Automated Host Quarantine',
        description: 'Applies cgroups containment & virtual network adapter suspension.',
        risk: 'HIGH',
        status: workflowStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        actor: 'world-engine / kernel-shim',
        iconType: 'quarantine'
      },
      {
        stepNumber: 6,
        label: 'Perimeter Network Severance',
        description: 'Drops border firewall transit routes for Port 445 on edge firewalls.',
        risk: 'HIGH',
        status: workflowStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        actor: 'firewall-controller',
        iconType: 'sever'
      },
      {
        stepNumber: 7,
        label: 'SOC War Room Alert Broadcast',
        description: 'Broadcasts containment completion to incident responders and audit vault.',
        risk: 'LOW',
        status: workflowStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        actor: 'agent_policy_auditor',
        iconType: 'notify'
      }
    ],
    [workflowStatus]
  );

  // Generate React Flow Nodes with staggered horizontal layout
  const initialNodes: Node[] = useMemo(() => {
    return stepsConfig.map((st, i) => {
      // 2 rows layout: steps 1-4 on row 1, steps 5-7 on row 2
      const isRow2 = i >= 4;
      const x = isRow2 ? (i - 4) * 320 + 80 : i * 320 + 50;
      const y = isRow2 ? 220 : 50;

      return {
        id: `step-${st.stepNumber}`,
        type: 'playbookNode',
        position: { x, y },
        data: st as unknown as Record<string, unknown>
      };
    });
  }, [stepsConfig]);

  // Generate React Flow Edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 1; i < stepsConfig.length; i++) {
      const from = `step-${i}`;
      const to = `step-${i + 1}`;
      const isPastApproval = i >= 4;
      const isExecuting = i === 3 && workflowStatus === 'WAITING_FOR_APPROVAL';

      edges.push({
        id: `e-${from}-${to}`,
        source: from,
        target: to,
        animated: isExecuting || (workflowStatus === 'COMPLETED' && isPastApproval),
        style: {
          stroke:
            workflowStatus === 'COMPLETED' || i < 4
              ? '#00ff66'
              : '#ffb800',
          strokeWidth: 2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: workflowStatus === 'COMPLETED' || i < 4 ? '#00ff66' : '#ffb800'
        }
      });
    }
    return edges;
  }, [stepsConfig, workflowStatus]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when workflow completes
  React.useEffect(() => {
    // updates reflected via useMemo
  }, [workflowStatus]);

  const nodeTypes = useMemo(() => ({ playbookNode: PlaybookFlowNode }), []);

  const handleGenerateWorld = () => {
    setGenerationOutput(
      'Synthesized Satellite Mesh Topology: 6 satellite nodes positioned across hierarchical orbital clusters, 8 encrypted inter-satellite optical links, 2 ground gateway stations. 3D coordinates assigned.'
    );
  };

  const handleSignSecondApproval = () => {
    setSigners([...signers, 'commander@aegis.defense']);
    setWorkflowStatus('COMPLETED');
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data as unknown as PlaybookStepData);
  }, []);

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="glass-panel p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-neon-cyan mb-1">
            <Workflow className="w-4 h-4" />
            <span>VISUAL WORKFLOW PLAYBOOK EDITOR (XYFLOW / REACT FLOW)</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Workflow Automation & HITL Dual-Custody (Phase 7 Verified)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Interactive node-based incident response playbooks with animated execution tracing and multi-person cryptographic gates.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center space-x-1.5 ${
              workflowStatus === 'COMPLETED'
                ? 'bg-neon-matrix/20 text-neon-matrix border-neon-matrix/40 shadow-neon-matrix/20'
                : 'bg-neon-amber/20 text-neon-amber border-neon-amber/40 shadow-neon-amber/20'
            }`}
          >
            {workflowStatus === 'COMPLETED' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <PauseCircle className="w-4 h-4 animate-spin" />
            )}
            <span>STATUS: {workflowStatus}</span>
          </span>
        </div>
      </div>

      {/* Natural Language World Generation Console */}
      <div className="glass-panel p-5 rounded-xl border border-surface-border space-y-3">
        <div className="flex items-center space-x-2 text-neon-purple font-bold">
          <Sparkles className="w-4 h-4" />
          <span>NATURAL LANGUAGE DIGITAL TWIN WORLD GENERATOR</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            className="flex-1 bg-slate-950/80 border border-surface-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-neon-cyan"
          />
          <button
            onClick={handleGenerateWorld}
            className="px-4 py-2 rounded-lg bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple border border-neon-purple/40 font-bold transition-all flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Synthesize World</span>
          </button>
        </div>
        {generationOutput && (
          <div className="p-3 bg-neon-purple/10 border border-neon-purple/30 rounded-lg text-slate-300 leading-relaxed text-[11px]">
            {generationOutput}
          </div>
        )}
      </div>

      {/* Visual Workflow Playbook Editor Canvas (xyflow / React Flow) */}
      <div className="glass-panel p-5 rounded-xl border border-surface-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-bold text-white text-sm flex items-center space-x-2">
            <span>Emergency Ransomware Containment Playbook (node-app-cluster)</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-neon-cyan border border-slate-700">
              Interactive Canvas
            </span>
          </div>

          <div className="text-[10px] text-slate-400">
            Drag nodes to rearrange • Click any node to inspect execution details
          </div>
        </div>

        {/* The React Flow Canvas Container */}
        <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-800 bg-[#07090e]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.4}
            maxZoom={1.5}
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="!bg-slate-900 !border-slate-700 !text-slate-300 fill-slate-300" />
            <MiniMap
              nodeColor={() => '#2563eb'}
              maskColor="rgba(7, 9, 14, 0.7)"
              className="!bg-slate-950/80 !border-slate-800 !rounded-lg"
            />
          </ReactFlow>

          {/* Node Inspector Drawer */}
          {selectedNodeData && (
            <div className="absolute top-4 right-4 z-20 w-80 p-4 rounded-xl bg-slate-950/95 border border-neon-cyan/40 shadow-2xl space-y-3 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-white font-bold text-xs">
                  Step {selectedNodeData.stepNumber}: {selectedNodeData.label}
                </span>
                <button
                  onClick={() => setSelectedNodeData(null)}
                  className="text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500">Risk Assessment:</span>{' '}
                  <span className="font-bold text-white">{selectedNodeData.risk}</span>
                </div>
                <div>
                  <span className="text-slate-500">Assigned Actor:</span>{' '}
                  <span className="text-neon-cyan">{selectedNodeData.actor}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{' '}
                  <span
                    className={
                      selectedNodeData.status === 'COMPLETED'
                        ? 'text-neon-matrix font-bold'
                        : selectedNodeData.status === 'PAUSED'
                        ? 'text-neon-amber font-bold'
                        : 'text-slate-400'
                    }
                  >
                    {selectedNodeData.status}
                  </span>
                </div>
                <div className="text-slate-400 leading-snug pt-1 border-t border-slate-800">
                  {selectedNodeData.description}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dual-Custody Approval Controls */}
        {workflowStatus === 'WAITING_FOR_APPROVAL' && (
          <div className="p-4 bg-slate-950/90 border border-neon-amber/50 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-neon-amber font-bold">
              <UserCheck className="w-4 h-4" />
              <span>Step 4 Gated: Multi-Signer Dual Custody Required</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Host isolation and perimeter link severance require two independent authorized security officers under zero-trust governance. Signer 1 ({signers[0]}) has signed.
            </p>
            <button
              onClick={handleSignSecondApproval}
              className="px-4 py-2 rounded-lg bg-neon-amber/20 hover:bg-neon-amber/30 text-neon-amber border border-neon-amber/40 font-bold transition-all shadow-lg hover:shadow-neon-amber/20 flex items-center space-x-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Sign As Commander (Sarah Connor) — Authorize Playbook Execution</span>
            </button>
          </div>
        )}

        {workflowStatus === 'COMPLETED' && (
          <div className="p-3 bg-neon-matrix/10 border border-neon-matrix/30 rounded-lg text-neon-matrix flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>
              All 7 steps completed. Immutable SHA-256 audit proof hash:{' '}
              <span className="font-mono text-[10px]">
                e928a471b0c94f18d726b0192840192830192840192830192840192830192840
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
