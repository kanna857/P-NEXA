import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';

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
  nodes: TwinNode[];
  edges: TwinEdge[];
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  onNodeClick: (nodeId: string) => void;
  activeLayers?: ActiveLayers;
  activeTool?: string;
  isSimulating?: boolean;
}

export function useThreeViewport({
  canvasRef,
  nodes,
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
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [compassAngle, setCompassAngle] = useState(0.55);

  // Groups for layer control
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

  // Camera spherical coordinates (defaults to match reference image)
  const sphericalRef = useRef({ theta: 0.55, phi: 1.05, radius: 82 });
  const targetLookAt = useRef(new THREE.Vector3(0, 4, 0));

  // Dynamic animated objects
  const animatedObjectsRef = useRef<{
    waterMesh?: THREE.Mesh;
    domeMesh?: THREE.Mesh;
    buses: Array<{ mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; progress: number; speed: number }>;
    trafficParticles: Array<{ mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; progress: number; speed: number }>;
    dataBeams: THREE.Line[];
    beaconStems: Array<{ line: THREE.Line; id: string; targetY: number }>;
    alarmLight?: THREE.PointLight;
    serverGlow?: THREE.Mesh;
  }>({
    buses: [],
    trafficParticles: [],
    dataBeams: [],
    beaconStems: []
  });

  // Helper: Procedural Building Facade Texture
  const createBuildingTexture = (windowTone: 'cool' | 'warm' | 'mixed' | 'server') => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, 128, 256);

    const cols = 8;
    const rows = 24;
    const padX = 4;
    const padY = 3;
    const w = (128 - padX * (cols + 1)) / cols;
    const h = (256 - padY * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isLit = Math.random() > 0.32;
        if (isLit) {
          if (windowTone === 'server') {
            ctx.fillStyle = Math.random() > 0.3 ? '#ef4444' : '#f97316';
          } else if (windowTone === 'warm') {
            ctx.fillStyle = Math.random() > 0.4 ? '#fef08a' : '#f59e0b';
          } else if (windowTone === 'cool') {
            ctx.fillStyle = Math.random() > 0.4 ? '#38bdf8' : '#0284c7';
          } else {
            ctx.fillStyle = Math.random() > 0.5 ? '#38bdf8' : '#fde047';
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

  // Helper: Procedural Stadium Soccer Pitch Texture
  const createSoccerPitchTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // Field grass
    ctx.fillStyle = '#047857';
    ctx.fillRect(0, 0, 256, 160);

    // Mowing stripes
    ctx.fillStyle = '#059669';
    for (let i = 0; i < 256; i += 32) {
      ctx.fillRect(i, 0, 16, 160);
    }

    // Outer white boundary line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 236, 140);

    // Halfway line & center circle
    ctx.beginPath();
    ctx.moveTo(128, 10);
    ctx.lineTo(128, 150);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 80, 28, 0, Math.PI * 2);
    ctx.stroke();

    // Goal penalty areas
    ctx.strokeRect(10, 45, 45, 70);
    ctx.strokeRect(201, 45, 45, 70);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
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

    // 2. Scene & Atmosphere Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060814);
    scene.fog = new THREE.FogExp2(0x060814, 0.007);
    sceneRef.current = scene;

    // 3. Camera Setup
    const aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(52, aspect, 0.1, 800);
    updateCameraFromSpherical(camera);
    cameraRef.current = camera;

    // 4. Lighting (Dramatic Cyber Dusk)
    const ambientLight = new THREE.AmbientLight(0x18243c, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x00e5ff, 1.1);
    keyLight.position.set(45, 65, 35);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const purpleRimLight = new THREE.DirectionalLight(0xa855f7, 0.7);
    purpleRimLight.position.set(-50, 40, -40);
    scene.add(purpleRimLight);

    // Initialize Layer Groups
    const grp = groupsRef.current;
    Object.values(grp).forEach((g) => {
      g.clear();
      scene.add(g);
    });

    // 5. Terrain Ground Plane & Cyber Grid
    const groundGeo = new THREE.PlaneGeometry(220, 220);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070b16,
      roughness: 0.85,
      metalness: 0.2
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.1;
    groundMesh.receiveShadow = true;
    grp.ground.add(groundMesh);

    // Holographic Cyber Grid Overlay
    const gridHelper = new THREE.GridHelper(220, 44, 0x00f0ff, 0x111c33);
    gridHelper.position.y = 0;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.15;
    grp.ground.add(gridHelper);

    // 6. River / Water Canal (Traversing along the right)
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
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35
    });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.rotation.x = Math.PI / 2;
    riverMesh.position.y = 0.05;
    grp.ground.add(riverMesh);
    animatedObjectsRef.current.waterMesh = riverMesh;

    // 7. Stadium & Sports Complex (Lower Left, x: -35, z: 28)
    const stadiumGroup = new THREE.Group();
    stadiumGroup.position.set(-36, 0, 24);

    // Running Track
    const trackGeo = new THREE.PlaneGeometry(28, 18);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Terracotta red track
      roughness: 0.7
    });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.rotation.x = -Math.PI / 2;
    trackMesh.position.y = 0.08;
    stadiumGroup.add(trackMesh);

    // Soccer Field with Textured Markings
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
    stadiumGroup.add(pitchMesh);

    // Concrete Grandstand Ring
    const standGeo = new THREE.CylinderGeometry(18, 19, 2.5, 32, 1, true);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const standMesh = new THREE.Mesh(standGeo, standMat);
    standMesh.position.y = 1.25;
    stadiumGroup.add(standMesh);

    // 4 Stadium Floodlight Towers
    const floodlightPositions = [
      [-14, 8],
      [14, 8],
      [-14, -8],
      [14, -8]
    ];
    floodlightPositions.forEach(([fx, fz]) => {
      const poleGeo = new THREE.CylinderGeometry(0.2, 0.3, 10, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(fx, 5, fz);

      const lampGeo = new THREE.BoxGeometry(1.2, 0.6, 0.8);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(fx, 9.8, fz);
      stadiumGroup.add(pole);
      stadiumGroup.add(lamp);
    });
    grp.buildings.add(stadiumGroup);

    // 8. 30+ 3D Campus Architectural Buildings
    const coolTexture = createBuildingTexture('cool');
    const warmTexture = createBuildingTexture('warm');
    const mixedTexture = createBuildingTexture('mixed');
    const serverTexture = createBuildingTexture('server');

    // Building definitions mapped to match reference image campus layout
    const campusBuildings = [
      // Academic Block Complex (Center-North)
      { id: 'b-acad-1', name: 'Academic Block A', x: -5, z: -25, w: 16, h: 18, d: 10, tex: coolTexture, type: 'academic' },
      { id: 'b-acad-2', name: 'Academic Block B', x: 12, z: -28, w: 14, h: 22, d: 9, tex: coolTexture, type: 'academic' },
      { id: 'b-acad-3', name: 'Science & Bio Research', x: -22, z: -20, w: 12, h: 14, d: 8, tex: mixedTexture, type: 'academic' },
      { id: 'b-acad-4', name: 'Robotics & AI Pavilion', x: 2, z: -42, w: 18, h: 16, d: 12, tex: coolTexture, type: 'academic' },

      // Hostel Block A & B (North-West)
      { id: 'b-hostel-a', name: 'Hostel Block A', x: -32, z: -10, w: 14, h: 26, d: 12, tex: warmTexture, type: 'hostel' },
      { id: 'b-hostel-b', name: 'Hostel Block B', x: -35, z: -32, w: 12, h: 20, d: 10, tex: warmTexture, type: 'hostel' },

      // Main Server Facility (Upper-Right)
      { id: 'srv-auth', name: 'Main Server (srv-auth)', x: 28, z: -18, w: 14, h: 16, d: 14, tex: serverTexture, type: 'server' },

      // Central Library (Mid-Right)
      { id: 'b-library', name: 'Central Library', x: 36, z: 12, w: 15, h: 13, d: 16, tex: warmTexture, type: 'library' },

      // Main Gate & Security Fortress (South-East)
      { id: 'b-maingate', name: 'Main Gate Security', x: 18, z: 32, w: 14, h: 9, d: 7, tex: coolTexture, type: 'security' },

      // Administrative Headquarters Tower (Center)
      { id: 'b-admin', name: 'Admin Headquarters Tower', x: 4, z: -6, w: 12, h: 34, d: 11, tex: mixedTexture, type: 'admin' },

      // Additional Surrounding Department Buildings
      { id: 'b-sub-1', name: 'Electronics Dept', x: -18, z: 4, w: 10, h: 12, d: 8, tex: coolTexture, type: 'building' },
      { id: 'b-sub-2', name: 'Materials Science', x: 20, z: -38, w: 11, h: 15, d: 9, tex: coolTexture, type: 'building' },
      { id: 'b-sub-3', name: 'Innovation Hub', x: 32, z: -40, w: 13, h: 11, d: 10, tex: warmTexture, type: 'building' },
      { id: 'b-sub-4', name: 'Faculty Residences', x: -44, z: 2, w: 10, h: 16, d: 8, tex: warmTexture, type: 'building' },
      { id: 'b-sub-5', name: 'Auditorium Dome', x: 16, z: 14, w: 12, h: 10, d: 12, tex: coolTexture, type: 'building' },
      { id: 'b-sub-6', name: 'Campus Cafeteria', x: -8, z: 12, w: 10, h: 7, d: 9, tex: warmTexture, type: 'building' },
      { id: 'b-sub-7', name: 'Energy Grid Substation', x: 30, z: 34, w: 8, h: 6, d: 8, tex: serverTexture, type: 'server' }
    ];

    campusBuildings.forEach((b) => {
      const isServer = b.type === 'server';
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);

      // Building Material with procedural glowing windows
      const mat = new THREE.MeshStandardMaterial({
        color: isServer ? 0x22050b : 0x0c1527,
        roughness: 0.35,
        metalness: 0.6,
        map: b.tex,
        emissiveMap: b.tex,
        emissive: isServer ? 0xef4444 : 0x38bdf8,
        emissiveIntensity: isServer ? 0.9 : 0.45
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { nodeId: b.id, name: b.name, type: b.type };

      // Glowing Rooftop Edges & Helipads
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: isServer ? 0xff003c : 0x00f0ff,
        transparent: true,
        opacity: 0.65
      });
      const wire = new THREE.LineSegments(edgeGeo, edgeMat);
      mesh.add(wire);

      // Flashing Rooftop Warning Antennas on tall buildings
      if (b.h > 18) {
        const antGeo = new THREE.CylinderGeometry(0.1, 0.15, 6, 6);
        const antMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
        const antenna = new THREE.Mesh(antGeo, antMat);
        antenna.position.set(0, b.h / 2 + 3, 0);

        const beaconGeo = new THREE.SphereGeometry(0.4, 6, 6);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff003c });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(0, b.h / 2 + 6, 0);

        mesh.add(antenna);
        mesh.add(beacon);
      }

      grp.buildings.add(mesh);

      // If Main Server, add pulsating red alert light
      if (b.id === 'srv-auth') {
        const alertLight = new THREE.PointLight(0xff003c, 2.5, 35);
        alertLight.position.set(b.x, b.h + 2, b.z);
        scene.add(alertLight);
        animatedObjectsRef.current.alarmLight = alertLight;

        // Concentric threat wave ring
        const ringGeo = new THREE.RingGeometry(8, 9, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xff003c,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const serverRing = new THREE.Mesh(ringGeo, ringMat);
        serverRing.rotation.x = Math.PI / 2;
        serverRing.position.set(b.x, 0.2, b.z);
        scene.add(serverRing);
        animatedObjectsRef.current.serverGlow = serverRing;
      }
    });

    // 9. Arterial Roadway Network & Moving Traffic
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
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.9,
        side: THREE.DoubleSide
      });
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.scale.set(1, 0.02, 1);
      grp.ground.add(roadMesh);
    });

    // Moving Campus Buses (Yellow/Amber Buses)
    animatedObjectsRef.current.buses = [];
    for (let i = 0; i < 3; i++) {
      const busGroup = new THREE.Group();

      const busBody = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 1.8, 2.0),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b, // Amber Bus Yellow
          roughness: 0.4,
          metalness: 0.5,
          emissive: 0xd97706,
          emissiveIntensity: 0.3
        })
      );
      busBody.position.y = 0.9;
      busGroup.add(busBody);

      // Glowing headlights
      const hlGeo = new THREE.SphereGeometry(0.2, 6, 6);
      const hlMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const hlL = new THREE.Mesh(hlGeo, hlMat);
      hlL.position.set(2.1, 0.8, 0.7);
      const hlR = new THREE.Mesh(hlGeo, hlMat);
      hlR.position.set(2.1, 0.8, -0.7);
      busGroup.add(hlL);
      busGroup.add(hlR);

      grp.vehicles.add(busGroup);
      animatedObjectsRef.current.buses.push({
        mesh: busGroup as unknown as THREE.Mesh,
        curve: i % 2 === 0 ? roadCurve1 : roadCurve2,
        progress: (i * 0.33) % 1,
        speed: 0.0018 + i * 0.0006
      });
    }

    // Moving Traffic Particles (Headlights & Taillights stream)
    animatedObjectsRef.current.trafficParticles = [];
    for (let i = 0; i < 16; i++) {
      const isTaillight = i % 2 === 0;
      const pMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 6, 6),
        new THREE.MeshBasicMaterial({
          color: isTaillight ? 0xff003c : 0x00f0ff,
          transparent: true,
          opacity: 0.9
        })
      );
      grp.vehicles.add(pMesh);
      animatedObjectsRef.current.trafficParticles.push({
        mesh: pMesh,
        curve: i % 2 === 0 ? roadCurve1 : roadCurve2,
        progress: (i / 16),
        speed: 0.0035 + (i % 3) * 0.001
      });
    }

    // 10. Holographic Sky Forcefield Dome
    const domeGeo = new THREE.SphereGeometry(130, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    domeMesh.position.y = -1;
    grp.network.add(domeMesh);
    animatedObjectsRef.current.domeMesh = domeMesh;

    // Sky Constellation Stars
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 300;
      starPositions[i + 1] = 20 + Math.random() * 120;
      starPositions[i + 2] = (Math.random() - 0.5) * 300;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.2,
      transparent: true,
      opacity: 0.7
    });
    const starField = new THREE.Points(starGeo, starMat);
    grp.weather.add(starField);

    // 11. Holographic Laser Beams Dropping to Buildings
    const beaconAnchors = [
      { id: 'beacon-hostel', x: -32, y: 26, z: -10, color: 0x00e5ff },
      { id: 'beacon-academic', x: -5, y: 18, z: -25, color: 0x10b981 },
      { id: 'beacon-server', x: 28, y: 16, z: -18, color: 0xff003c },
      { id: 'beacon-library', x: 36, y: 13, z: 12, color: 0x3b82f6 },
      { id: 'beacon-sports', x: -36, y: 3, z: 24, color: 0x14b8a6 },
      { id: 'beacon-buses', x: 0, y: 2, z: 15, color: 0xf59e0b },
      { id: 'beacon-gate', x: 18, y: 9, z: 32, color: 0x00e5ff }
    ];

    animatedObjectsRef.current.beaconStems = [];
    beaconAnchors.forEach((anc) => {
      const points = [
        new THREE.Vector3(anc.x, anc.y + 12, anc.z),
        new THREE.Vector3(anc.x, anc.y, anc.z)
      ];
      const stemGeo = new THREE.BufferGeometry().setFromPoints(points);
      const stemMat = new THREE.LineBasicMaterial({
        color: anc.color,
        transparent: true,
        opacity: 0.75
      });
      const stem = new THREE.Line(stemGeo, stemMat);
      grp.network.add(stem);
      animatedObjectsRef.current.beaconStems.push({
        line: stem,
        id: anc.id,
        targetY: anc.y
      });
    });

  }, [nodes]);

  // Synchronize Group Visibilities with activeLayers prop
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

  // Render & Animation Loop
  useEffect(() => {
    buildCampusWorld();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Mouse Orbit Controls
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !cameraRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      sphericalRef.current.theta -= dx * 0.0055;
      sphericalRef.current.phi = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, sphericalRef.current.phi + dy * 0.0055));
      updateCameraFromSpherical(cameraRef.current);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!cameraRef.current) return;
      sphericalRef.current.radius = Math.max(28, Math.min(160, sphericalRef.current.radius + e.deltaY * 0.06));
      updateCameraFromSpherical(cameraRef.current);
    };

    // Raycast Building Clicking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
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
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('click', onClick);

    // Animation Render Loop
    let clock = 0;
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      clock += 0.016;

      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      // 1. Move Buses Along Road Networks
      animatedObjectsRef.current.buses.forEach((b) => {
        b.progress = (b.progress + b.speed) % 1;
        const pos = b.curve.getPointAt(b.progress);
        const tangent = b.curve.getTangentAt(b.progress);
        b.mesh.position.copy(pos);
        b.mesh.lookAt(pos.clone().add(tangent));
      });

      // 2. Move Traffic Particles Along Roads
      animatedObjectsRef.current.trafficParticles.forEach((p) => {
        p.progress = (p.progress + p.speed) % 1;
        const pos = p.curve.getPointAt(p.progress);
        p.mesh.position.copy(pos);
        p.mesh.position.y += 0.4;
      });

      // 3. Pulse Forcefield Geodesic Dome
      if (animatedObjectsRef.current.domeMesh) {
        animatedObjectsRef.current.domeMesh.rotation.y += 0.0008;
        (animatedObjectsRef.current.domeMesh.material as THREE.Material).opacity =
          0.06 + Math.sin(clock * 1.5) * 0.03;
      }

      // 4. Pulse Main Server Alarm
      if (animatedObjectsRef.current.alarmLight) {
        animatedObjectsRef.current.alarmLight.intensity =
          1.8 + Math.sin(clock * 5) * 1.2;
      }
      if (animatedObjectsRef.current.serverGlow) {
        const s = 1 + Math.sin(clock * 3) * 0.15;
        animatedObjectsRef.current.serverGlow.scale.set(s, s, s);
      }

      // 5. Water Shimmer & Specular Ripples
      if (animatedObjectsRef.current.waterMesh) {
        const mat = animatedObjectsRef.current.waterMesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.25 + Math.sin(clock * 2) * 0.1;
      }

      // 6. Beacon Stems Pulse
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
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      rendererRef.current?.dispose();
    };
  }, [buildCampusWorld, onNodeClick]);

  // Camera Presets API
  const setCameraPreset = useCallback((preset: 'orbital' | 'top-down' | 'ingress' | 'stadium') => {
    if (preset === 'orbital') {
      sphericalRef.current = { theta: 0.55, phi: 1.05, radius: 82 };
      targetLookAt.current.set(0, 4, 0);
    } else if (preset === 'top-down') {
      sphericalRef.current = { theta: 0.0, phi: 0.08, radius: 105 };
      targetLookAt.current.set(0, 0, 0);
    } else if (preset === 'ingress') {
      sphericalRef.current = { theta: 1.25, phi: 1.28, radius: 42 };
      targetLookAt.current.set(22, 10, -10);
    } else if (preset === 'stadium') {
      sphericalRef.current = { theta: -0.85, phi: 1.15, radius: 55 };
      targetLookAt.current.set(-30, 2, 20);
    }
    if (cameraRef.current) {
      updateCameraFromSpherical(cameraRef.current);
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (!cameraRef.current) return;
    sphericalRef.current.radius = Math.max(28, sphericalRef.current.radius - 12);
    updateCameraFromSpherical(cameraRef.current);
  }, []);

  const zoomOut = useCallback(() => {
    if (!cameraRef.current) return;
    sphericalRef.current.radius = Math.min(160, sphericalRef.current.radius + 12);
    updateCameraFromSpherical(cameraRef.current);
  }, []);

  const resetCamera = useCallback(() => {
    sphericalRef.current = { theta: 0.55, phi: 1.05, radius: 82 };
    targetLookAt.current.set(0, 4, 0);
    if (cameraRef.current) {
      updateCameraFromSpherical(cameraRef.current);
    }
  }, []);

  return {
    setCameraPreset,
    zoomIn,
    zoomOut,
    resetCamera,
    compassAngle
  };
}
