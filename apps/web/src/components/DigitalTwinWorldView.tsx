import React, { useState, useCallback } from 'react';
import { DigitalTwinViewport } from './DigitalTwinViewport.js';
import { TwinGraphTopology } from './TwinGraphTopology.js';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';
import { computeHierarchicalClusterLayout } from '@nexus/world-engine';
import {
  Box,
  Map as MapIcon,
  Network,
  List as ListIcon,
  Maximize2,
  ChevronDown,
  GraduationCap,
  Users,
  Building2,
  Server,
  Bus,
  Cpu,
  Bot,
  ShieldAlert,
  Sun,
  Search
} from 'lucide-react';

// Pre-seeded Twin World Data
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
      name: 'Main Authentication Server',
      type: 'server',
      tier: 2,
      status: 'compromised',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.2.0.10', os: 'Ubuntu 24.04', cpuUsage: 89, memoryUsage: 94 }
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

type ViewMode = '3d' | 'map' | 'graph' | 'list';

export const DigitalTwinWorldView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [{ nodes, edges }, setWorld] = useState(() => buildSeedWorld());
  const [selectedWorld, setSelectedWorld] = useState('VIT University');
  const [showWorldDropdown, setShowWorldDropdown] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');

  const availableWorlds = [
    { name: 'VIT University', subtitle: 'Main Smart Campus Digital Twin · 28 Buildings', live: true },
    { name: 'CyberDyne Orbital', subtitle: 'Orbital Defense & Ground Station Telemetry', live: true },
    { name: 'Synthetix Bio-Labs', subtitle: 'Bio-Pharmaceutical Cleanroom Grid', live: false }
  ];

  const handleNodeStatusChange = useCallback(
    (nodeId: string, status: TwinNode['status']) => {
      setWorld((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, status } : n))
      }));
    },
    []
  );

  const handleEdgeStatusChange = useCallback(
    (edgeId: string, status: TwinEdge['status']) => {
      setWorld((prev) => ({
        ...prev,
        edges: prev.edges.map((e) => (e.id === edgeId ? { ...e, status } : e))
      }));
    },
    []
  );

  // Filtered Assets for List View
  const filteredAssets = nodes.filter((n) =>
    n.name.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
    n.type.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
    n.status.toLowerCase().includes(listSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-2 select-none font-mono">
      {/* Top Header Card (Directly matching reference image) */}
      <div className="glass-panel p-3.5 rounded-2xl border border-blue-500/20 bg-slate-950/80 backdrop-blur-md space-y-3">
        {/* World Profile & Mode Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Campus Avatar, World Selector & Subtitle */}
          <div className="flex items-center space-x-3">
            {/* Campus Photo Thumbnail Avatar */}
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-neon-cyan/40 p-0.5 bg-gradient-to-tr from-blue-900 to-indigo-900 shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-neon-cyan" />
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowWorldDropdown(!showWorldDropdown)}
                  className="text-white font-extrabold text-base tracking-wide flex items-center space-x-1.5 hover:text-neon-cyan transition-colors"
                >
                  <span>{selectedWorld}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                <span className="px-2 py-0.5 rounded text-[10px] bg-neon-matrix/15 text-neon-matrix border border-neon-matrix/40 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-matrix animate-ping" />
                  <span>Live</span>
                </span>
              </div>

              <div className="text-[11px] text-slate-400 font-sans tracking-tight">
                Digital Twin • Real-time AI Simulation
              </div>

              {/* World Dropdown */}
              {showWorldDropdown && (
                <div className="absolute top-full left-0 mt-2 w-72 p-2 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl z-50 backdrop-blur-xl space-y-1">
                  {availableWorlds.map((w) => (
                    <button
                      key={w.name}
                      onClick={() => {
                        setSelectedWorld(w.name);
                        setShowWorldDropdown(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg transition-all ${
                        selectedWorld === w.name
                          ? 'bg-blue-600/20 text-neon-cyan border border-blue-500/40'
                          : 'text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{w.name}</span>
                        {w.live && <span className="text-[9px] text-neon-matrix">● LIVE</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{w.subtitle}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: View Mode Switcher (3D View, Map View, Graph View, List View) */}
          <div className="flex items-center space-x-2 font-mono text-xs">
            <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-lg">
              <button
                onClick={() => setViewMode('3d')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all text-xs font-bold ${
                  viewMode === '3d'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D View</span>
              </button>

              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all text-xs font-bold ${
                  viewMode === 'map'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map View</span>
              </button>

              <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all text-xs font-bold ${
                  viewMode === 'graph'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Graph View</span>
              </button>

              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all text-xs font-bold ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
            </div>

            <button
              onClick={() => {
                const elem = document.documentElement;
                if (!document.fullscreenElement) elem.requestFullscreen?.();
                else document.exitFullscreen?.();
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Integrated KPI Metric Badges Strip (Exact matching reference image) */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3.5">
            {/* Students */}
            <div className="flex items-center space-x-1.5 text-slate-300">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-500">Students:</span>
              <span className="text-white font-bold tracking-wide">10,524</span>
            </div>

            {/* Faculty */}
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-slate-500">Faculty:</span>
              <span className="text-white font-bold tracking-wide">742</span>
            </div>

            {/* Buildings */}
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span className="text-slate-500">Buildings:</span>
              <span className="text-white font-bold tracking-wide">28</span>
            </div>

            {/* Servers */}
            <div className="flex items-center space-x-1.5">
              <Server className="w-4 h-4 text-rose-500" />
              <span className="text-slate-500">Servers:</span>
              <span className="text-white font-bold tracking-wide">46</span>
              <span className="text-[10px] text-rose-400 font-bold bg-rose-950/60 px-1 rounded border border-rose-800/50">
                2 down
              </span>
            </div>

            {/* Buses */}
            <div className="flex items-center space-x-1.5">
              <Bus className="w-4 h-4 text-amber-400" />
              <span className="text-slate-500">Buses:</span>
              <span className="text-white font-bold tracking-wide">32</span>
              <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-1 rounded border border-amber-800/50">
                3 delayed
              </span>
            </div>

            {/* IoT Devices */}
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-500">IoT Devices:</span>
              <span className="text-white font-bold tracking-wide">1,284</span>
            </div>

            {/* Active Agents */}
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Bot className="w-4 h-4 text-neon-cyan" />
              <span className="text-slate-500">Active Agents:</span>
              <span className="text-white font-bold tracking-wide">48</span>
            </div>

            {/* Incidents */}
            <div className="flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
              <span className="text-slate-500">Incidents:</span>
              <span className="text-rose-400 font-extrabold tracking-wide">5</span>
            </div>
          </div>

          {/* Weather Badge */}
          <div className="flex items-center space-x-1.5 text-amber-300 bg-amber-950/30 border border-amber-500/30 px-2.5 py-1 rounded-lg">
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="font-bold">28°C</span>
            <span className="text-slate-400 text-[10px]">Clear</span>
          </div>
        </div>
      </div>

      {/* Viewport Modes */}
      {viewMode === '3d' && (
        <DigitalTwinViewport
          nodes={nodes}
          edges={edges}
          onNodeStatusChange={handleNodeStatusChange}
          onEdgeStatusChange={handleEdgeStatusChange}
        />
      )}

      {viewMode === 'map' && (
        <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-blue-500/25 bg-[#070b16] p-6 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-white font-bold text-base flex items-center space-x-2">
                <MapIcon className="w-4 h-4 text-neon-cyan" />
                <span>Tactical 2D GIS Campus Cartography</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Vector boundaries, sensor telemetry overlays, and real-time transit bus routes
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-1 rounded bg-blue-950/60 border border-blue-500/40 text-neon-cyan font-bold">
                Zone: North Sector
              </span>
              <span className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                GPS Precision: ±0.4m
              </span>
            </div>
          </div>

          {/* Schematic 2D SVG Campus Blueprint */}
          <div className="flex-1 my-4 rounded-xl border border-slate-800 bg-[#040711] relative overflow-hidden flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 800 450">
              {/* Grid Background */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00f0ff" strokeWidth="0.5" strokeOpacity="0.08" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Water Canal Path */}
              <path
                d="M 680 0 Q 720 180 690 320 T 740 450"
                fill="none"
                stroke="#0284c7"
                strokeWidth="28"
                strokeOpacity="0.6"
              />

              {/* Stadium Oval */}
              <ellipse cx="180" cy="300" rx="90" ry="55" fill="#1e293b" stroke="#00f0ff" strokeWidth="2" strokeDasharray="4 2" />
              <rect x="125" y="270" width="110" height="60" rx="4" fill="#047857" stroke="#ffffff" strokeWidth="1.5" />
              <line x1="180" y1="270" x2="180" y2="330" stroke="#ffffff" strokeWidth="1" />
              <circle cx="180" cy="300" r="16" fill="none" stroke="#ffffff" strokeWidth="1" />

              {/* Academic Blocks */}
              <rect x="320" y="80" width="120" height="70" rx="6" fill="#0c1a3b" stroke="#38bdf8" strokeWidth="2" />
              <text x="380" y="120" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">Academic Block A & B</text>

              {/* Hostel Complex */}
              <rect x="140" y="110" width="110" height="80" rx="6" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
              <text x="195" y="155" textAnchor="middle" fill="#818cf8" fontSize="11" fontWeight="bold">Hostel Block A</text>

              {/* Main Server Building */}
              <rect x="520" y="100" width="90" height="90" rx="6" fill="#450a0a" stroke="#ef4444" strokeWidth="2" className="animate-pulse" />
              <text x="565" y="145" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="bold">Main Server</text>
              <text x="565" y="165" textAnchor="middle" fill="#fca5a5" fontSize="9">HIGH SEVERITY</text>

              {/* Central Library */}
              <rect x="530" y="240" width="100" height="75" rx="6" fill="#082f49" stroke="#0284c7" strokeWidth="2" />
              <text x="580" y="282" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">Central Library</text>

              {/* Main Gate */}
              <rect x="420" y="370" width="80" height="35" rx="4" fill="#0f172a" stroke="#00f0ff" strokeWidth="1.5" />
              <text x="460" y="392" textAnchor="middle" fill="#00f0ff" fontSize="10" fontWeight="bold">Main Gate</text>

              {/* Road Network Lines */}
              <path d="M 80 230 Q 300 230 460 370" fill="none" stroke="#475569" strokeWidth="12" />
              <path d="M 460 370 Q 460 180 520 100" fill="none" stroke="#475569" strokeWidth="10" />

              {/* Bus Vehicles */}
              <circle cx="280" cy="230" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              <text x="280" y="215" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">Bus #12</text>

              <circle cx="460" cy="270" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              <text x="460" y="255" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">Bus #04</text>
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Layers: Topography, Infrastructure, Geofencing, Active GPS Shuttles</span>
            <button
              onClick={() => setViewMode('3d')}
              className="px-3 py-1 rounded-lg bg-blue-600/30 text-neon-cyan border border-blue-500/40 hover:bg-blue-600/50"
            >
              Return to 3D Orbit View
            </button>
          </div>
        </div>
      )}

      {viewMode === 'graph' && (
        <div className="w-full h-[620px] rounded-2xl overflow-hidden border border-blue-500/25 bg-slate-950">
          <TwinGraphTopology
            nodes={nodes}
            edges={edges}
            onNodeStatusChange={handleNodeStatusChange}
            onEdgeStatusChange={handleEdgeStatusChange}
          />
        </div>
      )}

      {viewMode === 'list' && (
        <div className="w-full h-[620px] rounded-2xl overflow-hidden border border-blue-500/25 bg-slate-950/90 p-5 flex flex-col justify-between font-mono">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-white font-bold text-base flex items-center space-x-2">
                  <ListIcon className="w-4 h-4 text-neon-cyan" />
                  <span>Campus Asset & Node Registry Directory</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live state verification, IP mappings, OS revisions, and telemetry indicators
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter assets by name, type, status..."
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-neon-cyan"
                />
              </div>
            </div>

            {/* Asset Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Entity Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Tier</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">CPU / Load</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-bold text-white flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            asset.status === 'healthy'
                              ? 'bg-emerald-400'
                              : asset.status === 'warning'
                              ? 'bg-amber-400'
                              : 'bg-rose-500 animate-ping'
                          }`}
                        />
                        <span>{asset.name}</span>
                      </td>
                      <td className="p-3 text-neon-cyan uppercase">{asset.type}</td>
                      <td className="p-3 text-slate-400">Tier {asset.tier}</td>
                      <td className="p-3 text-slate-300">{asset.metadata.ipAddress || '—'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            asset.status === 'healthy'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                              : asset.status === 'warning'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {asset.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-white font-bold">{asset.metadata.cpuUsage || 32}%</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            handleNodeStatusChange(
                              asset.id,
                              asset.status === 'compromised' ? 'healthy' : 'compromised'
                            );
                          }}
                          className="px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:border-neon-cyan text-[10px] text-slate-300 hover:text-white transition-colors"
                        >
                          {asset.status === 'compromised' ? 'Restore' : 'Triage'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Showing {filteredAssets.length} of {nodes.length} registered campus assets</span>
            <button
              onClick={() => setViewMode('3d')}
              className="px-3 py-1 rounded-lg bg-blue-600/30 text-neon-cyan border border-blue-500/40 hover:bg-blue-600/50"
            >
              Switch to 3D Viewport
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
