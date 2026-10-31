import { Types } from 'mongoose';
import { DigitalTwinWorld, IDigitalTwinWorldDocument } from '../models/DigitalTwinWorld.js';
import { getDatabaseStatus } from './connection.js';

// In-memory fallback store for worlds
const memWorlds = new Map<string, any>();

export const WorldStore = {
  async createWorld(data: {
    tenantId: string;
    name: string;
    description?: string;
    environmentType?: string;
    nodes?: any[];
    edges?: any[];
  }): Promise<IDigitalTwinWorldDocument> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return DigitalTwinWorld.create({
        ...data,
        tenantId: new Types.ObjectId(data.tenantId)
      });
    }
    const id = new Types.ObjectId().toString();
    const doc: any = {
      _id: id,
      id,
      ...data,
      version: 1,
      nodes: data.nodes || [],
      edges: data.edges || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memWorlds.set(id, doc);
    return doc;
  },

  async findWorldsByTenant(tenantId: string): Promise<IDigitalTwinWorldDocument[]> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return DigitalTwinWorld.find({ tenantId }).exec();
    }
    return Array.from(memWorlds.values()).filter((w) => w.tenantId === tenantId);
  },

  async findWorldById(id: string): Promise<IDigitalTwinWorldDocument | null> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return DigitalTwinWorld.findById(id).exec();
    }
    return memWorlds.get(id) || null;
  },

  async findWorldByIdAndTenant(
    id: string,
    tenantId: string
  ): Promise<IDigitalTwinWorldDocument | null> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return DigitalTwinWorld.findOne({ _id: id, tenantId }).exec();
    }
    const w = memWorlds.get(id);
    if (!w || w.tenantId !== tenantId) return null;
    return w;
  },

  async updateNodeStatus(
    worldId: string,
    tenantId: string,
    nodeId: string,
    status: string
  ): Promise<IDigitalTwinWorldDocument | null> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return DigitalTwinWorld.findOneAndUpdate(
        { _id: worldId, tenantId, 'nodes.nodeId': nodeId },
        { $set: { 'nodes.$.status': status }, $inc: { version: 1 } },
        { new: true }
      ).exec();
    }
    const w = memWorlds.get(worldId);
    if (!w) return null;
    const node = w.nodes.find((n: any) => n.nodeId === nodeId);
    if (node) {
      node.status = status;
      w.version += 1;
      w.updatedAt = new Date();
    }
    return w;
  },

  async updateEdgeStatus(
    worldId: string,
    tenantId: string,
    edgeId: string,
    status: string
  ): Promise<IDigitalTwinWorldDocument | null> {
    const { isConnected, isMockMode } = getDatabaseStatus();
    if (isConnected && !isMockMode) {
      return DigitalTwinWorld.findOneAndUpdate(
        { _id: worldId, tenantId, 'edges.edgeId': edgeId },
        { $set: { 'edges.$.status': status }, $inc: { version: 1 } },
        { new: true }
      ).exec();
    }
    const w = memWorlds.get(worldId);
    if (!w) return null;
    const edge = w.edges.find((e: any) => e.edgeId === edgeId);
    if (edge) {
      edge.status = status;
      w.version += 1;
      w.updatedAt = new Date();
    }
    return w;
  },

  clearMemoryStore() {
    memWorlds.clear();
  }
};

