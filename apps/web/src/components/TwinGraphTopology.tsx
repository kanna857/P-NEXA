import React, { useState, useCallback } from 'react';
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
import { TwinNode, TwinEdge } from '@nexus/twin-graph';

// ── Custom Node Renderers ──────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  healthy: '#00ff66',
  warning: '#ffb800',
  compromised: '#ff003c',
  isolated: '#bf00ff',
  offline: '#334155'
};

const TYPE_EMOJI: Record<string, string> = {
  firewall: '🔥',
  router: '🔀',
  load_balancer: '⚖️',
  server: '🖥️',
  database: '🗄️',
  agent_pod: '🤖',
  iot_sensor: '📡',
  cloud_gateway: '☁️'
};

function CyberNode({ data }: NodeProps) {
  const color = STATUS_COLORS[(data as any).status] || '#00ff66';
  const emoji = TYPE_EMOJI[(data as any).type] || '💻';

  return (
    <div
      className="relative rounded-xl border font-mono text-xs select-none transition-all"
      style={{
        background: `linear-gradient(135deg, rgba(14,19,29,0.95) 0%, rgba(10,15,25,0.98) 100%)`,
        borderColor: color + '55',
        boxShadow: `0 0 14px ${color}22, inset 0 0 20px rgba(0,0,0,0.5)`,
        padding: '8px 12px',
        minWidth: '120px'
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, borderColor: color + '80' }} />

      <div className="flex items-center space-x-2">
        <span className="text-base leading-none">{emoji}</span>
        <div>
          <div className="text-white font-bold text-[11px] leading-tight truncate max-w-[90px]">
            {(data as any).label}
          </div>
          <div
            className="text-[9px] font-bold uppercase tracking-wider mt-0.5"
            style={{ color }}
          >
            {(data as any).status}
          </div>
        </div>
      </div>

      {/* Status indicator dot */}
      <div
        className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />

      <Handle type="source" position={Position.Right} style={{ background: color, borderColor: color + '80' }} />
    </div>
  );
}

const nodeTypes = { cyberNode: CyberNode };

// ── Twin Graph Topology Editor ─────────────────────────────────────────────
interface TwinGraphTopologyProps {
  nodes: TwinNode[];
  edges: TwinEdge[];
  onNodeStatusChange: (nodeId: string, status: TwinNode['status']) => void;
  onEdgeStatusChange: (edgeId: string, status: TwinEdge['status']) => void;
}

function toReactFlowNodes(twinNodes: TwinNode[]): Node[] {
  return twinNodes.map((n) => ({
    id: n.id,
    type: 'cyberNode',
    position: { x: (n.tier ?? 0) * 200 + 80, y: n.position.z * 4 + 260 },
    data: {
      label: n.name,
      status: n.status,
      type: n.type,
      tier: n.tier,
      metadata: n.metadata
    }
  }));
}

function toReactFlowEdges(twinEdges: TwinEdge[]): Edge[] {
  return twinEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: e.status !== 'severed',
    markerEnd: { type: MarkerType.ArrowClosed, color: e.status === 'severed' ? '#334155' : e.status === 'anomalous' ? '#ffb800' : '#00f0ff' },
    style: {
      stroke: e.status === 'severed' ? '#334155' : e.status === 'anomalous' ? '#ffb800' : '#00f0ff',
      strokeWidth: e.status === 'severed' ? 1 : 2,
      strokeDasharray: e.status === 'severed' ? '6,4' : undefined,
      opacity: e.status === 'severed' ? 0.3 : 0.8
    },
    label: `${e.protocol} · ${e.trafficRateKbps}Kbps`,
    labelStyle: { fill: '#64748b', fontSize: 9, fontFamily: 'monospace' },
    labelBgStyle: { fill: '#0e131d', fillOpacity: 0.9 }
  }));
}

export const TwinGraphTopology: React.FC<TwinGraphTopologyProps> = ({
  nodes: twinNodes,
  edges: twinEdges,
  onNodeStatusChange,
  onEdgeStatusChange
}) => {
  const [rfNodes, , onNodesChange] = useNodesState(toReactFlowNodes(twinNodes));
  const [rfEdges, , onEdgesChange] = useEdgesState(toReactFlowEdges(twinEdges));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const selectedTwinNode = twinNodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="w-full flex flex-col space-y-3">
      <div className="glass-panel px-4 py-3 rounded-xl flex items-center justify-between">
        <div>
          <div className="text-neon-cyan text-xs font-mono mb-0.5">REACT FLOW TOPOLOGY EDITOR</div>
          <h3 className="text-sm font-mono font-bold text-white">Network Topology Graph View</h3>
        </div>
        <div className="flex items-center space-x-2 font-mono text-[10px] text-slate-400">
          <span>{twinNodes.length} nodes</span>
          <span>·</span>
          <span>{twinEdges.length} links</span>
        </div>
      </div>

      <div className="flex gap-3">
        {/* React Flow Canvas */}
        <div
          className="flex-1 rounded-xl overflow-hidden border border-neon-cyan/20"
          style={{ height: '440px', background: '#07090e' }}
        >
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#00f0ff" gap={24} size={0.5} style={{ opacity: 0.06 }} />
            <Controls
              style={{
                background: '#0e131d',
                border: '1px solid #1e293b',
                borderRadius: '8px'
              }}
            />
            <MiniMap
              nodeStrokeColor={(n) => STATUS_COLORS[(n.data as any).status] || '#334155'}
              nodeColor={(n) => STATUS_COLORS[(n.data as any).status] + '55' || '#33415555'}
              style={{ background: '#07090e', border: '1px solid #1e293b', borderRadius: '8px' }}
            />
          </ReactFlow>
        </div>

        {/* Node Quick-Actions Panel */}
        {selectedTwinNode && (
          <div className="w-60 glass-panel p-4 rounded-xl font-mono text-xs space-y-3 flex-shrink-0">
            <div className="border-b border-surface-border pb-2">
              <div className="font-bold text-white truncate">{selectedTwinNode.name}</div>
              <div className="text-slate-400 text-[10px]">{selectedTwinNode.type}</div>
            </div>

            <div className="space-y-1.5">
              {(['healthy', 'warning', 'compromised', 'isolated', 'offline'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => onNodeStatusChange(selectedTwinNode.id, status)}
                  className={`w-full py-1.5 rounded border text-[11px] font-bold uppercase tracking-wider transition-all ${
                    selectedTwinNode.status === status
                      ? 'opacity-100'
                      : 'opacity-40 hover:opacity-80'
                  }`}
                  style={{
                    borderColor: STATUS_COLORS[status] + '60',
                    color: STATUS_COLORS[status],
                    background: STATUS_COLORS[status] + '10'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="border-t border-surface-border pt-2 space-y-1.5">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider">Connected Links</div>
              {twinEdges
                .filter((e) => e.source === selectedTwinNode.id || e.target === selectedTwinNode.id)
                .map((edge) => (
                  <div key={edge.id} className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px] truncate flex-1">
                      {edge.source === selectedTwinNode.id
                        ? `→ ${edge.target}`
                        : `← ${edge.source}`}
                    </span>
                    <button
                      onClick={() =>
                        onEdgeStatusChange(
                          edge.id,
                          edge.status === 'severed' ? 'normal' : 'severed'
                        )
                      }
                      className={`text-[9px] px-1.5 py-0.5 rounded border ml-2 flex-shrink-0 transition-all ${
                        edge.status === 'severed'
                          ? 'text-neon-matrix border-neon-matrix/30 bg-neon-matrix/10 hover:bg-neon-matrix/20'
                          : 'text-neon-alert border-neon-alert/30 bg-neon-alert/10 hover:bg-neon-alert/20'
                      }`}
                    >
                      {edge.status === 'severed' ? 'RESTORE' : 'SEVER'}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

