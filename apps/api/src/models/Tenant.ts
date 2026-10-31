import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITenantDocument extends Document {
  name: string;
  slug: string;
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

const TenantSchema = new Schema<ITenantDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    status: {
      type: String,
      enum: ['active', 'suspended', 'provisioning'],
      default: 'active',
      index: true
    },
    plan: {
      type: String,
      enum: ['starter', 'enterprise', 'defense_grade'],
      default: 'enterprise'
    },
    quotas: {
      maxAgents: { type: Number, default: 20 },
      maxParallelScenarios: { type: Number, default: 8 },
      maxEventStorageMb: { type: Number, default: 10240 }
    },
    settings: {
      mfaRequired: { type: Boolean, default: false },
      requireDualApprovalForWorkflows: { type: Boolean, default: true },
      retentionDays: { type: Number, default: 90 }
    }
  },
  {
    timestamps: true
  }
);

export const Tenant: Model<ITenantDocument> =
  mongoose.models.Tenant || mongoose.model<ITenantDocument>('Tenant', TenantSchema);

