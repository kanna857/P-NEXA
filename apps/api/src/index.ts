import { createApp } from './app.js';
import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './db/connection.js';
import { initRedis } from './db/redis.js';
import { rootLogger } from '@nexus/observability';

const logger = rootLogger.child({ component: 'ApiServer' });

async function main() {
  await connectDatabase();
  initRedis();

  const { httpServer } = createApp();

  httpServer.listen(config.PORT, () => {
    logger.info(`NEXUS OMEGA X API + Socket.IO Gateway online on port ${config.PORT}`, {
      env: config.NODE_ENV,
      port: config.PORT
    });
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, initiating graceful shutdown...`);
    httpServer.close(async () => {
      await disconnectDatabase();
      logger.info('Clean shutdown completed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal('Fatal error during API bootstrap', err);
  process.exit(1);
});
