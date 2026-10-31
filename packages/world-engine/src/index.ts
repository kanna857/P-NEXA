import { TwinNode, TwinEdge } from '@nexus/twin-graph';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface CyberGridGeometry {
  size: number;
  divisions: number;
  lineVertices: number[]; // Float32Array compatible flat array [x1,y1,z1, x2,y2,z2, ...]
}

/**
 * Generates flat vertex pairs for a holographic cyberpunk ground grid.
 */
export function generateCyberGrid(size: number = 100, divisions: number = 20): CyberGridGeometry {
  const lineVertices: number[] = [];
  const step = size / divisions;
  const half = size / 2;

  for (let i = 0; i <= divisions; i++) {
    const coord = -half + i * step;

    // Parallel to Z axis
    lineVertices.push(coord, 0, -half);
    lineVertices.push(coord, 0, half);

    // Parallel to X axis
    lineVertices.push(-half, 0, coord);
    lineVertices.push(half, 0, coord);
  }

  return { size, divisions, lineVertices };
}

/**
 * Computes 3D hierarchical cluster positions for digital twin nodes.
 * Tier 0 (Perimeter/Firewall): x = -40
 * Tier 1 (Ingress / Load Balancer): x = -20
 * Tier 2 (App / Microservice Servers): x = 0
 * Tier 3 (Database / Storage): x = 20
 * Tier 4 (IoT / Edge Devices / Satellite Relay): x = 40
 */
export function computeHierarchicalClusterLayout(
  nodes: TwinNode[],
  _edges: TwinEdge[]
): TwinNode[] {
  const tierGroups = new Map<number, TwinNode[]>();

  for (const node of nodes) {
    const tier = node.tier ?? 2;
    if (!tierGroups.has(tier)) tierGroups.set(tier, []);
    tierGroups.get(tier)!.push(node);
  }

  const updatedNodes: TwinNode[] = [];

  for (const [tier, group] of tierGroups.entries()) {
    const tierX = (tier - 2) * 25; // Centers tier 2 at 0
    const count = group.length;

    for (let i = 0; i < count; i++) {
      const node = group[i]!;
      // Spread across Z and slightly varying Y
      const zOffset = (i - (count - 1) / 2) * 14;
      const yOffset = 2 + (i % 2) * 4;

      updatedNodes.push({
        ...node,
        position: {
          x: tierX,
          y: yOffset,
          z: zOffset
        }
      });
    }
  }

  return updatedNodes;
}

/**
 * Calculates 3D Bezier curve points connecting source and target nodes with an arc height.
 */
export function computeSplineCurvePoints(
  start: Vector3D,
  end: Vector3D,
  arcHeight: number = 6,
  pointCount: number = 20
): Vector3D[] {
  const mid: Vector3D = {
    x: (start.x + end.x) / 2,
    y: Math.max(start.y, end.y) + arcHeight,
    z: (start.z + end.z) / 2
  };

  const points: Vector3D[] = [];
  for (let i = 0; i <= pointCount; i++) {
    const t = i / pointCount;
    // Quadratic Bezier formula: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;

    points.push({
      x: uu * start.x + 2 * u * t * mid.x + tt * end.x,
      y: uu * start.y + 2 * u * t * mid.y + tt * end.y,
      z: uu * start.z + 2 * u * t * mid.z + tt * end.z
    });
  }

  return points;
}

/**
 * Interpolates particle position along a 3D spline curve at a given progress (0.0 to 1.0).
 */
export function interpolateParticlePosition(points: Vector3D[], progress: number): Vector3D {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  if (points.length === 1) return points[0]!;

  const clamped = Math.max(0, Math.min(1, progress));
  const exactIndex = clamped * (points.length - 1);
  const baseIndex = Math.floor(exactIndex);
  const frac = exactIndex - baseIndex;

  const p1 = points[baseIndex]!;
  const p2 = points[Math.min(baseIndex + 1, points.length - 1)]!;

  return {
    x: p1.x + (p2.x - p1.x) * frac,
    y: p1.y + (p2.y - p1.y) * frac,
    z: p1.z + (p2.z - p1.z) * frac
  };
}

export interface SphericalCoordinates {
  theta: number; // Azimuthal angle in radians
  phi: number;   // Polar angle in radians
  radius: number; // Distance from target
}

export interface CameraPresetConfig {
  theta: number;
  phi: number;
  radius: number;
  target: Vector3D;
  description: string;
}

export const CAMERA_PRESETS: Record<'orbital' | 'top-down' | 'ingress' | 'stadium', CameraPresetConfig> = {
  orbital: {
    theta: 0.55,
    phi: 1.05,
    radius: 82,
    target: { x: 0, y: 4, z: 0 },
    description: 'Isometric Orbital View (Default Perspective)'
  },
  'top-down': {
    theta: 0.0,
    phi: 0.08,
    radius: 105,
    target: { x: 0, y: 0, z: 0 },
    description: 'Zenith Orthographic Blueprint View'
  },
  ingress: {
    theta: 1.25,
    phi: 1.28,
    radius: 42,
    target: { x: 22, y: 10, z: -10 },
    description: 'Perimeter Ingress & Gate Inspection'
  },
  stadium: {
    theta: -0.85,
    phi: 1.15,
    radius: 55,
    target: { x: -30, y: 2, z: 20 },
    description: 'Sports Complex & Central Arena Close-Up'
  }
};

/**
 * Calculates cartesian 3D position (x, y, z) from spherical coordinates and target lookAt.
 */
export function calculateSphericalCameraPosition(
  coords: SphericalCoordinates,
  target: Vector3D = { x: 0, y: 0, z: 0 }
): Vector3D {
  const sinPhi = Math.sin(coords.phi);
  const cosPhi = Math.cos(coords.phi);
  const sinTheta = Math.sin(coords.theta);
  const cosTheta = Math.cos(coords.theta);

  return {
    x: target.x + coords.radius * sinPhi * sinTheta,
    y: target.y + coords.radius * cosPhi,
    z: target.z + coords.radius * sinPhi * cosTheta
  };
}

/**
 * Clamps zoom radius within safe operational boundaries.
 */
export function clampCameraZoom(radius: number, min: number = 24, max: number = 180): number {
  return Math.max(min, Math.min(max, radius));
}

/**
 * Computes compass heading angle in degrees (0 to 360) from camera azimuth theta.
 */
export function computeCompassHeading(theta: number): number {
  let deg = ((-theta * 180) / Math.PI + 32) % 360;
  if (deg < 0) deg += 360;
  return deg;
}

/**
 * Calculates panning displacement vector relative to camera orientation.
 */
export function computePanDelta(
  dx: number,
  dy: number,
  theta: number,
  speed: number = 0.08
): Vector3D {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  return {
    x: (-dx * cosTheta + dy * sinTheta) * speed,
    y: 0,
    z: (dx * sinTheta + dy * cosTheta) * speed
  };
}

/**
 * Computes optimal camera spherical coordinates and target to frame an entity.
 */
export function computeEntityFocusCoordinates(
  entityPos: Vector3D,
  currentSpherical: SphericalCoordinates,
  closeUpRadius: number = 42
): { target: Vector3D; spherical: SphericalCoordinates } {
  return {
    target: { x: entityPos.x, y: entityPos.y + 2, z: entityPos.z },
    spherical: {
      theta: currentSpherical.theta,
      phi: Math.max(0.6, Math.min(1.2, currentSpherical.phi)),
      radius: closeUpRadius
    }
  };
}
