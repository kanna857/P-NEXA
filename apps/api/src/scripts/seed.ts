import { SystemRoles } from '@nexus/shared';
import { verifyAuditChain } from '@nexus/governance';
import { connectDatabase, disconnectDatabase, getDatabaseStatus } from '../db/connection.js';
import { DataStore } from '../db/store.js';
import { WorldStore } from '../db/worldStore.js';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { DigitalTwinWorld } from '../models/DigitalTwinWorld.js';
import { AuditLog } from '../models/AuditLog.js';
import { hashPassword } from '../services/authService.js';
import { recordAuditEvent } from '../services/auditService.js';
import { rootLogger } from '@nexus/observability';

const logger = rootLogger.child({ component: 'SeedScript' });

export async function runSeed(): Promise<void> {
  // Allow fallback if running without live MongoDB instance
  if (!process.env.MONGODB_URI) {
    process.env.ALLOW_MEMORY_FALLBACK = 'true';
  } else {
    process.env.ALLOW_MEMORY_FALLBACK = 'true';
  }
  logger.info('Starting NEXUS OMEGA X database seed...');
  await connectDatabase();

  // Clean existing demo seed data for idempotent execution
  const { isConnected, isMockMode } = getDatabaseStatus();
  if (isConnected && !isMockMode) {
    try {
      await Tenant.deleteMany({ slug: { $in: ['cyberdyne-orbital', 'aegis-defense', 'synthetix-labs'] } });
      await User.deleteMany({ email: { $in: ['superadmin@nexus.ai', 'admin@cyberdyne.ai', 'analyst@cyberdyne.ai', 'sim.engineer@cyberdyne.ai', 'auditor@cyberdyne.ai', 'viewer@cyberdyne.ai'] } });
      await DigitalTwinWorld.deleteMany({ name: 'CyberDyne Orbital Defense Matrix' });
      await AuditLog.deleteMany({});
    } catch {
      // ignore cleanup errors
    }
  }

  // 1. Seed Tenants
  const tenant1 = await DataStore.createTenant({
    name: 'CyberDyne Orbital',
    slug: 'cyberdyne-orbital',
    plan: 'defense_grade',
    quotas: { maxAgents: 50, maxParallelScenarios: 32, maxEventStorageMb: 51200 },
    settings: { mfaRequired: true, requireDualApprovalForWorkflows: true, retentionDays: 365 }
  });
  const tenant1Id = (tenant1 as any)._id?.toString() || (tenant1 as any).id;

  const tenant2 = await DataStore.createTenant({
    name: 'Aegis Defense Grid',
    slug: 'aegis-defense',
    plan: 'enterprise',
    quotas: { maxAgents: 20, maxParallelScenarios: 12, maxEventStorageMb: 20480 }
  });

  const tenant3 = await DataStore.createTenant({
    name: 'Synthetix Labs',
    slug: 'synthetix-labs',
    plan: 'starter',
    quotas: { maxAgents: 5, maxParallelScenarios: 2, maxEventStorageMb: 5120 }
  });

  logger.info('Created organizations:', {
    tenants: [tenant1.name, tenant2.name, tenant3.name]
  });

  // 2. Seed Users for CyberDyne Orbital
  const isProduction = process.env.NODE_ENV === 'production';

  // Hard production security guard: Default/static seed credentials are strictly forbidden
  if (isProduction && (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_DEFAULT_USER_PASSWORD)) {
    throw new Error(
      'CRITICAL SECURITY VIOLATION: Seeding in a production environment with default credentials is prohibited. ' +
      'You must explicitly provide cryptographically strong SEED_ADMIN_PASSWORD and SEED_DEFAULT_USER_PASSWORD environment variables.'
    );
  }

  // Explicitly labeled rotated development credentials (never valid in production)
  const devAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'DevOnly_SuperAdmin_#2026$Rotated!';
  const devUserPassword = process.env.SEED_DEFAULT_USER_PASSWORD || 'DevOnly_User_#2026$Rotated!';

  if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_DEFAULT_USER_PASSWORD) {
    logger.warn('NOTICE: Seeding with synthetic development-only credentials. DO NOT deploy these credentials to production environments.');
  }

  const defaultPasswordHash = await hashPassword(devUserPassword);
  const superAdminPasswordHash = await hashPassword(devAdminPassword);

  const users = [
    {
      email: 'superadmin@nexus.ai',
      firstName: 'Nexus',
      lastName: 'Prime',
      role: SystemRoles.SUPER_ADMIN,
      passwordHash: superAdminPasswordHash
    },
    {
      email: 'admin@cyberdyne.ai',
      firstName: 'Sarah',
      lastName: 'Connor',
      role: SystemRoles.ORG_ADMIN,
      passwordHash: defaultPasswordHash
    },
    {
      email: 'analyst@cyberdyne.ai',
      firstName: 'Miles',
      lastName: 'Dyson',
      role: SystemRoles.SECURITY_ANALYST,
      passwordHash: defaultPasswordHash
    },
    {
      email: 'sim.engineer@cyberdyne.ai',
      firstName: 'John',
      lastName: 'Vance',
      role: SystemRoles.SIMULATION_ENGINEER,
      passwordHash: defaultPasswordHash
    },
    {
      email: 'auditor@cyberdyne.ai',
      firstName: 'Elena',
      lastName: 'Rostova',
      role: SystemRoles.AUDITOR,
      passwordHash: defaultPasswordHash
    },
    {
      email: 'viewer@cyberdyne.ai',
      firstName: 'Marcus',
      lastName: 'Wright',
      role: SystemRoles.VIEWER,
      passwordHash: defaultPasswordHash
    }
  ];

  for (const u of users) {
    await DataStore.createUser({
      tenantId: tenant1Id,
      ...u
    });
  }
  logger.info(`Seeded ${users.length} identity accounts for tenant: ${tenant1.name}`);

  // 3. Establish initial cryptographic audit chain
  await recordAuditEvent({
    tenantId: tenant1Id,
    action: 'TENANT_INITIALIZED',
    actor: { systemService: 'seed-engine' },
    targetResource: { type: 'Tenant', id: tenant1Id },
    payload: { name: tenant1.name, plan: tenant1.plan }
  });

  await recordAuditEvent({
    tenantId: tenant1Id,
    action: 'POLICY_BASELINES_LOADED',
    actor: { systemService: 'seed-engine' },
    targetResource: { type: 'SecurityPolicy', id: 'pol_baseline_v1' },
    payload: { defaultMode: 'ENFORCED', mitreCoverage: ['TA0001', 'TA0002', 'TA0003'] }
  });

  await recordAuditEvent({
    tenantId: tenant1Id,
    action: 'AGENT_SOC_TRIAGE_SPAWNED',
    actor: { systemService: 'agent-engine' },
    targetResource: { type: 'Agent', id: 'agent_soc_01' },
    payload: { role: 'SOC_TRIAGE', allowlist: ['query_siem', 'isolate_node'] }
  });

  const worldNodes = [
    { nodeId: 'node-gateway-01', name: 'Demilitarized Orbital Gateway', type: 'firewall', tier: 0, status: 'healthy', position: { x: 0, y: 0, z: 0 }, metadata: { ipAddress: '10.0.0.1' } },
    { nodeId: 'node-app-cluster', name: 'Defense Strategy Core Server', type: 'server', tier: 1, status: 'warning', position: { x: -40, y: 20, z: 30 }, metadata: { ipAddress: '10.0.1.10', vulnerabilities: ['CVE-2024-3400'] } },
    { nodeId: 'node-db-01', name: 'Telemetry & Audit Database Master', type: 'database', tier: 2, status: 'healthy', position: { x: 40, y: -20, z: -30 }, metadata: { ipAddress: '10.0.2.5' } },
    { nodeId: 'node-relay-alpha', name: 'Optical Satellite Cross-Link Alpha', type: 'cloud_gateway', tier: 1, status: 'healthy', position: { x: 60, y: 40, z: 10 }, metadata: { ipAddress: '10.0.3.1' } },
    { nodeId: 'node-agent-pod', name: 'Autonomous Agent Society Cluster', type: 'agent_pod', tier: 1, status: 'healthy', position: { x: -60, y: -30, z: -10 }, metadata: { ipAddress: '10.0.4.1' } }
  ];

  const worldEdges = [
    { edgeId: 'edge-gw-app', source: 'node-gateway-01', target: 'node-app-cluster', protocol: 'TLS', trafficRateKbps: 450, isEncrypted: true, status: 'normal' },
    { edgeId: 'edge-app-db', source: 'node-app-cluster', target: 'node-db-01', protocol: 'TLS', trafficRateKbps: 920, isEncrypted: true, status: 'normal' },
    { edgeId: 'edge-gw-relay', source: 'node-gateway-01', target: 'node-relay-alpha', protocol: 'GRPC', trafficRateKbps: 1200, isEncrypted: true, status: 'normal' },
    { edgeId: 'edge-app-agent', source: 'node-app-cluster', target: 'node-agent-pod', protocol: 'INTERNAL_BUS', trafficRateKbps: 800, isEncrypted: true, status: 'normal' }
  ];

  const createdWorld = await WorldStore.createWorld({
    tenantId: tenant1Id,
    name: 'CyberDyne Orbital Defense Matrix',
    description: 'Living 3D Digital Twin World with aerospace telemetry links and multi-agent defense pods',
    environmentType: 'satellite_mesh',
    nodes: worldNodes,
    edges: worldEdges
  });

  const worldId = (createdWorld as any)._id?.toString() || (createdWorld as any).id;

  await recordAuditEvent({
    tenantId: tenant1Id,
    action: 'DIGITAL_TWIN_SEEDED',
    actor: { systemService: 'world-engine' },
    targetResource: { type: 'DigitalTwinWorld', id: worldId },
    payload: { name: 'CyberDyne Orbital Defense Matrix', nodesCount: worldNodes.length, edgesCount: worldEdges.length }
  });

  // Verify chain integrity
  const auditLogs = await DataStore.getAllAuditLogsForTenant(tenant1Id);
  const verifyResult = verifyAuditChain(auditLogs as any);

  if (!verifyResult.isValid) {
    throw new Error(`Audit chain verification failed during seed: ${verifyResult.error}`);
  }

  logger.info('Audit chain cryptographically verified successfully!', {
    totalBlocks: verifyResult.totalRecordsChecked,
    status: 'INTACT_SHA256_CHAIN'
  });

  logger.info('Database seed complete!');
}

if (process.argv[1]?.includes('seed.ts')) {
  runSeed()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seed execution failed', err);
      process.exit(1);
    });
}
