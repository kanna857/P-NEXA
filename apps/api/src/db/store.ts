import { Types } from 'mongoose';
import { Tenant, ITenantDocument } from '../models/Tenant.js';
import { User, IUserDocument } from '../models/User.js';
import { AuditLog, IAuditLogDocument } from '../models/AuditLog.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { getDatabaseStatus } from './connection.js';
import { SystemRole } from '@nexus/shared';

// In-Memory collections for test/fallback environments
const memTenants = new Map<string, any>();
const memUsers = new Map<string, any>();
const memAuditLogs = new Map<string, any[]>(); // key: tenantId
const memRefreshTokens = new Map<string, any>();

export const DataStore = {
  // --- Tenants ---
  async findTenantById(id: string): Promise<ITenantDocument | null> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return Tenant.findById(id).exec();
    }
    return memTenants.get(id) || null;
  },

  async findTenantBySlug(slug: string): Promise<ITenantDocument | null> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return Tenant.findOne({ slug }).exec();
    }
    for (const t of memTenants.values()) {
      if (t.slug === slug) return t;
    }
    return null;
  },

  async listTenants(): Promise<ITenantDocument[]> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return Tenant.find({ status: 'active' }).exec();
    }
    return Array.from(memTenants.values());
  },

  async createTenant(data: Partial<ITenantDocument>): Promise<ITenantDocument> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return Tenant.create(data);
    }
    const id = new Types.ObjectId().toString();
    const doc: any = {
      _id: id,
      id,
      status: 'active',
      plan: 'enterprise',
      quotas: { maxAgents: 20, maxParallelScenarios: 8, maxEventStorageMb: 10240 },
      settings: { mfaRequired: false, requireDualApprovalForWorkflows: true, retentionDays: 90 },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    memTenants.set(id, doc);
    return doc;
  },

  // --- Users ---
  async findUserByEmail(tenantId: string, email: string): Promise<IUserDocument | null> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return User.findOne({ tenantId, email: email.toLowerCase() }).exec();
    }
    for (const u of memUsers.values()) {
      if (u.tenantId.toString() === tenantId && u.email === email.toLowerCase()) {
        return u;
      }
    }
    return null;
  },

  async findUserById(id: string): Promise<IUserDocument | null> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return User.findById(id).exec();
    }
    return memUsers.get(id) || null;
  },

  async listUsersByTenant(tenantId: string): Promise<IUserDocument[]> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return User.find({ tenantId }).select('-passwordHash').exec();
    }
    return Array.from(memUsers.values()).filter((u) => u.tenantId.toString() === tenantId);
  },

  async createUser(data: {
    tenantId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: SystemRole;
    permissions?: string[];
  }): Promise<IUserDocument> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return User.create({
        ...data,
        email: data.email.toLowerCase(),
        tenantId: new Types.ObjectId(data.tenantId)
      });
    }
    const id = new Types.ObjectId().toString();
    const doc: any = {
      _id: id,
      id,
      ...data,
      email: data.email.toLowerCase(),
      status: 'active',
      permissions: data.permissions || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memUsers.set(id, doc);
    return doc;
  },

  // --- Audit Logs ---
  async getLastAuditLog(tenantId: string): Promise<IAuditLogDocument | null> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return AuditLog.findOne({ tenantId }).sort({ sequenceNumber: -1 }).exec();
    }
    const list = memAuditLogs.get(tenantId) || [];
    return list.length > 0 ? list[list.length - 1] : null;
  },

  async appendAuditLog(data: any): Promise<IAuditLogDocument> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return AuditLog.create(data);
    }
    const id = new Types.ObjectId().toString();
    const doc: any = {
      _id: id,
      id,
      ...data,
      timestamp: data.timestamp || new Date()
    };
    const list = memAuditLogs.get(data.tenantId.toString()) || [];
    list.push(doc);
    memAuditLogs.set(data.tenantId.toString(), list);
    return doc;
  },

  async getAuditLogs(
    tenantId: string,
    options: { limit?: number; page?: number; action?: string } = {}
  ): Promise<{ logs: IAuditLogDocument[]; total: number }> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    const limit = options.limit || 50;
    const page = options.page || 1;
    const skip = (page - 1) * limit;

    if (isConnected && !isMockMode) {
      const query: any = { tenantId };
      if (options.action) query.action = options.action;
      const total = await AuditLog.countDocuments(query);
      const logs = await AuditLog.find(query)
        .sort({ sequenceNumber: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      return { logs, total };
    }

    let list = memAuditLogs.get(tenantId) || [];
    if (options.action) {
      list = list.filter((l) => l.action === options.action);
    }
    const total = list.length;
    const sorted = [...list].sort((a, b) => b.sequenceNumber - a.sequenceNumber);
    const paginated = sorted.slice(skip, skip + limit);
    return { logs: paginated, total };
  },

  async getAllAuditLogsForTenant(tenantId: string): Promise<IAuditLogDocument[]> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return AuditLog.find({ tenantId }).sort({ sequenceNumber: 1 }).exec();
    }
    const list = memAuditLogs.get(tenantId) || [];
    return [...list].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  },

  // --- Refresh Tokens ---
  async saveRefreshToken(token: string, userId: string, tenantId: string, expiresAt: Date): Promise<void> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      await RefreshToken.create({ token, userId, tenantId, expiresAt });
      return;
    }
    memRefreshTokens.set(token, {
      token,
      userId,
      tenantId,
      expiresAt,
      revoked: false
    });
  },

  async findRefreshToken(token: string) {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return RefreshToken.findOne({ token, revoked: false }).exec();
    }
    const found = memRefreshTokens.get(token);
    if (!found || found.revoked || found.expiresAt < new Date()) return null;
    return found;
  },

  async revokeRefreshToken(token: string) {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      await RefreshToken.updateOne({ token }, { revoked: true }).exec();
      return;
    }
    const found = memRefreshTokens.get(token);
    if (found) found.revoked = true;
  },

  // Reset helper for tests
  clearMemoryStore() {
    memTenants.clear();
    memUsers.clear();
    memAuditLogs.clear();
    memRefreshTokens.clear();
  }
};
