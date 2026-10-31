import { TwinNode, TwinEdge } from '@nexus/twin-graph';
import { DeterministicPRNG } from './prng.js';
import { computeScenarioStateHash } from './state-hash.js';
import {
  ActiveThreat,
  ReplayVerificationResult,
  ScenarioMetrics,
  ScenarioSnapshot,
  SimulationEvent,
  SimulationScenario
} from './types.js';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export class ScenarioSimulationEngine {
  public scenario: SimulationScenario;
  private nodes: Map<string, TwinNode>;
  private edges: Map<string, TwinEdge>;
  private threats: Map<string, ActiveThreat>;
  private rng: DeterministicPRNG;

  // Track initial state for deterministic replay
  private initialNodes: TwinNode[];
  private initialEdges: TwinEdge[];
  private initialThreats: ActiveThreat[];

  constructor(
    scenario: SimulationScenario,
    initialNodes: TwinNode[],
    initialEdges: TwinEdge[],
    initialThreats: ActiveThreat[] = []
  ) {
    this.scenario = scenario;
    this.initialNodes = deepClone(initialNodes);
    this.initialEdges = deepClone(initialEdges);
    this.initialThreats = deepClone(initialThreats);

    this.nodes = new Map(deepClone(initialNodes).map((n) => [n.id, n]));
    this.edges = new Map(deepClone(initialEdges).map((e) => [e.id, e]));
    this.threats = new Map(deepClone(initialThreats).map((t) => [t.id, t]));
    this.rng = new DeterministicPRNG(scenario.seed);

    // If starting fresh (no snapshots yet), record Tick 0
    if (this.scenario.snapshots.length === 0) {
      this.recordTick0();
    }
  }

  private recordTick0(): ScenarioSnapshot {
    const nodeList = Array.from(this.nodes.values());
    const edgeList = Array.from(this.edges.values());
    const threatList = Array.from(this.threats.values());

    const compromisedNodesCount = nodeList.filter((n) => n.status === 'compromised').length;
    const isolatedNodesCount = nodeList.filter((n) => n.status === 'isolated').length;
    const severedEdgesCount = edgeList.filter((e) => e.status === 'severed').length;
    const activeThreatsCount = threatList.filter((t) => t.status === 'ACTIVE').length;
    const total = Math.max(1, nodeList.length);

    const systemResilienceScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            (compromisedNodesCount / total) * 60 -
            (isolatedNodesCount / total) * 20 -
            activeThreatsCount * 10
        )
      )
    );

    const metrics: ScenarioMetrics = {
      totalNodes: nodeList.length,
      compromisedNodesCount,
      isolatedNodesCount,
      severedEdgesCount,
      activeThreatsCount,
      systemResilienceScore,
      containmentAchieved: threatList.length > 0 && activeThreatsCount === 0
    };

    const initialEvents: SimulationEvent[] = [
      {
        id: `evt-0-${Date.now()}`,
        tick: 0,
        type: 'STATUS_CHANGE',
        message: `Simulation initialized with seed ${this.scenario.seed}. ${activeThreatsCount} active threat(s) detected.`,
        timestamp: Date.now()
      }
    ];

    const stateHash = computeScenarioStateHash(0, nodeList, edgeList, threatList, metrics);

    const snapshot: ScenarioSnapshot = {
      tick: 0,
      stateHash,
      nodes: deepClone(nodeList),
      edges: deepClone(edgeList),
      activeThreats: deepClone(threatList),
      metrics,
      events: initialEvents
    };

    this.scenario.snapshots.push(snapshot);
    this.scenario.activeThreats = deepClone(threatList);
    this.scenario.updatedAt = new Date().toISOString();
    return snapshot;
  }

  /**
   * Advances the simulation by exactly 1 tick deterministically.
   */
  public stepTick(): ScenarioSnapshot {
    this.scenario.currentTick += 1;
    const tick = this.scenario.currentTick;
    const events: SimulationEvent[] = [];

    // 1. Process scheduled intervention actions for this tick
    const scheduledActions = this.scenario.actions.filter((a) => a.scheduledTick === tick);
    for (const action of scheduledActions) {
      action.executedTick = tick;

      switch (action.type) {
        case 'ISOLATE_NODE': {
          const node = this.nodes.get(action.targetId);
          if (node) {
            node.status = 'isolated';
            events.push({
              id: `evt-${tick}-iso-${node.id}`,
              tick,
              type: 'ACTION_EXECUTED',
              message: `Containment action: Node ${node.id} (${node.name}) placed in quarantine isolation.`,
              timestamp: Date.now(),
              metadata: { targetId: action.targetId, actionId: action.id }
            });
          }
          break;
        }

        case 'SEVER_EDGE': {
          const edge = this.edges.get(action.targetId);
          if (edge) {
            edge.status = 'severed';
            events.push({
              id: `evt-${tick}-sev-${edge.id}`,
              tick,
              type: 'ACTION_EXECUTED',
              message: `Network action: Link ${edge.id} (${edge.source} <-> ${edge.target}) severed.`,
              timestamp: Date.now(),
              metadata: { targetId: action.targetId, actionId: action.id }
            });
          }
          break;
        }

        case 'RESTORE_NODE': {
          const node = this.nodes.get(action.targetId);
          if (node) {
            node.status = 'healthy';
            events.push({
              id: `evt-${tick}-rst-${node.id}`,
              tick,
              type: 'ACTION_EXECUTED',
              message: `Recovery action: Node ${node.id} restored to healthy state.`,
              timestamp: Date.now()
            });
          }
          break;
        }

        case 'RESTORE_EDGE': {
          const edge = this.edges.get(action.targetId);
          if (edge) {
            edge.status = 'normal';
            events.push({
              id: `evt-${tick}-rst-edge-${edge.id}`,
              tick,
              type: 'ACTION_EXECUTED',
              message: `Recovery action: Network link ${edge.id} restored to normal.`,
              timestamp: Date.now()
            });
          }
          break;
        }

        case 'APPLY_PATCH': {
          const node = this.nodes.get(action.targetId);
          if (node) {
            const vulnId = action.payload?.vulnerabilityId;
            if (node.metadata) {
              if (vulnId && node.metadata.vulnerabilities) {
                node.metadata.vulnerabilities = node.metadata.vulnerabilities.filter(
                  (v) => v !== vulnId
                );
              } else {
                node.metadata.vulnerabilities = [];
              }
            }
            events.push({
              id: `evt-${tick}-patch-${node.id}`,
              tick,
              type: 'ACTION_EXECUTED',
              message: `Remediation action: Applied security patch to node ${node.id}.`,
              timestamp: Date.now()
            });
          }
          break;
        }

        case 'THREAT_INJECT': {
          const targetNode = this.nodes.get(action.targetId);
          if (targetNode) {
            targetNode.status = 'compromised';
            const threatId = action.payload?.threatId || `threat-inj-${tick}`;
            const threatName = action.payload?.threatName || 'Injected Adversary Vector';
            const spreadProb = action.payload?.spreadProbability ?? 0.6;
            const newThreat: ActiveThreat = {
              id: threatId,
              name: threatName,
              threatActor: action.payload?.threatActor || 'APT-SIM',
              techniqueId: action.payload?.techniqueId || 'T1190',
              currentNodeId: targetNode.id,
              compromisedNodes: [targetNode.id],
              spreadProbability: spreadProb,
              stealthLevel: action.payload?.stealthLevel ?? 75,
              impactLevel: action.payload?.impactLevel ?? 80,
              status: 'ACTIVE'
            };
            this.threats.set(threatId, newThreat);
            events.push({
              id: `evt-${tick}-inj-${threatId}`,
              tick,
              type: 'NODE_COMPROMISED',
              message: `Adversary vector injected at node ${targetNode.id} (${targetNode.name}).`,
              timestamp: Date.now()
            });
          }
          break;
        }
      }
    }

    // 2. Threat progression and lateral movement
    for (const threat of this.threats.values()) {
      if (threat.status !== 'ACTIVE') continue;

      // Check all non-isolated compromised nodes for candidate lateral paths
      const activeCompromisedNodes = threat.compromisedNodes.filter((nodeId) => {
        const n = this.nodes.get(nodeId);
        return n && n.status !== 'isolated' && n.status !== 'offline';
      });

      // Find all unsevered outgoing edges to uncompromised, unisolated candidate targets
      const candidates: Array<{ targetNode: TwinNode; edge: TwinEdge }> = [];

      for (const sourceId of activeCompromisedNodes) {
        for (const edge of this.edges.values()) {
          if (edge.status === 'severed') continue;

          let targetId: string | null = null;
          if (edge.source === sourceId) targetId = edge.target;
          else if (edge.target === sourceId) targetId = edge.source;

          if (targetId && !threat.compromisedNodes.includes(targetId)) {
            const targetNode = this.nodes.get(targetId);
            if (
              targetNode &&
              targetNode.status !== 'isolated' &&
              targetNode.status !== 'offline'
            ) {
              // Ensure no duplicate candidates
              if (!candidates.some((c) => c.targetNode.id === targetNode.id)) {
                candidates.push({ targetNode, edge });
              }
            }
          }
        }
      }

      if (candidates.length === 0) {
        // Threat has zero reachable uncontained paths.
        // Check if containment was achieved via isolation or severed edges.
        const hasRemediation =
          activeCompromisedNodes.length === 0 ||
          this.nodes.get(threat.currentNodeId)?.status === 'isolated' ||
          Array.from(this.edges.values()).some((e) => e.status === 'severed');

        if (hasRemediation) {
          threat.status = 'CONTAINED';
          events.push({
            id: `evt-${tick}-cont-${threat.id}`,
            tick,
            type: 'THREAT_BLOCKED',
            message: `Threat ${threat.name} (${threat.id}) is contained: no traversable network paths remain.`,
            timestamp: Date.now()
          });
        }
        continue;
      }

      // Sort candidate targets deterministically by ID before using PRNG
      candidates.sort((a, b) => a.targetNode.id.localeCompare(b.targetNode.id));

      for (const candidate of candidates) {
        let prob = threat.spreadProbability;
        // Vulnerable systems have higher chance of compromise
        if ((candidate.targetNode.metadata?.vulnerabilities?.length ?? 0) > 0) {
          prob += 0.2;
        }
        // Encrypted links impede lateral movement
        if (candidate.edge.isEncrypted) {
          prob -= 0.15;
        }
        // Clamp probability into [0.05, 0.95]
        prob = Math.max(0.05, Math.min(0.95, prob));

        const roll = this.rng.next();
        if (roll < prob) {
          // Successful lateral movement
          candidate.targetNode.status = 'compromised';
          threat.compromisedNodes.push(candidate.targetNode.id);
          threat.currentNodeId = candidate.targetNode.id;

          events.push({
            id: `evt-${tick}-spread-${threat.id}-${candidate.targetNode.id}`,
            tick,
            type: 'THREAT_SPREAD',
            message: `Lateral movement succeeded: ${threat.name} expanded to ${candidate.targetNode.name} (${candidate.targetNode.id}) over link ${candidate.edge.id}.`,
            timestamp: Date.now(),
            metadata: {
              threatId: threat.id,
              targetNodeId: candidate.targetNode.id,
              edgeId: candidate.edge.id
            }
          });
          // One lateral compromise per threat per tick
          break;
        } else {
          events.push({
            id: `evt-${tick}-block-${threat.id}-${candidate.targetNode.id}`,
            tick,
            type: 'THREAT_BLOCKED',
            message: `Lateral movement attempt by ${threat.name} against ${candidate.targetNode.id} was resisted.`,
            timestamp: Date.now()
          });
        }
      }
    }

    // 3. Compute Metrics
    const nodeList = Array.from(this.nodes.values());
    const edgeList = Array.from(this.edges.values());
    const threatList = Array.from(this.threats.values());

    const compromisedNodesCount = nodeList.filter((n) => n.status === 'compromised').length;
    const isolatedNodesCount = nodeList.filter((n) => n.status === 'isolated').length;
    const severedEdgesCount = edgeList.filter((e) => e.status === 'severed').length;
    const activeThreatsCount = threatList.filter((t) => t.status === 'ACTIVE').length;
    const containmentAchieved = threatList.length > 0 && activeThreatsCount === 0;

    if (containmentAchieved) {
      events.push({
        id: `evt-${tick}-achieved`,
        tick,
        type: 'CONTAINMENT_ACHIEVED',
        message: 'Threat containment fully achieved across all vectors.',
        timestamp: Date.now()
      });
    }

    const total = Math.max(1, nodeList.length);
    const systemResilienceScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            (compromisedNodesCount / total) * 60 -
            (isolatedNodesCount / total) * 20 -
            activeThreatsCount * 10
        )
      )
    );

    const metrics: ScenarioMetrics = {
      totalNodes: nodeList.length,
      compromisedNodesCount,
      isolatedNodesCount,
      severedEdgesCount,
      activeThreatsCount,
      systemResilienceScore,
      containmentAchieved
    };

    // 4. Compute State Hash
    const stateHash = computeScenarioStateHash(tick, nodeList, edgeList, threatList, metrics);

    // 5. Store Snapshot
    const snapshot: ScenarioSnapshot = {
      tick,
      stateHash,
      nodes: deepClone(nodeList),
      edges: deepClone(edgeList),
      activeThreats: deepClone(threatList),
      metrics,
      events
    };

    this.scenario.snapshots.push(snapshot);
    this.scenario.activeThreats = deepClone(threatList);

    // Check completion condition
    if (this.scenario.currentTick >= this.scenario.maxTicks) {
      this.scenario.status = 'COMPLETED';
    }

    this.scenario.updatedAt = new Date().toISOString();
    return snapshot;
  }

  /**
   * Runs the simulation forward up to targetTick.
   */
  public runToTick(targetTick: number): ScenarioSnapshot[] {
    const newSnapshots: ScenarioSnapshot[] = [];
    while (
      this.scenario.currentTick < targetTick &&
      this.scenario.currentTick < this.scenario.maxTicks
    ) {
      newSnapshots.push(this.stepTick());
    }
    return newSnapshots;
  }

  /**
   * Runs simulation to completion or up to limit.
   */
  public runUntilComplete(maxTicksLimit = 50): ScenarioSnapshot[] {
    const limit = Math.min(this.scenario.maxTicks, maxTicksLimit);
    return this.runToTick(limit);
  }

  /**
   * Performs an exact deterministic replay from Tick 0 to currentTick
   * and verifies that all SHA-256 state hashes match bit-for-bit.
   */
  public verifyReplay(): ReplayVerificationResult {
    // Clone original scenario config
    const replayScenario: SimulationScenario = {
      ...deepClone(this.scenario),
      currentTick: 0,
      status: 'IDLE',
      snapshots: []
    };

    const replayEngine = new ScenarioSimulationEngine(
      replayScenario,
      this.initialNodes,
      this.initialEdges,
      this.initialThreats
    );

    const discrepancies: Array<{ tick: number; expectedHash: string; actualHash: string }> = [];

    // Compare Tick 0
    const expected0 = this.scenario.snapshots[0];
    const actual0 = replayScenario.snapshots[0];
    if (expected0 && actual0 && expected0.stateHash !== actual0.stateHash) {
      discrepancies.push({
        tick: 0,
        expectedHash: expected0.stateHash,
        actualHash: actual0.stateHash
      });
    }

    // Step through and compare every subsequent snapshot
    for (let t = 1; t <= this.scenario.currentTick; t++) {
      const actualSnapshot = replayEngine.stepTick();
      const expectedSnapshot = this.scenario.snapshots[t];

      if (!expectedSnapshot || expectedSnapshot.stateHash !== actualSnapshot.stateHash) {
        discrepancies.push({
          tick: t,
          expectedHash: expectedSnapshot?.stateHash || 'MISSING',
          actualHash: actualSnapshot.stateHash
        });
      }
    }

    const lastSnapshot = this.scenario.snapshots[this.scenario.currentTick];

    return {
      verified: discrepancies.length === 0,
      scenarioId: this.scenario.id,
      totalTicksVerified: this.scenario.currentTick,
      finalStateHash: lastSnapshot ? lastSnapshot.stateHash : '',
      discrepancies
    };
  }

  /**
   * Exports the state at a specific tick for branching or scrubbing.
   */
  public getSnapshotAtTick(tick: number): ScenarioSnapshot | undefined {
    return this.scenario.snapshots.find((s) => s.tick === tick);
  }
}
