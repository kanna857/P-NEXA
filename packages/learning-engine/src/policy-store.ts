import { canonicalJsonStringify, computeSha256 } from '@nexus/governance';
import {
  DefensePolicy,
  DefensePolicyParameters,
  PolicyStatus
} from './types.js';

export function computePolicyHash(
  tenantId: string,
  name: string,
  version: string,
  params: DefensePolicyParameters
): string {
  const canonicalPayload = {
    tenantId,
    name,
    version,
    parameters: {
      containmentThreshold: params.containmentThreshold,
      maxLateralHops: params.maxLateralHops,
      isolationStrategy: params.isolationStrategy,
      requireDualCustodyApproval: params.requireDualCustodyApproval,
      confidenceThreshold: params.confidenceThreshold,
      maxAutonomousSeverances: params.maxAutonomousSeverances
    }
  };
  return computeSha256(canonicalJsonStringify(canonicalPayload));
}

export function bumpMinorVersion(currentVersion: string): string {
  const parts = currentVersion.split('.').map((p) => parseInt(p, 10));
  const major = parts[0] ?? 1;
  const minor = parts[1] ?? 0;
  return `${major}.${minor + 1}.0`;
}

export function bumpPatchVersion(currentVersion: string): string {
  const parts = currentVersion.split('.').map((p) => parseInt(p, 10));
  const major = parts[0] ?? 1;
  const minor = parts[1] ?? 0;
  const patch = parts[2] ?? 0;
  return `${major}.${minor}.${patch + 1}`;
}

export class PolicyStore {
  private policies = new Map<string, DefensePolicy>();

  /**
   * Creates a new draft or candidate defense policy.
   * Parameter values are strictly constrained data structures — zero arbitrary code execution.
   */
  public createPolicy(data: {
    tenantId: string;
    name: string;
    description: string;
    version?: string;
    parameters: DefensePolicyParameters;
    status?: PolicyStatus;
    changelog?: string;
  }): DefensePolicy {
    const id = `pol-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const version = data.version || '1.0.0';
    const status = data.status || 'DRAFT';

    const immutableHash = computePolicyHash(
      data.tenantId,
      data.name,
      version,
      data.parameters
    );

    const now = new Date().toISOString();
    const policy: DefensePolicy = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      version,
      status,
      parameters: { ...data.parameters },
      immutableHash,
      createdAt: now,
      updatedAt: now,
      changelog: data.changelog
    };

    this.policies.set(id, policy);
    return policy;
  }

  public getPolicy(tenantId: string, id: string): DefensePolicy | undefined {
    const p = this.policies.get(id);
    if (!p || p.tenantId !== tenantId) return undefined;
    return p;
  }

  public getActivePolicy(tenantId: string): DefensePolicy | undefined {
    for (const p of this.policies.values()) {
      if (p.tenantId === tenantId && p.status === 'ACTIVE') {
        return p;
      }
    }
    return undefined;
  }

  public listPolicies(tenantId: string, status?: PolicyStatus): DefensePolicy[] {
    const list: DefensePolicy[] = [];
    for (const p of this.policies.values()) {
      if (p.tenantId === tenantId) {
        if (!status || p.status === status) {
          list.push(p);
        }
      }
    }
    // Sort descending by version or update time
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public updatePolicyStatus(
    tenantId: string,
    id: string,
    status: PolicyStatus,
    promoterId?: string
  ): DefensePolicy {
    const p = this.getPolicy(tenantId, id);
    if (!p) throw new Error(`Policy not found: ${id}`);

    p.status = status;
    p.updatedAt = new Date().toISOString();
    if (status === 'ACTIVE') {
      p.promotedAt = new Date().toISOString();
      p.promotedBy = promoterId;
    }
    return p;
  }

  public clear(): void {
    this.policies.clear();
  }
}

export const defaultPolicyStore = new PolicyStore();

