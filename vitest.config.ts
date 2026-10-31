import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@nexus/agent-registry': resolve(__dirname, 'packages/agent-registry/src/index.ts'),
      '@nexus/agent-orchestrator': resolve(__dirname, 'packages/agent-orchestrator/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
      'tests/**/*.test.ts'
    ],
    testTimeout: 10000
  }
});

