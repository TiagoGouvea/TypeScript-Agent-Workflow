import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    logHeapUsage: true,
    silent: false,
    reporters: ['verbose'],
    testTimeout: 30000,
  },
});
