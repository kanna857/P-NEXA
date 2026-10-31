import { describe, it, expect } from 'vitest';
import { DeterministicPRNG, seededRandom } from './prng.js';
import { computeScenarioStateHash } from './state-hash.js';
import { ScenarioSimulationEngine } from './scenario-engine.js';
import { ScenarioManager } from './scenario-manager.js';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';
import { SimulationScenario } from './types.js';

describe('Phase 5: Parallel Scenario Simulation & Deterministic Replay', () => {
  const sampleNodes: TwinNode[] = [
    {
      id: 'node-gateway',
      name: 'Internet Gateway',
      type: 'firewall',
      tier: 0,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.0.0.1' }
    },
    {
      id: 'node-app-1',
      name: 'App Server Alpha',
      type: 'server',
      tier: 2,
      status: 'healthy',
      position: { x: 10, y: 0, z: 0 },
      metadata: { ipAddress: '10.0.1.1', vulnerabilities: ['CVE-2024-38077'] }
    },
    {
      id: 'node-app-2',
      name: 'App Server Beta',
      type: 'server',
      tier: 2,
      status: 'healthy',
      position: { x: 10, y: 10, z: 0 },
      metadata: { ipAddress: '10.0.1.2' }
    },
    {
      id: 'node-db',
      name: 'Primary Database Vault',
      type: 'database',
      tier: 3,
      status: 'healthy',
      position: { x: 20, y: 5, z: 0 },
      metadata: { ipAddress: '10.0.2.1' }
    }
  ];

  const sampleEdges: TwinEdge[] = [
    {
      id: 'edge-gw-app1',
      source: 'node-gateway',
      target: 'node-app-1',
      protocol: 'TLS',
      trafficRateKbps: 500,
      isEncrypted: true,
      status: 'normal'
    },
    {
      id: 'edge-app1-app2',
      source: 'node-app-1',
      target: 'node-app-2',
      protocol: 'TCP',
      trafficRateKbps: 1200,
      isEncrypted: false,
      status: 'normal'
    },
    {
      id: 'edge-app1-db',
      source: 'node-app-1',
      target: 'node-db',
      protocol: 'GRPC',
      trafficRateKbps: 800,
      isEncrypted: true,
      status: 'normal'
    }
  ];

  describe('Deterministic PRNG', () => {
    it('produces bit-exact identical sequences from the same seed', () => {
      const prng1 = new DeterministicPRNG(424242);
      const prng2 = new DeterministicPRNG(424242);

      const seq1 = [prng1.next(), prng1.nextInt(1, 100), prng1.nextBoolean(), prng1.next()];
      const seq2 = [prng2.next(), prng2.nextInt(1, 100), prng2.nextBoolean(), prng2.next()];

      expect(seq1).toEqual(seq2);
    });

    it('seededRandom compatibility helper produces deterministic floats', () => {
      const genA = seededRandom(1337);
      const genB = seededRandom(1337);

      expect(genA()).toBe(genB());
      expect(genA()).toBe(genB());
      expect(genA()).toBe(genB());
    });
  });

  describe('State Hash Determinism', () => {
    it('generates reproducible SHA-256 hash irrespective of memory reference', () => {
      const metrics = {
        totalNodes: 4,
        compromisedNodesCount: 1,
        isolatedNodesCount: 0,
        severedEdgesCount: 0,
        activeThreatsCount: 1,
        systemResilienceScore: 85,
        containmentAchieved: false
      };

      const threats = [
        {
          id: 'th-1',
          name: 'LockBit Ransomware',
          status: 'ACTIVE' as const,
          currentNodeId: 'node-app-1',
          compromisedNodes: ['node-app-1'],
          spreadProbability: 0.7,
          stealthLevel: 60,
          impactLevel: 90
        }
      ];

      const hashA = computeScenarioStateHash(1, sampleNodes, sampleEdges, threats, metrics);
      const hashB = computeScenarioStateHash(1, JSON.parse(JSON.stringify(sampleNodes)), JSON.parse(JSON.stringify(sampleEdges)), JSON.parse(JSON.stringify(threats)), metrics);

      expect(hashA).toBe(hashB);
      expect(hashA).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('ScenarioSimulationEngine & Deterministic Replay', () => {
    it('steps through simulation deterministically and verifies bit-exact replay', () => {
      const scenario: SimulationScenario = {
        id: 'scen-test-01',
        tenantId: 'tenant-omega',
        worldId: 'world-01',
        name: 'APT29 Lateral Movement Sim',
        seed: 98765,
        currentTick: 0,
        maxTicks: 10,
        tickRateMs: 50,
        status: 'IDLE',
        actions: [],
        activeThreats: [
          {
            id: 'th-apt29',
            name: 'APT29 Spearphish',
            threatActor: 'APT29',
            currentNodeId: 'node-app-1',
            compromisedNodes: ['node-app-1'],
            spreadProbability: 0.8,
            stealthLevel: 80,
            impactLevel: 75,
            status: 'ACTIVE'
          }
        ],
        snapshots: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const engine = new ScenarioSimulationEngine(
        scenario,
        sampleNodes,
        sampleEdges,
        scenario.activeThreats
      );

      // Run 5 ticks
      const snapshots = engine.runToTick(5);
      expect(snapshots.length).toBe(5);
      expect(scenario.currentTick).toBe(5);
      expect(scenario.snapshots.length).toBe(6); // Tick 0 + 5 ticks

      // Mathematical bit-exact replay verification
      const replay = engine.verifyReplay();
      expect(replay.verified).toBe(true);
      expect(replay.discrepancies).toHaveLength(0);
      expect(replay.totalTicksVerified).toBe(5);
      expect(replay.finalStateHash).toBe(scenario.snapshots[5]!.stateHash);
    });

    it('enforces containment when isolation action is executed', () => {
      const scenario: SimulationScenario = {
        id: 'scen-containment-01',
        tenantId: 'tenant-omega',
        worldId: 'world-01',
        name: 'Containment Test',
        seed: 12345,
        currentTick: 0,
        maxTicks: 10,
        tickRateMs: 50,
        status: 'IDLE',
        actions: [
          {
            id: 'act-isolate-gw',
            type: 'ISOLATE_NODE',
            targetId: 'node-app-1',
            scheduledTick: 2
          },
          {
            id: 'act-sever-link',
            type: 'SEVER_EDGE',
            targetId: 'edge-app1-app2',
            scheduledTick: 2
          }
        ],
        activeThreats: [
          {
            id: 'th-ransomware',
            name: 'WannaCry Variant',
            currentNodeId: 'node-app-1',
            compromisedNodes: ['node-app-1'],
            spreadProbability: 0.9,
            stealthLevel: 50,
            impactLevel: 90,
            status: 'ACTIVE'
          }
        ],
        snapshots: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const engine = new ScenarioSimulationEngine(
        scenario,
        sampleNodes,
        sampleEdges,
        scenario.activeThreats
      );

      // Step to tick 2 (where isolation is executed) and tick 3 (where containment is evaluated)
      engine.runToTick(3);

      const latestSnapshot = scenario.snapshots[scenario.snapshots.length - 1]!;
      const isolatedNode = latestSnapshot.nodes.find((n) => n.id === 'node-app-1');
      expect(isolatedNode?.status).toBe('isolated');

      // Threat should now be marked CONTAINED because all paths from app-1 are isolated or severed
      const threat = latestSnapshot.activeThreats.find((t) => t.id === 'th-ransomware');
      expect(threat?.status).toBe('CONTAINED');
      expect(latestSnapshot.metrics.containmentAchieved).toBe(true);
    });
  });

  describe('Parallel Scenario Branching & Divergence Detection', () => {
    it('branches scenario at tick T and detects divergence between alternate decisions', () => {
      const manager = new ScenarioManager();

      // 1. Create baseline scenario (uncontained threat)
      const { scenario: parentScenario } = manager.createScenario(
        {
          tenantId: 'tenant-sec',
          worldId: 'world-01',
          name: 'Baseline Uncontained Incident',
          seed: 42,
          maxTicks: 6,
          initialThreats: [
            {
              name: 'FIN7 Lateral Spreader',
              targetNodeId: 'node-app-1',
              spreadProbability: 0.8
            }
          ]
        },
        sampleNodes,
        sampleEdges
      );

      // Step parent to tick 2
      manager.stepScenario('tenant-sec', parentScenario.id, 2);
      expect(parentScenario.currentTick).toBe(2);

      // 2. Branch scenario at Tick 2 with aggressive containment
      const { branchScenario } = manager.branchScenario('tenant-sec', parentScenario.id, 2, {
        name: 'Branch A: Immediate Network Severance',
        branchTick: 2,
        actions: [
          {
            id: 'act-branch-sever-1',
            type: 'SEVER_EDGE',
            targetId: 'edge-app1-app2',
            scheduledTick: 3
          },
          {
            id: 'act-branch-sever-2',
            type: 'SEVER_EDGE',
            targetId: 'edge-app1-db',
            scheduledTick: 3
          },
          {
            id: 'act-branch-isolate',
            type: 'ISOLATE_NODE',
            targetId: 'node-app-1',
            scheduledTick: 3
          }
        ]
      });

      expect(branchScenario.parentId).toBe(parentScenario.id);
      expect(branchScenario.branchTick).toBe(2);

      // Run both to tick 5
      manager.stepScenario('tenant-sec', parentScenario.id, 3);
      manager.stepScenario('tenant-sec', branchScenario.id, 3);

      expect(parentScenario.currentTick).toBe(5);
      expect(branchScenario.currentTick).toBe(5);

      // 3. Detect Divergence
      const divergence = manager.compareScenarios('tenant-sec', parentScenario.id, branchScenario.id);
      expect(divergence.diverged).toBe(true);
      expect(divergence.divergenceTick).toBeGreaterThanOrEqual(2);
      expect(divergence.timelineComparison.length).toBeGreaterThan(3);

      // Branch should achieve containment, whereas uncontained baseline may have more compromised nodes
      expect(divergence.containmentDelta.branchAchieved).toBe(true);
    });
  });
});
