import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@nexus/shared';
import { rootLogger } from '@nexus/observability';

const logger = rootLogger.child({ component: 'ErrorHandler' });

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or query parameters',
        details: err.errors
      }
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`Server error during ${req.method} ${req.path}`, err);
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  const errorObj = err as Error;
  logger.error(`Unhandled error during ${req.method} ${req.path}`, errorObj);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred'
    }
  });
}

