import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, NotFoundError, SystemRoles } from '@nexus/shared';
import { DataStore } from '../db/store.js';

export async function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const headerTenant = req.headers['x-tenant-id'] as string | undefined;

  let activeTenantId: string | undefined = headerTenant;

  if (req.user) {
    if (!activeTenantId) {
      activeTenantId = req.user.tenantId;
    } else if (
      activeTenantId !== req.user.tenantId &&
      req.user.role !== SystemRoles.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Cross-tenant access prohibited for current role');
    }
  }

  if (activeTenantId) {
    // Validate tenant exists and is active
    const tenant =
      (await DataStore.findTenantById(activeTenantId)) ||
      (await DataStore.findTenantBySlug(activeTenantId));

    if (!tenant) {
      throw new NotFoundError(`Tenant '${activeTenantId}'`);
    }

    if (tenant.status === 'suspended') {
      throw new ForbiddenError('Tenant account is suspended');
    }

    req.tenantId = (tenant as any)._id?.toString() || (tenant as any).id;
  }

  next();
}

