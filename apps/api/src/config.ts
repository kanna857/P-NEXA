import { z } from 'zod';

const configSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    MONGODB_URI: z.string().default('mongodb://localhost:27017/nexus_omega_x'),
    REDIS_URI: z.string().default('redis://localhost:6379'),
    JWT_SECRET: z.string().min(16).default('nexus_omega_x_super_secret_jwt_key_2026_at_least_32_chars!'),
    JWT_EXPIRES_IN: z.string().default('24h'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
    ALLOW_MEMORY_FALLBACK: z
      .string()
      .optional()
      .transform((val) => val === 'true' || process.env.NODE_ENV === 'test')
  })
  .refine(
    (data) => {
      if (
        data.NODE_ENV === 'production' &&
        data.JWT_SECRET === 'nexus_omega_x_super_secret_jwt_key_2026_at_least_32_chars!'
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        'FATAL SECURITY VIOLATION: Default development JWT_SECRET is strictly forbidden in production. ' +
        'Inject a cryptographically random secret via environment variables or secret manager.',
      path: ['JWT_SECRET']
    }
  );

export const config = configSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  REDIS_URI: process.env.REDIS_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN,
  ALLOW_MEMORY_FALLBACK: process.env.ALLOW_MEMORY_FALLBACK
});

