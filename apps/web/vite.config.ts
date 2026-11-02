import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.GITHUB_PAGES === 'true' ? '/P-NEXA/' : './'),
  plugins: [react()],
  resolve: {
    alias: {
      '@nexus/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@nexus/twin-graph': resolve(__dirname, '../../packages/twin-graph/src/index.ts'),
      '@nexus/world-engine': resolve(__dirname, '../../packages/world-engine/src/index.ts'),
      '@nexus/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@nexus/agent-registry': resolve(__dirname, '../../packages/agent-registry/src/index.ts'),
      '@nexus/agent-orchestrator': resolve(__dirname, '../../packages/agent-orchestrator/src/index.ts')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});
