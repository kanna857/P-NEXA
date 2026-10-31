import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { UserTokenPayload } from '@nexus/shared';
import { config } from '../config.js';
import { DataStore } from '../db/store.js';

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

export function signAccessToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as any
  });
}

export function verifyAccessToken(token: string): UserTokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as UserTokenPayload;
}

export async function createRefreshToken(userId: string, tenantId: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await DataStore.saveRefreshToken(token, userId, tenantId, expiresAt);
  return token;
}
