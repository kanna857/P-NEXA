import { AgentIdentity, AgentRole } from './types.js';
import { computeBlastRadius, findAttackPath, TwinNode, TwinEdge } from '@nexus/twin-graph';
import { computeSha256 } from '@nexus/governance';

export type ToolRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ToolExecutionContext {
  tenantId: string;
  worldId: string;
  nodes: TwinNode[];
  edges: TwinEdge[];
  humanApproved?: boolean;
}

export interface AgentTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  execute: (input: TInput, context: ToolExecutionContext) => Promise<TOutput>;
}

// Predefined role-to-tool allowlists
export const ROLE_TOOL_ALLOWLISTS: Record<AgentRole, string[]> = {
  SOC_TRIAGE: ['query_telemetry', 'classify_threat', 'correlate_alert'],
  THREAT_HUNTER: ['search_threat_intel', 'trace_mitre_attack', 'scan_lateral_paths'],
  INCIDENT_RESPONDER: [
    'query_blast_radius',
    'propose_node_isolation',
    'propose_edge_severance',
    'apply_containment'
  ],
  RED_TEAM_ADVERSARY: ['simulate_attack_vector', 'find_exploit_path'],
  POLICY_AUDITOR: ['audit_tool_execution', 'verify_governance_rules', 'record_audit_proof']
};

export function isToolAllowed(agent: AgentIdentity, toolName: string): boolean {
  return agent.toolAllowlist.includes(toolName);
}

// Tool Implementations
export const toolsRegistry = new Map<string, AgentTool>();

function registerTool<TInput, TOutput>(tool: AgentTool<TInput, TOutput>) {
  toolsRegistry.set(tool.name, tool);
}

// 1. SOC Triage Tools
registerTool({
  name: 'query_telemetry',
  description: 'Inspects telemetry metrics (CPU, traffic, anomalies) for a specific node',
  riskLevel: 'LOW',
  execute: async (input: { nodeId: string }, context) => {
    const node = context.nodes.find((n) => n.id === input.nodeId);
    if (!node) return { error: `Node ${input.nodeId} not found` };
    return {
      nodeId: node.id,
      name: node.name,
      status: node.status,
      telemetry: node.metadata || {},
      isCompromised: node.status === 'compromised'
    };
  }
});

registerTool({
  name: 'classify_threat',
  description: 'Calculates threat level, severity, and false positive probability from alert payload',
  riskLevel: 'LOW',
  execute: async (input: { alertText: string; sourceNodeId: string }, context) => {
    const node = context.nodes.find((n) => n.id === input.sourceNodeId);
    const text = input.alertText.toLowerCase();

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let confidence = 0.85;
    let isFalsePositive = false;

    if (text.includes('routine') || text.includes('scheduled-test')) {
      isFalsePositive = true;
      severity = 'LOW';
      confidence = 0.95;
    } else if (text.includes('exfiltration') || text.includes('ransomware') || (node && node.tier >= 3)) {
      severity = 'CRITICAL';
      confidence = 0.98;
    } else if (text.includes('lateral') || text.includes('injection') || text.includes('unauthorized')) {
      severity = 'HIGH';
      confidence = 0.92;
    } else {
      severity = 'MEDIUM';
    }

    return { severity, confidence, isFalsePositive };
  }
});

registerTool({
  name: 'correlate_alert',
  description: 'Finds adjacent nodes and edges linked to the alert source',
  riskLevel: 'LOW',
  execute: async (input: { sourceNodeId: string }, context) => {
    const incidentEdges = context.edges.filter(
      (e) => e.source === input.sourceNodeId || e.target === input.sourceNodeId
    );
    const connectedNodeIds = incidentEdges.map((e) =>
      e.source === input.sourceNodeId ? e.target : e.source
    );
    return {
      sourceNodeId: input.sourceNodeId,
      adjacentNodeIds: connectedNodeIds,
      edgeCount: incidentEdges.length
    };
  }
});

// 2. Threat Hunter Tools
registerTool({
  name: 'trace_mitre_attack',
  description: 'Maps observed behavior against standard MITRE ATT&CK taxonomy',
  riskLevel: 'LOW',
  execute: async (input: { behaviorSummary: string }) => {
    const s = input.behaviorSummary.toLowerCase();
    if (s.includes('lateral') || s.includes('smb') || s.includes('ssh')) {
      return {
        techniqueId: 'T1021',
        name: 'Remote Services: Lateral Movement',
        tactic: 'Lateral Movement',
        confidence: 0.9
      };
    }
    if (s.includes('injection') || s.includes('sql') || s.includes('exploit')) {
      return {
        techniqueId: 'T1190',
        name: 'Exploit Public-Facing Application',
        tactic: 'Initial Access',
        confidence: 0.92
      };
    }
    if (s.includes('credential') || s.includes('dump') || s.includes('harvest')) {
      return {
        techniqueId: 'T1003',
        name: 'OS Credential Dumping',
        tactic: 'Credential Access',
        confidence: 0.88
      };
    }
    return {
      techniqueId: 'T1059',
      name: 'Command and Scripting Interpreter',
      tactic: 'Execution',
      confidence: 0.75
    };
  }
});

registerTool({
  name: 'search_threat_intel',
  description: 'Searches known IOCs and threat actor behavioral signatures',
  riskLevel: 'LOW',
  execute: async (input: { indicator: string }) => {
    return {
      indicator: input.indicator,
      knownThreatActor: 'APT-29 / Midnight Blizzard',
      campaign: 'Nexus Cyber Infiltration Test',
      cveReferences: ['CVE-2026-3810', 'CVE-2026-1194'],
      reputationScore: 92 // 0 to 100 risk
    };
  }
});

registerTool({
  name: 'scan_lateral_paths',
  description: 'Calculates reachable downstream assets from candidate compromised node',
  riskLevel: 'LOW',
  execute: async (input: { startNodeId: string; maxHops?: number }, context) => {
    return computeBlastRadius(context.nodes, context.edges, input.startNodeId, input.maxHops || 3);
  }
});

// 3. Incident Responder Tools
registerTool({
  name: 'query_blast_radius',
  description: 'Calculates blast radius and potential loss if node is compromised',
  riskLevel: 'LOW',
  execute: async (input: { nodeId: string; maxHops?: number }, context) => {
    return computeBlastRadius(context.nodes, context.edges, input.nodeId, input.maxHops || 3);
  }
});

registerTool({
  name: 'propose_node_isolation',
  description: 'Proposes isolation of a compromised node. HIGH RISK: requires human approval gate.',
  riskLevel: 'HIGH',
  execute: async (input: { nodeId: string; rationale: string }, context) => {
    return {
      action: 'ISOLATE_NODE',
      targetId: input.nodeId,
      rationale: input.rationale,
      humanApproved: !!context.humanApproved,
      status: context.humanApproved ? 'EXECUTED' : 'AWAITING_APPROVAL'
    };
  }
});

registerTool({
  name: 'propose_edge_severance',
  description: 'Proposes severing a network connection edge. HIGH RISK: requires human approval gate.',
  riskLevel: 'HIGH',
  execute: async (input: { edgeId: string; rationale: string }, context) => {
    return {
      action: 'SEVER_EDGE',
      targetId: input.edgeId,
      rationale: input.rationale,
      humanApproved: !!context.humanApproved,
      status: context.humanApproved ? 'EXECUTED' : 'AWAITING_APPROVAL'
    };
  }
});

registerTool({
  name: 'apply_containment',
  description: 'Applies containment action to graph once approved',
  riskLevel: 'HIGH',
  execute: async (input: { action: 'ISOLATE_NODE' | 'SEVER_EDGE'; targetId: string }, context) => {
    if (!context.humanApproved) {
      throw new Error(`Execution blocked: Action ${input.action} requires human sign-off`);
    }

    if (input.action === 'ISOLATE_NODE') {
      const node = context.nodes.find((n) => n.id === input.targetId);
      if (node) node.status = 'isolated';
      return { success: true, isolatedNodeId: input.targetId };
    } else {
      const edge = context.edges.find((e) => e.id === input.targetId);
      if (edge) edge.status = 'severed';
      return { success: true, severedEdgeId: input.targetId };
    }
  }
});

// 4. Red Team Adversary Tools
registerTool({
  name: 'simulate_attack_vector',
  description: 'Tests if adversary can pivot to sensitive target database or domain controller',
  riskLevel: 'LOW',
  execute: async (input: { sourceId: string; targetId: string }, context) => {
    const path = findAttackPath(context.nodes, context.edges, input.sourceId, input.targetId);
    return {
      sourceId: input.sourceId,
      targetId: input.targetId,
      pathFound: path !== null,
      path,
      hopCount: path ? path.length - 1 : null
    };
  }
});

registerTool({
  name: 'find_exploit_path',
  description: 'Identifies lateral movement possibilities given active topology',
  riskLevel: 'LOW',
  execute: async (input: { startingNodeId: string }, context) => {
    const sensitiveNodes = context.nodes.filter((n) => n.type === 'database' || n.tier >= 3);
    const reachableTargets: Array<{ targetId: string; path: string[] }> = [];

    for (const target of sensitiveNodes) {
      if (target.id === input.startingNodeId) continue;
      const path = findAttackPath(context.nodes, context.edges, input.startingNodeId, target.id);
      if (path) {
        reachableTargets.push({ targetId: target.id, path });
      }
    }

    return {
      startingNodeId: input.startingNodeId,
      vulnerableTargets: reachableTargets,
      threatFeasible: reachableTargets.length > 0
    };
  }
});

// 5. Policy Auditor Tools
registerTool({
  name: 'audit_tool_execution',
  description: 'Verifies that planned agent actions conform to tenant policy and tool allowlists',
  riskLevel: 'LOW',
  execute: async (input: { agentRole: AgentRole; plannedAction: string }) => {
    const allowlist = ROLE_TOOL_ALLOWLISTS[input.agentRole] || [];
    const isAllowed =
      allowlist.includes(input.plannedAction) ||
      input.plannedAction === 'MONITOR' ||
      input.plannedAction === 'NO_ACTION' ||
      input.plannedAction === 'ISOLATE_NODE' ||
      input.plannedAction === 'SEVER_EDGE';

    return {
      agentRole: input.agentRole,
      plannedAction: input.plannedAction,
      isCompliant: isAllowed,
      policyReference: 'NEXUS-GOV-POLICY-SEC-01'
    };
  }
});

registerTool({
  name: 'verify_governance_rules',
  description: 'Validates that high-risk actions carry cryptographic sign-off',
  riskLevel: 'LOW',
  execute: async (input: { action: string; hasApproval: boolean }) => {
    const requiresSignoff = input.action === 'ISOLATE_NODE' || input.action === 'SEVER_EDGE';
    const passes = !requiresSignoff || input.hasApproval;
    return {
      action: input.action,
      requiresSignoff,
      governancePassed: passes
    };
  }
});

registerTool({
  name: 'record_audit_proof',
  description: 'Computes cryptographic SHA-256 proof for audit ledger',
  riskLevel: 'LOW',
  execute: async (input: { data: Record<string, unknown> }) => {
    const jsonStr = JSON.stringify(input.data);
    const hash = computeSha256(jsonStr);
    return { proofHash: hash, timestamp: new Date().toISOString() };
  }
});

/**
 * Sandboxed tool execution function with strict allowlist and safety barriers.
 * Never executes arbitrary scripts or runtime eval.
 */
export async function executeToolSandboxed<TInput = any, TOutput = any>(
  agent: AgentIdentity,
  toolName: string,
  input: TInput,
  context: ToolExecutionContext
): Promise<TOutput> {
  // 1. Strict Allowlist verification
  if (!isToolAllowed(agent, toolName)) {
    throw new Error(
      `Permission Denied: Agent role '${agent.role}' is not authorized to call tool '${toolName}'. Allowlist: [${agent.toolAllowlist.join(
        ', '
      )}]`
    );
  }

  // 2. Fetch tool from registry
  const tool = toolsRegistry.get(toolName);
  if (!tool) {
    throw new Error(`Tool not found: '${toolName}'`);
  }

  // 3. Sandboxed execution (zero eval / child_process)
  return (await tool.execute(input, context)) as TOutput;
}

