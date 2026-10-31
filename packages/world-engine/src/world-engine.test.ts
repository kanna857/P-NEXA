import { describe, it, expect } from 'vitest';
import {
  generateCyberGrid,
  computeHierarchicalClusterLayout,
  computeSplineCurvePoints,
  interpolateParticlePosition
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
});

