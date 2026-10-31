import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { SystemRole, SystemRoles } from '@nexus/shared';

export interface IUserDocument extends Document {
  tenantId: Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: SystemRole;
  status: 'active' | 'inactive' | 'locked';
  permissions: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: Object.values(SystemRoles),
      default: SystemRoles.VIEWER,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'locked'],
      default: 'active'
    },
    permissions: [{ type: String }],
    lastLoginAt: { type: Date }
  },
  {
    timestamps: true
  }
);

// Compound index enforcing uniqueness of email within each tenant
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

