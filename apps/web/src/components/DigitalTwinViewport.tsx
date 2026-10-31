import React, { useRef, useState, useCallback, useMemo } from 'react';
import { useThreeViewport } from '../hooks/useThreeViewport.js';
import { TwinNode, TwinEdge, computeBlastRadius } from '@nexus/twin-graph';
import {
  Activity,
  Shield,
  AlertTriangle,
  Scissors,
  RotateCcw,
  PlaySquare,
  Layers,
  MousePointer,
  Ruler,
  PlusCircle,
  Pencil,
  Play,
  Pause,
  Compass,
  Plus,
  Minus,
  Maximize2,
  Users,
  GraduationCap,
  Building,
  Server,
  Bus,
  Cpu,
  Sun,
  ShieldAlert
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
  onEdgeStatusChange: _onEdgeStatusChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('srv-auth');
  const [blastRadiusResult, setBlastRadiusResult] = useState<ReturnType<typeof computeBlastRadius> | null>(null);
  const [showBlastRadius, setShowBlastRadius] = useState(false);

  // Digital Twin Earth Tier Layer Filtering
  const [activeTiers, setActiveTiers] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Interactive Tools & Timeline state
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(true);
  const [timelineTime, setTimelineTime] = useState<string>('10:24');

  const toggleTier = (tier: number) => {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        if (next.size > 1) next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  };

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

  const { setCameraPreset, zoomIn, zoomOut, resetCamera } = useThreeViewport({
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

  // Holographic Callout Beacons mapped from reference image
  const calloutBeacons = [
    {
      id: 'beacon-hostel',
      title: 'Hostel Block A',
      status: '2,400 students · 96% capacity',
      top: '32%',
      left: '26%',
      color: 'border-neon-cyan/80 bg-slate-950/90 text-cyan-300'
    },
    {
      id: 'beacon-academic',
      title: 'Academic Block',
      status: '18 buildings · Normal',
      top: '20%',
      left: '42%',
      color: 'border-neon-matrix/80 bg-slate-950/90 text-emerald-300'
    },
    {
      id: 'beacon-server',
      title: 'Main Server (srv-auth)',
      status: 'Issues detected · High Severity',
      top: '28%',
      left: '58%',
      color: 'border-neon-crimson bg-rose-950/90 text-rose-300 animate-pulse'
    },
    {
      id: 'beacon-library',
      title: 'Central Library',
      status: '350k resources · Online',
      top: '34%',
      left: '72%',
      color: 'border-blue-500/80 bg-slate-950/90 text-blue-300'
    },
    {
      id: 'beacon-sports',
      title: 'Sports Complex',
      status: 'Normal Activity',
      top: '46%',
      left: '22%',
      color: 'border-neon-cyan/80 bg-slate-950/90 text-cyan-300'
    },
    {
      id: 'beacon-buses',
      title: 'Campus Transit Buses',
      status: '32 active / 3 delayed',
      top: '44%',
      left: '38%',
      color: 'border-amber-500/80 bg-amber-950/90 text-amber-300'
    }
  ];

  return (
    <div className="relative w-full h-full flex flex-col space-y-2 select-none font-mono">
      {/* KPI Summary Bar (Matching reference header metrics) */}
      <div className="glass-panel p-2.5 rounded-xl border border-surface-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <div className="text-white font-bold text-sm tracking-wide">VIT University</div>
          <span className="px-2 py-0.5 rounded text-[10px] bg-neon-matrix/20 text-neon-matrix border border-neon-matrix/40 font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-matrix animate-ping" />
            <span>Live</span>
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            Digital Twin · Real-time AI Simulation
          </span>
        </div>

        {/* Dynamic KPI Badges */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center space-x-1 text-slate-300">
            <GraduationCap className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="text-slate-500">Students:</span>
            <span className="text-white font-bold">10,524</span>
          </div>

          <div className="flex items-center space-x-1 text-slate-300">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-500">Faculty:</span>
            <span className="text-white font-bold">742</span>
          </div>

          <div className="flex items-center space-x-1 text-slate-300">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Buildings:</span>
            <span className="text-white font-bold">28</span>
          </div>

          <div className="flex items-center space-x-1">
            <Server className="w-3.5 h-3.5 text-neon-crimson" />
            <span className="text-slate-500">Servers:</span>
            <span className="text-white font-bold">46</span>
            <span className="text-[10px] text-neon-crimson font-bold">(2 down)</span>
          </div>

          <div className="flex items-center space-x-1">
            <Bus className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-500">Buses:</span>
            <span className="text-white font-bold">32</span>
            <span className="text-[10px] text-amber-400 font-bold">(3 delayed)</span>
          </div>

          <div className="flex items-center space-x-1 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-neon-matrix" />
            <span className="text-slate-500">IoT:</span>
            <span className="text-white font-bold">1,284</span>
          </div>

          <div className="flex items-center space-x-1">
            <ShieldAlert className="w-3.5 h-3.5 text-neon-crimson animate-pulse" />
            <span className="text-slate-500">Incidents:</span>
            <span className="text-neon-crimson font-bold">5</span>
          </div>

          <div className="flex items-center space-x-1 text-amber-300">
            <Sun className="w-3.5 h-3.5" />
            <span>28°C</span>
          </div>
        </div>
      </div>

      {/* Main 3D Viewport Canvas Container */}
      <div className="flex gap-3 flex-1 min-h-0" style={{ height: '520px' }}>
        <div className="flex-1 relative rounded-xl overflow-hidden border border-neon-cyan/20 glass-panel bg-void-darker">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: 'block', cursor: 'crosshair' }}
          />

          {/* Floating Callout Holographic Beacons */}
          {calloutBeacons.map((b) => (
            <div
              key={b.id}
              onClick={() => {
                const targetNode = nodes.find((n) => n.id.includes('srv-auth') || n.name.includes(b.title.split(' ')[0]!));
                if (targetNode) setSelectedNodeId(targetNode.id);
              }}
              style={{ top: b.top, left: b.left }}
              className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 p-2 rounded-xl border shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-105 ${b.color}`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-[11px] truncate">
                <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                <span>{b.title}</span>
              </div>
              <div className="text-[9px] text-slate-300 mt-0.5 truncate">{b.status}</div>
            </div>
          ))}

          {/* Floating Left: Infrastructure Layers Menu & Camera Presets */}
          <div className="absolute top-3 left-3 z-20 font-mono text-xs flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="px-3 py-1.5 rounded-lg bg-slate-950/90 border border-neon-cyan/40 hover:border-neon-cyan text-slate-200 hover:text-white flex items-center space-x-1.5 transition-all shadow-lg backdrop-blur-md"
              >
                <Layers className="w-3.5 h-3.5 text-neon-cyan" />
                <span>Layers ({activeTiers.size}/5)</span>
              </button>

              <div className="flex items-center space-x-1 bg-slate-950/90 border border-slate-800 p-1 rounded-lg shadow-lg backdrop-blur-md">
                <button
                  onClick={() => setCameraPreset('orbital')}
                  className="px-2 py-1 rounded text-[10px] text-slate-300 hover:text-neon-cyan hover:bg-slate-900 transition-colors"
                  title="Orbital 3D Angle"
                >
                  Orbital
                </button>
                <button
                  onClick={() => setCameraPreset('top-down')}
                  className="px-2 py-1 rounded text-[10px] text-slate-300 hover:text-neon-cyan hover:bg-slate-900 transition-colors"
                  title="Overhead Top-Down Map"
                >
                  Top-Down
                </button>
                <button
                  onClick={() => setCameraPreset('ingress')}
                  className="px-2 py-1 rounded text-[10px] text-slate-300 hover:text-neon-cyan hover:bg-slate-900 transition-colors"
                  title="Close Node Ingress"
                >
                  Ingress
                </button>
              </div>
            </div>

            {showLayerMenu && (
              <div className="w-64 p-3 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl space-y-2 backdrop-blur-md">
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

          {/* Floating Right: Tool Palette (Select, Measure, Add Entity, Draw Zone, Zoom, Compass) */}
          <div className="absolute top-3 right-3 z-20 flex flex-col space-y-1.5 bg-slate-950/90 border border-slate-800 p-1.5 rounded-xl shadow-xl backdrop-blur-md">
            {[
              { id: 'select', label: 'Select', icon: MousePointer },
              { id: 'measure', label: 'Measure', icon: Ruler },
              { id: 'add', label: 'Add Entity', icon: PlusCircle },
              { id: 'zone', label: 'Draw Zone', icon: Pencil },
              { id: 'simulate', label: 'Simulate Event', icon: PlaySquare }
            ].map((tool) => {
              const Icon = tool.icon;
              const isSelected = selectedTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className={`p-1.5 rounded-lg flex items-center space-x-1.5 text-[10px] transition-all ${
                    isSelected
                      ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title={tool.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">{tool.label}</span>
                </button>
              );
            })}

            <div className="pt-1 border-t border-slate-800 flex flex-col space-y-1 items-center">
              <button
                onClick={resetCamera}
                className="p-1 rounded text-slate-400 hover:text-neon-cyan transition-colors"
                title="Reset Camera (Compass)"
              >
                <Compass className="w-4 h-4 text-neon-cyan" />
              </button>
              <button
                onClick={zoomIn}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                title="Zoom In"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={zoomOut}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Floating Bottom: Timeline Scrub Bar */}
          <div className="absolute bottom-3 left-3 right-3 z-20 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between space-x-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                className="p-1.5 rounded-lg bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/30 transition-all"
              >
                {isPlayingTimeline ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <span className="px-2 py-0.5 rounded text-[10px] bg-neon-matrix/10 text-neon-matrix border border-neon-matrix/30 font-bold">
                Live
              </span>
              <span className="text-white font-bold text-xs">{timelineTime}</span>
            </div>

            {/* Timeline hour ticks */}
            <div className="flex-1 flex items-center justify-between px-3 text-[10px] text-slate-500 relative">
              <div className="absolute inset-x-3 h-0.5 bg-slate-800 top-1/2 -translate-y-1/2" />
              <div className="absolute left-[38%] w-3 h-3 rounded-full bg-neon-purple border-2 border-white top-1/2 -translate-y-1/2 shadow-lg shadow-purple-500/50" />
              {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map((hr) => (
                <span
                  key={hr}
                  onClick={() => setTimelineTime(hr)}
                  className={`z-10 bg-slate-950 px-1 cursor-pointer transition-colors ${
                    hr === '10:00' ? 'text-neon-purple font-bold' : 'hover:text-slate-300'
                  }`}
                >
                  {hr}
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-white">1x</span>
              <button className="p-1 text-slate-400 hover:text-white">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Node Inspector Panel */}
        <div className="w-72 flex flex-col space-y-3">
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

              <div className="space-y-1.5 text-slate-400 text-[11px]">
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
                    className={`font-bold text-lg ${
                      blastRadiusResult.riskScore > 70
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
