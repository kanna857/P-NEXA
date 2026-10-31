import { Router } from 'express';
import {
  authRegisterSchema,
  authLoginSchema,
  refreshTokenSchema,
  ConflictError,
  UnauthorizedError,
  SystemRoles
} from '@nexus/shared';
import { validateBody } from '../middlewares/validate.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { DataStore } from '../db/store.js';
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  createRefreshToken
} from '../services/authService.js';
import { recordAuditEvent } from '../services/auditService.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(authRegisterSchema), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, organizationName, organizationSlug } = req.body;

    const slug = organizationSlug || organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const existingTenant = await DataStore.findTenantBySlug(slug);
    if (existingTenant) {
      throw new ConflictError(`Organization with slug '${slug}' already exists`);
    }

    const tenant = await DataStore.createTenant({
      name: organizationName,
      slug,
      plan: 'enterprise'
    });

    const tenantId = (tenant as any)._id?.toString() || (tenant as any).id;

    const existingUser = await DataStore.findUserByEmail(tenantId, email);
    if (existingUser) {
      throw new ConflictError(`User with email '${email}' already exists in this tenant`);
    }

    const passwordHash = await hashPassword(password);
    const user = await DataStore.createUser({
      tenantId,
      email,
      passwordHash,
      firstName,
      lastName,
      role: SystemRoles.ORG_ADMIN,
      permissions: []
    });

    const userId = (user as any)._id?.toString() || (user as any).id;

    // Record audit event for tenant and admin registration
    await recordAuditEvent({
      tenantId,
      action: 'TENANT_PROVISIONED',
      actor: { userId, systemService: 'auth-service', ipAddress: req.ip ?? undefined },
      targetResource: { type: 'Tenant', id: tenantId },
      payload: { name: organizationName, slug }
    });

    const accessToken = signAccessToken({
      userId,
      email: user.email,
      tenantId,
      role: user.role,
      permissions: user.permissions
    });

    const refreshToken = await createRefreshToken(userId, tenantId);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        tenant: {
          id: tenantId,
          name: tenant.name,
          slug: tenant.slug
        },
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', validateBody(authLoginSchema), async (req, res, next) => {
  try {
    const { email, password, tenantSlug } = req.body;

    let targetTenant: any = null;
    if (tenantSlug) {
      targetTenant = await DataStore.findTenantBySlug(tenantSlug);
      if (!targetTenant) {
        throw new UnauthorizedError('Invalid credentials or tenant');
      }
    } else {
      const tenants = await DataStore.listTenants();
      if (tenants.length > 0) {
        // Find tenant containing this user
        for (const t of tenants) {
          const tId = (t as any)._id?.toString() || (t as any).id;
          const u = await DataStore.findUserByEmail(tId, email);
          if (u) {
            targetTenant = t;
            break;
          }
        }
      }
    }

    if (!targetTenant) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const tenantId = (targetTenant as any)._id?.toString() || (targetTenant as any).id;
    const user = await DataStore.findUserByEmail(tenantId, email);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const userId = (user as any)._id?.toString() || (user as any).id;

    // Cryptographic audit record for login
    await recordAuditEvent({
      tenantId,
      action: 'USER_LOGIN',
      actor: { userId, ipAddress: req.ip ?? undefined },
      targetResource: { type: 'User', id: userId },
      payload: { email: user.email, role: user.role }
    });

    const accessToken = signAccessToken({
      userId,
      email: user.email,
      tenantId,
      role: user.role,
      permissions: user.permissions
    });

    const refreshToken = await createRefreshToken(userId, tenantId);

    res.json({
      success: true,
      data: {
        user: {
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.permissions
        },
        tenant: {
          id: tenantId,
          name: targetTenant.name,
          slug: targetTenant.slug
        },
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', validateBody(refreshTokenSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const record = await DataStore.findRefreshToken(refreshToken);

    if (!record) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await DataStore.findUserById(record.userId.toString());
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    const userId = (user as any)._id?.toString() || (user as any).id;
    const tenantId = record.tenantId.toString();

    // Rotate refresh token
    await DataStore.revokeRefreshToken(refreshToken);
    const newRefreshToken = await createRefreshToken(userId, tenantId);

    const accessToken = signAccessToken({
      userId,
      email: user.email,
      tenantId,
      role: user.role,
      permissions: user.permissions
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await DataStore.findUserById(req.user!.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const tenant = await DataStore.findTenantById(req.user!.tenantId);
    const allTenants = await DataStore.listTenants();

    res.json({
      success: true,
      data: {
        user: {
          id: req.user!.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.permissions
        },
        currentTenant: tenant
          ? {
              id: (tenant as any)._id?.toString() || (tenant as any).id,
              name: tenant.name,
              slug: tenant.slug,
              plan: tenant.plan,
              quotas: tenant.quotas
            }
          : null,
        availableTenants: allTenants.map((t: any) => ({
          id: t._id?.toString() || t.id,
          name: t.name,
          slug: t.slug
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

