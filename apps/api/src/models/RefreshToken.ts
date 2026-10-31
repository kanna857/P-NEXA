import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRefreshTokenDocument extends Document {
  token: string;
  userId: Types.ObjectId;
  tenantId: Types.ObjectId;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken: Model<IRefreshTokenDocument> =
  mongoose.models.RefreshToken || mongoose.model<IRefreshTokenDocument>('RefreshToken', RefreshTokenSchema);

