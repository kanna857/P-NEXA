# NEXUS OMEGA X — Database Schemas & Data Architecture

All collections are strictly partitioned by `tenantId` (except global administrative collections).

### 1. Tenants & Identity
```typescript
// Tenant / Organization
interface ITenant {
  _id: ObjectId;
  name: string;
  slug: string; // unique, e.g., "cyberdyne-corp"
  status: 'active' | 'suspended' | 'provisioning';
  plan: 'starter' | 'enterprise' | 'defense_grade';
  quotas: {
    maxAgents: number;
    maxParallelScenarios: number;
    maxEventStorageMb: number;
  };
  settings: {
    mfaRequired: boolean;
    requireDualApprovalForWorkflows: boolean;
    retentionDays: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// User
interface IUser {
  _id: ObjectId;
  tenantId: ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'SECURITY_ANALYST' | 'SIMULATION_ENGINEER' | 'OPERATOR' | 'AUDITOR' | 'VIEWER';
  status: 'active' | 'inactive' | 'locked';
  permissions: string[]; // specific overrides
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Tamper-Evident Audit Ledger (Cryptographic Hash Chain)
```typescript
interface IAuditLog {
  _id: ObjectId;
  tenantId: ObjectId;
  sequenceNumber: number; // strictly incrementing per tenant
  previousHash: string;   // SHA-256 of the prior record
  currentHash: string;    // SHA-256(sequenceNumber + previousHash + timestamp + action + actor + payload)
  actor: {
    userId?: ObjectId;
    agentId?: string;
    systemService?: string;
    ipAddress?: string;
  };
  action: string;         // e.g., "AUTH_LOGIN", "STRATEGY_PROMOTED", "SIMULATION_LAUNCHED"
  targetResource: {
    type: string;         // "Scenario", "Agent", "Tenant", "Workflow"
    id: string;
  };
  payload: Record<string, unknown>; // canonical JSON representation
  evidenceHash?: string;  // optional merkle root or artifact checksum
  timestamp: Date;
}
```

### 3. Living 3D Digital Twin Graph
```typescript
interface ITwinNode {
  nodeId: string;
  name: string;
  type: 'server' | 'database' | 'firewall' | 'router' | 'workstation' | 'agent_pod' | 'iot_sensor';
  position: { x: number; y: number; z: number };
  status: 'healthy' | 'warning' | 'compromised' | 'offline';
  metadata: {
    ipAddress?: string;
    os?: string;
    vulnerabilities?: string[];
    telemetry?: Record<string, number>;
  };
}

interface ITwinEdge {
  sourceId: string;
  targetId: string;
  protocol: 'TCP' | 'UDP' | 'TLS' | 'GRPC' | 'INTERNAL_BUS';
  trafficRateKbps: number;
  isEncrypted: boolean;
  status: 'normal' | 'anomalous' | 'severed';
}

interface IDigitalTwinWorld {
  _id: ObjectId;
  tenantId: ObjectId;
  name: string;
  description: string;
  version: number;
  environmentType: 'cloud' | 'enterprise_datacenter' | 'scada_ics' | 'satellite_mesh';
  nodes: ITwinNode[];
  edges: ITwinEdge[];
  updatedAt: Date;
}
```

### 4. Multi-Agent AI Society & Vector Memory
```typescript
interface IAgent {
  _id: ObjectId;
  tenantId: ObjectId;
  agentId: string; // alphanumeric identifier
  name: string;
  role: 'SOC_TRIAGE' | 'INCIDENT_RESPONDER' | 'THREAT_HUNTER' | 'RED_TEAM_ADVERSARY' | 'POLICY_AUDITOR';
  status: 'idle' | 'analyzing' | 'simulating' | 'suspended';
  currentStrategyVersion: string;
  toolAllowlist: string[]; // e.g. ["query_siem", "isolate_node", "replay_traffic"]
  configuration: {
    temperature: number;
    maxContextTokens: number;
  };
  metrics: {
    tasksCompleted: number;
    accuracyScore: number;
  };
}

interface IAgentMemory {
  _id: ObjectId;
  tenantId: ObjectId;
  agentId: string;
  type: 'observation' | 'reflection' | 'plan' | 'incident_fact';
  content: string;
  embedding: number[]; // 1536-dim vector for MongoDB Vector Search
  importance: number;  // 1-10
  referencedEntities: string[];
  createdAt: Date;
}
```

### 5. Scenarios, Replays & Strategy Policies
```typescript
interface IScenario {
  _id: ObjectId;
  tenantId: ObjectId;
  name: string;
  worldId: ObjectId;
  seed: number; // deterministic PRNG seed
  tickRateMs: number;
  status: 'draft' | 'running' | 'completed' | 'failed';
  checkpoints: Array<{
    tick: number;
    stateHash: string;
    snapshotUri: string;
  }>;
  telemetryLogs: Array<{
    tick: number;
    timestamp: Date;
    eventsCount: number;
    anomaliesDetected: number;
  }>;
}

interface IStrategyPolicy {
  _id: ObjectId;
  tenantId: ObjectId;
  agentRole: string;
  version: string; // e.g. "v1.2.0"
  rules: Array<{
    condition: string;
    prescribedAction: string;
    confidenceThreshold: number;
  }>;
  evaluationMetrics: {
    ttrReductionPercent: number;
    falsePositiveRate: number;
    benchmarkScore: number;
  };
  status: 'candidate' | 'approved' | 'active' | 'deprecated';
  approvedBy?: ObjectId;
}
```

