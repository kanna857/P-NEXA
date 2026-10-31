import {
  ScenarioSimulationEngine,
  SimulationAction,
  SimulationScenario
} from '@nexus/simulation-engine';
import { TwinEdge, TwinNode } from '@nexus/twin-graph';
import {
  ABComparisonResult,
  BenchmarkCase,
  BenchmarkRunResult,
  BenchmarkSuiteResult,
  DefensePolicy
} from './types.js';

export function createStandardBenchmarkSuite(): BenchmarkCase[] {
  // ── Benchmark Case 1: Ransomware Rapid Lateral Outbreak ─────────────────
  const nodesCase1: TwinNode[] = [
    {
      id: 'gw-1',
      name: 'Perimeter Gateway',
      type: 'firewall',
      tier: 0,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: {}
    },
    {
      id: 'app-alpha',
      name: 'Core Application Service',
      type: 'server',
      tier: 2,
      status: 'healthy',
      position: { x: 10, y: 0, z: 0 },
      metadata: { vulnerabilities: ['CVE-2024-38077'] }
    },
    {
      id: 'app-beta',
      name: 'Microservice Beta',
      type: 'server',
      tier: 2,
      status: 'healthy',
      position: { x: 10, y: 10, z: 0 },
      metadata: {}
    },
    {
      id: 'db-master',
      name: 'Master SQL Database',
      type: 'database',
      tier: 3,
      status: 'healthy',
      position: { x: 20, y: 5, z: 0 },
      metadata: {}
    }
  ];

  const edgesCase1: TwinEdge[] = [
    {
      id: 'e-gw-alpha',
      source: 'gw-1',
      target: 'app-alpha',
      protocol: 'TLS',
      trafficRateKbps: 1000,
      isEncrypted: true,
      status: 'normal'
    },
    {
      id: 'e-alpha-beta',
      source: 'app-alpha',
      target: 'app-beta',
      protocol: 'TCP',
      trafficRateKbps: 800,
      isEncrypted: false,
      status: 'normal'
    },
    {
      id: 'e-alpha-db',
      source: 'app-alpha',
      target: 'db-master',
      protocol: 'GRPC',
      trafficRateKbps: 400,
      isEncrypted: true,
      status: 'normal'
    }
  ];

  const case1: BenchmarkCase = {
    id: 'bench-case-ransomware-outbreak',
    name: 'Rapid Ransomware Lateral Outbreak',
    description: 'Adversary compromises app-alpha and attempts rapid lateral spread to database and peers.',
    worldNodes: nodesCase1,
    worldEdges: edgesCase1,
    threats: [
      {
        name: 'LockBit Lateral Vector',
        targetNodeId: 'app-alpha',
        spreadProbability: 0.85,
        threatActor: 'FIN7'
      }
    ],
    seed: 54321,
    maxTicks: 8,
    targetMetrics: {
      minContainmentRate: 1.0,
      minResilience: 70,
      maxMTTC: 4
    }
  };

  // ── Benchmark Case 2: Multi-Hop Ingress Exfiltration ───────────────────
  const nodesCase2: TwinNode[] = [
    {
      id: 'ingress-lb',
      name: 'Ingress Load Balancer',
      type: 'load_balancer',
      tier: 1,
      status: 'healthy',
      position: { x: 0, y: 0, z: 0 },
      metadata: {}
    },
    {
      id: 'api-srv',
      name: 'API Gateway Host',
      type: 'server',
      tier: 2,
      status: 'healthy',
      position: { x: 10, y: 0, z: 0 },
      metadata: { vulnerabilities: ['CVE-2024-21413'] }
    },
    {
      id: 'auth-vault',
      name: 'Auth Token Vault',
      type: 'database',
      tier: 3,
      status: 'healthy',
      position: { x: 20, y: 0, z: 0 },
      metadata: {}
    }
  ];

  const edgesCase2: TwinEdge[] = [
    {
      id: 'e-lb-api',
      source: 'ingress-lb',
      target: 'api-srv',
      protocol: 'TLS',
      trafficRateKbps: 1500,
      isEncrypted: true,
      status: 'normal'
    },
    {
      id: 'e-api-vault',
      source: 'api-srv',
      target: 'auth-vault',
      protocol: 'INTERNAL_BUS',
      trafficRateKbps: 600,
      isEncrypted: true,
      status: 'normal'
    }
  ];

  const case2: BenchmarkCase = {
    id: 'bench-case-ingress-exfil',
    name: 'Multi-Hop Ingress Exfiltration Vector',
    description: 'External adversary vector traversing load balancer to extract token secrets.',
    worldNodes: nodesCase2,
    worldEdges: edgesCase2,
    threats: [
      {
        name: 'APT29 Spearphish Pivot',
        targetNodeId: 'ingress-lb',
        spreadProbability: 0.75,
        threatActor: 'APT29'
      }
    ],
    seed: 133742,
    maxTicks: 6,
    targetMetrics: {
      minContainmentRate: 1.0,
      minResilience: 75,
      maxMTTC: 3
    }
  };

  return [case1, case2];
}

/**
 * Translates declarative policy parameters into concrete simulation actions.
 * Zero arbitrary code execution: purely deterministic declarative transformation.
 */
export function deriveActionsFromPolicy(
  policy: DefensePolicy,
  bCase: BenchmarkCase
): SimulationAction[] {
  const actions: SimulationAction[] = [];
  const { isolationStrategy, maxAutonomousSeverances } = policy.parameters;

  for (let idx = 0; idx < bCase.threats.length; idx++) {
    const threat = bCase.threats[idx]!;

    if (isolationStrategy === 'AGGRESSIVE_ISOLATE') {
      actions.push({
        id: `act-bench-iso-${idx}`,
        type: 'ISOLATE_NODE',
        targetId: threat.targetNodeId,
        scheduledTick: 1,
        createdBy: `policy:${policy.id}`
      });
    } else if (isolationStrategy === 'SELECTIVE_SEVER') {
      // Find connected outgoing edges
      const connectedEdges = bCase.worldEdges.filter(
        (e) => e.source === threat.targetNodeId || e.target === threat.targetNodeId
      );
      const severLimit = Math.min(connectedEdges.length, maxAutonomousSeverances);
      for (let sIdx = 0; sIdx < severLimit; sIdx++) {
        actions.push({
          id: `act-bench-sev-${idx}-${sIdx}`,
          type: 'SEVER_EDGE',
          targetId: connectedEdges[sIdx]!.id,
          scheduledTick: 1,
          createdBy: `policy:${policy.id}`
        });
      }
    } else if (isolationStrategy === 'OBSERVE_AND_REPORT') {
      // Passive observe strategy: no automated actions scheduled on Tick 1
    }
  }

  return actions;
}

/**
 * Runs a candidate defense policy against an individual benchmark case.
 */
export function runBenchmarkCase(
  policy: DefensePolicy,
  bCase: BenchmarkCase
): BenchmarkRunResult {
  const derivedActions = deriveActionsFromPolicy(policy, bCase);

  const scenario: SimulationScenario = {
    id: `sim-bench-${bCase.id}-${Date.now()}`,
    tenantId: policy.tenantId,
    worldId: `world-bench-${bCase.id}`,
    name: `Benchmark Run: ${bCase.name}`,
    seed: bCase.seed,
    currentTick: 0,
    maxTicks: bCase.maxTicks,
    tickRateMs: 50,
    status: 'IDLE',
    actions: derivedActions,
    activeThreats: bCase.threats.map((t, idx) => ({
      id: `threat-bench-${idx}`,
      name: t.name,
      threatActor: t.threatActor || 'APT-SIM',
      currentNodeId: t.targetNodeId,
      compromisedNodes: [t.targetNodeId],
      spreadProbability: t.spreadProbability,
      stealthLevel: 70,
      impactLevel: 80,
      status: 'ACTIVE'
    })),
    snapshots: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const initialNodes = bCase.worldNodes.map((n) => {
    const isTarget = bCase.threats.some((t) => t.targetNodeId === n.id);
    return isTarget ? { ...n, status: 'compromised' as const } : { ...n };
  });

  const engine = new ScenarioSimulationEngine(
    scenario,
    initialNodes,
    bCase.worldEdges,
    scenario.activeThreats
  );

  engine.runUntilComplete(bCase.maxTicks);

  const finalSnapshot = scenario.snapshots[scenario.snapshots.length - 1]!;
  const containmentSnap = scenario.snapshots.find(
    (s) => s.metrics.containmentAchieved
  );
  const containmentAchieved = !!containmentSnap;
  const ticksToContainment = containmentSnap ? containmentSnap.tick : bCase.maxTicks;

  const passed =
    containmentAchieved &&
    finalSnapshot.metrics.systemResilienceScore >= bCase.targetMetrics.minResilience &&
    ticksToContainment <= bCase.targetMetrics.maxMTTC;

  return {
    caseId: bCase.id,
    caseName: bCase.name,
    passed,
    containmentAchieved,
    ticksToContainment,
    finalResilienceScore: finalSnapshot.metrics.systemResilienceScore,
    compromisedNodesCount: finalSnapshot.metrics.compromisedNodesCount,
    isolatedNodesCount: finalSnapshot.metrics.isolatedNodesCount,
    severedEdgesCount: finalSnapshot.metrics.severedEdgesCount
  };
}

/**
 * Runs a policy across the complete benchmark test suite, computing composite scores.
 */
export function runBenchmarkSuite(
  policy: DefensePolicy,
  suite = createStandardBenchmarkSuite()
): BenchmarkSuiteResult {
  const results: BenchmarkRunResult[] = [];
  let totalContainment = 0;
  let totalMTTC = 0;
  let totalResilience = 0;
  let passedCount = 0;

  for (const bCase of suite) {
    const res = runBenchmarkCase(policy, bCase);
    results.push(res);

    if (res.passed) passedCount++;
    if (res.containmentAchieved) totalContainment++;
    totalMTTC += res.ticksToContainment;
    totalResilience += res.finalResilienceScore;
  }

  const count = suite.length;
  const meanContainmentRate = count > 0 ? totalContainment / count : 0;
  const meanMTTC = count > 0 ? Number((totalMTTC / count).toFixed(1)) : 10;
  const meanResilienceScore = count > 0 ? Math.round(totalResilience / count) : 0;

  // Composite Score (0 to 100)
  const compositeScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        meanContainmentRate * 40 +
          meanResilienceScore * 0.4 +
          Math.max(0, 10 - meanMTTC) * 2
      )
    )
  );

  const passedAll = passedCount === count;
  const isEligibleForPromotion = passedAll && compositeScore >= 75;

  return {
    policyId: policy.id,
    policyVersion: policy.version,
    totalCases: count,
    passedCases: passedCount,
    passedAll,
    meanContainmentRate,
    meanMTTC,
    meanResilienceScore,
    compositeScore,
    isEligibleForPromotion,
    results,
    evaluatedAt: new Date().toISOString()
  };
}

/**
 * Executes an A/B benchmark evaluation comparing an active policy against a candidate policy.
 * Quantifies regression risks and returns promotion recommendation.
 */
export function comparePoliciesAB(
  activePolicy: DefensePolicy,
  candidatePolicy: DefensePolicy,
  suite = createStandardBenchmarkSuite()
): ABComparisonResult {
  const activeBenchmark = runBenchmarkSuite(activePolicy, suite);
  const candidateBenchmark = runBenchmarkSuite(candidatePolicy, suite);

  const scoreDelta = candidateBenchmark.compositeScore - activeBenchmark.compositeScore;
  const resilienceDelta =
    candidateBenchmark.meanResilienceScore - activeBenchmark.meanResilienceScore;
  const mttcDelta = candidateBenchmark.meanMTTC - activeBenchmark.meanMTTC;

  const isRegression =
    scoreDelta < -2 ||
    resilienceDelta < -5 ||
    candidateBenchmark.meanContainmentRate < activeBenchmark.meanContainmentRate ||
    !candidateBenchmark.isEligibleForPromotion;

  let recommendation: 'PROMOTE' | 'REVISE' | 'REJECT';
  let summary = '';

  if (isRegression) {
    recommendation = 'REJECT';
    summary = `Candidate policy ${candidatePolicy.version} demonstrated performance regression (Score Δ: ${scoreDelta}, Resilience Δ: ${resilienceDelta}). Automatic promotion blocked.`;
  } else if (candidateBenchmark.isEligibleForPromotion && scoreDelta >= 0) {
    recommendation = 'PROMOTE';
    summary = `Candidate policy ${candidatePolicy.version} meets all safety benchmarks with higher or equal composite score (${candidateBenchmark.compositeScore} vs ${activeBenchmark.compositeScore}). Eligible for promotion.`;
  } else {
    recommendation = 'REVISE';
    summary = `Candidate policy ${candidatePolicy.version} passed benchmarks with composite score ${candidateBenchmark.compositeScore}, but did not demonstrate clear superiority over active baseline. Revision suggested.`;
  }

  return {
    activePolicyId: activePolicy.id,
    activeVersion: activePolicy.version,
    candidatePolicyId: candidatePolicy.id,
    candidateVersion: candidatePolicy.version,
    activeCompositeScore: activeBenchmark.compositeScore,
    candidateCompositeScore: candidateBenchmark.compositeScore,
    scoreDelta,
    resilienceDelta,
    mttcDelta,
    isRegression,
    recommendation,
    summary
  };
}

