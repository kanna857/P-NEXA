import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { defaultPredictiveEngine } from '@nexus/cyber-engine';
import { ForecastRequestSchema, ValidationError } from '@nexus/shared';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';

export const predictiveRouter = Router();

predictiveRouter.use(authMiddleware);
predictiveRouter.use(tenantMiddleware);

const detectSchema = z.object({
  entityId: z.string().min(1, 'entityId is required'),
  metric: z.string().min(1, 'metric is required'),
  value: z.number(),
  timestamp: z.string().optional()
});

// ── 1. Evaluate Anomaly On-Demand ───────────────────────────────────────────
predictiveRouter.post('/detect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = detectSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ValidationError(parse.error.errors.map((e) => e.message).join(', '));
    }

    const tenantId = req.tenantId!;
    const { entityId, metric, value, timestamp } = parse.data;

    const finding = defaultPredictiveEngine.evaluate(
      tenantId,
      entityId,
      metric,
      value,
      timestamp || new Date().toISOString()
    );

    res.json({
      success: true,
      finding
    });
  } catch (err) {
    next(err);
  }
});

// ── 2. Generate Time-Series Forecast with Calibrated Uncertainty ────────────
predictiveRouter.post('/forecast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = ForecastRequestSchema.safeParse({
      ...req.body,
      tenantId: req.tenantId
    });

    if (!parse.success) {
      throw new ValidationError(parse.error.errors.map((e) => e.message).join(', '));
    }

    const { tenantId, entityId, metric, horizonSteps, stepIntervalSec, historicalValues } = parse.data;

    const forecast = defaultPredictiveEngine.forecast(
      tenantId,
      entityId,
      metric,
      horizonSteps,
      stepIntervalSec,
      historicalValues
    );

    res.json({
      success: true,
      tenantId,
      entityId,
      metric,
      horizonSteps,
      stepIntervalSec,
      forecast
    });
  } catch (err) {
    next(err);
  }
});

// ── 3. Get Statistical Rolling Baseline Summary ─────────────────────────────
predictiveRouter.get('/baselines/:entityId/:metric', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { entityId, metric } = req.params;

    const win = defaultPredictiveEngine.getWindow(tenantId, entityId!, metric!);
    const stats = win.getStats();

    res.json({
      success: true,
      tenantId,
      entityId,
      metric,
      stats
    });
  } catch (err) {
    next(err);
  }
});

