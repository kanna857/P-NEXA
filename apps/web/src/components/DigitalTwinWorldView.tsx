import React, { useState, useCallback, useEffect } from 'react';
import { DigitalTwinViewport } from './DigitalTwinViewport.js';
import { TwinGraphTopology } from './TwinGraphTopology.js';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';
import { computeHierarchicalClusterLayout } from '@nexus/world-engine';
import { Box, Network, RefreshCw, Radio } from 'lucide-react';

// ── Pre-seeded CyberDyne Orbital Twin World Data ───────────────────────────
function buildSeedWorld(): { nodes: TwinNode[]; edges: TwinEdge[] } {
  const rawNodes: TwinNode[] = [
    {
      id: 'fw-border',
      name: 'Border Firewall',
      type: 'firewall',
      tier: 0,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.0.0.1', os: 'FortiOS 7.4' }
    },
    {
      id: 'fw-dmz',
      name: 'DMZ Firewall',
      type: 'firewall',
      tier: 0,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.0.0.2' }
    },
    {
      id: 'lb-main',
      name: 'Ingress Load Balancer',
      type: 'load_balancer',
      tier: 1,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.1.0.1', trafficRateKbps: 4500 }
    },
    {
      id: 'rtr-core',
      name: 'Core Router',
      type: 'router',
      tier: 1,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.1.0.10' }
    },
    {
      id: 'srv-auth',
      name: 'Auth Service',
      type: 'server',
      tier: 2,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.2.0.10', os: 'Ubuntu 24.04', cpuUsage: 34, memoryUsage: 56 }
    },
    {
      id: 'srv-api',
      name: 'Core API Gateway',
      type: 'server',
      tier: 2,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.2.0.11', os: 'Ubuntu 24.04', cpuUsage: 61, memoryUsage: 72 }
    },
    {
      id: 'srv-ai',
      name: 'AI Inference Engine',
      type: 'server',
      tier: 2,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.2.0.50', os: 'Debian 12', cpuUsage: 88, memoryUsage: 94 }
    },
    {
      id: 'agent-soc',
      name: 'SOC Agent Pod',
      type: 'agent_pod',
      tier: 2,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.2.0.100' }
    },
    {
      id: 'db-mongo',
      name: 'Identity Vault MongoDB',
      type: 'database',
      tier: 3,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.3.0.10', os: 'MongoDB 7.0' }
    },
    {
      id: 'db-redis',
      name: 'Event Cache Redis',
      type: 'database',
      tier: 3,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.3.0.20', os: 'Redis 7.2' }
    },
    {
      id: 'iot-sensor-1',
      name: 'Perimeter Sensor Alpha',
      type: 'iot_sensor',
      tier: 4,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '192.168.100.10' }
    },
    {
      id: 'iot-sensor-2',
      name: 'Thermal Array Beta',
      type: 'iot_sensor',
      tier: 4,
      status: 'warning',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '192.168.100.11', vulnerabilities: ['CVE-2024-1234'] }
    }
  ];

  // Auto-compute 3D hierarchical layout
  const nodes = computeHierarchicalClusterLayout(rawNodes, []);

  const edges: TwinEdge[] = [
    { id: 'e1', source: 'fw-border', target: 'lb-main', protocol: 'TLS', trafficRateKbps: 2000, isEncrypted: true, status: 'normal' },
    { id: 'e2', source: 'fw-dmz', target: 'rtr-core', protocol: 'TLS', trafficRateKbps: 1200, isEncrypted: true, status: 'normal' },
    { id: 'e3', source: 'lb-main', target: 'srv-auth', protocol: 'GRPC', trafficRateKbps: 800, isEncrypted: true, status: 'normal' },
    { id: 'e4', source: 'lb-main', target: 'srv-api', protocol: 'GRPC', trafficRateKbps: 1400, isEncrypted: true, status: 'normal' },
    { id: 'e5', source: 'rtr-core', target: 'srv-ai', protocol: 'INTERNAL_BUS', trafficRateKbps: 3200, isEncrypted: true, status: 'normal' },
    { id: 'e6', source: 'rtr-core', target: 'agent-soc', protocol: 'INTERNAL_BUS', trafficRateKbps: 400, isEncrypted: true, status: 'normal' },
    { id: 'e7', source: 'srv-auth', target: 'db-mongo', protocol: 'TCP', trafficRateKbps: 600, isEncrypted: true, status: 'normal' },
    { id: 'e8', source: 'srv-api', target: 'db-mongo', protocol: 'TCP', trafficRateKbps: 900, isEncrypted: true, status: 'normal' },
    { id: 'e9', source: 'srv-api', target: 'db-redis', protocol: 'TCP', trafficRateKbps: 2200, isEncrypted: true, status: 'normal' },
    { id: 'e10', source: 'agent-soc', target: 'db-redis', protocol: 'TCP', trafficRateKbps: 120, isEncrypted: true, status: 'normal' },
    { id: 'e11', source: 'iot-sensor-1', target: 'fw-border', protocol: 'UDP', trafficRateKbps: 50, isEncrypted: false, status: 'normal' },
    { id: 'e12', source: 'iot-sensor-2', target: 'fw-border', protocol: 'UDP', trafficRateKbps: 40, isEncrypted: false, status: 'anomalous' }
  ];

  return { nodes, edges };
}

type ViewMode = '3d' | 'topology';

export const DigitalTwinWorldView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [{ nodes, edges }, setWorld] = useState(() => buildSeedWorld());
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [apiSynced, setApiSynced] = useState<boolean>(false);

  // Attempt real-time world synchronization with backend API
  useEffect(() => {
    let isMounted = true;
    fetch('http://localhost:4000/health')
      .then((res) => {
        if (res.ok && isMounted) {
          setApiSynced(true);
        }
      })
      .catch(() => {
        if (isMounted) setApiSynced(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleNodeStatusChange = useCallback(
    (nodeId: string, status: TwinNode['status']) => {
      setWorld((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, status } : n))
      }));
      setLastEvent(`Node ${nodeId} → ${status.toUpperCase()}`);
    },
    []
  );

  const handleEdgeStatusChange = useCallback(
    (edgeId: string, status: TwinEdge['status']) => {
      setWorld((prev) => ({
        ...prev,
        edges: prev.edges.map((e) => (e.id === edgeId ? { ...e, status } : e))
      }));
      setLastEvent(`Link ${edgeId} → ${status.toUpperCase()}`);
    },
    []
  );

  const handleResetWorld = useCallback(() => {
    setWorld(buildSeedWorld());
    setLastEvent('World state reset to baseline');
  }, []);

  // Simulated telemetry pulse (randomizes CPU/memory each 3s)
  const [tickCount, setTickCount] = useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTickCount((t) => t + 1);
      setWorld((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => ({
          ...n,
          metadata: {
            ...n.metadata,
            cpuUsage:
              n.metadata.cpuUsage !== undefined
                ? Math.max(5, Math.min(98, n.metadata.cpuUsage + (Math.random() - 0.5) * 8))
                : n.metadata.cpuUsage,
            memoryUsage:
              n.metadata.memoryUsage !== undefined
                ? Math.max(10, Math.min(99, n.metadata.memoryUsage + (Math.random() - 0.5) * 5))
                : n.metadata.memoryUsage
          }
        }))
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* World Header Controls */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-neon-cyan text-xs font-mono mb-1">
            <Box className="w-4 h-4" />
            <span>PHASE 2 — LIVING 3D DIGITAL TWIN WORLDS</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 ${
                apiSynced
                  ? 'bg-neon-matrix/20 text-neon-matrix border border-neon-matrix/40'
                  : 'bg-neon-amber/20 text-neon-amber border border-neon-amber/40'
              }`}
            >
              <Radio className={`w-3 h-3 ${apiSynced ? 'animate-pulse' : ''}`} />
              <span>{apiSynced ? 'API STREAM LIVE' : 'LOCAL SYNC'}</span>
            </span>
          </div>
          <h2 className="text-xl font-bold font-mono text-white">
            CyberDyne Orbital Defense Grid Alpha
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            12 Nodes · 12 Links · Live Telemetry Tick #{tickCount}
            {lastEvent && (
              <span className="ml-3 text-neon-matrix"> ⚡ {lastEvent}</span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg overflow-hidden border border-slate-700">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 text-xs flex items-center space-x-1.5 transition-all ${
                viewMode === '3d'
                  ? 'bg-neon-cyan/20 text-neon-cyan border-r border-slate-700'
                  : 'text-slate-400 hover:text-white bg-slate-900 border-r border-slate-700'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D View</span>
            </button>
            <button
              onClick={() => setViewMode('topology')}
              className={`px-3 py-1.5 text-xs flex items-center space-x-1.5 transition-all ${
                viewMode === 'topology'
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-slate-400 hover:text-white bg-slate-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Topology</span>
            </button>
          </div>

          <button
            onClick={handleResetWorld}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset World</span>
          </button>
        </div>
      </div>

      {/* Render active view */}
      {viewMode === '3d' ? (
        <DigitalTwinViewport
          nodes={nodes}
          edges={edges}
          onNodeStatusChange={handleNodeStatusChange}
          onEdgeStatusChange={handleEdgeStatusChange}
        />
      ) : (
        <TwinGraphTopology
          nodes={nodes}
          edges={edges}
          onNodeStatusChange={handleNodeStatusChange}
          onEdgeStatusChange={handleEdgeStatusChange}
        />
      )}
    </div>
  );
};

