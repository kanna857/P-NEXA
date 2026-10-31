import { Router } from 'express';
import { Permissions, userInviteSchema, ConflictError } from '@nexus/shared';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';
import { validateBody } from '../middlewares/validate.js';
import { DataStore } from '../db/store.js';
import { hashPassword } from '../services/authService.js';
import { recordAuditEvent } from '../services/auditService.js';

export const userRouter = Router();

userRouter.use(authMiddleware);
userRouter.use(tenantMiddleware);

// List users for active tenant
userRouter.get('/', requirePermission(Permissions.USER_READ), async (req, res, next) => {
  try {
    const users = await DataStore.listUsersByTenant(req.tenantId!);
    res.json({
      success: true,
      data: users.map((u: any) => ({
        id: u._id?.toString() || u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        status: u.status,
        permissions: u.permissions,
        createdAt: u.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
});

// Invite / provision user in tenant
userRouter.post(
  '/',
  requirePermission(Permissions.USER_INVITE),
  validateBody(userInviteSchema),
  async (req, res, next) => {
    try {
      const { email, firstName, lastName, role, permissions } = req.body;
      const tenantId = req.tenantId!;

      const existing = await DataStore.findUserByEmail(tenantId, email);
      if (existing) {
        throw new ConflictError(`User with email '${email}' already exists in this tenant`);
      }

      // Default temporary password
      const defaultPassword = 'NexusTemporaryPass2026!';
      const passwordHash = await hashPassword(defaultPassword);

      const newUser = await DataStore.createUser({
        tenantId,
        email,
        firstName,
        lastName,
        role,
        permissions,
        passwordHash
      });

      const newUserId = (newUser as any)._id?.toString() || (newUser as any).id;

      await recordAuditEvent({
        tenantId,
        action: 'USER_INVITED',
        actor: { userId: req.user!.userId, ipAddress: req.ip ?? undefined },
        targetResource: { type: 'User', id: newUserId },
        payload: { email, role, permissions }
      });

      res.status(201).json({
        success: true,
        data: {
          id: newUserId,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          permissions: newUser.permissions
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

