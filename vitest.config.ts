import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  root: '.',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // exclude: ['node_modules', 'dist', 'tests/integration/**'],
    globals: true,
    logHeapUsage: true,
    silent: false,
    reporters: ['verbose'],
    testTimeout: 120000,
    env: loadEnv(mode, process.cwd(), ''),
    ui: {
      open: false
    },
  },
}));
