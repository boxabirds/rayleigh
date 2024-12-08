import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
