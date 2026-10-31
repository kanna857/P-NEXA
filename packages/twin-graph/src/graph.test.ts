import { describe, it, expect } from 'vitest';
import { TwinNode, TwinEdge, computeBlastRadius, findAttackPath } from './index.js';

describe('Twin Graph Algorithms', () => {
  const nodes: TwinNode[] = [
    {
      id: 'fw-1',
      name: 'Border Firewall',
      type: 'firewall',
      tier: 0,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: {}
    },
    {
      id: 'lb-1',
      name: 'Ingress Proxy',
      type: 'load_balancer',
      tier: 1,
      status: 'healthy',
      position: { x: 10, y: 0, z: 0 },
      metadata: {}
    },
    {
      id: 'app-1',
      name: 'Core Auth Service',
      type: 'server',
      tier: 2,
      status: 'compromised',
      position: { x: 20, y: 0, z: -10 },
      metadata: {}
    },
    {
      id: 'app-2',
      name: 'Billing Service',
      type: 'server',
      tier: 2,
      status: 'healthy',
      position: { x: 20, y: 0, z: 10 },
      metadata: {}
    },
    {
      id: 'db-1',
      name: 'User Vault Mongo DB',
      type: 'database',
      tier: 3,
      status: 'healthy',
      position: { x: 30, y: 0, z: 0 },
      metadata: {}
    }
  ];

  const edges: TwinEdge[] = [
    {
      id: 'e1',
      source: 'fw-1',
      target: 'lb-1',
      protocol: 'TLS',
      trafficRateKbps: 500,
      isEncrypted: true,
      status: 'normal'
    },
    {
      id: 'e2',
      source: 'lb-1',
      target: 'app-1',
      protocol: 'GRPC',
      trafficRateKbps: 300,
      isEncrypted: true,
      status: 'normal'
    },
    {
      id: 'e3',
      source: 'lb-1',
      target: 'app-2',
      protocol: 'GRPC',
      trafficRateKbps: 200,
      isEncrypted: true,
      status: 'normal'
    },
    {
      id: 'e4',
      source: 'app-1',
      target: 'db-1',
      protocol: 'TCP',
      trafficRateKbps: 800,
      isEncrypted: true,
      status: 'normal'
    }
  ];

  it('computes blast radius from compromised node app-1', () => {
    const result = computeBlastRadius(nodes, edges, 'app-1', 2);
    expect(result.startNodeId).toBe('app-1');
    expect(result.impactedNodeIds).toContain('db-1');
    expect(result.impactedNodeIds).toContain('lb-1');
    expect(result.riskScore).toBeGreaterThan(0);
  });

  it('isolating a node prevents threat lateral movement across blast radius', () => {
    // Isolate app-1
    const isolatedNodes: TwinNode[] = nodes.map((n) =>
      n.id === 'app-1' ? { ...n, status: 'isolated' } : n
    );
    const isolatedEdges: TwinEdge[] = edges.map((e) =>
      e.source === 'app-1' || e.target === 'app-1' ? { ...e, status: 'severed' } : e
    );

    const result = computeBlastRadius(isolatedNodes, isolatedEdges, 'app-1', 2);
    expect(result.impactedNodeIds.length).toBe(0);
  });

  it('finds attack path between perimeter firewall and user database', () => {
    const path = findAttackPath(nodes, edges, 'fw-1', 'db-1');
    expect(path).toEqual(['fw-1', 'lb-1', 'app-1', 'db-1']);
  });

  it('returns null when path is blocked by severance or isolation', () => {
    const severedEdges: TwinEdge[] = edges.map((e) =>
      e.id === 'e4' ? { ...e, status: 'severed' } : e
    );
    const path = findAttackPath(nodes, severedEdges, 'fw-1', 'db-1');
    expect(path).toBeNull();
  });
});

