import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';
import { computeSplineCurvePoints, interpolateParticlePosition } from '@nexus/world-engine';

// ── Color Maps ─────────────────────────────────────────────────────────────
const NODE_STATUS_COLORS: Record<string, number> = {
  healthy: 0x00ff66,
  warning: 0xffb800,
  compromised: 0xff003c,
  isolated: 0xbf00ff,
  offline: 0x334155
};

const EDGE_STATUS_COLORS: Record<string, number> = {
  normal: 0x00f0ff,
  anomalous: 0xffb800,
  severed: 0x334155
};

const NODE_TYPE_GEOMETRIES: Record<string, () => THREE.BufferGeometry> = {
  firewall: () => new THREE.OctahedronGeometry(1.5, 0),
  router: () => new THREE.TorusGeometry(1.2, 0.4, 8, 6),
  load_balancer: () => new THREE.CylinderGeometry(0.8, 1.2, 2, 6),
  server: () => new THREE.BoxGeometry(2, 1.4, 1),
  database: () => new THREE.CylinderGeometry(1.2, 1.2, 2, 8),
  agent_pod: () => new THREE.IcosahedronGeometry(1.2, 0),
  iot_sensor: () => new THREE.SphereGeometry(0.7, 8, 8),
  cloud_gateway: () => new THREE.TorusKnotGeometry(0.9, 0.3, 64, 8)
};

interface UseThreeViewportOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  nodes: TwinNode[];
  edges: TwinEdge[];
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  onNodeClick: (nodeId: string) => void;
}

export function useThreeViewport({
  canvasRef,
  nodes,
  edges,
  selectedNodeId,
  highlightedNodeIds,
  onNodeClick
}: UseThreeViewportOptions) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const edgeLinesRef = useRef<Map<string, THREE.Line>>(new Map());
  const particlesRef = useRef<Array<{ mesh: THREE.Mesh; points: ReturnType<typeof computeSplineCurvePoints>; progress: number; speed: number }>>([]);
  const gridRef = useRef<THREE.LineSegments | null>(null);
  const frameIdRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ theta: 0.6, phi: 1.0, radius: 80 });

  const buildScene = useCallback(() => {
    if (!canvasRef.current) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.008);
    sceneRef.current = scene;

    // Camera
    const aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 500);
    updateCameraFromSpherical(camera);
    cameraRef.current = camera;

    // Ambient light (dim blue)
    scene.add(new THREE.AmbientLight(0x1a2640, 0.8));

    // Directional key light
    const keyLight = new THREE.DirectionalLight(0x00f0ff, 0.8);
    keyLight.position.set(30, 50, 30);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Hemisphere fill
    scene.add(new THREE.HemisphereLight(0x001122, 0x000000, 0.4));

    // ── Cyber Grid ────────────────────────────────────────────────────────
    const gridSize = 120;
    const divisions = 24;
    const step = gridSize / divisions;
    const half = gridSize / 2;
    const gridVertices: number[] = [];

    for (let i = 0; i <= divisions; i++) {
      const c = -half + i * step;
      gridVertices.push(c, 0, -half, c, 0, half);
      gridVertices.push(-half, 0, c, half, 0, c);
    }

    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.06 });
    const grid = new THREE.LineSegments(gridGeo, gridMat);
    grid.position.y = -2;
    scene.add(grid);
    gridRef.current = grid;

    buildNodes(scene, nodes);
    buildEdges(scene, nodes, edges);
    buildEdgeParticles(scene, nodes, edges);
  }, [nodes, edges]);

  const updateCameraFromSpherical = (camera: THREE.PerspectiveCamera) => {
    const { theta, phi, radius } = sphericalRef.current;
    camera.position.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(0, 4, 0);
  };

  const buildNodes = (scene: THREE.Scene, nodeList: TwinNode[]) => {
    for (const node of nodeList) {
      const geoFactory = NODE_TYPE_GEOMETRIES[node.type] || (() => new THREE.BoxGeometry(2, 2, 2));
      const geo = geoFactory();
      const color = NODE_STATUS_COLORS[node.status] ?? 0x00ff66;

      const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.6,
        roughness: 0.3,
        emissive: color,
        emissiveIntensity: node.status === 'compromised' ? 0.6 : 0.25
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(node.position.x, node.position.y + 2, node.position.z);
      mesh.castShadow = true;
      mesh.userData = { nodeId: node.id, type: 'node' };

      // Glow halo ring
      const ringGeo = new THREE.TorusGeometry(2.2, 0.08, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);

      scene.add(mesh);
      nodeMeshesRef.current.set(node.id, mesh);
    }
  };

  const buildEdges = (scene: THREE.Scene, nodeList: TwinNode[], edgeList: TwinEdge[]) => {
    const nodePositions = new Map(nodeList.map((n) => [n.id, n.position]));

    for (const edge of edgeList) {
      const srcPos = nodePositions.get(edge.source);
      const tgtPos = nodePositions.get(edge.target);
      if (!srcPos || !tgtPos) continue;

      const start = new THREE.Vector3(srcPos.x, srcPos.y + 2, srcPos.z);
      const end = new THREE.Vector3(tgtPos.x, tgtPos.y + 2, tgtPos.z);
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      mid.y += 5;

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(24);
      const geo = new THREE.BufferGeometry().setFromPoints(points);

      const color = EDGE_STATUS_COLORS[edge.status] ?? 0x00f0ff;
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: edge.status === 'severed' ? 0.12 : 0.4
      });

      const line = new THREE.Line(geo, mat);
      line.userData = { edgeId: edge.id, type: 'edge' };
      scene.add(line);
      edgeLinesRef.current.set(edge.id, line);
    }
  };

  const buildEdgeParticles = (scene: THREE.Scene, nodeList: TwinNode[], edgeList: TwinEdge[]) => {
    const nodePositions = new Map(nodeList.map((n) => [n.id, n.position]));

    for (const edge of edgeList) {
      if (edge.status === 'severed') continue;
      const srcPos = nodePositions.get(edge.source);
      const tgtPos = nodePositions.get(edge.target);
      if (!srcPos || !tgtPos) continue;

      const start = { x: srcPos.x, y: srcPos.y + 2, z: srcPos.z };
      const end = { x: tgtPos.x, y: tgtPos.y + 2, z: tgtPos.z };
      const splinePoints = computeSplineCurvePoints(start, end, 5, 18);

      const pGeo = new THREE.SphereGeometry(0.18, 5, 5);
      const pMat = new THREE.MeshBasicMaterial({
        color: edge.status === 'anomalous' ? 0xffb800 : 0x00f0ff,
        transparent: true,
        opacity: 0.85
      });
      const particle = new THREE.Mesh(pGeo, pMat);
      scene.add(particle);
      particlesRef.current.push({
        mesh: particle,
        points: splinePoints,
        progress: Math.random(), // Stagger starting positions
        speed: 0.003 + Math.random() * 0.004
      });
    }
  };

  const highlightNodes = useCallback(
    (_scene: THREE.Scene, selected: string | null, highlighted: string[]) => {
      nodeMeshesRef.current.forEach((mesh, nodeId) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (nodeId === selected) {
          mat.emissiveIntensity = 1.2;
          mesh.scale.setScalar(1.25);
        } else if (highlighted.includes(nodeId)) {
          mat.emissiveIntensity = 0.8;
          mesh.scale.setScalar(1.1);
        } else {
          mat.emissiveIntensity = 0.25;
          mesh.scale.setScalar(1.0);
        }
      });
    },
    []
  );

  useEffect(() => {
    buildScene();

    // Mouse orbit controls
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !cameraRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      sphericalRef.current.theta -= dx * 0.005;
      sphericalRef.current.phi = Math.max(0.2, Math.min(Math.PI - 0.2, sphericalRef.current.phi + dy * 0.005));
      updateCameraFromSpherical(cameraRef.current);
    };
    const onMouseUp = () => { isDraggingRef.current = false; };
    const onWheel = (e: WheelEvent) => {
      if (!cameraRef.current) return;
      sphericalRef.current.radius = Math.max(25, Math.min(180, sphericalRef.current.radius + e.deltaY * 0.08));
      updateCameraFromSpherical(cameraRef.current);
    };

    // Node click via raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      if (!cameraRef.current || !sceneRef.current || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);
      const nodeMeshes = Array.from(nodeMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(nodeMeshes, false);
      if (intersects.length > 0) {
        const nodeId = intersects[0]!.object.userData.nodeId as string;
        if (nodeId) onNodeClick(nodeId);
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('click', onClick);

    // Animation loop
    let time = 0;
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      time += 0.016;

      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      // Pulse node rings and float
      nodeMeshesRef.current.forEach((mesh) => {
        mesh.position.y += Math.sin(time * 1.5 + mesh.position.x * 0.1) * 0.002;
        const ring = mesh.children[0];
        if (ring) {
          ring.rotation.z += 0.008;
          (ring as THREE.Mesh).scale.setScalar(1 + Math.sin(time * 2) * 0.04);
        }
      });

      // Animate data packets along edges
      for (const p of particlesRef.current) {
        p.progress = (p.progress + p.speed) % 1;
        const pos = interpolateParticlePosition(p.points, p.progress);
        p.mesh.position.set(pos.x, pos.y, pos.z);
        const pMat = p.mesh.material as THREE.MeshBasicMaterial;
        pMat.opacity = 0.5 + Math.sin(time * 4 + p.progress * Math.PI) * 0.35;
      }

      // Pulse grid
      if (gridRef.current) {
        (gridRef.current.material as THREE.LineBasicMaterial).opacity =
          0.04 + Math.sin(time * 0.4) * 0.02;
      }

      // Update highlights
      if (sceneRef.current) {
        highlightNodes(sceneRef.current, selectedNodeId, highlightedNodeIds);
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animate();

    // Resize handler
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

      // Cleanup Three.js resources
      rendererRef.current?.dispose();
      nodeMeshesRef.current.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      nodeMeshesRef.current.clear();
      edgeLinesRef.current.clear();
      particlesRef.current = [];
    };
  }, [buildScene, selectedNodeId, highlightedNodeIds, highlightNodes, onNodeClick]);

  const setCameraPreset = useCallback((preset: 'orbital' | 'top-down' | 'ingress') => {
    if (preset === 'orbital') {
      sphericalRef.current = { theta: 0.6, phi: 1.0, radius: 80 };
    } else if (preset === 'top-down') {
      sphericalRef.current = { theta: 0, phi: 0.1, radius: 100 };
    } else if (preset === 'ingress') {
      sphericalRef.current = { theta: 1.2, phi: 1.25, radius: 35 };
    }
    if (cameraRef.current) {
      updateCameraFromSpherical(cameraRef.current);
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (!cameraRef.current) return;
    sphericalRef.current.radius = Math.max(25, sphericalRef.current.radius - 12);
    updateCameraFromSpherical(cameraRef.current);
  }, []);

  const zoomOut = useCallback(() => {
    if (!cameraRef.current) return;
    sphericalRef.current.radius = Math.min(180, sphericalRef.current.radius + 12);
    updateCameraFromSpherical(cameraRef.current);
  }, []);

  const resetCamera = useCallback(() => {
    sphericalRef.current = { theta: 0.6, phi: 1.0, radius: 80 };
    if (cameraRef.current) {
      updateCameraFromSpherical(cameraRef.current);
    }
  }, []);

  return {
    setCameraPreset,
    zoomIn,
    zoomOut,
    resetCamera
  };
}

