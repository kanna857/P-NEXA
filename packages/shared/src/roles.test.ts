import { describe, it, expect } from 'vitest';
import { SystemRoles, Permissions, hasPermission } from './roles.js';

describe('RBAC Authorization Matrix', () => {
  it('SUPER_ADMIN possesses all permissions implicitly', () => {
    expect(hasPermission(SystemRoles.SUPER_ADMIN, Permissions.TENANT_CREATE)).toBe(true);
    expect(hasPermission(SystemRoles.SUPER_ADMIN, Permissions.SYSTEM_CONFIG)).toBe(true);
    expect(hasPermission(SystemRoles.SUPER_ADMIN, Permissions.AUDIT_VERIFY)).toBe(true);
  });

  it('ORG_ADMIN cannot configure core system settings but can administer tenant', () => {
    expect(hasPermission(SystemRoles.ORG_ADMIN, Permissions.USER_INVITE)).toBe(true);
    expect(hasPermission(SystemRoles.ORG_ADMIN, Permissions.WORLD_WRITE)).toBe(true);
    expect(hasPermission(SystemRoles.ORG_ADMIN, Permissions.SYSTEM_CONFIG)).toBe(false);
  });

  it('SECURITY_ANALYST can remediate incidents but cannot create tenants', () => {
    expect(hasPermission(SystemRoles.SECURITY_ANALYST, Permissions.INCIDENT_REMEDIATE)).toBe(true);
    expect(hasPermission(SystemRoles.SECURITY_ANALYST, Permissions.TENANT_CREATE)).toBe(false);
  });

  it('VIEWER cannot perform write or administrative actions', () => {
    expect(hasPermission(SystemRoles.VIEWER, Permissions.WORLD_READ)).toBe(true);
    expect(hasPermission(SystemRoles.VIEWER, Permissions.WORLD_WRITE)).toBe(false);
    expect(hasPermission(SystemRoles.VIEWER, Permissions.INCIDENT_REMEDIATE)).toBe(false);
  });

  it('respects explicit user permission overrides', () => {
    expect(
      hasPermission(SystemRoles.VIEWER, Permissions.SIM_EXECUTE, [Permissions.SIM_EXECUTE])
    ).toBe(true);
  });
});

