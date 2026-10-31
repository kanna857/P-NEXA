import { Router } from 'express';
import { getDatabaseStatus } from '../db/connection.js';
import { getCacheClient } from '../db/redis.js';
import { telemetry } from '@nexus/observability';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'nexus-omega-x-api',
    timestamp: new Date().toISOString()
  });
});

healthRouter.get('/health/live', (_req, res) => {
  const snapshot = telemetry.getSystemSnapshot();
  res.json({
    status: 'live',
    uptime: snapshot.uptimeSeconds,
    memory: snapshot
  });
});

healthRouter.get('/health/ready', async (_req, res) => {
  const dbStatus = getDatabaseStatus();
  const cache = getCacheClient();

  let redisOk = false;
  let redisPing = 'unknown';

  try {
    redisPing = await cache.ping();
    redisOk = true;
  } catch (e) {
    redisOk = false;
  }

  const isHealthy = dbStatus.isConnected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ready' : 'degraded',
    checks: {
      database: {
        connected: dbStatus.isConnected,
        isMockMode: dbStatus.isMockMode
      },
      cache: {
        connected: redisOk,
        isMockMode: cache.isMock(),
        ping: redisPing
      }
    },
    timestamp: new Date().toISOString()
  });
});

