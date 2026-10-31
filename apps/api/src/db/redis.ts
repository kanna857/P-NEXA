import { Redis } from 'ioredis';
import { rootLogger } from '@nexus/observability';
import { config } from '../config.js';

const logger = rootLogger.child({ component: 'RedisClient' });

export interface ICacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  ping(): Promise<string>;
  isMock(): boolean;
}

class InMemoryMockCache implements ICacheClient {
  private store = new Map<string, { value: string; expiry?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null> {
    const expiry = mode === 'EX' && duration ? Date.now() + duration * 1000 : undefined;
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  async ping(): Promise<string> {
    return 'PONG (in-memory mock)';
  }

  isMock(): boolean {
    return true;
  }
}

class RealRedisWrapper implements ICacheClient {
  private redis: any;

  constructor(redis: any) {
    this.redis = redis;
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null> {
    if (mode === 'EX' && duration) {
      return (await this.redis.set(key, value, 'EX', duration)) as 'OK' | null;
    }
    return (await this.redis.set(key, value)) as 'OK' | null;
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  isMock(): boolean {
    return false;
  }
}

let cacheClientInstance: ICacheClient | null = null;

export function initRedis(): ICacheClient {
  if (cacheClientInstance) return cacheClientInstance;

  try {
    const client = new (Redis as any)(config.REDIS_URI, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // don't hang if offline
      lazyConnect: true,
      connectTimeout: 2000
    });

    client.on('error', (err: any) => {
      logger.warn('Redis client error or unavailable, switching to in-memory fallback', {
        err: err.message
      });
      cacheClientInstance = new InMemoryMockCache();
    });

    client.connect().catch(() => {
      logger.warn('Cannot connect to live Redis; using in-memory mock cache fallback');
      cacheClientInstance = new InMemoryMockCache();
    });

    cacheClientInstance = new RealRedisWrapper(client);
    return cacheClientInstance;
  } catch (err) {
    logger.warn('Failed to initialize Redis client; fallback active', { err });
    cacheClientInstance = new InMemoryMockCache();
    return cacheClientInstance;
  }
}

export function getCacheClient(): ICacheClient {
  if (!cacheClientInstance) {
    cacheClientInstance = initRedis();
  }
  return cacheClientInstance;
}

