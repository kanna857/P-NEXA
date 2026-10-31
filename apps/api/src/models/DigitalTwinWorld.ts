import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITwinNodeDocument {
  nodeId: string;
  name: string;
  type: string;
  tier: number;
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

export interface ITwinEdgeDocument {
  edgeId: string;
  source: string;
  target: string;
  protocol: 'TCP' | 'UDP' | 'TLS' | 'GRPC' | 'INTERNAL_BUS';
  trafficRateKbps: number;
  isEncrypted: boolean;
  status: 'normal' | 'anomalous' | 'severed';
}

export interface IDigitalTwinWorldDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  description: string;
  environmentType: 'cloud' | 'enterprise_datacenter' | 'scada_ics' | 'satellite_mesh';
  version: number;
  nodes: ITwinNodeDocument[];
  edges: ITwinEdgeDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const TwinNodeSchema = new Schema<ITwinNodeDocument>(
  {
    nodeId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    tier: { type: Number, default: 2 },
    status: {
      type: String,
      enum: ['healthy', 'warning', 'compromised', 'isolated', 'offline'],
      default: 'healthy'
    },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      z: { type: Number, default: 0 }
    },
    metadata: {
      ipAddress: String,
      subnet: String,
      os: String,
      vulnerabilities: [String],
      cpuUsage: Number,
      memoryUsage: Number,
      trafficRateKbps: Number
    }
  },
  { _id: false }
);

const TwinEdgeSchema = new Schema<ITwinEdgeDocument>(
  {
    edgeId: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    protocol: {
      type: String,
      enum: ['TCP', 'UDP', 'TLS', 'GRPC', 'INTERNAL_BUS'],
      default: 'TLS'
    },
    trafficRateKbps: { type: Number, default: 100 },
    isEncrypted: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['normal', 'anomalous', 'severed'],
      default: 'normal'
    }
  },
  { _id: false }
);

const DigitalTwinWorldSchema = new Schema<IDigitalTwinWorldDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    environmentType: {
      type: String,
      enum: ['cloud', 'enterprise_datacenter', 'scada_ics', 'satellite_mesh'],
      default: 'enterprise_datacenter'
    },
    version: { type: Number, default: 1 },
    nodes: [TwinNodeSchema],
    edges: [TwinEdgeSchema]
  },
  { timestamps: true }
);

DigitalTwinWorldSchema.index({ tenantId: 1, name: 1 });

export const DigitalTwinWorld: Model<IDigitalTwinWorldDocument> =
  mongoose.models.DigitalTwinWorld ||
  mongoose.model<IDigitalTwinWorldDocument>('DigitalTwinWorld', DigitalTwinWorldSchema);

