import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // exclude: ['node_modules', 'dist', 'tests/integration/**'],
    globals: true,
    logHeapUsage: true,
    silent: false,
    reporters: ['verbose'],
    testTimeout: 30000,
  },
});
