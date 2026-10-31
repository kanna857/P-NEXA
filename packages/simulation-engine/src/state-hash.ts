import { canonicalJsonStringify, computeSha256 } from '@nexus/governance';
import { TwinNode, TwinEdge } from '@nexus/twin-graph';
import { ActiveThreat, ScenarioMetrics } from './types.js';

/**
 * Computes a deterministic canonical SHA-256 state hash for a scenario snapshot.
 * Guarantees bit-exact reproducibility regardless of memory reference or property insertion order.
 */
export function computeScenarioStateHash(
  tick: number,
  nodes: TwinNode[],
  edges: TwinEdge[],
  threats: ActiveThreat[],
  metrics: ScenarioMetrics
): string {
  // 1. Sort and canonicalize nodes
  const sortedNodes = [...nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => ({
      id: n.id,
      status: n.status,
      tier: n.tier,
      type: n.type,
      vulnerabilities: [...(n.metadata?.vulnerabilities || [])].sort()
    }));

  // 2. Sort and canonicalize edges
  const sortedEdges = [...edges]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      status: e.status
    }));

  // 3. Sort and canonicalize threats
  const sortedThreats = [...threats]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      currentNodeId: t.currentNodeId,
      compromisedNodes: [...t.compromisedNodes].sort()
    }));

  // 4. Canonical metrics object
  const canonicalMetrics = {
    totalNodes: metrics.totalNodes,
    compromisedNodesCount: metrics.compromisedNodesCount,
    isolatedNodesCount: metrics.isolatedNodesCount,
    severedEdgesCount: metrics.severedEdgesCount,
    activeThreatsCount: metrics.activeThreatsCount,
    systemResilienceScore: metrics.systemResilienceScore,
    containmentAchieved: metrics.containmentAchieved
  };

  const canonicalPayload = {
    tick,
    metrics: canonicalMetrics,
    nodes: sortedNodes,
    edges: sortedEdges,
    threats: sortedThreats
  };

  const serialized = canonicalJsonStringify(canonicalPayload);
  return computeSha256(serialized);
}

