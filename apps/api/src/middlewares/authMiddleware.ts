import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, UserTokenPayload } from '@nexus/shared';
import { verifyAccessToken } from '../services/authService.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserTokenPayload;
      tenantId?: string;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authorization Bearer token required');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Malformed authorization header');
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    // Prefer tenantId from verified token if not explicitly provided
    if (!req.tenantId) {
      req.tenantId = payload.tenantId;
    }
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}

