import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@nexus/agent-engine': resolve(__dirname, 'packages/agent-engine/src/index.ts'),
      '@nexus/agent-memory': resolve(__dirname, 'packages/agent-memory/src/index.ts'),
      '@nexus/agent-orchestrator': resolve(__dirname, 'packages/agent-orchestrator/src/index.ts'),
      '@nexus/agent-registry': resolve(__dirname, 'packages/agent-registry/src/index.ts'),
      '@nexus/cyber-engine': resolve(__dirname, 'packages/cyber-engine/src/index.ts'),
      '@nexus/event-store': resolve(__dirname, 'packages/event-store/src/index.ts'),
      '@nexus/governance': resolve(__dirname, 'packages/governance/src/index.ts'),
      '@nexus/learning-engine': resolve(__dirname, 'packages/learning-engine/src/index.ts'),
      '@nexus/observability': resolve(__dirname, 'packages/observability/src/index.ts'),
      '@nexus/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
      '@nexus/simulation-engine': resolve(__dirname, 'packages/simulation-engine/src/index.ts'),
      '@nexus/twin-graph': resolve(__dirname, 'packages/twin-graph/src/index.ts'),
      '@nexus/ui': resolve(__dirname, 'packages/ui/src/index.ts'),
      '@nexus/workflow-engine': resolve(__dirname, 'packages/workflow-engine/src/index.ts'),
      '@nexus/world-engine': resolve(__dirname, 'packages/world-engine/src/index.ts')
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
    testTimeout: 30000
  }
});

