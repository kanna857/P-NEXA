import { TwinNode, TwinEdge } from '@nexus/twin-graph';
import { createScenarioBranch, detectScenarioDivergence } from './branching.js';
import { ScenarioSimulationEngine } from './scenario-engine.js';
import {
  ActiveThreat,
  BranchScenarioParams,
  CreateScenarioParams,
  DivergenceResult,
  ReplayVerificationResult,
  ScenarioSnapshot,
  SimulationAction,
  SimulationScenario
} from './types.js';

interface ScenarioContext {
  scenario: SimulationScenario;
  engine: ScenarioSimulationEngine;
  initialNodes: TwinNode[];
  initialEdges: TwinEdge[];
  initialThreats: ActiveThreat[];
}

export class ScenarioManager {
  private scenarios = new Map<string, ScenarioContext>();

  /**
   * Initializes and creates a new deterministic simulation scenario.
   */
  public createScenario(
    params: CreateScenarioParams,
    worldNodes: TwinNode[],
    worldEdges: TwinEdge[]
  ): { scenario: SimulationScenario; engine: ScenarioSimulationEngine } {
    const id = `scen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const seed = params.seed ?? Math.floor(Math.random() * 1000000);

    const initialThreats: ActiveThreat[] = (params.initialThreats || []).map((t, idx) => ({
      id: `threat-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
      name: t.name,
      threatActor: t.threatActor || 'APT-SIM',
      techniqueId: t.techniqueId || 'T1021',
      currentNodeId: t.targetNodeId,
      compromisedNodes: [t.targetNodeId],
      spreadProbability: t.spreadProbability ?? 0.6,
      stealthLevel: 70,
      impactLevel: 80,
      status: 'ACTIVE'
    }));

    // Mark initial target nodes as compromised
    const initialNodes = worldNodes.map((n) => {
      const isTarget = initialThreats.some((t) => t.currentNodeId === n.id);
      return isTarget ? { ...n, status: 'compromised' as const } : { ...n };
    });

    const scenario: SimulationScenario = {
      id,
      tenantId: params.tenantId,
      worldId: params.worldId,
      name: params.name,
      description: params.description,
      seed,
      currentTick: 0,
      maxTicks: params.maxTicks ?? 20,
      tickRateMs: params.tickRateMs ?? 1000,
      status: 'IDLE',
      actions: params.initialActions || [],
      activeThreats: initialThreats,
      snapshots: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const engine = new ScenarioSimulationEngine(
      scenario,
      initialNodes,
      worldEdges,
      initialThreats
    );

    this.scenarios.set(id, {
      scenario,
      engine,
      initialNodes,
      initialEdges: worldEdges,
      initialThreats
    });

    return { scenario, engine };
  }

  /**
   * Retrieves a scenario ensuring multi-tenant isolation.
   */
  public getScenario(tenantId: string, id: string): SimulationScenario | undefined {
    const ctx = this.scenarios.get(id);
    if (!ctx || ctx.scenario.tenantId !== tenantId) return undefined;
    return ctx.scenario;
  }

  public getEngine(tenantId: string, id: string): ScenarioSimulationEngine | undefined {
    const ctx = this.scenarios.get(id);
    if (!ctx || ctx.scenario.tenantId !== tenantId) return undefined;
    return ctx.engine;
  }

  /**
   * Lists scenarios for a specific tenant and optional worldId.
   */
  public listScenarios(tenantId: string, worldId?: string): SimulationScenario[] {
    const list: SimulationScenario[] = [];
    for (const ctx of this.scenarios.values()) {
      if (ctx.scenario.tenantId === tenantId) {
        if (!worldId || ctx.scenario.worldId === worldId) {
          list.push(ctx.scenario);
        }
      }
    }
    return list;
  }

  /**
   * Advances simulation by N ticks.
   */
  public stepScenario(tenantId: string, id: string, steps = 1): ScenarioSnapshot[] {
    const ctx = this.scenarios.get(id);
    if (!ctx || ctx.scenario.tenantId !== tenantId) {
      throw new Error(`Scenario not found or access denied: ${id}`);
    }

    const snapshots: ScenarioSnapshot[] = [];
    for (let i = 0; i < steps; i++) {
      if (ctx.scenario.status === 'COMPLETED') break;
      snapshots.push(ctx.engine.stepTick());
    }
    return snapshots;
  }

  /**
   * Runs simulation forward to a target tick or completion.
   */
  public runScenario(
    tenantId: string,
    id: string,
    targetTick?: number
  ): ScenarioSnapshot[] {
    const ctx = this.scenarios.get(id);
    if (!ctx || ctx.scenario.tenantId !== tenantId) {
      throw new Error(`Scenario not found or access denied: ${id}`);
    }

    const target = targetTick ?? ctx.scenario.maxTicks;
    return ctx.engine.runToTick(target);
  }

  /**
   * Schedules or applies an action to a scenario.
   */
  public addAction(
    tenantId: string,
    id: string,
    action: Omit<SimulationAction, 'id'>
  ): SimulationAction {
    const ctx = this.scenarios.get(id);
    if (!ctx || ctx.scenario.tenantId !== tenantId) {
      throw new Error(`Scenario not found or access denied: ${id}`);
    }

    const fullAction: SimulationAction = {
      ...action,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };

    ctx.scenario.actions.push(fullAction);
    ctx.scenario.updatedAt = new Date().toISOString();
    return fullAction;
  }

  /**
   * Forks a scenario into a parallel counterfactual branch at a specific tick.
   */
  public branchScenario(
    tenantId: string,
    parentId: string,
    branchTick: number,
    params?: BranchScenarioParams
  ): { branchScenario: SimulationScenario; branchEngine: ScenarioSimulationEngine } {
    const parentCtx = this.scenarios.get(parentId);
    if (!parentCtx || parentCtx.scenario.tenantId !== tenantId) {
      throw new Error(`Parent scenario not found or access denied: ${parentId}`);
    }

    const { branchScenario, branchEngine } = createScenarioBranch(
      parentCtx.scenario,
      parentCtx.initialNodes,
      parentCtx.initialEdges,
      parentCtx.initialThreats,
      branchTick,
      params
    );

    this.scenarios.set(branchScenario.id, {
      scenario: branchScenario,
      engine: branchEngine,
      initialNodes: parentCtx.initialNodes,
      initialEdges: parentCtx.initialEdges,
      initialThreats: parentCtx.initialThreats
    });

    return { branchScenario, branchEngine };
  }

  /**
   * Replays scenario from Tick 0 and mathematically verifies SHA-256 state hashes.
   */
  public replayScenario(tenantId: string, id: string): ReplayVerificationResult {
    const ctx = this.scenarios.get(id);
    if (!ctx || ctx.scenario.tenantId !== tenantId) {
      throw new Error(`Scenario not found or access denied: ${id}`);
    }

    return ctx.engine.verifyReplay();
  }

  /**
   * Compares two scenarios and quantifies divergence.
   */
  public compareScenarios(
    tenantId: string,
    scenarioAId: string,
    scenarioBId: string
  ): DivergenceResult {
    const ctxA = this.scenarios.get(scenarioAId);
    const ctxB = this.scenarios.get(scenarioBId);

    if (!ctxA || ctxA.scenario.tenantId !== tenantId) {
      throw new Error(`Scenario A not found or access denied: ${scenarioAId}`);
    }
    if (!ctxB || ctxB.scenario.tenantId !== tenantId) {
      throw new Error(`Scenario B not found or access denied: ${scenarioBId}`);
    }

    return detectScenarioDivergence(ctxA.scenario, ctxB.scenario);
  }

  public deleteScenario(tenantId: string, id: string): boolean {
    const ctx = this.scenarios.get(id);
    if (!ctx || ctx.scenario.tenantId !== tenantId) return false;
    return this.scenarios.delete(id);
  }

  public clear(): void {
    this.scenarios.clear();
  }
}

export const defaultScenarioManager = new ScenarioManager();

