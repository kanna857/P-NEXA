import React, { useRef, useState, useCallback, useMemo } from 'react';
import { useThreeViewport } from '../hooks/useThreeViewport.js';
import { TwinNode, TwinEdge, computeBlastRadius } from '@nexus/twin-graph';
import {
  Activity,
  Shield,
  AlertTriangle,
  Scissors,
  RotateCcw,
  Box,
  Layers
} from 'lucide-react';

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  healthy: { label: 'HEALTHY', color: 'text-neon-matrix border-neon-matrix/40 bg-neon-matrix/10' },
  warning: { label: 'WARNING', color: 'text-neon-amber border-neon-amber/40 bg-neon-amber/10' },
  compromised: { label: 'COMPROMISED', color: 'text-neon-alert border-neon-alert/40 bg-neon-alert/10' },
  isolated: { label: 'ISOLATED', color: 'text-neon-psionic border-neon-psionic/40 bg-neon-psionic/10' },
  offline: { label: 'OFFLINE', color: 'text-slate-500 border-slate-700 bg-slate-800' }
};

const TIER_LABELS: Record<number, { name: string; color: string }> = {
  0: { name: 'Tier 0: Perimeter Firewalls', color: 'text-neon-cyan' },
  1: { name: 'Tier 1: Routing & Ingress', color: 'text-blue-400' },
  2: { name: 'Tier 2: Compute & Agent Pods', color: 'text-purple-400' },
  3: { name: 'Tier 3: Identity & Data Vaults', color: 'text-emerald-400' },
  4: { name: 'Tier 4: Perimeter IoT Sensors', color: 'text-amber-400' }
};

interface DigitalTwinViewportProps {
  nodes: TwinNode[];
  edges: TwinEdge[];
  onNodeStatusChange?: (nodeId: string, status: TwinNode['status']) => void;
  onEdgeStatusChange?: (edgeId: string, status: TwinEdge['status']) => void;
}

export const DigitalTwinViewport: React.FC<DigitalTwinViewportProps> = ({
  nodes,
  edges,
  onNodeStatusChange,
  onEdgeStatusChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [blastRadiusResult, setBlastRadiusResult] = useState<ReturnType<typeof computeBlastRadius> | null>(null);
  const [showBlastRadius, setShowBlastRadius] = useState(false);

  // Digital Twin Earth Visualization Patterns: Tier Layer Filtering
  const [activeTiers, setActiveTiers] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const toggleTier = (tier: number) => {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        if (next.size > 1) next.delete(tier); // keep at least 1 tier visible
      } else {
        next.add(tier);
      }
      return next;
    });
  };

  // Filter nodes and edges by active tiers
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => activeTiers.has(n.tier ?? 0));
  }, [nodes, activeTiers]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [edges, visibleNodeIds]);

  const selectedNode = filteredNodes.find((n) => n.id === selectedNodeId);
  const highlightedNodeIds = blastRadiusResult?.impactedNodeIds ?? [];

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
      setShowBlastRadius(false);
      setBlastRadiusResult(null);
    },
    []
  );

  useThreeViewport({
    canvasRef,
    nodes: filteredNodes,
    edges: filteredEdges,
    selectedNodeId,
    highlightedNodeIds,
    onNodeClick: handleNodeClick
  });

  const handleRunBlastRadius = () => {
    if (!selectedNodeId) return;
    const result = computeBlastRadius(nodes, edges, selectedNodeId, 3);
    setBlastRadiusResult(result);
    setShowBlastRadius(true);
  };

  const handleIsolateNode = () => {
    if (!selectedNodeId || !onNodeStatusChange) return;
    onNodeStatusChange(selectedNodeId, 'isolated');
  };

  const handleMarkCompromised = () => {
    if (!selectedNodeId || !onNodeStatusChange) return;
    onNodeStatusChange(selectedNodeId, 'compromised');
  };

  const handleRestoreNode = () => {
    if (!selectedNodeId || !onNodeStatusChange) return;
    onNodeStatusChange(selectedNodeId, 'healthy');
  };

  const healthyCounts = {
    total: nodes.length,
    healthy: nodes.filter((n) => n.status === 'healthy').length,
    warning: nodes.filter((n) => n.status === 'warning').length,
    compromised: nodes.filter((n) => n.status === 'compromised').length,
    isolated: nodes.filter((n) => n.status === 'isolated').length
  };

  return (
    <div className="relative w-full h-full flex flex-col space-y-3">
      {/* Viewport Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel p-4 rounded-xl">
        <div>
          <div className="flex items-center space-x-2 text-neon-cyan text-xs font-mono mb-1">
            <Box className="w-4 h-4" />
            <span>LIVING 3D DIGITAL TWIN WORLD (EARTH / CAMPUS VISUALIZATION PATTERNS)</span>
          </div>
          <h2 className="text-lg font-bold font-mono text-white">Cyber Topology Viewport</h2>
          <p className="text-xs text-slate-400">
            Drag to orbit · Scroll to zoom · Click nodes to inspect · Filter infrastructure tiers
          </p>
        </div>

        {/* Node Health Stats */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          {[
            { label: 'Healthy', count: healthyCounts.healthy, color: 'text-neon-matrix' },
            { label: 'Warning', count: healthyCounts.warning, color: 'text-neon-amber' },
            { label: 'Compromised', count: healthyCounts.compromised, color: 'text-neon-alert' },
            { label: 'Isolated', count: healthyCounts.isolated, color: 'text-neon-psionic' }
          ].map((s) => (
            <div key={s.label} className="text-center px-2 py-1 rounded bg-slate-900 border border-slate-800">
              <div className={`text-lg font-bold ${s.color}`}>{s.count}</div>
              <div className="text-[10px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main 3D + Side Panel */}
      <div className="flex gap-3 flex-1 min-h-0" style={{ height: '560px' }}>
        {/* Three.js Canvas Container */}
        <div className="flex-1 relative rounded-xl overflow-hidden border border-neon-cyan/20 glass-panel">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: 'block', cursor: 'crosshair' }}
          />

          {/* Tier Layer Filter Controls Overlay */}
          <div className="absolute top-3 left-3 z-10 font-mono text-xs">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="px-3 py-1.5 rounded-lg bg-slate-950/90 border border-neon-cyan/40 hover:border-neon-cyan text-slate-200 hover:text-white flex items-center space-x-1.5 transition-all shadow-lg backdrop-blur-md"
            >
              <Layers className="w-3.5 h-3.5 text-neon-cyan" />
              <span>Infrastructure Layers ({activeTiers.size}/5)</span>
            </button>

            {showLayerMenu && (
              <div className="mt-2 w-64 p-3 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl space-y-2 backdrop-blur-md">
                <div className="text-[10px] uppercase text-slate-500 font-bold border-b border-slate-800 pb-1 flex justify-between items-center">
                  <span>Toggle Tiers</span>
                  <button
                    onClick={() => setActiveTiers(new Set([0, 1, 2, 3, 4]))}
                    className="text-neon-cyan hover:underline text-[9px]"
                  >
                    Reset All
                  </button>
                </div>
                {Object.entries(TIER_LABELS).map(([tierStr, meta]) => {
                  const t = Number(tierStr);
                  const isChecked = activeTiers.has(t);
                  return (
                    <label
                      key={t}
                      className="flex items-center justify-between text-[11px] text-slate-300 hover:text-white cursor-pointer py-0.5"
                    >
                      <span className={meta.color}>{meta.name}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTier(t)}
                        className="rounded border-slate-700 bg-slate-900 text-neon-cyan focus:ring-0 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 flex flex-col space-y-1.5 font-mono text-[10px] z-10">
            {Object.entries(STATUS_BADGE).map(([status, meta]) => (
              <div key={status} className={`px-2 py-0.5 rounded border backdrop-blur-sm ${meta.color}`}>
                {meta.label}
              </div>
            ))}
          </div>

          {/* Scan lines aesthetic overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,240,255,0.012) 3px, rgba(0,240,255,0.012) 4px)'
            }}
          />
        </div>

        {/* Node Inspector Panel */}
        <div className="w-72 flex flex-col space-y-3">
          {/* Selected Node Details */}
          {selectedNode ? (
            <div className="glass-panel p-4 rounded-xl font-mono text-xs space-y-3 flex-shrink-0">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <span className="font-bold text-white text-sm truncate">{selectedNode.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_BADGE[selectedNode.status]?.color}`}
                >
                  {STATUS_BADGE[selectedNode.status]?.label}
                </span>
              </div>

              <div className="space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="text-neon-cyan">{selectedNode.type.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tier:</span>
                  <span className="text-white">{selectedNode.tier}</span>
                </div>
                {selectedNode.metadata.ipAddress && (
                  <div className="flex justify-between">
                    <span>IP Address:</span>
                    <span className="text-white">{selectedNode.metadata.ipAddress}</span>
                  </div>
                )}
                {selectedNode.metadata.os && (
                  <div className="flex justify-between">
                    <span>OS:</span>
                    <span className="text-white">{selectedNode.metadata.os}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Position:</span>
                  <span className="text-slate-500">
                    ({selectedNode.position.x.toFixed(0)}, {selectedNode.position.z.toFixed(0)})
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={handleRunBlastRadius}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded bg-neon-amber/10 text-neon-amber border border-neon-amber/30 hover:bg-neon-amber/20 transition-all text-[11px]"
                >
                  <Activity className="w-3 h-3" />
                  <span>Run Blast Radius Analysis</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleIsolateNode}
                    className="flex items-center justify-center space-x-1 py-1.5 rounded bg-neon-psionic/10 text-neon-psionic border border-neon-psionic/30 hover:bg-neon-psionic/20 transition-all text-[10px]"
                  >
                    <Scissors className="w-3 h-3" />
                    <span>Isolate</span>
                  </button>

                  <button
                    onClick={handleMarkCompromised}
                    className="flex items-center justify-center space-x-1 py-1.5 rounded bg-neon-alert/10 text-neon-alert border border-neon-alert/30 hover:bg-neon-alert/20 transition-all text-[10px]"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Compromised</span>
                  </button>
                </div>

                <button
                  onClick={handleRestoreNode}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded bg-neon-matrix/10 text-neon-matrix border border-neon-matrix/30 hover:bg-neon-matrix/20 transition-all text-[11px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore to Healthy</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-4 rounded-xl font-mono text-xs text-slate-500 text-center flex-shrink-0">
              <Shield className="w-8 h-8 mx-auto mb-2 text-neon-cyan/30" />
              <p>Click any node in the 3D viewport to inspect it and perform security operations.</p>
            </div>
          )}

          {/* Blast Radius Result */}
          {showBlastRadius && blastRadiusResult && (
            <div className="glass-panel-amber p-4 rounded-xl font-mono text-xs space-y-2 flex-1 overflow-auto">
              <div className="text-neon-amber font-bold text-sm border-b border-neon-amber/20 pb-2 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Blast Radius Analysis</span>
              </div>

              <div className="space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Threat Origin:</span>
                  <span className="text-neon-alert font-bold">{blastRadiusResult.startNodeId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Impacted Nodes:</span>
                  <span className="text-neon-amber font-bold">{blastRadiusResult.impactedNodeIds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Hops:</span>
                  <span className="text-white">{blastRadiusResult.maxHopsReached}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Risk Score:</span>
                  <span
                    className={`font-bold text-lg ${blastRadiusResult.riskScore > 70
                        ? 'text-neon-alert'
                        : blastRadiusResult.riskScore > 40
                          ? 'text-neon-amber'
                          : 'text-neon-matrix'
                      }`}
                  >
                    {blastRadiusResult.riskScore}/100
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-neon-amber/20">
                <div className="text-[10px] text-slate-500 mb-1">Impacted Systems (highlighted):</div>
                <div className="flex flex-wrap gap-1">
                  {blastRadiusResult.impactedNodeIds.map((id) => (
                    <span key={id} className="px-1.5 py-0.5 rounded bg-neon-amber/10 text-neon-amber border border-neon-amber/20 text-[10px]">
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Edge Status List */}
          <div className="glass-panel p-3 rounded-xl font-mono text-xs flex-shrink-0">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-2">
              Network Links ({filteredEdges.length})
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {filteredEdges.map((edge) => (
                <div key={edge.id} className="flex items-center justify-between">
                  <div className="text-[10px] text-slate-500 truncate flex-1 mr-2">
                    {edge.source} → {edge.target}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`text-[9px] px-1 py-0.5 rounded border ${edge.status === 'severed'
                          ? 'text-slate-500 border-slate-700'
                          : edge.status === 'anomalous'
                            ? 'text-neon-amber border-neon-amber/30'
                            : 'text-neon-cyan border-neon-cyan/20'
                        }`}
                    >
                      {edge.status.toUpperCase()}
                    </span>
                    {onEdgeStatusChange && edge.status !== 'severed' && (
                      <button
                        onClick={() => onEdgeStatusChange(edge.id, 'severed')}
                        className="text-neon-alert opacity-50 hover:opacity-100 transition-opacity"
                        title="Sever link"
                      >
                        <Scissors className="w-2.5 h-2.5" />
                      </button>
                    )}
                    {onEdgeStatusChange && edge.status === 'severed' && (
                      <button
                        onClick={() => onEdgeStatusChange(edge.id, 'normal')}
                        className="text-neon-matrix opacity-50 hover:opacity-100 transition-opacity"
                        title="Restore link"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                      </button>
                    )}
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
