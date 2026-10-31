import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Search,
  Sliders
} from 'lucide-react';

export type WorldMode = 'school' | 'office' | 'defense';

export interface DigitalTwinWorldViewProps {
  worldMode?: WorldMode;
  worldName?: string;
  onWorldChange?: (mode: WorldMode, name: string) => void;
}

// Procedural World Seeding per Mode (School, Office, Defense)
function buildSeedWorld(mode: WorldMode): { nodes: TwinNode[]; edges: TwinEdge[] } {
  let rawNodes: TwinNode[] = [];

  if (mode === 'office') {
    rawNodes = [
      {
        id: 'fw-border',
        name: 'Enterprise Cloud Perimeter Shield',
        type: 'firewall',
        tier: 0,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.0.1', os: 'Palo Alto PAN-OS 11.1' }
      },
      {
        id: 'fw-dmz',
        name: 'Corporate DMZ Border Gateway',
        type: 'firewall',
        tier: 0,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.0.2' }
      },
      {
        id: 'lb-main',
        name: 'Global Traffic Director & Ingress LB',
        type: 'load_balancer',
        tier: 1,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.1.0.1', trafficRateKbps: 18400 }
      },
      {
        id: 'rtr-core',
        name: 'Core Enterprise Backbone Router',
        type: 'router',
        tier: 1,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.1.0.10' }
      },
      {
        id: 'srv-auth',
        name: 'Enterprise SSO & Okta Identity Node',
        type: 'server',
        tier: 2,
        status: 'compromised',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.2.0.10', os: 'Ubuntu 24.04 LTS', cpuUsage: 93, memoryUsage: 96 }
      },
      {
        id: 'srv-api',
        name: 'Core Financial Transactions Gateway',
        type: 'server',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.2.0.11', os: 'Alpine Linux 3.20', cpuUsage: 68, memoryUsage: 74 }
      },
      {
        id: 'srv-ai',
        name: 'Financial Neural Predictive Engine',
        type: 'server',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.2.0.50', os: 'Rocky Linux 9', cpuUsage: 89, memoryUsage: 92 }
      },
      {
        id: 'agent-soc',
        name: 'Corporate SecOps Triage Pod',
        type: 'agent_pod',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.2.0.100' }
      },
      {
        id: 'db-mongo',
        name: 'Enterprise ERP Document Vault',
        type: 'database',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.3.0.10', os: 'MongoDB 7.0 Enterprise' }
      },
      {
        id: 'db-redis',
        name: 'High-Frequency Realtime Cache',
        type: 'database',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.3.0.20', os: 'Redis Enterprise 7.2' }
      },
      {
        id: 'b-acad-1',
        name: 'Corporate Tower Alpha (60 Stories)',
        type: 'server',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '172.16.10.1', occupancy: '98%', hvac: 'Optimum' }
      },
      {
        id: 'b-hostel-a',
        name: 'Executive Boardroom & VIP Suites',
        type: 'server',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '172.16.20.1', securityClearance: 'Executive' }
      },
      {
        id: 'b-library',
        name: 'Tech Innovation & R&D Center',
        type: 'server',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '172.16.30.1', rAndDProjects: 42 }
      },
      {
        id: 'b-sports',
        name: 'Executive Helipad Plaza (Flight Deck)',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '172.16.40.1', windKnots: 8, padStatus: 'Ready' }
      },
      {
        id: 'b-maingate',
        name: 'Turnstiles & Biometric Security Gate',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '172.16.50.1', passRatePerMin: 140 }
      },
      {
        id: 'b-buses',
        name: 'Executive EV Shuttle Fleet',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '172.16.60.1', activeVehicles: 24, charging: 6 }
      },
      {
        id: 'iot-sensor-1',
        name: 'Helipad Weather & Wind Telemetry',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '172.16.100.10' }
      },
      {
        id: 'iot-sensor-2',
        name: 'Server Room Precision Chiller Array',
        type: 'iot_sensor',
        tier: 4,
        status: 'warning',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '172.16.100.11', vulnerabilities: ['CVE-2024-5129'] }
      }
    ];
  } else if (mode === 'defense') {
    rawNodes = [
      {
        id: 'fw-border',
        name: 'Air-Gapped Quantum Defensive Shield',
        type: 'firewall',
        tier: 0,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.0.1', os: 'SELinux Hardened' }
      },
      {
        id: 'fw-dmz',
        name: 'Bastion Red-Zone Filter',
        type: 'firewall',
        tier: 0,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.0.2' }
      },
      {
        id: 'lb-main',
        name: 'Bastion Traffic Scrubbing Ingress',
        type: 'load_balancer',
        tier: 1,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.1.0.1', trafficRateKbps: 34000 }
      },
      {
        id: 'rtr-core',
        name: 'Tactical Fiber Core Router',
        type: 'router',
        tier: 1,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.1.0.10' }
      },
      {
        id: 'srv-auth',
        name: 'Cryptographic Key Management Vault',
        type: 'server',
        tier: 2,
        status: 'compromised',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.2.0.10', os: 'RHEL 9 EAL4+', cpuUsage: 97, memoryUsage: 98 }
      },
      {
        id: 'srv-api',
        name: 'Tactical Telemetry & C2 Gateway',
        type: 'server',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.2.0.11', os: 'Hardened BSD', cpuUsage: 73, memoryUsage: 81 }
      },
      {
        id: 'srv-ai',
        name: 'Aegis Autonomous Defense Matrix',
        type: 'server',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.2.0.50', os: 'NVIDIA DGX SuperPod OS', cpuUsage: 94, memoryUsage: 96 }
      },
      {
        id: 'agent-soc',
        name: 'Tactical Cyber-Warfare Sentry Pod',
        type: 'agent_pod',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.2.0.100' }
      },
      {
        id: 'db-mongo',
        name: 'Classified Intel Archive MongoDB',
        type: 'database',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.3.0.10', os: 'MongoDB 7.0 Hardened' }
      },
      {
        id: 'db-redis',
        name: 'Threat Signal High-Freq Cache',
        type: 'database',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.3.0.20', os: 'Redis 7.2' }
      },
      {
        id: 'b-acad-1',
        name: 'Tactical Command Bastion',
        type: 'server',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.99.10.1', armorGrade: 'Reinforced Concrete Level 5' }
      },
      {
        id: 'b-hostel-a',
        name: 'Underground Cyber Ops Bunker-1',
        type: 'server',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.99.20.1', depthMeters: -45 }
      },
      {
        id: 'b-library',
        name: 'Satellite Uplink & Radar Dish Array',
        type: 'server',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.99.30.1', uplinkBand: 'Ku-Band Military' }
      },
      {
        id: 'b-sports',
        name: 'Drone Recon Apron (UAV-ALPHA)',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.99.40.1', dronesScrambled: 8, flightStatus: 'Patrolling' }
      },
      {
        id: 'b-maingate',
        name: 'Fortified Perimeter Checkpoint Delta',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.99.50.1', laserBarrier: 'Armed' }
      },
      {
        id: 'b-buses',
        name: 'Rapid Response Mobile Unit Division',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.99.60.1', armedVehicles: 16 }
      },
      {
        id: 'iot-sensor-1',
        name: 'Perimeter Laser Tripwire Array',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.99.100.10' }
      },
      {
        id: 'iot-sensor-2',
        name: 'Radiation & Thermal Sniffer Array',
        type: 'iot_sensor',
        tier: 4,
        status: 'warning',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.99.100.11', vulnerabilities: ['CVE-2024-9981'] }
      }
    ];
  } else {
    // School mode (Smart Education Campus)
    rawNodes = [
      {
        id: 'fw-border',
        name: 'Border Campus Firewall',
        type: 'firewall',
        tier: 0,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.0.1', os: 'FortiOS 7.4' }
      },
      {
        id: 'fw-dmz',
        name: 'Academic DMZ Firewall',
        type: 'firewall',
        tier: 0,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.0.2' }
      },
      {
        id: 'lb-main',
        name: 'Campus Ingress Load Balancer',
        type: 'load_balancer',
        tier: 1,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.1.0.1', trafficRateKbps: 4500 }
      },
      {
        id: 'rtr-core',
        name: 'Campus Core Backbone Router',
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
        name: 'Academic Portal API Gateway',
        type: 'server',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.2.0.11', os: 'Ubuntu 24.04', cpuUsage: 61, memoryUsage: 72 }
      },
      {
        id: 'srv-ai',
        name: 'LMS AI Research & Tutor Engine',
        type: 'server',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.2.0.50', os: 'Debian 12', cpuUsage: 88, memoryUsage: 94 }
      },
      {
        id: 'agent-soc',
        name: 'Campus Safety & SOC Agent Pod',
        type: 'agent_pod',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.2.0.100' }
      },
      {
        id: 'db-mongo',
        name: 'Student Records Vault MongoDB',
        type: 'database',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.3.0.10', os: 'MongoDB 7.0' }
      },
      {
        id: 'db-redis',
        name: 'Campus Event Cache Redis',
        type: 'database',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.3.0.20', os: 'Redis 7.2' }
      },
      {
        id: 'b-acad-1',
        name: 'Academic Block A & B (18 Lecture Halls)',
        type: 'server',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.10.1', lectureHalls: 18 }
      },
      {
        id: 'b-hostel-a',
        name: 'Hostel Block A (2,400 Students)',
        type: 'server',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.20.1', occupancyRate: '96%' }
      },
      {
        id: 'b-library',
        name: 'Central Library (350k Resources)',
        type: 'server',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.30.1', catalogCount: 350000 }
      },
      {
        id: 'b-sports',
        name: 'Sports Complex & Stadium Arena',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.40.1', pitchCondition: 'Optimal' }
      },
      {
        id: 'b-maingate',
        name: 'Campus Main Gate & RFID Turnstiles',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.50.1', accessState: 'Secure' }
      },
      {
        id: 'b-buses',
        name: 'Campus Transit Bus Fleet',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.60.1', activeBuses: 32, delayedBuses: 3 }
      },
      {
        id: 'iot-sensor-1',
        name: 'Perimeter Gate Optical Sensor Alpha',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.100.10' }
      },
      {
        id: 'iot-sensor-2',
        name: 'Central Library Thermal Array Beta',
        type: 'iot_sensor',
        tier: 4,
        status: 'warning',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.100.11', vulnerabilities: ['CVE-2024-1234'] }
      }
    ];
  }

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

export const DigitalTwinWorldView: React.FC<DigitalTwinWorldViewProps> = ({
  worldMode: propWorldMode,
  worldName: propWorldName,
  onWorldChange
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [internalWorldMode, setInternalWorldMode] = useState<WorldMode>(propWorldMode || 'school');
  const [simulationPlan, setSimulationPlan] = useState<string>('standard');
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [showWorldDropdown, setShowWorldDropdown] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');

  const activeMode: WorldMode = propWorldMode || internalWorldMode;

  // Re-seed world on activeMode change
  const [{ nodes, edges }, setWorld] = useState(() => buildSeedWorld(activeMode));

  useEffect(() => {
    setWorld(buildSeedWorld(activeMode));
  }, [activeMode]);

  const availableWorlds: Array<{
    id: string;
    name: string;
    mode: WorldMode;
    subtitle: string;
    badge: string;
  }> = [
    {
      id: 'world-school',
      name: 'NEXUS Quantum Academy',
      mode: 'school',
      subtitle: 'Smart Campus Digital Twin · 28 Academic & Sports Facilities',
      badge: 'Smart Campus'
    },
    {
      id: 'world-office',
      name: 'CyberDyne Enterprise HQ',
      mode: 'office',
      subtitle: 'Commercial Skyrise Tower Complex & Helipad Operations',
      badge: 'Corporate HQ'
    },
    {
      id: 'world-defense',
      name: 'Aegis Cyber Defense Complex',
      mode: 'defense',
      subtitle: 'Fortified Bastion Grid, Drone Apron & Satellite Uplink',
      badge: 'Defense Grid'
    }
  ];

  const currentWorldObj = availableWorlds.find((w) => w.mode === activeMode) || availableWorlds[0]!;
  const selectedWorldTitle = propWorldName || currentWorldObj.name;

  const simulationPlans = [
    { id: 'standard', name: 'Standard Baselined Operation', badge: 'Normal' },
    { id: 'backup_failover', name: 'Plan A: Backup Server Failover', badge: 'Recommended' },
    { id: 'load_distribution', name: 'Plan B: Dynamic Load Balancing', badge: 'Active' },
    { id: 'lockdown', name: 'Plan C: Zero-Trust Lockdown', badge: 'Critical' }
  ];

  const handleSelectWorld = (mode: WorldMode, name: string) => {
    setInternalWorldMode(mode);
    setShowWorldDropdown(false);
    onWorldChange?.(mode, name);
  };

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

  // Dynamic KPI Metric Values per Mode
  const kpiData = useMemo(() => {
    if (activeMode === 'office') {
      return {
        item1: { label: 'Personnel', value: '8,420', icon: Users, color: 'text-cyan-400' },
        item2: { label: 'Workstations', value: '9,150', icon: Cpu, color: 'text-blue-400' },
        item3: { label: 'Office Towers', value: '14', icon: Building2, color: 'text-purple-400' },
        item4: { label: 'Cloud Nodes', value: '184', sub: '4 degraded', icon: Server, color: 'text-rose-500' },
        item5: { label: 'EV Shuttles', value: '24', sub: 'On time', icon: Bus, color: 'text-amber-400' },
        item6: { label: 'Facilities IoT', value: '3,410', icon: Cpu, color: 'text-emerald-400' },
        item7: { label: 'Active Agents', value: '62', icon: Bot, color: 'text-neon-cyan' },
        item8: { label: 'Alerts', value: '3', icon: ShieldAlert, color: 'text-rose-500' },
        weather: { temp: '22°C', condition: 'Climate Controlled' }
      };
    }
    if (activeMode === 'defense') {
      return {
        item1: { label: 'Operators', value: '1,420', icon: Users, color: 'text-cyan-400' },
        item2: { label: 'Bastions', value: '64', icon: Building2, color: 'text-blue-400' },
        item3: { label: 'Firewall Grids', value: '18', icon: ShieldAlert, color: 'text-purple-400' },
        item4: { label: 'Core Bastions', value: '92', sub: '5 under attack', icon: Server, color: 'text-rose-500' },
        item5: { label: 'Response Units', value: '16', sub: 'Scrambled', icon: Bus, color: 'text-rose-400' },
        item6: { label: 'Sensors', value: '4,890', icon: Cpu, color: 'text-emerald-400' },
        item7: { label: 'Defensive AI', value: '84', icon: Bot, color: 'text-neon-cyan' },
        item8: { label: 'Breaches', value: '2', icon: ShieldAlert, color: 'text-rose-500' },
        weather: { temp: '19°C', condition: 'Vault Atmosphere' }
      };
    }
    // School mode default
    return {
      item1: { label: 'Students', value: '10,524', icon: GraduationCap, color: 'text-cyan-400' },
      item2: { label: 'Faculty', value: '742', icon: Users, color: 'text-blue-400' },
      item3: { label: 'Buildings', value: '28', icon: Building2, color: 'text-purple-400' },
      item4: { label: 'Servers', value: '46', sub: '2 down', icon: Server, color: 'text-rose-500' },
      item5: { label: 'Buses', value: '32', sub: '3 delayed', icon: Bus, color: 'text-amber-400' },
      item6: { label: 'IoT Devices', value: '1,284', icon: Cpu, color: 'text-emerald-400' },
      item7: { label: 'Active Agents', value: '48', icon: Bot, color: 'text-neon-cyan' },
      item8: { label: 'Incidents', value: '5', icon: ShieldAlert, color: 'text-rose-500' },
      weather: { temp: '28°C', condition: 'Clear' }
    };
  }, [activeMode]);

  // Filtered Assets for List View
  const filteredAssets = nodes.filter((n) =>
    n.name.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
    n.type.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
    n.status.toLowerCase().includes(listSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-2 select-none font-mono">
      {/* Top Header Card */}
      <div className="glass-panel p-3.5 rounded-2xl border border-blue-500/20 bg-slate-950/80 backdrop-blur-md space-y-3">
        {/* World Profile & Mode Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Campus Avatar, World Selector & Subtitle */}
          <div className="flex items-center space-x-3">
            {/* Thumbnail Avatar */}
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-neon-cyan/40 p-0.5 bg-gradient-to-tr from-blue-900 to-indigo-900 shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center">
                {activeMode === 'office' ? (
                  <Building2 className="w-6 h-6 text-neon-cyan" />
                ) : activeMode === 'defense' ? (
                  <ShieldAlert className="w-6 h-6 text-neon-crimson" />
                ) : (
                  <GraduationCap className="w-6 h-6 text-neon-cyan" />
                )}
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowWorldDropdown(!showWorldDropdown)}
                  className="text-white font-extrabold text-base tracking-wide flex items-center space-x-1.5 hover:text-neon-cyan transition-colors"
                >
                  <span>{selectedWorldTitle}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                <span className="px-2 py-0.5 rounded text-[10px] bg-neon-matrix/15 text-neon-matrix border border-neon-matrix/40 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-matrix animate-ping" />
                  <span>Live</span>
                </span>

                <span className="hidden md:inline-flex px-2 py-0.5 rounded text-[9px] bg-blue-950/70 text-neon-cyan border border-blue-500/40 uppercase font-bold">
                  {currentWorldObj.badge}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 font-sans tracking-tight">
                Digital Twin • Real-time AI Simulation
              </div>

              {/* World Dropdown */}
              {showWorldDropdown && (
                <div className="absolute top-full left-0 mt-2 w-80 p-2 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl z-50 backdrop-blur-xl space-y-1">
                  <div className="px-2 py-1 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    Select Digital Twin Simulation Environment
                  </div>
                  {availableWorlds.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => handleSelectWorld(w.mode, w.name)}
                      className={`w-full text-left p-2 rounded-lg transition-all ${
                        activeMode === w.mode
                          ? 'bg-blue-600/25 text-neon-cyan border border-blue-500/40'
                          : 'text-slate-300 hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          {w.mode === 'office' && <Building2 className="w-3.5 h-3.5 text-blue-400" />}
                          {w.mode === 'defense' && <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
                          {w.mode === 'school' && <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />}
                          <span>{w.name}</span>
                        </span>
                        <span className="text-[9px] text-neon-matrix font-mono">● LIVE</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{w.subtitle}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Simulation Plan Dropdown + View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {/* Active Simulation Plan Selector */}
            <div className="relative">
              <button
                onClick={() => setShowPlanDropdown(!showPlanDropdown)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-neon-purple text-xs font-bold text-slate-200 flex items-center space-x-1.5 transition-all shadow-lg"
              >
                <Sliders className="w-3.5 h-3.5 text-neon-purple" />
                <span className="text-slate-400 font-normal">Plan:</span>
                <span className="text-neon-purple truncate max-w-[130px]">
                  {simulationPlans.find((p) => p.id === simulationPlan)?.name.split(':')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showPlanDropdown && (
                <div className="absolute top-full right-0 mt-2 w-72 p-2 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl z-50 backdrop-blur-xl space-y-1">
                  <div className="px-2 py-1 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    Select Active Simulation Plan
                  </div>
                  {simulationPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => {
                        setSimulationPlan(plan.id);
                        setShowPlanDropdown(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg transition-all ${
                        simulationPlan === plan.id
                          ? 'bg-purple-600/25 text-purple-300 border border-purple-500/40'
                          : 'text-slate-300 hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{plan.name}</span>
                        <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">
                          {plan.badge}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Switcher */}
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

        {/* Integrated KPI Metric Badges Strip (Dynamically Adapting to Mode) */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3.5">
            {/* Metric 1 */}
            <div className="flex items-center space-x-1.5 text-slate-300">
              <kpiData.item1.icon className={`w-4 h-4 ${kpiData.item1.color}`} />
              <span className="text-slate-500">{kpiData.item1.label}:</span>
              <span className="text-white font-bold tracking-wide">{kpiData.item1.value}</span>
            </div>

            {/* Metric 2 */}
            <div className="flex items-center space-x-1.5 text-slate-300">
              <kpiData.item2.icon className={`w-4 h-4 ${kpiData.item2.color}`} />
              <span className="text-slate-500">{kpiData.item2.label}:</span>
              <span className="text-white font-bold tracking-wide">{kpiData.item2.value}</span>
            </div>

            {/* Metric 3 */}
            <div className="flex items-center space-x-1.5 text-slate-300">
              <kpiData.item3.icon className={`w-4 h-4 ${kpiData.item3.color}`} />
              <span className="text-slate-500">{kpiData.item3.label}:</span>
              <span className="text-white font-bold tracking-wide">{kpiData.item3.value}</span>
            </div>

            {/* Metric 4 (Servers/Nodes) */}
            <div className="flex items-center space-x-1.5">
              <kpiData.item4.icon className={`w-4 h-4 ${kpiData.item4.color}`} />
              <span className="text-slate-500">{kpiData.item4.label}:</span>
              <span className="text-white font-bold tracking-wide">{kpiData.item4.value}</span>
              {kpiData.item4.sub && (
                <span className="text-[10px] text-rose-400 font-bold bg-rose-950/60 px-1 rounded border border-rose-800/50">
                  {kpiData.item4.sub}
                </span>
              )}
            </div>

            {/* Metric 5 (Vehicles/Units) */}
            <div className="flex items-center space-x-1.5">
              <kpiData.item5.icon className={`w-4 h-4 ${kpiData.item5.color}`} />
              <span className="text-slate-500">{kpiData.item5.label}:</span>
              <span className="text-white font-bold tracking-wide">{kpiData.item5.value}</span>
              {kpiData.item5.sub && (
                <span className={`text-[10px] font-bold px-1 rounded border ${
                  activeMode === 'defense'
                    ? 'text-rose-400 bg-rose-950/60 border-rose-800/50'
                    : activeMode === 'office'
                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50'
                    : 'text-amber-400 bg-amber-950/60 border-amber-800/50'
                }`}>
                  {kpiData.item5.sub}
                </span>
              )}
            </div>

            {/* Metric 6 (IoT Devices) */}
            <div className="flex items-center space-x-1.5 text-slate-300">
              <kpiData.item6.icon className={`w-4 h-4 ${kpiData.item6.color}`} />
              <span className="text-slate-500">{kpiData.item6.label}:</span>
              <span className="text-white font-bold tracking-wide">{kpiData.item6.value}</span>
            </div>

            {/* Metric 7 (Active Agents) */}
            <div className="flex items-center space-x-1.5 text-slate-300">
              <kpiData.item7.icon className={`w-4 h-4 ${kpiData.item7.color}`} />
              <span className="text-slate-500">{kpiData.item7.label}:</span>
              <span className="text-white font-bold tracking-wide">{kpiData.item7.value}</span>
            </div>

            {/* Metric 8 (Incidents) */}
            <div className="flex items-center space-x-1.5">
              <kpiData.item8.icon className={`w-4 h-4 ${kpiData.item8.color} animate-pulse`} />
              <span className="text-slate-500">{kpiData.item8.label}:</span>
              <span className="text-rose-400 font-extrabold tracking-wide">{kpiData.item8.value}</span>
            </div>
          </div>

          {/* Weather & Climate Badge */}
          <div className="flex items-center space-x-1.5 text-amber-300 bg-amber-950/30 border border-amber-500/30 px-2.5 py-1 rounded-lg">
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="font-bold">{kpiData.weather.temp}</span>
            <span className="text-slate-400 text-[10px]">{kpiData.weather.condition}</span>
          </div>
        </div>
      </div>

      {/* Viewport Modes */}
      {viewMode === '3d' && (
        <DigitalTwinViewport
          nodes={nodes}
          edges={edges}
          worldMode={activeMode}
          simulationPlan={simulationPlan}
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
                <span>
                  {activeMode === 'school' && 'Tactical 2D GIS Smart Campus Cartography'}
                  {activeMode === 'office' && 'Enterprise Commercial Skyrise Real Estate Cartography'}
                  {activeMode === 'defense' && 'Hardened Bastion Defense Perimeter Cartography'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeMode === 'school' && 'Vector boundaries, sensor telemetry overlays, and real-time transit bus routes'}
                {activeMode === 'office' && 'Skyrise footprints, helipad approach corridors, and EV fleet positioning'}
                {activeMode === 'defense' && 'Bastion kill-zones, UAV flight aprons, and air-gapped security perimeters'}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-1 rounded bg-blue-950/60 border border-blue-500/40 text-neon-cyan font-bold">
                {activeMode === 'school' ? 'Zone: North Academic Sector' : activeMode === 'office' ? 'Zone: Financial Plaza Alpha' : 'Zone: Bastion Red Perimeter'}
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

              {/* Water Canal Path / Reflecting Basin */}
              <path
                d="M 680 0 Q 720 180 690 320 T 740 450"
                fill="none"
                stroke={activeMode === 'defense' ? '#7f1d1d' : '#0284c7'}
                strokeWidth="28"
                strokeOpacity="0.6"
              />

              {activeMode === 'school' && (
                <>
                  {/* Soccer Stadium Oval */}
                  <ellipse cx="180" cy="300" rx="90" ry="55" fill="#1e293b" stroke="#00f0ff" strokeWidth="2" strokeDasharray="4 2" />
                  <rect x="125" y="270" width="110" height="60" rx="4" fill="#047857" stroke="#ffffff" strokeWidth="1.5" />
                  <line x1="180" y1="270" x2="180" y2="330" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="180" cy="300" r="16" fill="none" stroke="#ffffff" strokeWidth="1" />
                  <text x="180" y="348" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">Sports Complex & Stadium</text>

                  {/* Academic Blocks */}
                  <rect x="320" y="80" width="120" height="70" rx="6" fill="#0c1a3b" stroke="#38bdf8" strokeWidth="2" />
                  <text x="380" y="120" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">Academic Block A & B</text>

                  {/* Hostel Complex */}
                  <rect x="140" y="110" width="110" height="80" rx="6" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
                  <text x="195" y="155" textAnchor="middle" fill="#818cf8" fontSize="11" fontWeight="bold">Hostel Block A</text>

                  {/* Main Server */}
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
                </>
              )}

              {activeMode === 'office' && (
                <>
                  {/* Executive Helipad Plaza */}
                  <circle cx="180" cy="300" r="60" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 3" />
                  <circle cx="180" cy="300" r="42" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="180" y="312" textAnchor="middle" fill="#f59e0b" fontSize="30" fontWeight="extrabold">H</text>
                  <text x="180" y="375" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">Helipad Deck Alpha</text>

                  {/* Corporate Tower Alpha */}
                  <rect x="310" y="70" width="140" height="90" rx="6" fill="#0a192f" stroke="#00f0ff" strokeWidth="2.5" />
                  <text x="380" y="115" textAnchor="middle" fill="#00f0ff" fontSize="12" fontWeight="bold">Corporate Tower Alpha</text>
                  <text x="380" y="135" textAnchor="middle" fill="#94a3b8" fontSize="9">60 Stories · Global HQ</text>

                  {/* Executive Suites */}
                  <rect x="140" y="100" width="120" height="85" rx="6" fill="#1e1b4b" stroke="#a855f7" strokeWidth="2" />
                  <text x="200" y="145" textAnchor="middle" fill="#c084fc" fontSize="11" fontWeight="bold">Executive Boardroom</text>

                  {/* Core Cloud Datacenter */}
                  <rect x="520" y="100" width="100" height="90" rx="6" fill="#450a0a" stroke="#ef4444" strokeWidth="2" className="animate-pulse" />
                  <text x="570" y="145" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="bold">Enterprise SSO Vault</text>
                  <text x="570" y="165" textAnchor="middle" fill="#fca5a5" fontSize="9">DEGRADED AUTH</text>

                  {/* Tech Innovation Lab */}
                  <rect x="530" y="240" width="110" height="80" rx="6" fill="#082f49" stroke="#38bdf8" strokeWidth="2" />
                  <text x="585" y="282" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">Tech Innovation R&D</text>

                  {/* Security Turnstiles Gate */}
                  <rect x="420" y="370" width="90" height="35" rx="4" fill="#0f172a" stroke="#00f0ff" strokeWidth="1.5" />
                  <text x="465" y="392" textAnchor="middle" fill="#00f0ff" fontSize="10" fontWeight="bold">Biometric Turnstiles</text>

                  {/* Corporate Highway Lines */}
                  <path d="M 80 230 Q 300 230 460 370" fill="none" stroke="#334155" strokeWidth="12" />
                  <path d="M 460 370 Q 460 180 520 100" fill="none" stroke="#334155" strokeWidth="10" />

                  {/* EV Fleet Shuttles */}
                  <circle cx="280" cy="230" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  <text x="280" y="215" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">EV Shuttle #01</text>

                  <circle cx="460" cy="270" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  <text x="460" y="255" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">EV Shuttle #08</text>
                </>
              )}

              {activeMode === 'defense' && (
                <>
                  {/* Tactical Drone Apron (UAV-ALPHA) */}
                  <rect x="110" y="250" width="140" height="100" rx="8" fill="#18181b" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 3" />
                  <line x1="180" y1="260" x2="180" y2="340" stroke="#ef4444" strokeWidth="2" />
                  <line x1="130" y1="300" x2="230" y2="300" stroke="#ef4444" strokeWidth="2" />
                  <text x="180" y="335" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">UAV RUNWAY ALPHA</text>

                  {/* Tactical Command Bastion */}
                  <polygon points="380,60 450,110 430,165 330,165 310,110" fill="#18181b" stroke="#f43f5e" strokeWidth="2.5" />
                  <text x="380" y="125" textAnchor="middle" fill="#f43f5e" fontSize="11" fontWeight="bold">Command Bastion</text>

                  {/* Underground Cyber Ops Bunker */}
                  <rect x="140" y="100" width="120" height="85" rx="6" fill="#1c1917" stroke="#e11d48" strokeWidth="2" />
                  <text x="200" y="145" textAnchor="middle" fill="#fb7185" fontSize="11" fontWeight="bold">Cyber Ops Bunker-1</text>

                  {/* Quantum Cryptographic Vault */}
                  <rect x="520" y="100" width="100" height="90" rx="6" fill="#450a0a" stroke="#dc2626" strokeWidth="2" className="animate-pulse" />
                  <text x="570" y="145" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="bold">Crypto Vault Alpha</text>
                  <text x="570" y="165" textAnchor="middle" fill="#fca5a5" fontSize="9">BREACH DETECTED</text>

                  {/* Satellite Uplink & Radar Dish Array */}
                  <circle cx="585" cy="280" r="45" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="585" y1="235" x2="585" y2="325" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="540" y1="280" x2="630" y2="280" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="585" y="285" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">Radar Array</text>

                  {/* Checkpoint Delta */}
                  <rect x="420" y="370" width="90" height="35" rx="4" fill="#0f172a" stroke="#ef4444" strokeWidth="1.5" />
                  <text x="465" y="392" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">Checkpoint Delta</text>

                  {/* Fortified Patrol Tracks */}
                  <path d="M 80 230 Q 300 230 460 370" fill="none" stroke="#292524" strokeWidth="12" />
                  <path d="M 460 370 Q 460 180 520 100" fill="none" stroke="#292524" strokeWidth="10" />

                  {/* Rapid Response Armored Units */}
                  <circle cx="280" cy="230" r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                  <text x="280" y="215" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">Unit #01</text>

                  <circle cx="460" cy="270" r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                  <text x="460" y="255" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">Unit #03</text>
                </>
              )}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Layers: Topography, Infrastructure, Geofencing, Active GPS Telemetry</span>
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
                  <span>
                    {activeMode === 'school' && 'Campus Asset & Node Registry Directory'}
                    {activeMode === 'office' && 'Corporate Enterprise Node & Asset Registry'}
                    {activeMode === 'defense' && 'Hardened Bastion & Defense Grid Directory'}
                  </span>
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
                      <td className="p-3 text-slate-300">{(asset.metadata as any)?.ipAddress || '—'}</td>
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
                      <td className="p-3 text-white font-bold">{(asset.metadata as any)?.cpuUsage || 32}%</td>
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
            <span>Showing {filteredAssets.length} of {nodes.length} registered environment assets</span>
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
