export const SystemRoles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  SECURITY_ANALYST: 'SECURITY_ANALYST',
  SIMULATION_ENGINEER: 'SIMULATION_ENGINEER',
  OPERATOR: 'OPERATOR',
  AUDITOR: 'AUDITOR',
  VIEWER: 'VIEWER'
} as const;

export type SystemRole = typeof SystemRoles[keyof typeof SystemRoles];

export const Permissions = {
  // Tenant & IAM
  TENANT_CREATE: 'tenant:create',
  TENANT_READ: 'tenant:read',
  TENANT_UPDATE: 'tenant:update',
  TENANT_DELETE: 'tenant:delete',
  USER_INVITE: 'user:invite',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // Digital Twin Worlds
  WORLD_READ: 'world:read',
  WORLD_WRITE: 'world:write',
  WORLD_DELETE: 'world:delete',

  // Multi-Agent Society
  AGENT_READ: 'agent:read',
  AGENT_WRITE: 'agent:write',
  AGENT_COMMAND: 'agent:command',
  AGENT_POLICY_PROMOTE: 'agent:policy_promote',

  // Cyber Incidents
  INCIDENT_READ: 'incident:read',
  INCIDENT_WRITE: 'incident:write',
  INCIDENT_REMEDIATE: 'incident:remediate',

  // Scenario Simulation
  SIM_READ: 'sim:read',
  SIM_EXECUTE: 'sim:execute',
  SIM_BRANCH: 'sim:branch',

  // Workflow Automation
  WORKFLOW_READ: 'workflow:read',
  WORKFLOW_CREATE: 'workflow:create',
  WORKFLOW_APPROVE: 'workflow:approve',

  // Governance & Tamper-Evident Ledger
  AUDIT_READ: 'audit:read',
  AUDIT_VERIFY: 'audit:verify',
  AUDIT_EXPORT: 'audit:export',
  SYSTEM_CONFIG: 'system:config'
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];

export const RolePermissionsMap: Record<SystemRole, Permission[]> = {
  [SystemRoles.SUPER_ADMIN]: Object.values(Permissions),

  [SystemRoles.ORG_ADMIN]: [
    Permissions.TENANT_READ,
    Permissions.TENANT_UPDATE,
    Permissions.USER_INVITE,
    Permissions.USER_READ,
    Permissions.USER_UPDATE,
    Permissions.USER_DELETE,
    Permissions.WORLD_READ,
    Permissions.WORLD_WRITE,
    Permissions.WORLD_DELETE,
    Permissions.AGENT_READ,
    Permissions.AGENT_WRITE,
    Permissions.AGENT_COMMAND,
    Permissions.AGENT_POLICY_PROMOTE,
    Permissions.INCIDENT_READ,
    Permissions.INCIDENT_WRITE,
    Permissions.INCIDENT_REMEDIATE,
    Permissions.SIM_READ,
    Permissions.SIM_EXECUTE,
    Permissions.SIM_BRANCH,
    Permissions.WORKFLOW_READ,
    Permissions.WORKFLOW_CREATE,
    Permissions.WORKFLOW_APPROVE,
    Permissions.AUDIT_READ,
    Permissions.AUDIT_VERIFY,
    Permissions.AUDIT_EXPORT
  ],

  [SystemRoles.SECURITY_ANALYST]: [
    Permissions.TENANT_READ,
    Permissions.USER_READ,
    Permissions.WORLD_READ,
    Permissions.AGENT_READ,
    Permissions.AGENT_COMMAND,
    Permissions.INCIDENT_READ,
    Permissions.INCIDENT_WRITE,
    Permissions.INCIDENT_REMEDIATE,
    Permissions.SIM_READ,
    Permissions.SIM_EXECUTE,
    Permissions.WORKFLOW_READ,
    Permissions.WORKFLOW_CREATE,
    Permissions.AUDIT_READ
  ],

  [SystemRoles.SIMULATION_ENGINEER]: [
    Permissions.TENANT_READ,
    Permissions.USER_READ,
    Permissions.WORLD_READ,
    Permissions.WORLD_WRITE,
    Permissions.AGENT_READ,
    Permissions.AGENT_WRITE,
    Permissions.AGENT_COMMAND,
    Permissions.SIM_READ,
    Permissions.SIM_EXECUTE,
    Permissions.SIM_BRANCH,
    Permissions.WORKFLOW_READ,
    Permissions.AUDIT_READ
  ],

  [SystemRoles.OPERATOR]: [
    Permissions.TENANT_READ,
    Permissions.USER_READ,
    Permissions.WORLD_READ,
    Permissions.AGENT_READ,
    Permissions.INCIDENT_READ,
    Permissions.SIM_READ,
    Permissions.WORKFLOW_READ,
    Permissions.AUDIT_READ
  ],

  [SystemRoles.AUDITOR]: [
    Permissions.TENANT_READ,
    Permissions.USER_READ,
    Permissions.WORLD_READ,
    Permissions.AGENT_READ,
    Permissions.INCIDENT_READ,
    Permissions.SIM_READ,
    Permissions.WORKFLOW_READ,
    Permissions.AUDIT_READ,
    Permissions.AUDIT_VERIFY,
    Permissions.AUDIT_EXPORT
  ],

  [SystemRoles.VIEWER]: [
    Permissions.TENANT_READ,
    Permissions.WORLD_READ,
    Permissions.INCIDENT_READ,
    Permissions.SIM_READ,
    Permissions.AUDIT_READ
  ]
};

export function hasPermission(
  role: SystemRole,
  permission: Permission,
  userOverrides: string[] = []
): boolean {
  if (role === SystemRoles.SUPER_ADMIN) return true;
  if (userOverrides.includes(permission)) return true;
  const rolePerms = RolePermissionsMap[role] || [];
  return rolePerms.includes(permission);
}

