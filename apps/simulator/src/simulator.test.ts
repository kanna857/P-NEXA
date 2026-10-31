import { describe, it, expect } from 'vitest';
import { SimulatorService } from './index.js';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';

describe('SimulatorService & Counterfactual Evaluation', () => {
  const sampleNodes: TwinNode[] = [
    {
      id: 'node-edge-1',
      name: 'Ingress Gateway',
      type: 'router',
      tier: 0,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: {}
    },
    {
      id: 'node-app-cluster',
      name: 'API Gateway Cluster',
      type: 'load_balancer',
      tier: 1,
      status: 'healthy',
      position: { x: 10, y: 0, z: 0 },
      metadata: { vulnerabilities: ['CVE-2024-21413'] }
    },
    {
      id: 'node-service-alpha',
      name: 'Auth Service',
      type: 'server',
      tier: 2,
      status: 'healthy',
      position: { x: 20, y: -5, z: 0 },
      metadata: {}
    },
    {
      id: 'node-service-beta',
      name: 'Billing Service',
      type: 'server',
      tier: 2,
      status: 'healthy',
      position: { x: 20, y: 5, z: 0 },
      metadata: {}
    },
    {
      id: 'node-db-vault',
      name: 'Customer DB Vault',
      type: 'database',
      tier: 3,
      status: 'healthy',
      position: { x: 30, y: 0, z: 0 },
      metadata: {}
    }
  ];

  const sampleEdges: TwinEdge[] = [
    {
      id: 'e1',
      source: 'node-edge-1',
      target: 'node-app-cluster',
      protocol: 'TLS',
      trafficRateKbps: 1000,
      isEncrypted: true,
      status: 'normal'
    },
    {
      id: 'e2',
      source: 'node-app-cluster',
      target: 'node-service-alpha',
      protocol: 'GRPC',
      trafficRateKbps: 800,
      isEncrypted: true,
      status: 'normal'
    },
    {
      id: 'e3',
      source: 'node-app-cluster',
      target: 'node-service-beta',
      protocol: 'GRPC',
      trafficRateKbps: 600,
      isEncrypted: false,
      status: 'normal'
    },
    {
      id: 'e4',
      source: 'node-service-alpha',
      target: 'node-db-vault',
      protocol: 'INTERNAL_BUS',
      trafficRateKbps: 400,
      isEncrypted: true,
      status: 'normal'
    }
  ];

  it('executes Monte Carlo simulation batch and computes statistical metrics', async () => {
    const simulator = new SimulatorService();

    const result = await simulator.runMonteCarloBatch({
      tenantId: 'tenant-test',
      worldId: 'world-mc-01',
      iterations: 5,
      baseSeed: 1000,
      maxTicks: 8,
      worldNodes: sampleNodes,
      worldEdges: sampleEdges,
      initialThreats: [
        {
          name: 'FIN7 Adversary Probe',
          targetNodeId: 'node-app-cluster',
          spreadProbability: 0.7
        }
      ],
      interventions: [
        {
          id: 'int-isolate',
          type: 'ISOLATE_NODE',
          targetId: 'node-app-cluster',
          scheduledTick: 1
        }
      ]
    });

    expect(result.totalRuns).toBe(5);
    expect(result.runs).toHaveLength(5);
    expect(result.containmentRate).toBeGreaterThanOrEqual(0.8);
    expect(result.meanResilienceScore).toBeGreaterThan(0);
    expect(result.meanCompromisedNodes).toBeGreaterThanOrEqual(0);
  });

  it('evaluates multiple counterfactual containment strategies and ranks them', async () => {
    const simulator = new SimulatorService();

    const evaluation = await simulator.evaluateStrategies({
      tenantId: 'tenant-test',
      worldId: 'world-eval-01',
      branchTick: 2,
      maxTicks: 8,
      seed: 4242,
      worldNodes: sampleNodes,
      worldEdges: sampleEdges,
      initialThreats: [
        {
          name: 'APT28 Credential Harvester',
          targetNodeId: 'node-app-cluster',
          spreadProbability: 0.8
        }
      ],
      strategies: [
        {
          name: 'Strategy A: Immediate Ingress & Egress Severance',
          actions: [
            {
              id: 'act-a1',
              type: 'SEVER_EDGE',
              targetId: 'e2',
              scheduledTick: 2
            },
            {
              id: 'act-a2',
              type: 'SEVER_EDGE',
              targetId: 'e3',
              scheduledTick: 2
            }
          ]
        },
        {
          name: 'Strategy B: Full Host Quarantine Isolation',
          actions: [
            {
              id: 'act-b1',
              type: 'ISOLATE_NODE',
              targetId: 'node-app-cluster',
              scheduledTick: 2
            }
          ]
        }
      ]
    });

    expect(evaluation.rankedStrategies).toHaveLength(2);
    expect(evaluation.baselineScenarioId).toBeDefined();

    // Strategies with containment or isolation should have equal or higher resilience than unmitigated baseline
    for (const strat of evaluation.rankedStrategies) {
      expect(strat.blastRadiusReduction).toBeGreaterThanOrEqual(0);
    }
  });
});
