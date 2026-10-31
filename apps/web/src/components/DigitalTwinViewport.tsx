import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useThreeViewport, ActiveLayers, WorldMode } from '../hooks/useThreeViewport.js';
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
  PlusSquare,
  Pencil,
  Play,
  Pause,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Building2,
  Users,
  Car,
  Server,
  Share2,
  Sun,
  X,
  Radio,
  BookOpen,
  ChevronDown,
  Crosshair,
  Bot
} from 'lucide-react';

interface DigitalTwinViewportProps {
  nodes: TwinNode[];
  edges: TwinEdge[];
  worldMode?: WorldMode;
  simulationPlan?: string;
  onNodeStatusChange?: (nodeId: string, status: TwinNode['status']) => void;
  onEdgeStatusChange?: (edgeId: string, status: TwinEdge['status']) => void;
  onInvestigateEntity?: (node: TwinNode) => void;
}

export const DigitalTwinViewport: React.FC<DigitalTwinViewportProps> = ({
  nodes,
  edges,
  worldMode = 'school',
  simulationPlan = 'standard',
  onNodeStatusChange,
  onInvestigateEntity
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Selected node & blast radius state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('srv-auth');
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [blastRadiusResult, setBlastRadiusResult] = useState<ReturnType<typeof computeBlastRadius> | null>(null);
  const [showBlastRadius, setShowBlastRadius] = useState(false);

  // Active Layers (Matches reference image Layers +)
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>({
    buildings: true,
    people: true,
    vehicles: true,
    servers: true,
    network: true,
    security: true,
    weather: true
  });
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);

  // Active Tools (Matches reference image Tools)
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [activePreset, setActivePreset] = useState<'orbital' | 'top-down' | 'ingress' | 'stadium'>('orbital');

  // Timeline State (Matches reference image scrub bar)
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(true);
  const [timelineTime, setTimelineTime] = useState<string>('10:24');
  const [speedMultiplier, setSpeedMultiplier] = useState<'1x' | '2x' | '5x'>('1x');

  // Interactive Measurement & Zone notifications
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState('');
  const [showEntitySelector, setShowEntitySelector] = useState(false);

  // Three.js Viewport Hook
  const {
    setCameraPreset,
    zoomIn,
    zoomOut,
    resetCamera,
    focusNode,
    hoveredNodeId,
    compassAngle,
    fpsTelemetry
  } = useThreeViewport({
    canvasRef,
    worldMode,
    simulationPlan,
    nodes,
    edges,
    selectedNodeId,
    highlightedNodeIds: blastRadiusResult?.impactedNodeIds ?? [],
    onNodeClick: (nodeId) => {
      setSelectedNodeId(nodeId);
      setIsInspectorOpen(true);
      setShowBlastRadius(false);
      focusNode(nodeId);
      setScreenReaderAnnouncement(`Selected node ${nodeId}`);
    },
    activeLayers,
    activeTool: selectedTool,
    isSimulating: selectedTool === 'simulate'
  });

  // Track Fullscreen State Changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation & accessibility shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = (e.target as HTMLElement) || (document.activeElement as HTMLElement);

      // Escape key handler: ALWAYS dismiss drawers/inspectors/modals, even from within dialogs
      if (e.key === 'Escape') {
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          (target as HTMLInputElement).blur();
        }
        setIsInspectorOpen(false);
        setShowEntitySelector(false);
        setShowLayersDropdown(false);
        return;
      }

      // Guard: Completely suppress letter/number shortcuts whenever user is typing in inputs, search boxes, forms, or text areas
      const isTypingContext =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox' ||
          target.getAttribute('role') === 'searchbox' ||
          Boolean(
            target.closest('input, textarea, select, [contenteditable="true"], [role="searchbox"], form')
          ));

      if (isTypingContext) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetCamera();
        setActivePreset('orbital');
        setScreenReaderAnnouncement('Camera view reset to default orbital perspective.');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
        setScreenReaderAnnouncement('Camera zoomed in.');
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
        setScreenReaderAnnouncement('Camera zoomed out.');
      } else if (e.key === '1') {
        setActivePreset('orbital');
        setCameraPreset('orbital');
        setScreenReaderAnnouncement('Switched to orbital camera preset.');
      } else if (e.key === '2') {
        setActivePreset('top-down');
        setCameraPreset('top-down');
        setScreenReaderAnnouncement('Switched to top-down camera preset.');
      } else if (e.key === '3') {
        setActivePreset('ingress');
        setCameraPreset('ingress');
        setScreenReaderAnnouncement('Switched to ingress camera preset.');
      } else if (e.key === '4') {
        setActivePreset('stadium');
        setCameraPreset('stadium');
        setScreenReaderAnnouncement('Switched to stadium camera preset.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetCamera, zoomIn, zoomOut, setCameraPreset, isInspectorOpen]);

  const toggleLayer = (layer: keyof ActiveLayers) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    if (toolId === 'measure') {
      setHudMessage('Measurement Tool Active: Click two points on campus to calculate spatial distance.');
    } else if (toolId === 'add') {
      setHudMessage('Add Entity Tool Active: Click anywhere on the campus grid to place a new node.');
    } else if (toolId === 'zone') {
      setHudMessage('Draw Zone Tool Active: Drag on the viewport to define an exclusion or security zone.');
    } else if (toolId === 'simulate') {
      setHudMessage('Simulation Mode: Injecting authentication server failure and campus transit delays...');
    } else {
      setHudMessage(null);
    }
  };

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

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      const el = containerRef.current as any;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (req) {
        req.call(el).catch((err: unknown) => {
          console.warn('Fullscreen request blocked:', err);
        });
      }
    } else {
      const doc = document as any;
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exit) {
        exit.call(doc).catch((err: unknown) => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    }
  };

  const handleSelectEntity = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsInspectorOpen(true);
    setShowBlastRadius(false);
    focusNode(nodeId);
    setShowEntitySelector(false);
    setScreenReaderAnnouncement(`Focused on entity ${nodeId}`);
  };

  // 7 Holographic Beacons dynamically configured per simulation world
  const beacons = useMemo(() => {
    if (worldMode === 'office') {
      return [
        {
          id: 'beacon-hostel',
          nodeId: 'b-hostel-a',
          title: 'Global Trading Floor',
          status: '450 desks · High Volume',
          icon: Building2,
          top: '28%',
          left: '26%',
          glowBorder: 'border-cyan-400/80',
          bg: 'bg-slate-950/90',
          text: 'text-cyan-300',
          dotColor: 'bg-cyan-400',
          stemColor: 'bg-cyan-400/60'
        },
        {
          id: 'beacon-academic',
          nodeId: 'b-acad-1',
          title: 'Executive Tower Alpha',
          status: '72 floors · 98% occupied',
          icon: Building2,
          top: '18%',
          left: '46%',
          glowBorder: 'border-emerald-400/80',
          bg: 'bg-slate-950/90',
          text: 'text-emerald-300',
          dotColor: 'bg-emerald-400',
          stemColor: 'bg-emerald-400/60'
        },
        {
          id: 'beacon-server',
          nodeId: 'srv-auth',
          title: 'Primary Datacenter',
          status: 'Cooling Anomaly · High Severity',
          icon: Server,
          top: '24%',
          left: '62%',
          glowBorder: 'border-rose-500',
          bg: 'bg-rose-950/90',
          text: 'text-rose-300',
          dotColor: 'bg-rose-500 animate-ping',
          stemColor: 'bg-rose-500/80 animate-pulse'
        },
        {
          id: 'beacon-library',
          nodeId: 'b-library',
          title: 'Global Operations Hub',
          status: '24/7 Operations · Online',
          icon: BookOpen,
          top: '32%',
          left: '71%',
          glowBorder: 'border-blue-500/80',
          bg: 'bg-slate-950/90',
          text: 'text-blue-300',
          dotColor: 'bg-blue-400',
          stemColor: 'bg-blue-400/60'
        },
        {
          id: 'beacon-sports',
          nodeId: 'b-sports',
          title: 'Rooftop Helipad',
          status: 'VIP Transport Active',
          icon: Activity,
          top: '46%',
          left: '25%',
          glowBorder: 'border-amber-400/80',
          bg: 'bg-slate-950/90',
          text: 'text-amber-300',
          dotColor: 'bg-amber-400',
          stemColor: 'bg-amber-400/60'
        },
        {
          id: 'beacon-buses',
          nodeId: 'b-buses',
          title: 'Corporate EV Shuttles',
          status: '24 active · Zero delays',
          icon: Car,
          top: '44%',
          left: '38%',
          glowBorder: 'border-emerald-400/80',
          bg: 'bg-slate-950/90',
          text: 'text-emerald-300',
          dotColor: 'bg-emerald-400',
          stemColor: 'bg-emerald-400/60'
        },
        {
          id: 'beacon-gate',
          nodeId: 'b-maingate',
          title: 'Biometric Portal',
          status: 'Access Level 5 Enforced',
          icon: Shield,
          top: '50%',
          left: '56%',
          glowBorder: 'border-blue-400/80',
          bg: 'bg-slate-950/90',
          text: 'text-blue-300',
          dotColor: 'bg-blue-400',
          stemColor: 'bg-blue-400/60'
        }
      ];
    } else if (worldMode === 'defense') {
      return [
        {
          id: 'beacon-hostel',
          nodeId: 'b-hostel-a',
          title: 'Operator Ready Barracks',
          status: 'Tactical Squads on Standby',
          icon: Building2,
          top: '28%',
          left: '26%',
          glowBorder: 'border-cyan-400/80',
          bg: 'bg-slate-950/90',
          text: 'text-cyan-300',
          dotColor: 'bg-cyan-400',
          stemColor: 'bg-cyan-400/60'
        },
        {
          id: 'beacon-academic',
          nodeId: 'b-acad-1',
          title: 'SOC Command Fortress',
          status: 'Level 4 Cyber Threat Alert',
          icon: Building2,
          top: '18%',
          left: '46%',
          glowBorder: 'border-emerald-400/80',
          bg: 'bg-slate-950/90',
          text: 'text-emerald-300',
          dotColor: 'bg-emerald-400',
          stemColor: 'bg-emerald-400/60'
        },
        {
          id: 'beacon-server',
          nodeId: 'srv-auth',
          title: 'Crypto Core Vault',
          status: 'Air-Gap Breach Contained',
          icon: Server,
          top: '24%',
          left: '62%',
          glowBorder: 'border-rose-500',
          bg: 'bg-rose-950/90',
          text: 'text-rose-300',
          dotColor: 'bg-rose-500 animate-ping',
          stemColor: 'bg-rose-500/80 animate-pulse'
        },
        {
          id: 'beacon-library',
          nodeId: 'b-library',
          title: 'Threat Intel Radome',
          status: 'Orbital Telemetry Linked',
          icon: BookOpen,
          top: '32%',
          left: '71%',
          glowBorder: 'border-blue-500/80',
          bg: 'bg-slate-950/90',
          text: 'text-blue-300',
          dotColor: 'bg-blue-400',
          stemColor: 'bg-blue-400/60'
        },
        {
          id: 'beacon-sports',
          nodeId: 'b-sports',
          title: 'Tactical Drone Pad',
          status: '16 UAVs Armed / 2 Scrambled',
          icon: Activity,
          top: '46%',
          left: '25%',
          glowBorder: 'border-teal-400/80',
          bg: 'bg-slate-950/90',
          text: 'text-teal-300',
          dotColor: 'bg-teal-400',
          stemColor: 'bg-teal-400/60'
        },
        {
          id: 'beacon-buses',
          nodeId: 'b-buses',
          title: 'Rapid Response Fleet',
          status: 'Armored Units Dispatched',
          icon: Car,
          top: '44%',
          left: '38%',
          glowBorder: 'border-amber-400/80',
          bg: 'bg-amber-950/90',
          text: 'text-amber-300',
          dotColor: 'bg-amber-400',
          stemColor: 'bg-amber-400/60'
        },
        {
          id: 'beacon-gate',
          nodeId: 'b-maingate',
          title: 'Perimeter Barrier',
          status: 'Hardened Lockdown Active',
          icon: Shield,
          top: '50%',
          left: '56%',
          glowBorder: 'border-rose-500/80',
          bg: 'bg-slate-950/90',
          text: 'text-rose-300',
          dotColor: 'bg-rose-500',
          stemColor: 'bg-rose-500/60'
        }
      ];
    }

    // Default: School Mode
    return [
      {
        id: 'beacon-hostel',
        nodeId: 'b-hostel-a',
        title: 'Student Dorm Hall A',
        status: '2,400 residents · 96% occupancy',
        icon: Building2,
        top: '28%',
        left: '26%',
        glowBorder: 'border-cyan-400/80',
        bg: 'bg-slate-950/90',
        text: 'text-cyan-300',
        dotColor: 'bg-cyan-400',
        stemColor: 'bg-cyan-400/60'
      },
      {
        id: 'beacon-academic',
        nodeId: 'b-acad-1',
        title: 'STEM Lecture Block',
        status: '18 lecture halls · Normal',
        icon: Building2,
        top: '18%',
        left: '46%',
        glowBorder: 'border-emerald-400/80',
        bg: 'bg-slate-950/90',
        text: 'text-emerald-300',
        dotColor: 'bg-emerald-400',
        stemColor: 'bg-emerald-400/60'
      },
      {
        id: 'beacon-server',
        nodeId: 'srv-auth',
        title: 'Campus Auth Server',
        status: 'Issues detected · High Severity',
        icon: Server,
        top: '24%',
        left: '62%',
        glowBorder: 'border-rose-500',
        bg: 'bg-rose-950/90',
        text: 'text-rose-300',
        dotColor: 'bg-rose-500 animate-ping',
        stemColor: 'bg-rose-500/80 animate-pulse'
      },
      {
        id: 'beacon-library',
        nodeId: 'b-library',
        title: 'Digital Media Library',
        status: '350k educational resources · Online',
        icon: BookOpen,
        top: '32%',
        left: '71%',
        glowBorder: 'border-blue-500/80',
        bg: 'bg-slate-950/90',
        text: 'text-blue-300',
        dotColor: 'bg-blue-400',
        stemColor: 'bg-blue-400/60'
      },
      {
        id: 'beacon-sports',
        nodeId: 'b-sports',
        title: 'Athletic Sports Complex',
        status: 'Football tournament underway',
        icon: Activity,
        top: '46%',
        left: '25%',
        glowBorder: 'border-teal-400/80',
        bg: 'bg-slate-950/90',
        text: 'text-teal-300',
        dotColor: 'bg-teal-400',
        stemColor: 'bg-teal-400/60'
      },
      {
        id: 'beacon-buses',
        nodeId: 'b-buses',
        title: 'Campus Transit Buses',
        status: '32 active / 3 delayed',
        icon: Car,
        top: '44%',
        left: '38%',
        glowBorder: 'border-amber-400/80',
        bg: 'bg-amber-950/90',
        text: 'text-amber-300',
        dotColor: 'bg-amber-400',
        stemColor: 'bg-amber-400/60'
      },
      {
        id: 'beacon-gate',
        nodeId: 'b-maingate',
        title: 'North Campus Gate',
        status: 'Secure · Automated Turnstiles',
        icon: Shield,
        top: '50%',
        left: '56%',
        glowBorder: 'border-blue-400/80',
        bg: 'bg-slate-950/90',
        text: 'text-blue-300',
        dotColor: 'bg-blue-400',
        stemColor: 'bg-blue-400/60'
      }
    ];
  }, [worldMode]);

  const selectedNode = useMemo(() => {
    const raw = nodes.find((n) => n.id === selectedNodeId);
    const id = selectedNodeId || 'srv-auth';

    let dynamicName = raw?.name || 'Facility Entity';
    let dynamicType: TwinNode['type'] = raw?.type || 'server';
    let dynamicOS = raw?.metadata?.os || 'Linux Core';
    let dynamicCpu = raw?.metadata?.cpuUsage ?? 45;
    let dynamicMem = raw?.metadata?.memoryUsage ?? 60;

    if (worldMode === 'office') {
      if (id === 'srv-auth') {
        dynamicName = 'Tier-4 Financial Datacenter Vault';
        dynamicType = 'server';
        dynamicOS = 'RHEL 9.4 Enterprise';
        dynamicCpu = 92;
        dynamicMem = 96;
      } else if (id === 'b-acad-1') {
        dynamicName = 'Executive Tower Alpha (72 Floors)';
        dynamicType = 'server';
      } else if (id === 'b-hostel-a') {
        dynamicName = 'Global Operations Trading Floor';
        dynamicType = 'server';
      } else if (id === 'b-library') {
        dynamicName = 'Corporate Legal & Archives Center';
        dynamicType = 'server';
      } else if (id === 'b-sports') {
        dynamicName = 'Executive Helipad & Sky Lounge';
        dynamicType = 'iot_sensor';
      } else if (id === 'b-maingate') {
        dynamicName = 'Biometric Access Control Portal';
        dynamicType = 'iot_sensor';
      } else if (id === 'b-buses') {
        dynamicName = 'Autonomous Corporate EV Shuttles';
        dynamicType = 'iot_sensor';
      }
    } else if (worldMode === 'defense') {
      if (id === 'srv-auth') {
        dynamicName = 'Air-Gapped Cryptographic Core';
        dynamicType = 'server';
        dynamicOS = 'Hardened seL4 Microkernel';
        dynamicCpu = 96;
        dynamicMem = 98;
      } else if (id === 'b-acad-1') {
        dynamicName = 'SOC Command Citadel Fortress';
        dynamicType = 'server';
      } else if (id === 'b-hostel-a') {
        dynamicName = 'Cyber Defense Ready Barracks';
        dynamicType = 'server';
      } else if (id === 'b-library') {
        dynamicName = 'Threat Intelligence Radome Array';
        dynamicType = 'server';
      } else if (id === 'b-sports') {
        dynamicName = 'Tactical Drone UAV Launch Pad';
        dynamicType = 'iot_sensor';
      } else if (id === 'b-maingate') {
        dynamicName = 'Hardened Ingress Defense Barrier';
        dynamicType = 'iot_sensor';
      } else if (id === 'b-buses') {
        dynamicName = 'Armored Rapid Response Fleet';
        dynamicType = 'iot_sensor';
      }
    } else {
      // School mode
      if (id === 'srv-auth') {
        dynamicName = 'Campus Core Authentication Server';
        dynamicType = 'server';
        dynamicOS = 'Ubuntu 24.04 LTS';
        dynamicCpu = 89;
        dynamicMem = 94;
      } else if (id === 'b-acad-1') {
        dynamicName = 'STEM Academic Lecture Wing';
        dynamicType = 'server';
      } else if (id === 'b-hostel-a') {
        dynamicName = 'Student Dormitory Hall A Complex';
        dynamicType = 'server';
      } else if (id === 'b-library') {
        dynamicName = 'Central Digital Media Library';
        dynamicType = 'server';
      } else if (id === 'b-sports') {
        dynamicName = 'Athletic Arena & Soccer Stadium';
        dynamicType = 'iot_sensor';
      } else if (id === 'b-maingate') {
        dynamicName = 'North Campus Automated Entry Gate';
        dynamicType = 'iot_sensor';
      } else if (id === 'b-buses') {
        dynamicName = 'Campus Transit Fleet Shuttles';
        dynamicType = 'iot_sensor';
      }
    }

    return {
      id,
      name: dynamicName,
      type: dynamicType,
      tier: raw?.tier ?? 2,
      status: id === 'srv-auth' ? 'compromised' : (raw?.status ?? 'healthy'),
      metadata: {
        ipAddress: raw?.metadata?.ipAddress || '10.2.0.10',
        os: dynamicOS,
        cpuUsage: dynamicCpu,
        memoryUsage: dynamicMem
      },
      position: raw?.position || { x: 28, y: 16, z: -18 }
    };
  }, [nodes, selectedNodeId, worldMode]);

  return (
    <div
      ref={containerRef}
      role="region"
      tabIndex={0}
      data-testid="digital-twin-viewport"
      aria-label="3D Digital Twin World Viewport"
      className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-blue-500/25 bg-[#060814] select-none font-mono shadow-2xl focus:outline-none focus:ring-1 focus:ring-purple-500/50"
    >
      {/* Screen Reader Live Region for Accessibility Announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {screenReaderAnnouncement}
      </div>

      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="application"
        aria-label="Interactive 3D Digital Twin Viewport. Use mouse drag to orbit, right-click drag to pan, wheel to zoom, R to reset camera, F to toggle fullscreen."
        className="w-full h-full block focus:outline-none focus:ring-1 focus:ring-neon-cyan/50"
        style={{ cursor: selectedTool === 'measure' ? 'crosshair' : hoveredNodeId ? 'pointer' : 'grab' }}
      />

      {/* Floating Holographic Beacons in 3D Space */}
      {beacons.map((b) => {
        const Icon = b.icon;
        const isSelected = selectedNodeId === b.nodeId;

        return (
          <div
            key={b.id}
            data-testid={b.id === 'beacon-server' ? 'beacon-server' : `beacon-${b.nodeId}`}
            role="button"
            tabIndex={0}
            aria-label={`Select and focus ${b.title}, status: ${b.status}`}
            onClick={() => handleSelectEntity(b.nodeId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectEntity(b.nodeId);
              }
            }}
            style={{ top: b.top, left: b.left }}
            className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 group ${
              isSelected ? 'scale-110 z-30' : 'hover:scale-105'
            }`}
          >
            {/* Beacon Card */}
            <div
              className={`px-3 py-2 rounded-xl border backdrop-blur-md shadow-2xl flex items-center space-x-2.5 transition-all ${
                b.glowBorder
              } ${b.bg} ${b.text} ${isSelected ? 'ring-2 ring-white/50' : ''}`}
            >
              <div className="p-1 rounded-lg bg-white/10 flex-shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 font-bold text-xs tracking-wide">
                  <span className={`w-2 h-2 rounded-full ${b.dotColor}`} />
                  <span>{b.title}</span>
                </div>
                <div className="text-[10px] text-slate-300 tracking-tight font-sans mt-0.5 whitespace-nowrap">
                  {b.status}
                </div>
              </div>
            </div>

            {/* Pulsing Vertical Stem down to building roof */}
            <div className="flex justify-center -mt-0.5">
              <div className={`w-0.5 h-5 ${b.stemColor}`} />
            </div>
            <div className="flex justify-center">
              <div className={`w-2 h-2 rounded-full ${b.dotColor} animate-ping -mt-1`} />
            </div>
          </div>
        );
      })}

      {/* Floating Top-Left: "Layers +" and "Focus Entity" Menus */}
      <div className="absolute top-4 left-4 z-20 flex items-start space-x-2">
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => setShowLayersDropdown(!showLayersDropdown)}
            aria-label="Toggle map visual layers"
            className="px-3 py-1.5 rounded-xl bg-slate-950/85 border border-blue-500/40 hover:border-neon-cyan text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-xl backdrop-blur-md group"
          >
            <Layers className="w-3.5 h-3.5 text-neon-cyan group-hover:rotate-12 transition-transform" />
            <span>Layers +</span>
          </button>

          {/* Compact Vertical Layer Icons or Expanded Palette */}
          {showLayersDropdown && (
            <div className="p-1.5 rounded-xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-md flex flex-col space-y-1">
              {[
                { id: 'buildings', label: 'Buildings', icon: Building2 },
                { id: 'people', label: 'People', icon: Users },
                { id: 'vehicles', label: 'Vehicles', icon: Car },
                { id: 'servers', label: 'Servers', icon: Server },
                { id: 'network', label: 'Network', icon: Share2 },
                { id: 'security', label: 'Security', icon: Shield },
                { id: 'weather', label: 'Weather', icon: Sun }
              ].map((layer) => {
                const Icon = layer.icon;
                const isEnabled = activeLayers[layer.id as keyof ActiveLayers];

                return (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id as keyof ActiveLayers)}
                    className={`p-2 rounded-lg flex items-center space-x-2 text-xs transition-all ${
                      isEnabled
                        ? 'bg-blue-600/30 text-neon-cyan border border-blue-500/40 font-bold'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/60'
                    }`}
                    title={`Toggle ${layer.label}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline">{layer.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Entity Focus Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowEntitySelector(!showEntitySelector)}
            data-testid="entity-focus-selector"
            aria-label="Quick focus entity selector"
            className="px-3 py-1.5 rounded-xl bg-slate-950/85 border border-purple-500/40 hover:border-neon-purple text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-xl backdrop-blur-md"
          >
            <Crosshair className="w-3.5 h-3.5 text-neon-purple" />
            <span className="hidden md:inline">Focus Entity</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showEntitySelector && (
            <div className="absolute top-full left-0 mt-2 w-64 p-1.5 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl z-50 backdrop-blur-xl space-y-1">
              <div className="px-2 py-1 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                Select Facility to Focus Camera
              </div>
              {beacons.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSelectEntity(b.nodeId)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    selectedNodeId === b.nodeId
                      ? 'bg-purple-600/30 text-neon-purple font-bold border border-purple-500/40'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <span className="truncate">{b.title}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${b.dotColor}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Hardware FPS & Performance Telemetry */}
        <div
          data-testid="fps-telemetry-pill"
          aria-label={`Hardware render telemetry: ${fpsTelemetry.fps} frames per second, ${fpsTelemetry.frameTimeMs} milliseconds frame time`}
          className="px-2.5 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800 text-[11px] font-mono flex items-center space-x-2 shadow-xl backdrop-blur-md"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              fpsTelemetry.fps >= 50
                ? 'bg-emerald-400 animate-pulse'
                : fpsTelemetry.fps >= 30
                ? 'bg-amber-400'
                : 'bg-rose-500 animate-ping'
            }`}
          />
          <span className="text-white font-bold">{fpsTelemetry.fps} FPS</span>
          <span className="text-slate-500 text-[10px] hidden lg:inline">({fpsTelemetry.frameTimeMs}ms)</span>
          {fpsTelemetry.isLowPowered && (
            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
              Low-Power LOD
            </span>
          )}
        </div>
      </div>

      {/* Floating Top-Right: "Tools" Palette */}
      <div className="absolute top-4 right-4 z-20 flex flex-col space-y-1.5 bg-slate-950/90 border border-slate-800/80 p-2 rounded-xl shadow-2xl backdrop-blur-md">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1 pb-1 border-b border-slate-800">
          Tools
        </div>
        {[
          { id: 'select', label: 'Select', icon: MousePointer },
          { id: 'measure', label: 'Measure', icon: Ruler },
          { id: 'add', label: 'Add Entity', icon: PlusSquare },
          { id: 'zone', label: 'Draw Zone', icon: Pencil },
          { id: 'simulate', label: 'Simulate Event', icon: PlaySquare }
        ].map((tool) => {
          const Icon = tool.icon;
          const isSelected = selectedTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={`p-2 rounded-lg flex items-center space-x-2 text-xs transition-all ${
                isSelected
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 font-bold shadow-lg shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title={tool.label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden lg:inline">{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Floating HUD Tool Message Bar */}
      {hudMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-slate-950/90 border border-neon-cyan/40 text-neon-cyan text-xs font-bold shadow-2xl backdrop-blur-md flex items-center space-x-2 animate-pulse">
          <Radio className="w-4 h-4 text-neon-cyan" />
          <span>{hudMessage}</span>
          <button
            onClick={() => setHudMessage(null)}
            aria-label="Dismiss tool announcement"
            className="ml-2 text-slate-400 hover:text-white p-1 rounded-md w-6 h-6 flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-neon-cyan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Bottom-Right: 3D Compass & Zoom Controls */}
      <div className="absolute bottom-16 right-4 z-20 flex flex-col items-center space-y-2">
        {/* Camera Angle Presets */}
        <div className="flex items-center space-x-1 bg-slate-950/90 border border-slate-800 p-1 rounded-lg shadow-xl backdrop-blur-md text-[10px]">
          {(['orbital', 'top-down', 'ingress', 'stadium'] as const).map((preset, idx) => (
            <button
              key={preset}
              data-testid={`camera-preset-${preset}`}
              aria-label={`Switch camera to ${preset} preset (${idx + 1})`}
              onClick={() => {
                setActivePreset(preset);
                setCameraPreset(preset);
                setScreenReaderAnnouncement(`Switched to ${preset} camera preset.`);
              }}
              className={`px-2 py-1 rounded transition-colors capitalize flex items-center space-x-1 ${
                activePreset === preset
                  ? 'bg-neon-cyan/20 text-neon-cyan font-bold border border-neon-cyan/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{preset}</span>
              <kbd className="text-[8px] opacity-60 font-mono">[{idx + 1}]</kbd>
            </button>
          ))}
        </div>

        {/* Dedicated Reset View Button */}
        <button
          onClick={() => {
            resetCamera();
            setActivePreset('orbital');
            setScreenReaderAnnouncement('Camera reset to default orbital view.');
          }}
          data-testid="reset-view-btn"
          aria-label="Reset camera view to default orientation (R)"
          title="Reset Camera View (R)"
          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 hover:border-neon-cyan text-slate-300 hover:text-white flex items-center justify-between text-[10px] font-mono shadow-xl backdrop-blur-md transition-all group focus:outline-none focus:ring-1 focus:ring-neon-cyan"
        >
          <span className="flex items-center space-x-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-neon-cyan group-hover:-rotate-90 transition-transform" />
            <span>Reset View</span>
          </span>
          <kbd className="px-1 py-0.2 bg-slate-900 border border-slate-700 rounded text-[9px] text-slate-400">R</kbd>
        </button>

        {/* Circular 3D Compass Dial */}
        <div
          data-testid="compass-dial"
          role="button"
          tabIndex={0}
          aria-label="Compass dial. Click to reset view to North."
          onClick={() => {
            resetCamera();
            setActivePreset('orbital');
            setScreenReaderAnnouncement('Camera oriented to North.');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              resetCamera();
              setActivePreset('orbital');
            }
          }}
          className="relative w-12 h-12 rounded-full border border-blue-500/50 bg-slate-950/90 shadow-2xl flex items-center justify-center cursor-pointer hover:border-neon-cyan transition-all group backdrop-blur-md focus:outline-none focus:ring-1 focus:ring-neon-cyan"
          title="Reset View to North (Click Compass)"
        >
          {/* Compass Rose Labels */}
          <span className="absolute top-0.5 text-[8px] font-bold text-neon-cyan">N</span>
          <span className="absolute bottom-0.5 text-[8px] font-bold text-slate-500">S</span>
          <span className="absolute right-1 text-[8px] font-bold text-slate-500">E</span>
          <span className="absolute left-1 text-[8px] font-bold text-slate-500">W</span>

          {/* Rotating Compass Needle */}
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-75"
            style={{ transform: `rotate(${-compassAngle * (180 / Math.PI) + 32}deg)` }}
          >
            <div className="w-0.5 h-6 bg-gradient-to-t from-transparent via-cyan-400 to-white shadow-sm shadow-cyan-400" />
          </div>
        </div>

        {/* Zoom In & Out Buttons */}
        <div className="flex flex-col space-y-1 bg-slate-950/90 border border-slate-800 p-1 rounded-xl shadow-xl backdrop-blur-md">
          <button
            onClick={() => {
              zoomIn();
              setScreenReaderAnnouncement('Zoomed in.');
            }}
            data-testid="zoom-in-btn"
            aria-label="Zoom In (+)"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors focus:outline-none focus:ring-1 focus:ring-neon-cyan"
            title="Zoom In (+)"
          >
            <Plus className="w-4 h-4 text-neon-cyan" />
          </button>
          <button
            onClick={() => {
              zoomOut();
              setScreenReaderAnnouncement('Zoomed out.');
            }}
            data-testid="zoom-out-btn"
            aria-label="Zoom Out (-)"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors focus:outline-none focus:ring-1 focus:ring-neon-cyan"
            title="Zoom Out (-)"
          >
            <Minus className="w-4 h-4 text-neon-cyan" />
          </button>
        </div>
      </div>

      {/* Floating Bottom: Timeline Scrub Bar */}
      <div className="absolute bottom-3 left-4 right-4 z-20 p-2.5 rounded-xl bg-slate-950/90 border border-blue-500/25 flex items-center justify-between space-x-4 shadow-2xl backdrop-blur-md">
        {/* Play/Pause & Live Badge */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
            aria-label={isPlayingTimeline ? 'Pause timeline simulation' : 'Play timeline simulation'}
            className="p-1.5 rounded-lg bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/30 transition-all min-w-[28px] min-h-[28px] flex items-center justify-center"
          >
            {isPlayingTimeline ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <span className="px-2 py-0.5 rounded text-[10px] bg-neon-matrix/10 text-neon-matrix border border-neon-matrix/40 font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-matrix animate-ping" />
            <span>Live</span>
          </span>
          <span className="text-white font-bold text-xs tracking-wider">{timelineTime}</span>
        </div>

        {/* Timeline Scrubber Track */}
        <div className="flex-1 flex items-center justify-between px-4 text-[10px] text-slate-400 relative">
          <div className="absolute inset-x-4 h-1 bg-slate-800 rounded-full top-1/2 -translate-y-1/2" />
          {/* Active timeline progress bar */}
          <div
            className="absolute left-4 h-1 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full top-1/2 -translate-y-1/2"
            style={{ width: '38%' }}
          />
          {/* Purple scrubber knob */}
          <div className="absolute left-[38%] w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-white top-1/2 -translate-y-1/2 shadow-lg shadow-purple-500/60 z-20 cursor-pointer hover:scale-125 transition-transform" />

          {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map((hr) => (
            <span
              key={hr}
              onClick={() => setTimelineTime(hr)}
              className={`z-10 bg-slate-950 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                hr === '10:00' ? 'text-neon-purple font-bold border border-neon-purple/30' : 'hover:text-white'
              }`}
            >
              {hr}
            </span>
          ))}
        </div>

        {/* Speed multiplier & Fullscreen */}
        <div className="flex items-center space-x-2 text-[10px] text-slate-400 flex-shrink-0">
          <button
            onClick={() =>
              setSpeedMultiplier((prev) => (prev === '1x' ? '2x' : prev === '2x' ? '5x' : '1x'))
            }
            aria-label={`Toggle simulation speed multiplier, currently ${speedMultiplier}`}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white font-bold hover:border-neon-cyan transition-colors min-h-[26px] min-w-[28px]"
          >
            {speedMultiplier}
          </button>
          <button
            onClick={handleToggleFullscreen}
            data-testid="fullscreen-btn"
            aria-label={isFullscreen ? 'Exit Fullscreen (Esc or F)' : 'Enter Fullscreen (F)'}
            aria-pressed={isFullscreen}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors focus:outline-none focus:ring-1 focus:ring-neon-cyan"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-neon-cyan" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Contextual Node / Entity Inspector Drawer */}
      {isInspectorOpen && selectedNode && (
        <div
          data-testid="entity-inspector"
          role="dialog"
          aria-label="Entity Inspector"
          className="absolute top-4 right-16 bottom-20 w-80 z-30 p-4 rounded-2xl bg-slate-950/95 border border-blue-500/40 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-y-auto font-mono text-xs animate-in slide-in-from-right duration-200"
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="truncate pr-2">
                <div className="text-white font-bold text-sm truncate">{selectedNode.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Asset ID: {selectedNode.id}</div>
              </div>
              <button
                onClick={() => setIsInspectorOpen(false)}
                aria-label="Close Inspector"
                data-testid="close-inspector-btn"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status & Type */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 block text-[9px] uppercase">Status</span>
                <span
                  className={`font-bold ${
                    selectedNode.status === 'compromised'
                      ? 'text-rose-400'
                      : selectedNode.status === 'warning'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 block text-[9px] uppercase">Type</span>
                <span className="font-bold text-neon-cyan">{selectedNode.type.toUpperCase()}</span>
              </div>
            </div>

            {/* Real-time Telemetry */}
            <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">IP Address:</span>
                <span className="text-white font-bold">{selectedNode.metadata.ipAddress || '10.2.0.10'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CPU Load:</span>
                <span
                  className={`font-bold ${
                    (selectedNode.metadata.cpuUsage ?? 40) > 80 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {selectedNode.metadata.cpuUsage || 88}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Memory:</span>
                <span className="text-white font-bold">{selectedNode.metadata.memoryUsage || 94}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Coordinates:</span>
                <span className="text-slate-400">
                  ({selectedNode.position.x.toFixed(0)}, {selectedNode.position.z.toFixed(0)})
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  if (selectedNode && onInvestigateEntity) {
                    onInvestigateEntity(selectedNode);
                  }
                }}
                data-testid="investigate-incident-btn"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-900/60 to-blue-900/60 border border-neon-purple text-white hover:from-purple-800/80 hover:to-blue-800/80 font-bold flex items-center justify-center space-x-2 transition-all text-xs shadow-lg shadow-purple-950/50 group animate-pulse"
              >
                <Bot className="w-4 h-4 text-neon-purple group-hover:scale-110 transition-transform" />
                <span>Investigate Incident with Agent Council</span>
              </button>

              <button
                onClick={handleRunBlastRadius}
                className="w-full py-2 rounded-xl bg-neon-amber/10 border border-neon-amber/40 text-neon-amber hover:bg-neon-amber/20 font-bold flex items-center justify-center space-x-2 transition-all text-xs"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Run Blast Radius Analysis</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleIsolateNode}
                  className="py-1.5 rounded-lg bg-purple-900/30 border border-purple-500/40 text-purple-300 hover:bg-purple-900/50 flex items-center justify-center space-x-1.5 transition-all text-[11px]"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Isolate</span>
                </button>
                <button
                  onClick={handleMarkCompromised}
                  className="py-1.5 rounded-lg bg-rose-900/30 border border-rose-500/40 text-rose-300 hover:bg-rose-900/50 flex items-center justify-center space-x-1.5 transition-all text-[11px]"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Compromise</span>
                </button>
              </div>

              <button
                onClick={handleRestoreNode}
                className="w-full py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 flex items-center justify-center space-x-1.5 transition-all text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore to Healthy</span>
              </button>
            </div>

            {/* Blast Radius Results Overlay */}
            {showBlastRadius && blastRadiusResult && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] space-y-1.5 animate-in fade-in">
                <div className="text-neon-amber font-bold flex items-center space-x-1.5 border-b border-amber-500/30 pb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Impacted Entities ({blastRadiusResult.impactedNodeIds.length})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Risk Score:</span>
                  <span className="text-rose-400 font-bold">{blastRadiusResult.riskScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Hop Depth:</span>
                  <span className="text-white font-bold">{blastRadiusResult.maxHopsReached}</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center">
            P-NEXA Digital Twin Engine · Telemetry Live
          </div>
        </div>
      )}
    </div>
  );
};
