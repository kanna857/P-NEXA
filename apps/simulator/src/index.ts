import { rootLogger } from '@nexus/observability';
import {
  ScenarioManager,
  SimulationAction
} from '@nexus/simulation-engine';
import { TwinEdge, TwinNode } from '@nexus/twin-graph';

const logger = rootLogger.child({ component: 'SimulatorService' });

export interface MonteCarloBatchParams {
  tenantId: string;
  worldId: string;
  iterations: number;
  baseSeed: number;
  maxTicks?: number;
  worldNodes: TwinNode[];
  worldEdges: TwinEdge[];
  initialThreats: Array<{
    name: string;
    targetNodeId: string;
    spreadProbability?: number;
    threatActor?: string;
  }>;
  interventions?: SimulationAction[];
}

export interface MonteCarloBatchResult {
  totalRuns: number;
  containmentRate: number; // 0 to 1
  meanTicksToContainment: number;
  meanResilienceScore: number;
  meanCompromisedNodes: number;
  runs: Array<{
    seed: number;
    containmentAchieved: boolean;
    ticksToContainment?: number;
    finalResilience: number;
    finalCompromised: number;
  }>;
}

export interface StrategyEvaluationParams {
  tenantId: string;
  worldId: string;
  branchTick: number;
  maxTicks?: number;
  worldNodes: TwinNode[];
  worldEdges: TwinEdge[];
  seed: number;
  initialThreats: Array<{
    name: string;
    targetNodeId: string;
    spreadProbability?: number;
  }>;
  strategies: Array<{
    name: string;
    actions: SimulationAction[];
  }>;
}

export interface StrategyRankEntry {
  name: string;
  branchScenarioId: string;
  compromisedCount: number;
  resilienceScore: number;
  containmentAchieved: boolean;
  resilienceDelta: number;
  blastRadiusReduction: number;
}

export interface StrategyEvaluationResult {
  baselineScenarioId: string;
  baseline: {
    compromisedCount: number;
    resilienceScore: number;
    containmentAchieved: boolean;
  };
  rankedStrategies: StrategyRankEntry[];
}

export class SimulatorService {
  private scenarioManager: ScenarioManager;

  constructor(manager?: ScenarioManager) {
    this.scenarioManager = manager || new ScenarioManager();
  }

  /**
   * Runs a deterministic Monte Carlo simulation batch across N seeds to compute
   * statistical resilience, time-to-containment, and blast radius probability distributions.
   */
  public async runMonteCarloBatch(
    params: MonteCarloBatchParams
  ): Promise<MonteCarloBatchResult> {
    const {
      tenantId,
      worldId,
      iterations,
      baseSeed,
      maxTicks = 15,
      worldNodes,
      worldEdges,
      initialThreats,
      interventions = []
    } = params;

    logger.info('Starting Monte Carlo simulation batch', {
      tenantId,
      worldId,
      iterations,
      baseSeed
    });

    const runs: MonteCarloBatchResult['runs'] = [];
    let containmentCount = 0;
    let totalTicksToContainment = 0;
    let totalResilience = 0;
    let totalCompromised = 0;

    for (let i = 0; i < iterations; i++) {
      const seed = baseSeed + i * 7919; // Prime step
      const { scenario, engine } = this.scenarioManager.createScenario(
        {
          tenantId,
          worldId,
          name: `Monte Carlo Run #${i + 1}`,
          seed,
          maxTicks,
          initialThreats,
          initialActions: interventions
        },
        worldNodes,
        worldEdges
      );

      // Run to completion or max ticks
      engine.runUntilComplete(maxTicks);

      const finalSnapshot = scenario.snapshots[scenario.snapshots.length - 1]!;
      const containmentAchieved = finalSnapshot.metrics.containmentAchieved;
      const containmentSnap = scenario.snapshots.find(
        (s) => s.metrics.containmentAchieved
      );

      if (containmentAchieved) {
        containmentCount++;
        totalTicksToContainment += containmentSnap ? containmentSnap.tick : maxTicks;
      }

      totalResilience += finalSnapshot.metrics.systemResilienceScore;
      totalCompromised += finalSnapshot.metrics.compromisedNodesCount;

      runs.push({
        seed,
        containmentAchieved,
        ticksToContainment: containmentSnap?.tick,
        finalResilience: finalSnapshot.metrics.systemResilienceScore,
        finalCompromised: finalSnapshot.metrics.compromisedNodesCount
      });
    }

    const containmentRate = iterations > 0 ? containmentCount / iterations : 0;
    const meanTicksToContainment =
      containmentCount > 0 ? totalTicksToContainment / containmentCount : maxTicks;
    const meanResilienceScore =
      iterations > 0 ? Math.round(totalResilience / iterations) : 0;
    const meanCompromisedNodes =
      iterations > 0 ? Number((totalCompromised / iterations).toFixed(2)) : 0;

    logger.info('Monte Carlo batch completed', {
      totalRuns: iterations,
      containmentRate,
      meanResilienceScore,
      meanCompromisedNodes
    });

    return {
      totalRuns: iterations,
      containmentRate,
      meanTicksToContainment,
      meanResilienceScore,
      meanCompromisedNodes,
      runs
    };
  }

  /**
   * Evaluates multiple candidate containment strategies in parallel counterfactual branches
   * diverging at branchTick, ranking them by resilience preservation and blast radius reduction.
   */
  public async evaluateStrategies(
    params: StrategyEvaluationParams
  ): Promise<StrategyEvaluationResult> {
    const {
      tenantId,
      worldId,
      branchTick,
      maxTicks = 10,
      worldNodes,
      worldEdges,
      seed,
      initialThreats,
      strategies
    } = params;

    // 1. Run baseline scenario up to maxTicks (no intervention)
    const { scenario: baselineScenario, engine: baselineEngine } =
      this.scenarioManager.createScenario(
        {
          tenantId,
          worldId,
          name: 'Baseline Evaluation Run (No Interventions)',
          seed,
          maxTicks,
          initialThreats
        },
        worldNodes,
        worldEdges
      );

    baselineEngine.runUntilComplete(maxTicks);
    const baselineFinal =
      baselineScenario.snapshots[baselineScenario.snapshots.length - 1]!;

    const rankedStrategies: StrategyRankEntry[] = [];

    // 2. Evaluate each strategy as a branch at branchTick
    for (const strat of strategies) {
      const { branchScenario, branchEngine } = this.scenarioManager.branchScenario(
        tenantId,
        baselineScenario.id,
        branchTick,
        {
          name: `Evaluation Branch: ${strat.name}`,
          branchTick,
          actions: strat.actions
        }
      );

      // Run branch forward to maxTicks
      branchEngine.runUntilComplete(maxTicks);
      const branchFinal =
        branchScenario.snapshots[branchScenario.snapshots.length - 1]!;

      const resilienceDelta =
        branchFinal.metrics.systemResilienceScore -
        baselineFinal.metrics.systemResilienceScore;
      const blastRadiusReduction =
        baselineFinal.metrics.compromisedNodesCount -
        branchFinal.metrics.compromisedNodesCount;

      rankedStrategies.push({
        name: strat.name,
        branchScenarioId: branchScenario.id,
        compromisedCount: branchFinal.metrics.compromisedNodesCount,
        resilienceScore: branchFinal.metrics.systemResilienceScore,
        containmentAchieved: branchFinal.metrics.containmentAchieved,
        resilienceDelta,
        blastRadiusReduction
      });
    }

    // Sort strategies: highest resilience score first, then lowest compromised count
    rankedStrategies.sort((a, b) => {
      if (b.resilienceScore !== a.resilienceScore) {
        return b.resilienceScore - a.resilienceScore;
      }
      return a.compromisedCount - b.compromisedCount;
    });

    return {
      baselineScenarioId: baselineScenario.id,
      baseline: {
        compromisedCount: baselineFinal.metrics.compromisedNodesCount,
        resilienceScore: baselineFinal.metrics.systemResilienceScore,
        containmentAchieved: baselineFinal.metrics.containmentAchieved
      },
      rankedStrategies
    };
  }

  public getScenarioManager(): ScenarioManager {
    return this.scenarioManager;
  }
}

// Standalone runner bootstrap
async function startSimulator() {
  logger.info('NEXUS OMEGA X Deterministic Simulation Service online and ready');
}

if (process.argv[1]?.endsWith('src/index.ts') || process.argv[1]?.endsWith('dist/index.js')) {
  startSimulator().catch((err) => {
    logger.fatal('Simulator crashed during bootstrap', err);
    process.exit(1);
  });
}
