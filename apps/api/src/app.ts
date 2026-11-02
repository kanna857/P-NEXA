import express, { Express } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middlewares/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { organizationRouter } from './routes/organizations.js';
import { userRouter } from './routes/users.js';
import { auditRouter } from './routes/audit.js';
import { worldsRouter } from './routes/worlds.js';
import { agentsRouter } from './routes/agents.js';
import { incidentsRouter } from './routes/incidents.js';
import { scenariosRouter } from './routes/scenarios.js';
import { policiesRouter } from './routes/policies.js';
import { workflowsRouter } from './routes/workflows.js';
import { developerRouter } from './routes/developer.js';
import { councilRouter } from './routes/council.js';
import { verifyAccessToken } from './services/authService.js';
import { rootLogger } from '@nexus/observability';

const logger = rootLogger.child({ component: 'AppFactory' });

export function createApp(): { app: Express; httpServer: ReturnType<typeof createServer>; io: SocketIOServer } {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
    })
  );
  app.use(express.json({ limit: '10mb' }));

  // Create HTTP + Socket.IO server
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  // Inject io into requests for route-level broadcast
  app.use((req: any, _res, next) => {
    req.io = io;
    next();
  });

  // ── Socket.IO Authentication & Room Management ───────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    logger.info('Socket.IO client connected', { userId: user?.userId, tenantId: user?.tenantId });

    // Auto-join tenant room for isolation
    if (user?.tenantId) {
      socket.join(`tenant:${user.tenantId}`);
    }

    socket.on('join_world', (worldId: string) => {
      socket.join(`world:${worldId}`);
      logger.debug('Socket joined world room', { worldId, userId: user?.userId });
    });

    socket.on('leave_world', (worldId: string) => {
      socket.leave(`world:${worldId}`);
    });

    socket.on('join_simulation', (scenarioId: string) => {
      socket.join(`sim:${scenarioId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.debug('Socket.IO client disconnected', { userId: user?.userId, reason });
    });
  });

  // ── Mount REST Routes ────────────────────────────────────────────────────
  app.use(healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/organizations', organizationRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/audit', auditRouter);
  app.use('/api/v1/worlds', worldsRouter);
  app.use('/api/v1/agents', agentsRouter);
  app.use('/api/v1/incidents', incidentsRouter);
  app.use('/api/v1/scenarios', scenariosRouter);
  app.use('/api/v1/policies', policiesRouter);
  app.use('/api/v1/workflows', workflowsRouter);
  app.use('/api/v1/developer', developerRouter);
  app.use('/api/v1/council', councilRouter);

  // Global error handler
  app.use(errorHandler);

  return { app, httpServer, io };
}
