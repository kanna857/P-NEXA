import mongoose from 'mongoose';
import { rootLogger } from '@nexus/observability';
import { config } from '../config.js';

const logger = rootLogger.child({ component: 'MongoConnection' });

let isConnected = false;
let isMockMode = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected) return;

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    isConnected = true;
    isMockMode = false;
    logger.info('Connected to MongoDB successfully', { uri: config.MONGODB_URI });
  } catch (error) {
    if (config.NODE_ENV === 'test' || config.ALLOW_MEMORY_FALLBACK || process.env.ALLOW_MEMORY_FALLBACK === 'true') {
      logger.warn('MongoDB connection failed; operating in in-memory state fallback mode', {
        error: (error as Error).message
      });
      isConnected = true;
      isMockMode = true;
    } else {
      logger.error('Failed to connect to MongoDB', error);
      throw error;
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  try {
    if (!isMockMode) {
      await mongoose.disconnect();
    }
    isConnected = false;
    logger.info('Disconnected from database');
  } catch (error) {
    logger.error('Error disconnecting database', error);
  }
}

export function getDatabaseStatus(): { isConnected: boolean; isMockMode: boolean } {
  return {
    isConnected: isConnected || mongoose.connection.readyState === 1,
    isMockMode
  };
}
