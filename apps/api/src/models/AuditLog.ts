import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAuditLogDocument extends Document {
  tenantId: Types.ObjectId;
  sequenceNumber: number;
  previousHash: string;
  currentHash: string;
  actor: {
    userId?: Types.ObjectId;
    agentId?: string;
    systemService?: string;
    ipAddress?: string;
  };
  action: string;
  targetResource: {
    type: string;
    id: string;
  };
  payload: Record<string, unknown>;
  evidenceHash?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    sequenceNumber: { type: Number, required: true },
    previousHash: { type: String, required: true },
    currentHash: { type: String, required: true },
    actor: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      agentId: { type: String },
      systemService: { type: String },
      ipAddress: { type: String }
    },
    action: { type: String, required: true, index: true },
    targetResource: {
      type: { type: String, required: true },
      id: { type: String, required: true }
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    evidenceHash: { type: String },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: false
  }
);

AuditLogSchema.index({ tenantId: 1, sequenceNumber: 1 }, { unique: true });

export const AuditLog: Model<IAuditLogDocument> =
  mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

