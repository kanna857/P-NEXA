import { ScenarioSimulationEngine } from './scenario-engine.js';
import {
  BranchScenarioParams,
  DivergenceResult,
  SimulationAction,
  SimulationScenario,
  TimelineTickComparison
} from './types.js';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Creates a counterfactual branch from a parent scenario at an exact tick.
 * The branch inherits full historical trajectory up to branchTick, then diverges
 * based on alternate interventions or actions.
 */
export function createScenarioBranch(
  parentScenario: SimulationScenario,
  initialNodes: any[],
  initialEdges: any[],
  initialThreats: any[],
  branchTick: number,
  params?: BranchScenarioParams
): { branchScenario: SimulationScenario; branchEngine: ScenarioSimulationEngine } {
  if (branchTick > parentScenario.currentTick) {
    throw new Error(
      `Cannot branch at tick ${branchTick} because parent scenario is only at tick ${parentScenario.currentTick}`
    );
  }

  const snapshotAtTick = parentScenario.snapshots.find((s) => s.tick === branchTick);
  if (!snapshotAtTick) {
    throw new Error(`Snapshot for tick ${branchTick} not found in parent scenario`);
  }

  const branchId = `scen-branch-${Math.random().toString(36).substring(2, 9)}`;
  const branchName =
    params?.name || `${parentScenario.name} (Counterfactual Branch @ T${branchTick})`;
  const branchDesc =
    params?.description ||
    `Branch diverged from ${parentScenario.id} at tick ${branchTick} to evaluate alternate containment strategy.`;

  // Inherit actions scheduled up to branchTick, plus new counterfactual actions
  const inheritedActions = parentScenario.actions.filter((a) => a.scheduledTick <= branchTick);
  const newActions = params?.actions || [];
  const mergedActions: SimulationAction[] = [
    ...deepClone(inheritedActions),
    ...deepClone(newActions)
  ];

  const branchScenario: SimulationScenario = {
    id: branchId,
    tenantId: parentScenario.tenantId,
    worldId: parentScenario.worldId,
    name: branchName,
    description: branchDesc,
    seed: parentScenario.seed,
    currentTick: 0,
    maxTicks: parentScenario.maxTicks,
    tickRateMs: parentScenario.tickRateMs,
    status: 'IDLE',
    parentId: parentScenario.id,
    branchTick,
    actions: mergedActions,
    activeThreats: deepClone(snapshotAtTick.activeThreats),
    snapshots: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Instantiate branch engine from initial state, and fast-forward to branchTick
  // This guarantees bit-exact internal PRNG alignment with the parent up to branchTick
  const branchEngine = new ScenarioSimulationEngine(
    branchScenario,
    initialNodes,
    initialEdges,
    initialThreats
  );

  // Fast forward branch engine to branchTick
  for (let t = 1; t <= branchTick; t++) {
    branchEngine.stepTick();
  }

  return { branchScenario, branchEngine };
}

/**
 * Compares two scenario trajectories tick-by-tick and identifies the exact tick
 * where state diverged, quantifying blast-radius and resilience deltas.
 */
export function detectScenarioDivergence(
  scenarioA: SimulationScenario,
  scenarioB: SimulationScenario
): DivergenceResult {
  const maxTick = Math.max(scenarioA.currentTick, scenarioB.currentTick);
  let divergenceTick: number | undefined = undefined;
  const timelineComparison: TimelineTickComparison[] = [];

  for (let t = 0; t <= maxTick; t++) {
    const snapA = scenarioA.snapshots.find((s) => s.tick === t);
    const snapB = scenarioB.snapshots.find((s) => s.tick === t);

    const hashA = snapA ? snapA.stateHash : 'NONE';
    const hashB = snapB ? snapB.stateHash : 'NONE';
    const matched = hashA === hashB;

    if (!matched && divergenceTick === undefined) {
      divergenceTick = t;
    }

    const eventsA = snapA?.events.map((e) => e.message) || [];
    const eventsB = snapB?.events.map((e) => e.message) || [];
    const deltaEvents = [
      ...eventsB.filter((e) => !eventsA.includes(e)).map((m) => `[Branch B] ${m}`),
      ...eventsA.filter((e) => !eventsB.includes(e)).map((m) => `[Branch A] ${m}`)
    ];

    timelineComparison.push({
      tick: t,
      parentHash: hashA,
      branchHash: hashB,
      matched,
      deltaEvents
    });
  }

  const finalSnapA = scenarioA.snapshots[scenarioA.snapshots.length - 1];
  const finalSnapB = scenarioB.snapshots[scenarioB.snapshots.length - 1];

  const blastRadiusDelta =
    (finalSnapB?.metrics.compromisedNodesCount ?? 0) -
    (finalSnapA?.metrics.compromisedNodesCount ?? 0);

  const resilienceDelta =
    (finalSnapB?.metrics.systemResilienceScore ?? 0) -
    (finalSnapA?.metrics.systemResilienceScore ?? 0);

  const parentContainmentSnapshot = scenarioA.snapshots.find(
    (s) => s.metrics.containmentAchieved
  );
  const branchContainmentSnapshot = scenarioB.snapshots.find(
    (s) => s.metrics.containmentAchieved
  );

  return {
    diverged: divergenceTick !== undefined,
    divergenceTick,
    parentScenarioId: scenarioA.id,
    branchScenarioId: scenarioB.id,
    blastRadiusDelta,
    resilienceDelta,
    containmentDelta: {
      parentAchieved: !!parentContainmentSnapshot,
      branchAchieved: !!branchContainmentSnapshot,
      parentTick: parentContainmentSnapshot?.tick,
      branchTick: branchContainmentSnapshot?.tick
    },
    timelineComparison
  };
}
