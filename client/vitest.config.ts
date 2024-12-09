import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    globalSetup: [],
    testTimeout: 300000,
    hookTimeout: 300000,
    env: {
      NODE_ENV: 'test',
    }
  },
});
