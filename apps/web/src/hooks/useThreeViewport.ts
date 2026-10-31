import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';

export type WorldMode = 'school' | 'office' | 'defense';

export interface ActiveLayers {
  buildings: boolean;
  people: boolean;
  vehicles: boolean;
  servers: boolean;
  network: boolean;
  security: boolean;
  weather: boolean;
}

interface UseThreeViewportOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  worldMode?: WorldMode;
  simulationPlan?: string;
  nodes: TwinNode[];
  edges: TwinEdge[];
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  onNodeClick: (nodeId: string) => void;
  activeLayers?: ActiveLayers;
  activeTool?: string;
  isSimulating?: boolean;
}

export interface FpsTelemetry {
  fps: number;
  frameTimeMs: number;
  isLowPowered: boolean;
}

export function useThreeViewport({
  canvasRef,
  worldMode = 'school',
  simulationPlan: _simulationPlan,
  nodes: _nodes,
  edges: _edges,
  selectedNodeId,
  highlightedNodeIds,
  onNodeClick,
  activeLayers = {
    buildings: true,
    people: true,
    vehicles: true,
    servers: true,
    network: true,
    security: true,
    weather: true
  },
  activeTool = 'select',
  isSimulating = false
}: UseThreeViewportOptions) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameIdRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const targetSphericalRef = useRef({ theta: 0.55, phi: 1.05, radius: 82 });
  const desiredLookAtRef = useRef(new THREE.Vector3(0, 4, 0));
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [compassAngle, setCompassAngle] = useState(0.55);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);

  // Real-time hardware performance & FPS telemetry
  const [fpsTelemetry, setFpsTelemetry] = useState<FpsTelemetry>({
    fps: 60,
    frameTimeMs: 16.6,
    isLowPowered: false
  });
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  const lastFpsUpdateRef = useRef<number>(performance.now());

  // Layer Groups
  const groupsRef = useRef<{
    buildings: THREE.Group;
    people: THREE.Group;
    vehicles: THREE.Group;
    servers: THREE.Group;
    network: THREE.Group;
    security: THREE.Group;
    weather: THREE.Group;
    ground: THREE.Group;
  }>({
    buildings: new THREE.Group(),
    people: new THREE.Group(),
    vehicles: new THREE.Group(),
    servers: new THREE.Group(),
    network: new THREE.Group(),
    security: new THREE.Group(),
    weather: new THREE.Group(),
    ground: new THREE.Group()
  });

  // Spherical camera state
  const sphericalRef = useRef({ theta: 0.55, phi: 1.05, radius: 82 });
  const targetLookAt = useRef(new THREE.Vector3(0, 4, 0));

  // Animated elements
  const animatedObjectsRef = useRef<{
    waterMesh?: THREE.Mesh;
    domeMesh?: THREE.Mesh;
    radarDishes: THREE.Mesh[];
    buses: Array<{ mesh: THREE.Group; curve: THREE.CatmullRomCurve3; progress: number; speed: number }>;
    trafficParticles: Array<{ mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; progress: number; speed: number }>;
    beaconStems: Array<{ line: THREE.Line; id: string; targetY: number }>;
    alarmLight?: THREE.PointLight;
    serverGlow?: THREE.Mesh;
  }>({
    radarDishes: [],
    buses: [],
    trafficParticles: [],
    beaconStems: []
  });

  // 1. Procedural Building Window Texture
  const createBuildingTexture = (tone: 'cool' | 'warm' | 'gold' | 'tactical' | 'server') => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    ctx.fillStyle = tone === 'tactical' ? '#080c14' : tone === 'gold' ? '#0a0d18' : '#070c18';
    ctx.fillRect(0, 0, 128, 256);

    const cols = 8;
    const rows = 24;
    const padX = 4;
    const padY = 3;
    const w = (128 - padX * (cols + 1)) / cols;
    const h = (256 - padY * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isLit = Math.random() > 0.3;
        if (isLit) {
          if (tone === 'server') {
            ctx.fillStyle = Math.random() > 0.3 ? '#ef4444' : '#f97316';
          } else if (tone === 'gold') {
            ctx.fillStyle = Math.random() > 0.4 ? '#fbbf24' : '#f59e0b';
          } else if (tone === 'tactical') {
            ctx.fillStyle = Math.random() > 0.4 ? '#f59e0b' : '#38bdf8';
          } else if (tone === 'warm') {
            ctx.fillStyle = Math.random() > 0.4 ? '#fef08a' : '#f59e0b';
          } else {
            ctx.fillStyle = Math.random() > 0.4 ? '#38bdf8' : '#0284c7';
          }
          ctx.fillRect(padX + c * (w + padX), padY + r * (h + padY), w, h);
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  };

  // 2. Soccer Pitch Texture (for School mode)
  const createSoccerPitchTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    ctx.fillStyle = '#047857';
    ctx.fillRect(0, 0, 256, 160);

    ctx.fillStyle = '#059669';
    for (let i = 0; i < 256; i += 32) {
      ctx.fillRect(i, 0, 16, 160);
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 236, 140);

    ctx.beginPath();
    ctx.moveTo(128, 10);
    ctx.lineTo(128, 150);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 80, 28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeRect(10, 45, 45, 70);
    ctx.strokeRect(201, 45, 45, 70);

    return new THREE.CanvasTexture(canvas);
  };

  // 3. Helipad Texture (for Office mode)
  const createHelipadTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // Dark tarmac pad
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 256);

    // Outer landing ring
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 128, 100, 0, Math.PI * 2);
    ctx.stroke();

    // White dashed inner ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(128, 128, 75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bold "H" in center
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 96px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', 128, 128);

    return new THREE.CanvasTexture(canvas);
  };

  // 4. Tactical Drone Pad Texture (for Defense mode)
  const createDronePadTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 256, 256);

    // Hazard stripes around border
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 240);

    // Crosshair target
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(128, 128, 85, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(128, 20);
    ctx.lineTo(128, 236);
    ctx.moveTo(20, 128);
    ctx.lineTo(236, 128);
    ctx.stroke();

    // "UAV-01" label
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UAV-ALPHA', 128, 128);

    return new THREE.CanvasTexture(canvas);
  };

  const updateCameraFromSpherical = (camera: THREE.PerspectiveCamera) => {
    const { theta, phi, radius } = sphericalRef.current;
    camera.position.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(targetLookAt.current);
    setCompassAngle(theta);
  };

  const buildCampusWorld = useCallback(() => {
    if (!canvasRef.current) return;

    // 1. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 2. Scene Setup
    const scene = new THREE.Scene();
    const bgColor = worldMode === 'office' ? 0x070b18 : worldMode === 'defense' ? 0x090508 : 0x060814;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.007);
    sceneRef.current = scene;

    // 3. Camera Setup
    const aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(52, aspect, 0.1, 800);
    updateCameraFromSpherical(camera);
    cameraRef.current = camera;

    // 4. Lighting based on World Mode
    const ambientColor = worldMode === 'office' ? 0x1e2238 : worldMode === 'defense' ? 0x221318 : 0x18243c;
    const ambientLight = new THREE.AmbientLight(ambientColor, 0.85);
    scene.add(ambientLight);

    const keyColor = worldMode === 'office' ? 0x38bdf8 : worldMode === 'defense' ? 0xff4444 : 0x00e5ff;
    const keyLight = new THREE.DirectionalLight(keyColor, 1.15);
    keyLight.position.set(45, 65, 35);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimColor = worldMode === 'office' ? 0xf59e0b : worldMode === 'defense' ? 0x00f0ff : 0xa855f7;
    const rimLight = new THREE.DirectionalLight(rimColor, 0.7);
    rimLight.position.set(-50, 40, -40);
    scene.add(rimLight);

    // Initialize Layer Groups
    const grp = groupsRef.current;
    Object.values(grp).forEach((g) => {
      g.clear();
      scene.add(g);
    });

    // 5. Terrain Ground Plane & Grid
    const groundGeo = new THREE.PlaneGeometry(220, 220);
    const groundMat = new THREE.MeshStandardMaterial({
      color: worldMode === 'office' ? 0x0b101e : worldMode === 'defense' ? 0x10131d : 0x070b16,
      roughness: 0.85,
      metalness: 0.25
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.1;
    groundMesh.receiveShadow = true;
    grp.ground.add(groundMesh);

    // Grid Overlay
    const gridColor = worldMode === 'office' ? 0x3b82f6 : worldMode === 'defense' ? 0xef4444 : 0x00f0ff;
    const gridHelper = new THREE.GridHelper(220, 44, gridColor, 0x111c33);
    gridHelper.position.y = 0;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.14;
    grp.ground.add(gridHelper);

    // 6. Water Canal / River
    const riverCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(45, 0.1, -100),
      new THREE.Vector3(52, 0.1, -50),
      new THREE.Vector3(48, 0.1, 0),
      new THREE.Vector3(56, 0.1, 50),
      new THREE.Vector3(65, 0.1, 100)
    ]);
    const riverPoints = riverCurve.getPoints(50);
    const riverShape = new THREE.Shape();
    riverPoints.forEach((p, idx) => {
      if (idx === 0) riverShape.moveTo(p.x - 7, p.z);
      else riverShape.lineTo(p.x - 7, p.z);
    });
    for (let i = riverPoints.length - 1; i >= 0; i--) {
      const p = riverPoints[i]!;
      riverShape.lineTo(p.x + 7, p.z);
    }
    riverShape.closePath();

    const riverGeo = new THREE.ShapeGeometry(riverShape);
    const riverMat = new THREE.MeshStandardMaterial({
      color: worldMode === 'defense' ? 0x0369a1 : 0x0284c7,
      roughness: 0.08,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35
    });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.rotation.x = Math.PI / 2;
    riverMesh.position.y = 0.05;
    grp.ground.add(riverMesh);
    animatedObjectsRef.current.waterMesh = riverMesh;

    // 7. Mode-Specific Central Installation (Stadium vs Corporate Helipad vs Tactical Drone Pad)
    const centralFacilityGroup = new THREE.Group();
    centralFacilityGroup.position.set(-36, 0, 24);

    if (worldMode === 'school') {
      // ── Athletic Stadium & Soccer Pitch ──
      const trackGeo = new THREE.PlaneGeometry(28, 18);
      const trackMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
      const trackMesh = new THREE.Mesh(trackGeo, trackMat);
      trackMesh.rotation.x = -Math.PI / 2;
      trackMesh.position.y = 0.08;
      centralFacilityGroup.add(trackMesh);

      const pitchGeo = new THREE.PlaneGeometry(24, 14);
      const pitchMat = new THREE.MeshStandardMaterial({
        map: createSoccerPitchTexture(),
        roughness: 0.6,
        emissive: 0x059669,
        emissiveIntensity: 0.25
      });
      const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
      pitchMesh.rotation.x = -Math.PI / 2;
      pitchMesh.position.y = 0.1;
      centralFacilityGroup.add(pitchMesh);

      const standGeo = new THREE.CylinderGeometry(18, 19, 2.5, 32, 1, true);
      const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const standMesh = new THREE.Mesh(standGeo, standMat);
      standMesh.position.y = 1.25;
      centralFacilityGroup.add(standMesh);

      // 4 Floodlights
      [[-14, 8], [14, 8], [-14, -8], [14, -8]].forEach(([fx, fz]) => {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.3, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0x64748b })
        );
        pole.position.set(fx, 5, fz);
        const lamp = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.6, 0.8),
          new THREE.MeshBasicMaterial({ color: 0x00f0ff })
        );
        lamp.position.set(fx, 9.8, fz);
        centralFacilityGroup.add(pole);
        centralFacilityGroup.add(lamp);
      });
    } else if (worldMode === 'office') {
      // ── Executive Corporate Helipad Plaza ──
      const heliGeo = new THREE.PlaneGeometry(24, 24);
      const heliMat = new THREE.MeshStandardMaterial({
        map: createHelipadTexture(),
        roughness: 0.4,
        metalness: 0.3
      });
      const heliMesh = new THREE.Mesh(heliGeo, heliMat);
      heliMesh.rotation.x = -Math.PI / 2;
      heliMesh.position.y = 0.1;
      centralFacilityGroup.add(heliMesh);

      // Executive Helipad Perimeter Beacon Lights
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        const lightPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        lightPole.position.set(Math.cos(a) * 11, 0.4, Math.sin(a) * 11);
        centralFacilityGroup.add(lightPole);
      }

      // Executive VIP Transport Rotorcraft on pad
      const chopper = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 1.4, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 })
      );
      body.position.y = 1.0;
      chopper.add(body);
      const rotor = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.08, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      rotor.position.y = 2.0;
      chopper.add(rotor);
      centralFacilityGroup.add(chopper);
    } else {
      // ── Defense Tactical Drone Launch Facility ──
      const dronePadGeo = new THREE.PlaneGeometry(24, 24);
      const dronePadMat = new THREE.MeshStandardMaterial({
        map: createDronePadTexture(),
        roughness: 0.5,
        metalness: 0.6
      });
      const dronePadMesh = new THREE.Mesh(dronePadGeo, dronePadMat);
      dronePadMesh.rotation.x = -Math.PI / 2;
      dronePadMesh.position.y = 0.1;
      centralFacilityGroup.add(dronePadMesh);

      // Radar Dish
      const dishMast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x475569 })
      );
      dishMast.position.set(-10, 3, -10);
      const dish = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5, 0.5, 0.8, 16),
        new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.8 })
      );
      dish.position.set(-10, 6.2, -10);
      dish.rotation.x = 0.5;
      centralFacilityGroup.add(dishMast);
      centralFacilityGroup.add(dish);
      animatedObjectsRef.current.radarDishes.push(dish);
    }
    grp.buildings.add(centralFacilityGroup);

    // 8. 30+ Architectural Buildings dynamically themed
    const coolTex = createBuildingTexture(worldMode === 'office' ? 'gold' : 'cool');
    const warmTex = createBuildingTexture(worldMode === 'defense' ? 'tactical' : 'warm');
    const serverTex = createBuildingTexture('server');

    // Architecture layout mapped to campus nodes
    const buildingsConfig = [
      { id: 'b-acad-1', x: -5, z: -25, w: 16, h: worldMode === 'office' ? 26 : 18, d: 10, tex: coolTex },
      { id: 'b-acad-2', x: 12, z: -28, w: 14, h: worldMode === 'office' ? 30 : 22, d: 9, tex: coolTex },
      { id: 'b-acad-3', x: -22, z: -20, w: 12, h: 14, d: 8, tex: warmTex },
      { id: 'b-acad-4', x: 2, z: -42, w: 18, h: 16, d: 12, tex: coolTex },

      { id: 'b-hostel-a', x: -32, z: -10, w: 14, h: worldMode === 'office' ? 32 : 26, d: 12, tex: warmTex },
      { id: 'b-hostel-b', x: -35, z: -32, w: 12, h: 20, d: 10, tex: warmTex },

      { id: 'srv-auth', x: 28, z: -18, w: 14, h: 16, d: 14, tex: serverTex, type: 'server' },

      { id: 'b-library', x: 36, z: 12, w: 15, h: 13, d: 16, tex: warmTex },
      { id: 'b-maingate', x: 18, z: 32, w: 14, h: 9, d: 7, tex: coolTex },

      // Central Tall Tower (Admin / Corporate HQ / Command Citadel)
      { id: 'b-admin', x: 4, z: -6, w: 13, h: worldMode === 'office' ? 44 : 34, d: 12, tex: coolTex },

      // Department & Support Buildings
      { id: 'b-sub-1', x: -18, z: 4, w: 10, h: 12, d: 8, tex: coolTex },
      { id: 'b-sub-2', x: 20, z: -38, w: 11, h: 15, d: 9, tex: coolTex },
      { id: 'b-sub-3', x: 32, z: -40, w: 13, h: 11, d: 10, tex: warmTex },
      { id: 'b-sub-4', x: -44, z: 2, w: 10, h: 16, d: 8, tex: warmTex },
      { id: 'b-sub-5', x: 16, z: 14, w: 12, h: 10, d: 12, tex: coolTex },
      { id: 'b-sub-6', x: -8, z: 12, w: 10, h: 7, d: 9, tex: warmTex },
      { id: 'b-sub-7', x: 30, z: 34, w: 8, h: 6, d: 8, tex: serverTex, type: 'server' }
    ];

    buildingsConfig.forEach((b) => {
      const isServer = b.type === 'server' || b.id === 'srv-auth';
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);

      const baseColor =
        worldMode === 'office'
          ? (isServer ? 0x22050b : 0x081022)
          : worldMode === 'defense'
          ? (isServer ? 0x2c0505 : 0x121724)
          : (isServer ? 0x22050b : 0x0c1527);

      const emissiveColor =
        isServer
          ? 0xef4444
          : worldMode === 'office'
          ? 0x38bdf8
          : worldMode === 'defense'
          ? 0xf59e0b
          : 0x38bdf8;

      const mat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.3,
        metalness: worldMode === 'office' ? 0.75 : 0.55,
        map: b.tex,
        emissiveMap: b.tex,
        emissive: emissiveColor,
        emissiveIntensity: isServer ? 0.95 : 0.45
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { nodeId: b.id };

      // Glowing Neon Rooftop Edges
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: isServer ? 0xff003c : worldMode === 'office' ? 0x38bdf8 : 0x00f0ff,
        transparent: true,
        opacity: 0.65
      });
      mesh.add(new THREE.LineSegments(edgeGeo, edgeMat));

      // Aviation Obstruction Light & Antenna
      if (b.h > 18) {
        const antenna = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.15, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
        );
        antenna.position.set(0, b.h / 2 + 3, 0);
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff003c })
        );
        beacon.position.set(0, b.h / 2 + 6, 0);
        mesh.add(antenna);
        mesh.add(beacon);
      }

      grp.buildings.add(mesh);

      // Primary Datacenter / Server Warning Ring
      if (b.id === 'srv-auth') {
        const alertLight = new THREE.PointLight(0xff003c, 2.8, 38);
        alertLight.position.set(b.x, b.h + 2, b.z);
        scene.add(alertLight);
        animatedObjectsRef.current.alarmLight = alertLight;

        const serverRing = new THREE.Mesh(
          new THREE.RingGeometry(8, 9.2, 32),
          new THREE.MeshBasicMaterial({ color: 0xff003c, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
        );
        serverRing.rotation.x = Math.PI / 2;
        serverRing.position.set(b.x, 0.25, b.z);
        scene.add(serverRing);
        animatedObjectsRef.current.serverGlow = serverRing;
      }
    });

    // 9. Roads & Vehicles
    const roadCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-45, 0.05, 35),
      new THREE.Vector3(-25, 0.05, 20),
      new THREE.Vector3(0, 0.05, 15),
      new THREE.Vector3(25, 0.05, 22),
      new THREE.Vector3(45, 0.05, 30)
    ]);
    const roadCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.05, 35),
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(-15, 0.05, -25),
      new THREE.Vector3(15, 0.05, -35),
      new THREE.Vector3(35, 0.05, -20)
    ]);

    [roadCurve1, roadCurve2].forEach((curve) => {
      const roadGeo = new THREE.TubeGeometry(curve, 40, 3.2, 3, false);
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, side: THREE.DoubleSide });
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.scale.set(1, 0.02, 1);
      grp.ground.add(roadMesh);
    });

    // Vehicles (Themed by mode: Buses for School, Executive Cars for Office, Armored Units for Defense)
    animatedObjectsRef.current.buses = [];
    for (let i = 0; i < 3; i++) {
      const vehGroup = new THREE.Group();
      const vehColor =
        worldMode === 'office' ? 0x0f172a : worldMode === 'defense' ? 0x334155 : 0xf59e0b;

      const vBody = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 1.8, 2.0),
        new THREE.MeshStandardMaterial({
          color: vehColor,
          roughness: 0.35,
          metalness: worldMode === 'office' ? 0.8 : 0.4,
          emissive: worldMode === 'office' ? 0x1e293b : worldMode === 'defense' ? 0x1e293b : 0xd97706,
          emissiveIntensity: 0.25
        })
      );
      vBody.position.y = 0.9;
      vehGroup.add(vBody);

      // Headlights
      const hlL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
      hlL.position.set(2.1, 0.8, 0.7);
      const hlR = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
      hlR.position.set(2.1, 0.8, -0.7);
      vehGroup.add(hlL);
      vehGroup.add(hlR);

      // Flashing strobe on defense vehicles
      if (worldMode === 'defense') {
        const strobe = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 6, 6),
          new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff003c : 0x00f0ff })
        );
        strobe.position.set(0, 1.9, 0);
        vehGroup.add(strobe);
      }

      grp.vehicles.add(vehGroup);
      animatedObjectsRef.current.buses.push({
        mesh: vehGroup,
        curve: i % 2 === 0 ? roadCurve1 : roadCurve2,
        progress: (i * 0.33) % 1,
        speed: 0.0018 + i * 0.0006
      });
    }

    // Traffic streaming light particles
    animatedObjectsRef.current.trafficParticles = [];
    for (let i = 0; i < 16; i++) {
      const isTail = i % 2 === 0;
      const pMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 6, 6),
        new THREE.MeshBasicMaterial({
          color: isTail ? 0xff003c : 0x00f0ff,
          transparent: true,
          opacity: 0.9
        })
      );
      grp.vehicles.add(pMesh);
      animatedObjectsRef.current.trafficParticles.push({
        mesh: pMesh,
        curve: i % 2 === 0 ? roadCurve1 : roadCurve2,
        progress: i / 16,
        speed: 0.0035 + (i % 3) * 0.001
      });
    }

    // 10. Holographic Geodesic Cyber Dome
    const domeColor = worldMode === 'defense' ? 0xff003c : worldMode === 'office' ? 0x6366f1 : 0x00e5ff;
    const domeGeo = new THREE.SphereGeometry(130, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({
      color: domeColor,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    domeMesh.position.y = -1;
    grp.network.add(domeMesh);
    animatedObjectsRef.current.domeMesh = domeMesh;

    // Sky Stars
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 300;
      starPos[i + 1] = 20 + Math.random() * 120;
      starPos[i + 2] = (Math.random() - 0.5) * 300;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: worldMode === 'office' ? 0xfef08a : 0x38bdf8,
      size: 1.2,
      transparent: true,
      opacity: 0.7
    });
    grp.weather.add(new THREE.Points(starGeo, starMat));

    // 11. Holographic Laser Beams Dropping to Buildings
    const beaconAnchors = [
      { id: 'beacon-1', x: -32, y: 26, z: -10, color: 0x00e5ff },
      { id: 'beacon-2', x: -5, y: 18, z: -25, color: 0x10b981 },
      { id: 'beacon-3', x: 28, y: 16, z: -18, color: 0xff003c },
      { id: 'beacon-4', x: 36, y: 13, z: 12, color: 0x3b82f6 },
      { id: 'beacon-5', x: -36, y: 3, z: 24, color: 0x14b8a6 },
      { id: 'beacon-6', x: 0, y: 2, z: 15, color: 0xf59e0b },
      { id: 'beacon-7', x: 18, y: 9, z: 32, color: 0x00e5ff }
    ];

    animatedObjectsRef.current.beaconStems = [];
    beaconAnchors.forEach((anc) => {
      const stemGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(anc.x, anc.y + 12, anc.z),
        new THREE.Vector3(anc.x, anc.y, anc.z)
      ]);
      const stemMat = new THREE.LineBasicMaterial({ color: anc.color, transparent: true, opacity: 0.75 });
      const stem = new THREE.Line(stemGeo, stemMat);
      grp.network.add(stem);
      animatedObjectsRef.current.beaconStems.push({ line: stem, id: anc.id, targetY: anc.y });
    });
  }, [worldMode]);

  // Synchronize Group Visibilities with activeLayers
  useEffect(() => {
    const grp = groupsRef.current;
    grp.buildings.visible = activeLayers.buildings;
    grp.people.visible = activeLayers.people;
    grp.vehicles.visible = activeLayers.vehicles;
    grp.servers.visible = activeLayers.servers;
    grp.network.visible = activeLayers.network;
    grp.security.visible = activeLayers.security;
    grp.weather.visible = activeLayers.weather;
  }, [activeLayers]);

  // Synchronize activeTool cursor
  useEffect(() => {
    if (!canvasRef.current) return;
    if (activeTool === 'select') canvasRef.current.style.cursor = 'default';
    else if (activeTool === 'measure') canvasRef.current.style.cursor = 'crosshair';
    else if (activeTool === 'add') canvasRef.current.style.cursor = 'copy';
    else if (activeTool === 'zone') canvasRef.current.style.cursor = 'cell';
    else if (activeTool === 'simulate') canvasRef.current.style.cursor = 'pointer';
  }, [activeTool]);

  // Highlight selected or blast-radius impacted buildings
  useEffect(() => {
    groupsRef.current.buildings.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        const isSelected = child.userData?.nodeId === selectedNodeId;
        const isHighlighted = highlightedNodeIds.includes(child.userData?.nodeId);
        if (isSelected) {
          mat.emissiveIntensity = 1.4;
          child.scale.set(1.06, 1.06, 1.06);
        } else if (isHighlighted) {
          mat.emissiveIntensity = 0.95;
          child.scale.set(1.03, 1.03, 1.03);
        } else {
          mat.emissiveIntensity = child.userData?.type === 'server' || isSimulating ? 1.0 : 0.45;
          child.scale.set(1, 1, 1);
        }
      }
    });
  }, [selectedNodeId, highlightedNodeIds, isSimulating]);

  // Render Loop
  useEffect(() => {
    buildCampusWorld();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      isTransitioningRef.current = false;
      if (e.button === 2 || e.button === 1 || e.shiftKey) {
        isPanningRef.current = true;
        isDraggingRef.current = false;
      } else {
        isDraggingRef.current = true;
        isPanningRef.current = false;
      }
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      if (!cameraRef.current) return;

      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      if (isPanningRef.current) {
        const cosTheta = Math.cos(sphericalRef.current.theta);
        const sinTheta = Math.sin(sphericalRef.current.theta);
        const panSpeed = 0.08 * (sphericalRef.current.radius / 80);

        targetLookAt.current.x += (-dx * cosTheta + dy * sinTheta) * panSpeed;
        targetLookAt.current.z += (dx * sinTheta + dy * cosTheta) * panSpeed;
        desiredLookAtRef.current.copy(targetLookAt.current);
        updateCameraFromSpherical(cameraRef.current);
        return;
      }

      if (isDraggingRef.current) {
        sphericalRef.current.theta -= dx * 0.0055;
        sphericalRef.current.phi = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, sphericalRef.current.phi + dy * 0.0055));
        targetSphericalRef.current.theta = sphericalRef.current.theta;
        targetSphericalRef.current.phi = sphericalRef.current.phi;
        updateCameraFromSpherical(cameraRef.current);
        return;
      }

      // Hover Raycasting
      if (canvas && sceneRef.current) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, cameraRef.current);

        const intersects = raycaster.intersectObjects(groupsRef.current.buildings.children, true);
        if (intersects.length > 0) {
          canvas.style.cursor = 'pointer';
          const obj = intersects[0]!.object;
          const id = obj.userData?.nodeId;
          if (id && id !== hoveredNodeIdRef.current) {
            hoveredNodeIdRef.current = id;
            setHoveredNodeId(id);
          }
        } else {
          canvas.style.cursor = activeTool === 'select' ? 'default' : 'crosshair';
          if (hoveredNodeIdRef.current) {
            hoveredNodeIdRef.current = null;
            setHoveredNodeId(null);
          }
        }
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      isPanningRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!cameraRef.current) return;
      isTransitioningRef.current = false;
      sphericalRef.current.radius = Math.max(28, Math.min(160, sphericalRef.current.radius + e.deltaY * 0.06));
      targetSphericalRef.current.radius = sphericalRef.current.radius;
      updateCameraFromSpherical(cameraRef.current);
    };

    const onClick = (e: MouseEvent) => {
      if (!cameraRef.current || !sceneRef.current || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObjects(groupsRef.current.buildings.children, true);
      if (intersects.length > 0) {
        const obj = intersects[0]!.object;
        const id = obj.userData?.nodeId;
        if (id) onNodeClick(id);
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('click', onClick);

    let clock = 0;
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      // Measure real hardware frame interval
      const now = performance.now();
      const deltaMs = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      if (deltaMs > 0 && deltaMs < 250) {
        frameTimesRef.current.push(deltaMs);
        if (frameTimesRef.current.length > 30) {
          frameTimesRef.current.shift();
        }
      }

      // Smooth FPS update every 500ms
      if (now - lastFpsUpdateRef.current > 500 && frameTimesRef.current.length >= 5) {
        const sum = frameTimesRef.current.reduce((a, b) => a + b, 0);
        const avgDelta = sum / frameTimesRef.current.length;
        const computedFps = Math.min(120, Math.max(1, Math.round(1000 / avgDelta)));
        const roundedDelta = Math.round(avgDelta * 10) / 10;
        const lowPower = avgDelta > 28.5; // < 35 FPS signals constrained GPU/CPU

        setFpsTelemetry({
          fps: computedFps,
          frameTimeMs: roundedDelta,
          isLowPowered: lowPower
        });

        // Dynamic hardware adaptation: scale pixel ratio down if hardware is throttled/low-power
        if (rendererRef.current) {
          const currentPR = rendererRef.current.getPixelRatio();
          if (lowPower && currentPR > 1.0) {
            rendererRef.current.setPixelRatio(1.0);
          } else if (!lowPower && currentPR < Math.min(window.devicePixelRatio, 2)) {
            rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          }
        }
        lastFpsUpdateRef.current = now;
      }

      clock += Math.min(0.05, deltaMs / 1000);

      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      // Smooth camera interpolation for presets / focus / reset
      if (isTransitioningRef.current) {
        const tD = targetSphericalRef.current;
        const s = sphericalRef.current;
        s.theta += (tD.theta - s.theta) * 0.12;
        s.phi += (tD.phi - s.phi) * 0.12;
        s.radius += (tD.radius - s.radius) * 0.12;
        targetLookAt.current.lerp(desiredLookAtRef.current, 0.12);

        const delta = Math.abs(tD.theta - s.theta) + Math.abs(tD.phi - s.phi) + Math.abs(tD.radius - s.radius);
        if (delta < 0.005 && targetLookAt.current.distanceTo(desiredLookAtRef.current) < 0.05) {
          isTransitioningRef.current = false;
        }
        updateCameraFromSpherical(cameraRef.current);
      }

      // Move vehicles
      animatedObjectsRef.current.buses.forEach((b) => {
        b.progress = (b.progress + b.speed) % 1;
        const pos = b.curve.getPointAt(b.progress);
        const tangent = b.curve.getTangentAt(b.progress);
        b.mesh.position.copy(pos);
        b.mesh.lookAt(pos.clone().add(tangent));
      });

      // Move traffic particles
      animatedObjectsRef.current.trafficParticles.forEach((p) => {
        p.progress = (p.progress + p.speed) % 1;
        const pos = p.curve.getPointAt(p.progress);
        p.mesh.position.copy(pos);
        p.mesh.position.y += 0.4;
      });

      // Rotate radar dishes in defense mode
      animatedObjectsRef.current.radarDishes.forEach((d) => {
        d.rotation.y += 0.02;
      });

      // Pulse dome
      if (animatedObjectsRef.current.domeMesh) {
        animatedObjectsRef.current.domeMesh.rotation.y += 0.0008;
        (animatedObjectsRef.current.domeMesh.material as THREE.Material).opacity =
          0.06 + Math.sin(clock * 1.5) * 0.03;
      }

      // Alarm light
      if (animatedObjectsRef.current.alarmLight) {
        animatedObjectsRef.current.alarmLight.intensity =
          1.8 + Math.sin(clock * 5) * 1.2;
      }
      if (animatedObjectsRef.current.serverGlow) {
        const s = 1 + Math.sin(clock * 3) * 0.15;
        animatedObjectsRef.current.serverGlow.scale.set(s, s, s);
      }

      // Water ripple
      if (animatedObjectsRef.current.waterMesh) {
        const mat = animatedObjectsRef.current.waterMesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.25 + Math.sin(clock * 2) * 0.1;
      }

      // Beacon laser pulse
      animatedObjectsRef.current.beaconStems.forEach((b) => {
        const mat = b.line.material as THREE.LineBasicMaterial;
        mat.opacity = 0.5 + Math.sin(clock * 4) * 0.35;
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animate();

    const handleResize = () => {
      if (!canvasRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      rendererRef.current?.dispose();
    };
  }, [buildCampusWorld, onNodeClick, activeTool, updateCameraFromSpherical]);

  // Camera presets
  const setCameraPreset = useCallback((preset: 'orbital' | 'top-down' | 'ingress' | 'stadium') => {
    if (preset === 'orbital') {
      targetSphericalRef.current = { theta: 0.55, phi: 1.05, radius: 82 };
      desiredLookAtRef.current.set(0, 4, 0);
    } else if (preset === 'top-down') {
      targetSphericalRef.current = { theta: 0.0, phi: 0.08, radius: 105 };
      desiredLookAtRef.current.set(0, 0, 0);
    } else if (preset === 'ingress') {
      targetSphericalRef.current = { theta: 1.25, phi: 1.28, radius: 42 };
      desiredLookAtRef.current.set(22, 10, -10);
    } else if (preset === 'stadium') {
      targetSphericalRef.current = { theta: -0.85, phi: 1.15, radius: 55 };
      desiredLookAtRef.current.set(-30, 2, 20);
    }
    isTransitioningRef.current = true;
  }, []);

  const zoomIn = useCallback(() => {
    sphericalRef.current.radius = Math.max(28, sphericalRef.current.radius - 12);
    targetSphericalRef.current.radius = sphericalRef.current.radius;
    if (cameraRef.current) updateCameraFromSpherical(cameraRef.current);
  }, [updateCameraFromSpherical]);

  const zoomOut = useCallback(() => {
    sphericalRef.current.radius = Math.min(160, sphericalRef.current.radius + 12);
    targetSphericalRef.current.radius = sphericalRef.current.radius;
    if (cameraRef.current) updateCameraFromSpherical(cameraRef.current);
  }, [updateCameraFromSpherical]);

  const resetCamera = useCallback(() => {
    targetSphericalRef.current = { theta: 0.55, phi: 1.05, radius: 82 };
    desiredLookAtRef.current.set(0, 4, 0);
    isTransitioningRef.current = true;
  }, []);

  const focusNode = useCallback((nodeId: string) => {
    let targetMesh: THREE.Object3D | null = null;
    groupsRef.current.buildings.traverse((obj) => {
      if (obj.userData?.nodeId === nodeId && !targetMesh) {
        targetMesh = obj;
      }
    });

    if (targetMesh) {
      const worldPos = new THREE.Vector3();
      (targetMesh as THREE.Object3D).getWorldPosition(worldPos);
      desiredLookAtRef.current.set(worldPos.x, worldPos.y + 2, worldPos.z);
      targetSphericalRef.current = {
        theta: sphericalRef.current.theta,
        phi: Math.max(0.65, Math.min(1.2, sphericalRef.current.phi)),
        radius: 46
      };
      isTransitioningRef.current = true;
    }
  }, []);

  return {
    setCameraPreset,
    zoomIn,
    zoomOut,
    resetCamera,
    focusNode,
    hoveredNodeId,
    compassAngle,
    fpsTelemetry
  };
}
