import { describe, it, expect } from 'vitest';
import {
  generateCyberGrid,
  computeHierarchicalClusterLayout,
  computeSplineCurvePoints,
  interpolateParticlePosition,
  calculateSphericalCameraPosition,
  clampCameraZoom,
  computeCompassHeading,
  computePanDelta,
  computeEntityFocusCoordinates,
  CAMERA_PRESETS
} from './index.js';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';

describe('World Engine — 3D Spatial Utilities', () => {
  it('generateCyberGrid produces correct vertex count for given divisions', () => {
    const grid = generateCyberGrid(100, 10);
    // Each division produces 2 line segments (X and Z axes), each with 2 points (6 floats)
    // (divisions + 1) * 2 lines * 2 points * 3 floats = (11)*2*2*3 = 132
    expect(grid.lineVertices.length).toBe((10 + 1) * 2 * 2 * 3);
    expect(grid.size).toBe(100);
    expect(grid.divisions).toBe(10);
  });

  it('computeHierarchicalClusterLayout assigns tier-based X positions', () => {
    const mockNodes: TwinNode[] = [
      { id: 'fw', name: 'Firewall', type: 'firewall', tier: 0, status: 'healthy', position: { x: 0, y: 0, z: 0 }, metadata: {} },
      { id: 'app', name: 'App Server', type: 'server', tier: 2, status: 'healthy', position: { x: 0, y: 0, z: 0 }, metadata: {} },
      { id: 'db', name: 'Database', type: 'database', tier: 3, status: 'healthy', position: { x: 0, y: 0, z: 0 }, metadata: {} }
    ];
    const result = computeHierarchicalClusterLayout(mockNodes, []);
    const fw = result.find((n) => n.id === 'fw')!;
    const db = result.find((n) => n.id === 'db')!;
    // Tier 0 => x = -50, tier 3 => x = 25
    expect(fw.position.x).toBeLessThan(db.position.x);
  });

  it('computeSplineCurvePoints generates correct point count along arc', () => {
    const start = { x: 0, y: 0, z: 0 };
    const end = { x: 30, y: 0, z: 0 };
    const points = computeSplineCurvePoints(start, end, 5, 20);
    expect(points.length).toBe(21); // pointCount + 1 for inclusive start/end
    expect(points[0]).toEqual(start);
    expect(points[20]!.x).toBeCloseTo(30, 1);
  });

  it('interpolateParticlePosition returns start at t=0 and end at t=1', () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 5, z: 0 },
      { x: 20, y: 0, z: 0 }
    ];
    const atStart = interpolateParticlePosition(points, 0);
    const atEnd = interpolateParticlePosition(points, 1);
    expect(atStart.x).toBeCloseTo(0);
    expect(atEnd.x).toBeCloseTo(20);
  });

  it('calculateSphericalCameraPosition accurately maps spherical to cartesian coords', () => {
    // Phi = PI / 2 (equator), Theta = 0 (along Z axis)
    const pos = calculateSphericalCameraPosition({ theta: 0, phi: Math.PI / 2, radius: 50 }, { x: 0, y: 0, z: 0 });
    expect(pos.x).toBeCloseTo(0, 2);
    expect(pos.y).toBeCloseTo(0, 2);
    expect(pos.z).toBeCloseTo(50, 2);

    // Phi = 0 (north pole, straight up on Y)
    const topPos = calculateSphericalCameraPosition({ theta: 0, phi: 0, radius: 100 }, { x: 10, y: 5, z: 0 });
    expect(topPos.x).toBeCloseTo(10, 2);
    expect(topPos.y).toBeCloseTo(105, 2);
    expect(topPos.z).toBeCloseTo(0, 2);
  });

  it('clampCameraZoom constrains radius within limits', () => {
    expect(clampCameraZoom(10, 24, 180)).toBe(24);
    expect(clampCameraZoom(250, 24, 180)).toBe(180);
    expect(clampCameraZoom(85, 24, 180)).toBe(85);
  });

  it('computeCompassHeading returns 0-360 degree normalized heading', () => {
    const heading0 = computeCompassHeading(0);
    expect(heading0).toBeGreaterThanOrEqual(0);
    expect(heading0).toBeLessThan(360);

    const headingPi = computeCompassHeading(Math.PI);
    expect(headingPi).toBeGreaterThanOrEqual(0);
    expect(headingPi).toBeLessThan(360);
  });

  it('computePanDelta shifts coordinates according to angle', () => {
    const delta = computePanDelta(10, 0, 0, 0.1);
    expect(delta.x).toBeCloseTo(-1, 1);
    expect(delta.y).toBe(0);
  });

  it('computeEntityFocusCoordinates centers target on entity and clamps phi', () => {
    const focus = computeEntityFocusCoordinates(
      { x: 25, y: 8, z: -15 },
      { theta: 0.8, phi: 0.2, radius: 80 },
      45
    );
    expect(focus.target).toEqual({ x: 25, y: 10, z: -15 });
    expect(focus.spherical.radius).toBe(45);
    expect(focus.spherical.phi).toBeGreaterThanOrEqual(0.6); // Clamped minimum
  });

  it('CAMERA_PRESETS contains all required perspectives with targets', () => {
    expect(CAMERA_PRESETS.orbital).toBeDefined();
    expect(CAMERA_PRESETS['top-down']).toBeDefined();
    expect(CAMERA_PRESETS.ingress).toBeDefined();
    expect(CAMERA_PRESETS.stadium).toBeDefined();
    expect(CAMERA_PRESETS.orbital.radius).toBe(82);
    expect(CAMERA_PRESETS['top-down'].phi).toBeLessThan(0.2); // Overhead
  });
});

