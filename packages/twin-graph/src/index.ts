export interface TwinNode {
  id: string;
  name: string;
  type: 'firewall' | 'router' | 'load_balancer' | 'server' | 'database' | 'agent_pod' | 'iot_sensor' | 'cloud_gateway';
  tier: number; // 0=edge, 1=ingress, 2=app, 3=data, 4=iot
  status: 'healthy' | 'warning' | 'compromised' | 'isolated' | 'offline';
  position: { x: number; y: number; z: number };
  metadata: {
    ipAddress?: string;
    subnet?: string;
    os?: string;
    vulnerabilities?: string[];
    cpuUsage?: number;
    memoryUsage?: number;
    trafficRateKbps?: number;
  };
}

export interface TwinEdge {
  id: string;
  source: string;
  target: string;
  protocol: 'TCP' | 'UDP' | 'TLS' | 'GRPC' | 'INTERNAL_BUS';
  trafficRateKbps: number;
  isEncrypted: boolean;
  status: 'normal' | 'anomalous' | 'severed';
}

export interface DigitalTwinWorldData {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  environmentType: 'cloud' | 'enterprise_datacenter' | 'scada_ics' | 'satellite_mesh';
  version: number;
  nodes: TwinNode[];
  edges: TwinEdge[];
}

export interface BlastRadiusResult {
  startNodeId: string;
  impactedNodeIds: string[];
  severedEdgeIds: string[];
  maxHopsReached: number;
  riskScore: number; // 0 to 100
}

/**
 * Computes downstream systems that can be reached from a compromised node.
 * Respects severed or isolated edges to model real containment.
 */
export function computeBlastRadius(
  nodes: TwinNode[],
  edges: TwinEdge[],
  startNodeId: string,
  maxHops: number = 3
): BlastRadiusResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const startNode = nodeMap.get(startNodeId);
  if (!startNode) {
    return {
      startNodeId,
      impactedNodeIds: [],
      severedEdgeIds: [],
      maxHopsReached: 0,
      riskScore: 0
    };
  }

  // Active adjacency list
  const adj = new Map<string, Array<{ target: string; edgeId: string }>>();
  for (const edge of edges) {
    if (edge.status === 'severed') continue;

    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push({ target: edge.target, edgeId: edge.id });

    // Bidirectional network accessibility
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.target)!.push({ target: edge.source, edgeId: edge.id });
  }

  const visited = new Set<string>([startNodeId]);
  const queue: Array<{ nodeId: string; hops: number }> = [{ nodeId: startNodeId, hops: 0 }];
  let maxHopsReached = 0;

  while (queue.length > 0) {
    const { nodeId, hops } = queue.shift()!;
    if (hops >= maxHops) continue;

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const neighborNode = nodeMap.get(neighbor.target);
      // Isolated nodes cannot be traversed
      if (neighborNode?.status === 'isolated') continue;

      if (!visited.has(neighbor.target)) {
        visited.add(neighbor.target);
        const nextHops = hops + 1;
        if (nextHops > maxHopsReached) maxHopsReached = nextHops;
        queue.push({ nodeId: neighbor.target, hops: nextHops });
      }
    }
  }

  // Exclude start node from impacted list
  visited.delete(startNodeId);
  const impacted = Array.from(visited);

  // Compute risk score based on criticality of impacted tiers
  let riskPoints = 0;
  for (const id of impacted) {
    const n = nodeMap.get(id);
    if (!n) continue;
    if (n.type === 'database') riskPoints += 30;
    else if (n.type === 'server') riskPoints += 15;
    else if (n.type === 'firewall') riskPoints += 25;
    else riskPoints += 10;
  }
  const riskScore = Math.min(100, riskPoints);

  const severedEdges = edges.filter((e) => e.status === 'severed').map((e) => e.id);

  return {
    startNodeId,
    impactedNodeIds: impacted,
    severedEdgeIds: severedEdges,
    maxHopsReached,
    riskScore
  };
}

/**
 * Finds shortest lateral threat traversal path between two nodes using BFS.
 */
export function findAttackPath(
  nodes: TwinNode[],
  edges: TwinEdge[],
  sourceId: string,
  targetId: string
): string[] | null {
  if (sourceId === targetId) return [sourceId];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();

  for (const edge of edges) {
    if (edge.status === 'severed') continue;

    const srcNode = nodeMap.get(edge.source);
    const tgtNode = nodeMap.get(edge.target);

    // Skip isolated endpoints
    if (srcNode?.status === 'isolated' || tgtNode?.status === 'isolated') continue;

    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);

    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.target)!.push(edge.source);
  }

  const queue: string[] = [sourceId];
  const visited = new Set<string>([sourceId]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === targetId) {
      // Reconstruct path
      const path = [targetId];
      let p = parent.get(targetId);
      while (p) {
        path.unshift(p);
        p = parent.get(p);
      }
      return path;
    }

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        parent.set(next, curr);
        queue.push(next);
      }
    }
  }

  return null;
}
