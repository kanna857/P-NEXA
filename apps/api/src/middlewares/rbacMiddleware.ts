import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError, Permission, SystemRole, hasPermission } from '@nexus/shared';

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const isAllowed = hasPermission(req.user.role, permission, req.user.permissions);
    if (!isAllowed) {
      throw new ForbiddenError(`Missing required permission: ${permission}`);
    }

    next();
  };
}

export function requireRole(allowedRoles: SystemRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(`Requires one of roles: ${allowedRoles.join(', ')}`);
    }

    next();
  };
}

