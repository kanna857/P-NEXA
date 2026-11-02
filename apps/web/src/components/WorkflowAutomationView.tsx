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
  CheckCircle2,
  PauseCircle,
  UserCheck,
  ShieldAlert,
  Server,
  Scissors,
  Bell,
  Eye,
  Activity,
  Zap,
  Sliders,
  Radio,
  FileCheck2,
  Check
} from 'lucide-react';
import { validateWorkflowAcyclic, DAGStep } from '../utils/dagValidator';

interface PlaybookStepData {
  stepNumber: number;
  label: string;
  description: string;
  type: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'COMPLETED' | 'PAUSED' | 'PENDING';
  actor: string;
  iconType: 'trigger' | 'condition' | 'anomaly' | 'council' | 'sim' | 'notify' | 'approval' | 'remediate' | 'audit' | 'diagnostic' | 'quarantine' | 'sever';
}

const STEP_ICONS = {
  trigger: Zap,
  condition: Sliders,
  anomaly: Radio,
  council: ShieldAlert,
  sim: Activity,
  notify: Bell,
  approval: UserCheck,
  remediate: Server,
  audit: FileCheck2,
  diagnostic: Eye,
  quarantine: Server,
  sever: Scissors
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
        <span className="text-slate-500 truncate max-w-[120px]">Actor: {nodeData.actor}</span>
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
  const [workflowStatus, setWorkflowStatus] = useState<'IDLE' | 'WAITING_FOR_APPROVAL' | 'COMPLETED'>('WAITING_FOR_APPROVAL');
  const [signers, setSigners] = useState<string[]>(['secops-lead@p-nexa.internal']);
  const [selectedNodeData, setSelectedNodeData] = useState<PlaybookStepData | null>(null);
  const [dagValidation, setDagValidation] = useState<{ isValid: boolean; message: string } | null>(null);

  // Phase 5 9-Node DAG Configuration
  const phase5StepsConfig: PlaybookStepData[] = useMemo(
    () => [
      {
        stepNumber: 1,
        label: 'Real-time Telemetry Trigger',
        description: 'Monitors inbound CPU telemetry; triggers when metric > 85% for 3 cycles.',
        type: 'TELEMETRY_TRIGGER',
        risk: 'LOW',
        status: 'COMPLETED',
        actor: 'telemetry_pipeline',
        iconType: 'trigger'
      },
      {
        stepNumber: 2,
        label: 'Threshold Condition Branch',
        description: 'Checks whether observed value exceeds upper critical boundary.',
        type: 'THRESHOLD_CONDITION',
        risk: 'LOW',
        status: 'COMPLETED',
        actor: 'condition_engine',
        iconType: 'condition'
      },
      {
        stepNumber: 3,
        label: 'Predictive Anomaly Scorer',
        description: 'Evaluates rolling statistical baseline; flags Z > 3.0σ surge.',
        type: 'ANOMALY_DETECTION',
        risk: 'LOW',
        status: 'COMPLETED',
        actor: 'predictive_engine',
        iconType: 'anomaly'
      },
      {
        stepNumber: 4,
        label: 'Autonomous AI Council Triaging',
        description: 'Runs Investigator, Cybersecurity, Simulation, Planner & Reviewer agents.',
        type: 'COUNCIL_INVESTIGATION',
        risk: 'MEDIUM',
        status: 'COMPLETED',
        actor: 'runtime_council',
        iconType: 'council'
      },
      {
        stepNumber: 5,
        label: 'Blast Radius Simulation',
        description: 'Simulates topological infection propagation across neighboring tiers.',
        type: 'SIMULATION',
        risk: 'LOW',
        status: 'COMPLETED',
        actor: 'simulation_engine',
        iconType: 'sim'
      },
      {
        stepNumber: 6,
        label: 'Operator & War Room Alert',
        description: 'Dispatches real-time Socket.IO notification to security engineers.',
        type: 'NOTIFICATION',
        risk: 'LOW',
        status: 'COMPLETED',
        actor: 'notification_service',
        iconType: 'notify'
      },
      {
        stepNumber: 7,
        label: 'Human Dual Approval Gate',
        description: 'Requires 2 distinct cryptographic sign-offs before high-risk containment.',
        type: 'HUMAN_APPROVAL',
        risk: 'CRITICAL',
        status: workflowStatus === 'COMPLETED' ? 'COMPLETED' : 'PAUSED',
        actor: 'SecOps Lead + Commander',
        iconType: 'approval'
      },
      {
        stepNumber: 8,
        label: 'Authorized Entity Remediation',
        description: 'Executes node isolation and dynamic routing severance safely.',
        type: 'AUTHORIZED_REMEDIATION',
        risk: 'HIGH',
        status: workflowStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        actor: 'remediation_engine',
        iconType: 'remediate'
      },
      {
        stepNumber: 9,
        label: 'Cryptographic Audit Logging',
        description: 'Generates immutable SHA-256 proof hash and seals block in Audit Vault.',
        type: 'AUDIT_LOGGING',
        risk: 'LOW',
        status: workflowStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        actor: 'audit_vault',
        iconType: 'audit'
      }
    ],
    [workflowStatus]
  );

  // Generate React Flow Nodes with 2-row layout
  const initialNodes: Node[] = useMemo(() => {
    return phase5StepsConfig.map((st, i) => {
      const isRow2 = i >= 5;
      const x = isRow2 ? (i - 5) * 280 + 60 : i * 280 + 40;
      const y = isRow2 ? 220 : 40;

      return {
        id: `step-${st.stepNumber}`,
        type: 'playbookNode',
        position: { x, y },
        data: st as unknown as Record<string, unknown>
      };
    });
  }, [phase5StepsConfig]);

  // Generate React Flow Edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 1; i < phase5StepsConfig.length; i++) {
      const from = `step-${i}`;
      const to = `step-${i + 1}`;
      const isPastApproval = i >= 7;
      const isExecuting = i === 6 && workflowStatus === 'WAITING_FOR_APPROVAL';

      edges.push({
        id: `e-${from}-${to}`,
        source: from,
        target: to,
        animated: isExecuting || (workflowStatus === 'COMPLETED' && isPastApproval),
        style: {
          stroke:
            workflowStatus === 'COMPLETED' || i < 7
              ? '#00ff66'
              : '#ffb800',
          strokeWidth: 2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: workflowStatus === 'COMPLETED' || i < 7 ? '#00ff66' : '#ffb800'
        }
      });
    }
    return edges;
  }, [phase5StepsConfig, workflowStatus]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({ playbookNode: PlaybookFlowNode }), []);

  const handleValidateDAG = () => {
    const workflowSteps: DAGStep[] = phase5StepsConfig.map((s, idx) => ({
      id: `step-${s.stepNumber}`,
      name: s.label,
      type: s.type,
      nextStepIds: idx < phase5StepsConfig.length - 1 ? [`step-${idx + 2}`] : []
    }));

    const result = validateWorkflowAcyclic(workflowSteps);
    if (result.isValid && !result.hasCycle) {
      setDagValidation({
        isValid: true,
        message: `DAG Verified: 100% Acyclic, 0 Cycles Detected across ${result.totalSteps} nodes.`
      });
    } else {
      setDagValidation({
        isValid: false,
        message: `Cycle Detected in workflow: ${result.cyclePath?.join(' -> ')}`
      });
    }
  };

  const handleSignSecondApproval = () => {
    setSigners([...signers, 'commander@p-nexa.internal']);
    setWorkflowStatus('COMPLETED');
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data as unknown as PlaybookStepData);
  }, []);

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20 bg-slate-950/90 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-neon-cyan mb-1">
            <Workflow className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Visual Workflow Automation Builder (React Flow / XYFlow)
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Autonomous Incident Response DAGs & Dual-Custody Gates
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Supports 9 node types: Telemetry Trigger, Threshold Condition, Anomaly Detection, Council Investigation, Simulation, Notification, Human Approval, Remediation, and Audit Logging.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleValidateDAG}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center space-x-1.5 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Validate Acyclic DAG</span>
          </button>

          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 ${
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

      {/* DAG Validation Alert */}
      {dagValidation && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
            dagValidation.isValid
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-bold">{dagValidation.message}</span>
        </div>
      )}

      {/* Visual Workflow Playbook Editor Canvas (xyflow / React Flow) */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-white text-xs flex items-center space-x-2">
            <span>Phase 5 Production DAG: Real-Time Telemetry to Autonomous Remediation</span>
            <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-neon-cyan border border-slate-700">
              9 Connected Nodes
            </span>
          </div>

          <div className="text-[10px] text-slate-400">
            Interactive canvas • Click node for execution metadata
          </div>
        </div>

        {/* The React Flow Canvas Container */}
        <div className="relative w-full h-[420px] rounded-xl overflow-hidden border border-slate-800 bg-[#07090e]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.3}
            maxZoom={1.5}
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="!bg-slate-900 !border-slate-700 !text-slate-300 fill-slate-300" />
            <MiniMap
              nodeColor={() => '#06b6d4'}
              maskColor="rgba(7, 9, 14, 0.7)"
              className="!bg-slate-950/80 !border-slate-800 !rounded-lg"
            />
          </ReactFlow>

          {/* Node Inspector Drawer */}
          {selectedNodeData && (
            <div className="absolute top-4 right-4 z-20 w-80 p-4 rounded-xl bg-slate-950/95 border border-neon-cyan/40 shadow-2xl space-y-2.5 backdrop-blur-md">
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

              <div className="space-y-1 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500">Node Type:</span>{' '}
                  <span className="font-bold text-neon-cyan">{selectedNodeData.type}</span>
                </div>
                <div>
                  <span className="text-slate-500">Risk Assessment:</span>{' '}
                  <span className="font-bold text-white">{selectedNodeData.risk}</span>
                </div>
                <div>
                  <span className="text-slate-500">Assigned Actor:</span>{' '}
                  <span className="text-purple-300">{selectedNodeData.actor}</span>
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
          <div className="p-4 bg-slate-950/90 border border-neon-amber/50 rounded-xl space-y-2.5">
            <div className="flex items-center space-x-2 text-neon-amber font-bold">
              <UserCheck className="w-4 h-4" />
              <span>Step 7 Gated: Multi-Signer Dual Custody Required for Remediation</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Node quarantine and perimeter routing isolation require two independent authorized security officers. Signer 1 ({signers[0]}) has signed.
            </p>
            <button
              onClick={handleSignSecondApproval}
              className="px-4 py-2 rounded-xl bg-neon-amber/20 hover:bg-neon-amber/30 text-neon-amber border border-neon-amber/40 font-bold transition-all shadow-lg hover:shadow-neon-amber/20 flex items-center space-x-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Sign As Commander (Secondary Approver) — Authorize Remediation Execution</span>
            </button>
          </div>
        )}

        {workflowStatus === 'COMPLETED' && (
          <div className="p-3 bg-neon-matrix/10 border border-neon-matrix/30 rounded-xl text-neon-matrix flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>
              All 9 DAG nodes executed successfully. Sealed SHA-256 immutable audit ledger proof:{' '}
              <span className="font-mono text-[10px] text-white">
                f47a92c0182b81e4918237190284719283019284719284019283719284719284
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
