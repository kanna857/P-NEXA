import { Router } from 'express';
import {
  tenantCreateSchema,
  tenantSwitchSchema,
  Permissions,
  SystemRoles,
  NotFoundError,
  ConflictError
} from '@nexus/shared';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';
import { validateBody } from '../middlewares/validate.js';
import { DataStore } from '../db/store.js';
import { signAccessToken, createRefreshToken } from '../services/authService.js';
import { recordAuditEvent } from '../services/auditService.js';

export const organizationRouter = Router();

organizationRouter.use(authMiddleware);
organizationRouter.use(tenantMiddleware);

// List accessible organizations
organizationRouter.get('/', async (req, res, next) => {
  try {
    const tenants = await DataStore.listTenants();
    // Super admin sees all, others see their current tenant
    const accessible =
      req.user!.role === SystemRoles.SUPER_ADMIN
        ? tenants
        : tenants.filter((t: any) => (t._id?.toString() || t.id) === req.user!.tenantId);

    res.json({
      success: true,
      data: accessible.map((t: any) => ({
        id: t._id?.toString() || t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        quotas: t.quotas,
        status: t.status
      }))
    });
  } catch (err) {
    next(err);
  }
});

// Create organization (SuperAdmin or users with TENANT_CREATE permission)
organizationRouter.post(
  '/',
  requirePermission(Permissions.TENANT_CREATE),
  validateBody(tenantCreateSchema),
  async (req, res, next) => {
    try {
      const { name, slug, plan, quotas, settings } = req.body;

      const existing = await DataStore.findTenantBySlug(slug);
      if (existing) {
        throw new ConflictError(`Organization slug '${slug}' is already taken`);
      }

      const tenant = await DataStore.createTenant({
        name,
        slug,
        plan,
        quotas,
        settings
      });

      const tenantId = (tenant as any)._id?.toString() || (tenant as any).id;

      await recordAuditEvent({
        tenantId,
        action: 'TENANT_CREATED',
        actor: { userId: req.user!.userId, ipAddress: req.ip ?? undefined },
        targetResource: { type: 'Tenant', id: tenantId },
        payload: { name, slug, plan }
      });

      res.status(201).json({
        success: true,
        data: tenant
      });
    } catch (err) {
      next(err);
    }
  }
);

// Switch active organization context
organizationRouter.post('/switch', validateBody(tenantSwitchSchema), async (req, res, next) => {
  try {
    const { tenantId } = req.body;
    const targetTenant = await DataStore.findTenantById(tenantId);

    if (!targetTenant) {
      throw new NotFoundError(`Tenant with id ${tenantId}`);
    }

    // Verify user membership in target tenant unless SUPER_ADMIN
    if (req.user!.role !== SystemRoles.SUPER_ADMIN) {
      const userInTarget = await DataStore.findUserByEmail(tenantId, req.user!.email);
      if (!userInTarget) {
        throw new NotFoundError('User has no account in target organization');
      }
    }

    const newAccessToken = signAccessToken({
      userId: req.user!.userId,
      email: req.user!.email,
      tenantId,
      role: req.user!.role,
      permissions: req.user!.permissions
    });

    const newRefreshToken = await createRefreshToken(req.user!.userId, tenantId);

    res.json({
      success: true,
      data: {
        currentTenant: {
          id: (targetTenant as any)._id?.toString() || (targetTenant as any).id,
          name: targetTenant.name,
          slug: targetTenant.slug
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (err) {
    next(err);
  }
});

