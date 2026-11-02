import { Router, Request, Response, NextFunction } from 'express';
import {
  TelemetryEventSchema,
  TelemetryBatchSchema,
  TelemetryQuerySchema,
  ValidationError
} from '@nexus/shared';
import { defaultTelemetryService } from '../services/telemetryService.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';

export const telemetryRouter = Router();

// Apply authentication and tenant isolation
telemetryRouter.use(authMiddleware);
telemetryRouter.use(tenantMiddleware);

// ── 1. Ingest Single Telemetry Event ─────────────────────────────────────────
telemetryRouter.post('/ingest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = TelemetryEventSchema.safeParse({
      ...req.body,
      tenantId: req.tenantId // enforce authenticated tenant isolation
    });

    if (!parse.success) {
      throw new ValidationError(parse.error.errors.map((e) => e.message).join(', '));
    }

    const io = (req as any).io;
    const result = await defaultTelemetryService.ingestEvent(parse.data, io);

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      result
    });
  } catch (err) {
    next(err);
  }
});

// ── 2. Ingest High-Throughput Telemetry Batch ─────────────────────────────────
telemetryRouter.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodyWithTenant = {
      ...req.body,
      tenantId: req.tenantId,
      events: (req.body.events || []).map((e: any) => ({
        ...e,
        tenantId: req.tenantId,
        mode: e.mode || req.body.mode || 'demo'
      }))
    };

    const parse = TelemetryBatchSchema.safeParse(bodyWithTenant);

    if (!parse.success) {
      throw new ValidationError(parse.error.errors.map((e) => e.message).join(', '));
    }

    const io = (req as any).io;
    const report = await defaultTelemetryService.ingestBatch(parse.data, io);

    res.status(200).json({
      success: true,
      report
    });
  } catch (err) {
    next(err);
  }
});

// ── 3. Query Live Digital Twin Entity States & Freshness ─────────────────────
telemetryRouter.get('/entities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const entities = defaultTelemetryService.getEntitiesForTenant(tenantId);

    res.json({
      success: true,
      total: entities.length,
      entities
    });
  } catch (err) {
    next(err);
  }
});

// ── 4. Query Historical Telemetry ───────────────────────────────────────────
telemetryRouter.get('/query', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = TelemetryQuerySchema.safeParse(req.query);
    if (!parse.success) {
      throw new ValidationError(parse.error.errors.map((e) => e.message).join(', '));
    }

    const tenantId = req.tenantId!;
    const events = await defaultTelemetryService.queryTelemetry(tenantId, parse.data);

    res.json({
      success: true,
      total: events.length,
      events
    });
  } catch (err) {
    next(err);
  }
});

// ── 5. Query Recent Anomalies ───────────────────────────────────────────────
telemetryRouter.get('/anomalies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const limit = Number(req.query.limit) || 50;
    const anomalies = defaultTelemetryService.getAnomalies(tenantId, limit);

    res.json({
      success: true,
      total: anomalies.length,
      anomalies
    });
  } catch (err) {
    next(err);
  }
});

// ── 6. Start / Stop Historical Telemetry Replay ─────────────────────────────
telemetryRouter.post('/replay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action = 'start', speedMultiplier = 1, sessionId } = req.body;
    const tenantId = req.tenantId!;
    const io = (req as any).io;

    if (action === 'stop') {
      if (!sessionId) {
        throw new ValidationError('sessionId is required to stop replay');
      }
      const stopped = defaultTelemetryService.stopReplay(sessionId);
      res.json({ success: stopped, sessionId });
      return;
    }

    const replayRes = await defaultTelemetryService.startReplay(tenantId, speedMultiplier, io);
    res.json({
      success: true,
      replay: replayRes
    });
    return;
  } catch (err) {
    next(err);
  }
});

// ── 7. Server-Sent Events (SSE) Streaming Fallback ──────────────────────────
telemetryRouter.get('/stream', (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial connection handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', tenantId, timestamp: new Date().toISOString() })}\n\n`);

  // Periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT', timestamp: new Date().toISOString() })}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// ── 8. Trigger End-to-End Demo Scenario ─────────────────────────────────────
telemetryRouter.post('/demo-scenario', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const targetEntityId = req.body.entityId || 'srv-auth';
    const io = (req as any).io;

    const result = await defaultTelemetryService.triggerDemoScenario(tenantId, targetEntityId, io);

    res.status(200).json({
      success: true,
      scenario: result.scenario,
      entityId: targetEntityId,
      telemetry: result.telemetryEvent,
      anomaly: result.anomalyFinding,
      investigationId: result.dossier.investigationId,
      status: result.dossier.status,
      recommendedPlan: result.dossier.recommendedPlan
    });
  } catch (err) {
    next(err);
  }
});

