import { z } from 'zod';
import { SystemRoles } from '../roles.js';

export const authRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  organizationName: z.string().min(2, 'Organization name is required'),
  organizationSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens')
    .optional()
});

export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
  tenantSlug: z.string().optional()
});

export type AuthLoginInput = z.infer<typeof authLoginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const userInviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum([
    SystemRoles.ORG_ADMIN,
    SystemRoles.SECURITY_ANALYST,
    SystemRoles.SIMULATION_ENGINEER,
    SystemRoles.OPERATOR,
    SystemRoles.AUDITOR,
    SystemRoles.VIEWER
  ]),
  permissions: z.array(z.string()).default([])
});

export type UserInviteInput = z.infer<typeof userInviteSchema>;

